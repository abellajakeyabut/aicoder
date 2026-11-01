import json
import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Stand-in for the frontend export so tests don't need a frontend build
static_dir = Path(tempfile.mkdtemp())
(static_dir / "index.html").write_text("<html><body>Kanban Studio</body></html>")
os.environ["STATIC_DIR"] = str(static_dir)

from app.db import DEFAULT_BOARD  # noqa: E402
from app.main import app  # noqa: E402  imported after STATIC_DIR is set above

DEFAULT = json.loads(DEFAULT_BOARD.read_text())


@pytest.fixture
def db_path(tmp_path, monkeypatch):
    path = tmp_path / "app.db"
    monkeypatch.setenv("DB_PATH", str(path))
    return path


@pytest.fixture
def anon(db_path):
    """A client that is not signed in."""
    with TestClient(app) as client:
        yield client


@pytest.fixture
def client(anon):
    """A client signed in as the demo user."""
    assert anon.post("/api/auth/login", json={"username": "user", "password": "password"}).status_code == 200
    return anon


@pytest.fixture
def board_id(client) -> int:
    """The demo user's seeded board."""
    return client.get("/api/boards").json()[0]["id"]


def register(username: str, password: str = "secret-pass") -> TestClient:
    """A new client signed in as a newly registered user. Needs the db to exist (the anon or client fixture)."""
    client = TestClient(app)
    response = client.post("/api/auth/register", json={"username": username, "password": password})
    assert response.status_code == 201
    return client
