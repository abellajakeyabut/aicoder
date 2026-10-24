import copy
import json
import sqlite3

import pytest
from fastapi.testclient import TestClient

from app.db import DEFAULT_BOARD
from app.main import app

DEFAULT = json.loads(DEFAULT_BOARD.read_text())


def test_startup_creates_db_and_tables(db_path):
    assert not db_path.exists()
    with TestClient(app):
        pass
    conn = sqlite3.connect(db_path)
    tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    conn.close()
    assert {"users", "boards"} <= tables


def test_first_get_seeds_default_board(client, db_path):
    response = client.get("/api/board")
    assert response.status_code == 200
    board = response.json()
    assert board == DEFAULT
    assert len(board["columns"]) == 5
    assert len(board["cards"]) == 8
    conn = sqlite3.connect(db_path)
    assert conn.execute("SELECT username FROM users").fetchall() == [("user",)]
    assert conn.execute("SELECT COUNT(*) FROM boards").fetchone() == (1,)
    conn.close()


def test_put_then_get_returns_saved_board(client):
    board = copy.deepcopy(DEFAULT)
    board["columns"][0]["title"] = "Ideas"
    board["cards"]["card-9"] = {"id": "card-9", "title": "New", "details": "Notes"}
    board["columns"][1]["cardIds"].append("card-9")
    board["columns"][4]["cardIds"].remove("card-8")
    board["columns"][0]["cardIds"].insert(0, "card-8")

    response = client.put("/api/board", json=board)
    assert response.status_code == 200
    assert response.json() == board
    assert client.get("/api/board").json() == board


def test_board_persists_across_restarts(db_path):
    board = copy.deepcopy(DEFAULT)
    board["columns"][0]["title"] = "Persisted"
    with TestClient(app) as client:
        client.put("/api/board", json=board)
    with TestClient(app) as client:
        assert client.get("/api/board").json() == board


def test_put_updates_timestamp(client, db_path):
    client.get("/api/board")
    conn = sqlite3.connect(db_path)
    (before,) = conn.execute("SELECT updated_at FROM boards").fetchone()
    client.put("/api/board", json=DEFAULT)
    (after,) = conn.execute("SELECT updated_at FROM boards").fetchone()
    conn.close()
    assert after > before


def make_invalid(change):
    board = copy.deepcopy(DEFAULT)
    change(board)
    return board


INVALID_BOARDS = {
    "unknown card id": make_invalid(lambda b: b["columns"][0]["cardIds"].append("card-404")),
    "card in two columns": make_invalid(lambda b: b["columns"][1]["cardIds"].append("card-1")),
    "card in no column": make_invalid(lambda b: b["columns"][0]["cardIds"].remove("card-1")),
    "card key mismatch": make_invalid(lambda b: b["cards"].update({"card-x": {"id": "card-y", "title": "T", "details": "D"}})),
    "duplicate column id": make_invalid(lambda b: b["columns"].append({"id": "col-done", "title": "Again", "cardIds": []})),
    "wrong type": make_invalid(lambda b: b["cards"]["card-1"].update({"details": 3})),
    "missing field": make_invalid(lambda b: b["columns"][0].pop("title")),
    "extra field": make_invalid(lambda b: b.update({"owner": "user"})),
}


@pytest.mark.parametrize("board", INVALID_BOARDS.values(), ids=INVALID_BOARDS.keys())
def test_invalid_board_rejected(client, board):
    client.get("/api/board")
    response = client.put("/api/board", json=board)
    assert response.status_code == 422
    assert client.get("/api/board").json() == DEFAULT
