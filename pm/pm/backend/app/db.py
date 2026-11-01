import hashlib
import hmac
import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

from app.models import Board, BoardSummary, User

DEFAULT_BOARD = Path(__file__).parent / "default_board.json"
DEMO_USER, DEMO_PASSWORD = "user", "password"
SCHEMA_VERSION = 1

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS boards_user ON boards(user_id);
"""

# Part 6 databases: users(id, username) and one board per user (boards.user_id UNIQUE, no name)
MIGRATE_V0 = """
ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE boards RENAME TO boards_v0;
"""
COPY_V0 = """
INSERT INTO boards (user_id, name, data, created_at, updated_at)
  SELECT user_id, 'My board', data, updated_at, updated_at FROM boards_v0;
DROP TABLE boards_v0;
"""


def now() -> str:
    return datetime.now(UTC).isoformat()


@contextmanager
def connect():
    conn = sqlite3.connect(os.environ.get("DB_PATH", "/data/app.db"))
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"{salt.hex()}${digest.hex()}"


def check_password(password: str, stored: str) -> bool:
    if "$" not in stored:
        return False
    salt, digest = stored.split("$")
    candidate = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=2**14, r=8, p=1)
    return hmac.compare_digest(candidate.hex(), digest)


def default_board() -> Board:
    return Board.model_validate_json(DEFAULT_BOARD.read_text())


def empty_board() -> Board:
    board = default_board()
    return Board(columns=[c.model_copy(update={"cardIds": []}) for c in board.columns], cards={})


def init_db():
    with connect() as conn:
        (version,) = conn.execute("PRAGMA user_version").fetchone()
        old = conn.execute("SELECT 1 FROM sqlite_master WHERE name = 'boards'").fetchone()
        if version == 0 and old:
            conn.executescript(MIGRATE_V0)
            conn.executescript(SCHEMA)
            conn.executescript(COPY_V0)
        conn.executescript(SCHEMA)
        conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
        # The demo account; also gives a migrated Part 6 user (no password yet) the demo password
        demo = conn.execute("SELECT password_hash FROM users WHERE username = ?", (DEMO_USER,)).fetchone()
        if demo is None:
            create_user_in(conn, DEMO_USER, DEMO_PASSWORD)
        elif demo[0] == "":
            conn.execute(
                "UPDATE users SET password_hash = ? WHERE username = ?", (hash_password(DEMO_PASSWORD), DEMO_USER)
            )


# Users and sessions


def create_user_in(conn: sqlite3.Connection, username: str, password: str) -> User:
    cursor = conn.execute(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, hash_password(password))
    )
    user = User(id=cursor.lastrowid, username=username)
    insert_board(conn, user.id, "My first board", default_board())
    return user


def create_user(username: str, password: str) -> User | None:
    """Returns None if the username is taken."""
    with connect() as conn:
        try:
            return create_user_in(conn, username, password)
        except sqlite3.IntegrityError:
            return None


def authenticate(username: str, password: str) -> User | None:
    with connect() as conn:
        row = conn.execute("SELECT id, password_hash FROM users WHERE username = ?", (username,)).fetchone()
    if row and check_password(password, row[1]):
        return User(id=row[0], username=username)
    return None


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with connect() as conn:
        conn.execute("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)", (token, user_id, now()))
    return token


def session_user(token: str) -> User | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT users.id, users.username FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ?",
            (token,),
        ).fetchone()
    return User(id=row[0], username=row[1]) if row else None


def delete_session(token: str):
    with connect() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


def change_password(user: User, current: str, new: str) -> bool:
    if not authenticate(user.username, current):
        return False
    with connect() as conn:
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(new), user.id))
    return True


def delete_user(user_id: int):
    with connect() as conn:
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))


# Boards


def insert_board(conn: sqlite3.Connection, user_id: int, name: str, board: Board) -> int:
    timestamp = now()
    cursor = conn.execute(
        "INSERT INTO boards (user_id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, name, board.model_dump_json(), timestamp, timestamp),
    )
    return cursor.lastrowid


def summary(row) -> BoardSummary:
    board_id, name, data, updated_at = row
    return BoardSummary(
        id=board_id, name=name, cardCount=len(Board.model_validate_json(data).cards), updatedAt=updated_at
    )


def list_boards(user_id: int) -> list[BoardSummary]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, name, data, updated_at FROM boards WHERE user_id = ? ORDER BY created_at, id", (user_id,)
        ).fetchall()
    return [summary(row) for row in rows]


def create_board(user_id: int, name: str) -> BoardSummary:
    with connect() as conn:
        board_id = insert_board(conn, user_id, name, empty_board())
        row = conn.execute("SELECT id, name, data, updated_at FROM boards WHERE id = ?", (board_id,)).fetchone()
    return summary(row)


def get_board(user_id: int, board_id: int) -> Board | None:
    with connect() as conn:
        row = conn.execute("SELECT data FROM boards WHERE id = ? AND user_id = ?", (board_id, user_id)).fetchone()
    return Board.model_validate_json(row[0]) if row else None


def save_board(user_id: int, board_id: int, board: Board) -> bool:
    with connect() as conn:
        cursor = conn.execute(
            "UPDATE boards SET data = ?, updated_at = ? WHERE id = ? AND user_id = ?",
            (board.model_dump_json(), now(), board_id, user_id),
        )
    return cursor.rowcount == 1


def rename_board(user_id: int, board_id: int, name: str) -> BoardSummary | None:
    with connect() as conn:
        conn.execute(
            "UPDATE boards SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?", (name, now(), board_id, user_id)
        )
        row = conn.execute(
            "SELECT id, name, data, updated_at FROM boards WHERE id = ? AND user_id = ?", (board_id, user_id)
        ).fetchone()
    return summary(row) if row else None


def delete_board(user_id: int, board_id: int) -> bool:
    with connect() as conn:
        cursor = conn.execute("DELETE FROM boards WHERE id = ? AND user_id = ?", (board_id, user_id))
    return cursor.rowcount == 1
