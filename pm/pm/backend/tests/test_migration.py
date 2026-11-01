import copy
import json
import sqlite3

from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import DEFAULT

PART6_SCHEMA = """
CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL);
CREATE TABLE boards (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
"""


def test_part6_database_is_migrated_keeping_the_board(db_path):
    # A Part 6 board: cards have no priority or due date yet
    old = copy.deepcopy(DEFAULT)
    for card in old["cards"].values():
        del card["priority"], card["dueDate"]
    old["columns"][0]["title"] = "My renamed backlog"
    conn = sqlite3.connect(db_path)
    conn.executescript(PART6_SCHEMA)
    conn.execute("INSERT INTO users (username) VALUES ('user')")
    conn.execute(
        "INSERT INTO boards (user_id, data, updated_at) VALUES (1, ?, '2026-01-01T00:00:00+00:00')", (json.dumps(old),)
    )
    conn.commit()
    conn.close()

    with TestClient(app) as client:
        assert client.post("/api/auth/login", json={"username": "user", "password": "password"}).status_code == 200
        (summary,) = client.get("/api/boards").json()
        assert summary["name"] == "My board"
        board = client.get(f"/api/boards/{summary['id']}").json()
    assert board["columns"][0]["title"] == "My renamed backlog"
    assert board["cards"]["card-1"]["priority"] is None
    assert len(board["cards"]) == 8

    conn = sqlite3.connect(db_path)
    assert conn.execute("PRAGMA user_version").fetchone() == (1,)
    assert conn.execute("SELECT name FROM sqlite_master WHERE name = 'boards_v0'").fetchone() is None
    conn.close()

    # A second startup leaves the migrated data alone
    with TestClient(app) as client:
        client.post("/api/auth/login", json={"username": "user", "password": "password"})
        assert len(client.get("/api/boards").json()) == 1
