import copy
import sqlite3

import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import DEFAULT, register


def test_startup_creates_db_tables_and_demo_user(db_path):
    assert not db_path.exists()
    with TestClient(app):
        pass
    conn = sqlite3.connect(db_path)
    tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    users = conn.execute("SELECT username FROM users").fetchall()
    conn.close()
    assert {"users", "sessions", "boards"} <= tables
    assert users == [("user",)]


def test_startup_twice_keeps_one_demo_user(db_path):
    with TestClient(app):
        pass
    with TestClient(app):
        pass
    conn = sqlite3.connect(db_path)
    assert conn.execute("SELECT COUNT(*) FROM users").fetchone() == (1,)
    assert conn.execute("SELECT COUNT(*) FROM boards").fetchone() == (1,)
    conn.close()


def test_demo_user_has_the_seeded_board(client, board_id):
    (summary,) = client.get("/api/boards").json()
    assert summary["name"] == "My first board"
    assert summary["cardCount"] == 8
    board = client.get(f"/api/boards/{board_id}").json()
    assert board == DEFAULT
    assert len(board["columns"]) == 4


def test_create_board_has_empty_default_columns(client):
    response = client.post("/api/boards", json={"name": "  Launch plan  "})
    assert response.status_code == 201
    created = response.json()
    assert created["name"] == "Launch plan"
    assert created["cardCount"] == 0
    board = client.get(f"/api/boards/{created['id']}").json()
    assert [c["title"] for c in board["columns"]] == [c["title"] for c in DEFAULT["columns"]]
    assert all(c["cardIds"] == [] for c in board["columns"])
    assert board["cards"] == {}
    assert [b["name"] for b in client.get("/api/boards").json()] == ["My first board", "Launch plan"]


@pytest.mark.parametrize("name", ["", "   ", "x" * 61])
def test_invalid_board_name(client, name):
    assert client.post("/api/boards", json={"name": name}).status_code == 422


def test_put_then_get_returns_saved_board(client, board_id):
    board = copy.deepcopy(DEFAULT)
    board["columns"][0]["title"] = "Ideas"
    board["cards"]["card-9"] = {
        "id": "card-9",
        "title": "New",
        "details": "Notes",
        "priority": "high",
        "dueDate": "2026-12-01",
    }
    board["columns"][1]["cardIds"].append("card-9")
    board["columns"][3]["cardIds"].remove("card-8")
    board["columns"][0]["cardIds"].insert(0, "card-8")

    response = client.put(f"/api/boards/{board_id}", json=board)
    assert response.status_code == 200
    assert response.json() == board
    assert client.get(f"/api/boards/{board_id}").json() == board
    assert client.get("/api/boards").json()[0]["cardCount"] == 9


def test_cards_without_priority_or_due_date_are_accepted(client, board_id):
    board = copy.deepcopy(DEFAULT)
    board["cards"]["card-9"] = {"id": "card-9", "title": "Old style", "details": ""}
    board["columns"][0]["cardIds"].append("card-9")
    assert client.put(f"/api/boards/{board_id}", json=board).status_code == 200
    saved = client.get(f"/api/boards/{board_id}").json()["cards"]["card-9"]
    assert saved == {"id": "card-9", "title": "Old style", "details": "", "priority": None, "dueDate": None}


def test_board_persists_across_restarts(db_path):
    board = copy.deepcopy(DEFAULT)
    board["columns"][0]["title"] = "Persisted"
    with TestClient(app) as client:
        client.post("/api/auth/login", json={"username": "user", "password": "password"})
        board_id = client.get("/api/boards").json()[0]["id"]
        client.put(f"/api/boards/{board_id}", json=board)
    with TestClient(app) as client:
        client.post("/api/auth/login", json={"username": "user", "password": "password"})
        assert client.get(f"/api/boards/{board_id}").json() == board


def test_put_updates_timestamp(client, board_id):
    before = client.get("/api/boards").json()[0]["updatedAt"]
    client.put(f"/api/boards/{board_id}", json=DEFAULT)
    after = client.get("/api/boards").json()[0]["updatedAt"]
    assert after > before


def test_rename_board(client, board_id):
    response = client.patch(f"/api/boards/{board_id}", json={"name": "Roadmap"})
    assert response.status_code == 200
    assert response.json()["name"] == "Roadmap"
    assert client.get("/api/boards").json()[0]["name"] == "Roadmap"
    assert client.patch(f"/api/boards/{board_id}", json={"name": ""}).status_code == 422


def test_delete_board(client, board_id):
    other = client.post("/api/boards", json={"name": "Other"}).json()
    assert client.delete(f"/api/boards/{board_id}").status_code == 204
    assert [b["id"] for b in client.get("/api/boards").json()] == [other["id"]]
    assert client.get(f"/api/boards/{board_id}").status_code == 404
    assert client.delete(f"/api/boards/{board_id}").status_code == 404


@pytest.mark.parametrize(
    "method, suffix, body",
    [
        ("get", "", None),
        ("put", "", DEFAULT),
        ("patch", "", {"name": "Mine now"}),
        ("delete", "", None),
        ("post", "/chat", {"message": "Hi"}),
    ],
)
def test_users_cannot_reach_each_others_boards(client, board_id, method, suffix, body):
    alice = register("alice")
    response = alice.request(method, f"/api/boards/{board_id}{suffix}", json=body)
    assert response.status_code == 404
    # The demo user's board is untouched
    assert client.get(f"/api/boards/{board_id}").json() == DEFAULT
    assert client.get("/api/boards").json()[0]["name"] == "My first board"


def test_each_user_lists_only_their_boards(client):
    alice = register("alice")
    alice.post("/api/boards", json={"name": "Side project"})
    assert [b["name"] for b in alice.get("/api/boards").json()] == ["My first board", "Side project"]
    assert [b["name"] for b in client.get("/api/boards").json()] == ["My first board"]


def test_unknown_board_is_404(client):
    assert client.get("/api/boards/9999").status_code == 404
    assert client.put("/api/boards/9999", json=DEFAULT).status_code == 404
    assert client.patch("/api/boards/9999", json={"name": "X"}).status_code == 404


def make_invalid(change):
    board = copy.deepcopy(DEFAULT)
    change(board)
    return board


INVALID_BOARDS = {
    "unknown card id": make_invalid(lambda b: b["columns"][0]["cardIds"].append("card-404")),
    "card in two columns": make_invalid(lambda b: b["columns"][1]["cardIds"].append("card-1")),
    "card in no column": make_invalid(lambda b: b["columns"][0]["cardIds"].remove("card-1")),
    "card key mismatch": make_invalid(
        lambda b: b["cards"].update({"card-x": {"id": "card-y", "title": "T", "details": "D"}})
    ),
    "duplicate column id": make_invalid(
        lambda b: b["columns"].append({"id": "col-done", "title": "Again", "cardIds": []})
    ),
    "wrong type": make_invalid(lambda b: b["cards"]["card-1"].update({"details": 3})),
    "missing field": make_invalid(lambda b: b["columns"][0].pop("title")),
    "extra field": make_invalid(lambda b: b.update({"owner": "user"})),
    "unknown priority": make_invalid(lambda b: b["cards"]["card-1"].update({"priority": "urgent"})),
    "invalid due date": make_invalid(lambda b: b["cards"]["card-1"].update({"dueDate": "2026-13-40"})),
}


@pytest.mark.parametrize("board", INVALID_BOARDS.values(), ids=INVALID_BOARDS.keys())
def test_invalid_board_rejected(client, board_id, board):
    response = client.put(f"/api/boards/{board_id}", json=board)
    assert response.status_code == 422
    assert client.get(f"/api/boards/{board_id}").json() == DEFAULT
