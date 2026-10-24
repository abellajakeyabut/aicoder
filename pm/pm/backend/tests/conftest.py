import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Stand-in for the frontend export so tests don't need a frontend build
static_dir = Path(tempfile.mkdtemp())
(static_dir / "index.html").write_text("<html><body>Kanban Studio</body></html>")
os.environ["STATIC_DIR"] = str(static_dir)


@pytest.fixture
def db_path(tmp_path, monkeypatch):
    path = tmp_path / "app.db"
    monkeypatch.setenv("DB_PATH", str(path))
    return path


@pytest.fixture
def client(db_path):
    from app.main import app  # imported after STATIC_DIR is set above

    with TestClient(app) as client:
        yield client
