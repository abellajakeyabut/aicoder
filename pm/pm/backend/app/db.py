import os
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

from app.models import Board

DEFAULT_BOARD = Path(__file__).parent / "default_board.json"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
"""


@contextmanager
def connect():
    conn = sqlite3.connect(os.environ.get("DB_PATH", "/data/app.db"))
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def init_db():
    with connect() as conn:
        conn.executescript(SCHEMA)


def get_board(username: str) -> Board:
    with connect() as conn:
        row = conn.execute(
            "SELECT boards.data FROM boards JOIN users ON users.id = boards.user_id WHERE users.username = ?",
            (username,),
        ).fetchone()
    if row:
        return Board.model_validate_json(row[0])
    board = Board.model_validate_json(DEFAULT_BOARD.read_text())
    save_board(username, board)
    return board


def save_board(username: str, board: Board):
    with connect() as conn:
        conn.execute("INSERT OR IGNORE INTO users (username) VALUES (?)", (username,))
        (user_id,) = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        conn.execute(
            """INSERT INTO boards (user_id, data, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at""",
            (user_id, board.model_dump_json(), datetime.now(UTC).isoformat()),
        )
