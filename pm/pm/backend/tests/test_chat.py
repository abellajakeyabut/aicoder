import copy
import json
import os
from types import SimpleNamespace

import pytest

from app.ai import AIBoard, AIResponse
from app.db import DEFAULT_BOARD
from app.models import Board

DEFAULT = json.loads(DEFAULT_BOARD.read_text())

live = pytest.mark.skipif(not os.environ.get("OPENROUTER_API_KEY"), reason="OPENROUTER_API_KEY not set")


def mock_ai(monkeypatch, result: AIResponse | None) -> list[dict]:
    """Replace the OpenRouter client with one returning `result`; returns the recorded call kwargs."""
    calls = []

    def parse(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(parsed=result))])

    fake = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(parse=parse)))
    monkeypatch.setattr("app.ai.client", lambda: fake)
    return calls


def board_with_new_card() -> dict:
    board = copy.deepcopy(DEFAULT)
    board["cards"]["card-new"] = {"id": "card-new", "title": "Test", "details": ""}
    board["columns"][0]["cardIds"].append("card-new")
    return board


def test_reply_only_leaves_board_unchanged(client, monkeypatch):
    mock_ai(monkeypatch, AIResponse(reply="There are 5 columns.", board=None))
    response = client.post("/api/chat", json={"message": "How many columns?"})
    assert response.status_code == 200
    assert response.json() == {"reply": "There are 5 columns.", "board": None}
    assert client.get("/api/board").json() == DEFAULT


def test_board_in_response_is_saved(client, monkeypatch):
    expected = board_with_new_card()
    mock_ai(monkeypatch, AIResponse(reply="Added.", board=AIBoard.from_board(Board.model_validate(expected))))
    response = client.post("/api/chat", json={"message": "Add a card called Test to Backlog"})
    assert response.status_code == 200
    assert response.json() == {"reply": "Added.", "board": expected}
    assert client.get("/api/board").json() == expected


def test_invalid_board_is_not_saved(client, monkeypatch):
    board = AIBoard.from_board(Board.model_validate(DEFAULT))
    board.columns[0].cardIds.remove("card-1")  # card-1 is in no column
    mock_ai(monkeypatch, AIResponse(reply="Done.", board=board))
    response = client.post("/api/chat", json={"message": "Remove card-1 from Backlog"})
    assert response.status_code == 502
    assert client.get("/api/board").json() == DEFAULT


def test_empty_ai_response_is_an_error(client, monkeypatch):
    mock_ai(monkeypatch, None)
    response = client.post("/api/chat", json={"message": "How many cards are in Done?"})
    assert response.status_code == 502
    assert client.get("/api/board").json() == DEFAULT


def test_history_and_board_sent_to_ai(client, monkeypatch):
    calls = mock_ai(monkeypatch, AIResponse(reply="Hi.", board=None))
    history = [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi, how can I help?"}]
    client.post("/api/chat", json={"message": "What is in Review?", "history": history})

    (call,) = calls
    system, *sent_history, latest = call["messages"]
    assert system["role"] == "system"
    assert sent_history == history
    assert latest["role"] == "user"
    assert AIBoard.from_board(Board.model_validate(DEFAULT)).model_dump_json() in latest["content"]
    assert latest["content"].endswith("What is in Review?")
    assert call["response_format"] is AIResponse


@live
def test_live_question_returns_no_board(client):
    response = client.post("/api/chat", json={"message": "What columns are there?"})
    assert response.status_code == 200
    assert response.json()["board"] is None
    assert response.json()["reply"]


@live
def test_live_add_card(client):
    response = client.post("/api/chat", json={"message": "Add a card called Test to Backlog"})
    assert response.status_code == 200
    board = response.json()["board"]
    backlog = next(column for column in board["columns"] if column["id"] == "col-backlog")
    assert "Test" in [board["cards"][card_id]["title"] for card_id in backlog["cardIds"]]
    assert client.get("/api/board").json() == board
