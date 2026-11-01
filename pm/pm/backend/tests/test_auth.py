import sqlite3

import pytest

from app import db
from tests.conftest import register


def test_demo_user_can_sign_in(anon):
    response = anon.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert response.status_code == 200
    assert response.json()["username"] == "user"
    assert "httponly" in response.headers["set-cookie"].lower()
    assert anon.get("/api/auth/me").json()["username"] == "user"


def test_wrong_password_is_rejected(anon):
    response = anon.post("/api/auth/login", json={"username": "user", "password": "nope"})
    assert response.status_code == 401
    assert anon.get("/api/auth/me").status_code == 401


def test_unknown_user_is_rejected(anon):
    assert anon.post("/api/auth/login", json={"username": "ghost", "password": "password"}).status_code == 401


def test_register_signs_in_with_a_seeded_board(anon):
    response = anon.post("/api/auth/register", json={"username": "alice", "password": "wonderland"})
    assert response.status_code == 201
    assert response.json()["username"] == "alice"
    assert anon.get("/api/auth/me").json()["username"] == "alice"
    boards = anon.get("/api/boards").json()
    assert [b["name"] for b in boards] == ["My first board"]
    assert boards[0]["cardCount"] == 8


def test_register_then_login(anon):
    anon.post("/api/auth/register", json={"username": "alice", "password": "wonderland"})
    anon.post("/api/auth/logout")
    assert anon.post("/api/auth/login", json={"username": "alice", "password": "wonderland"}).status_code == 200


def test_duplicate_username_is_a_conflict(anon):
    response = anon.post("/api/auth/register", json={"username": "user", "password": "password2"})
    assert response.status_code == 409


@pytest.mark.parametrize(
    "credentials",
    [
        {"username": "ab", "password": "long-enough"},
        {"username": "has space", "password": "long-enough"},
        {"username": "x" * 33, "password": "long-enough"},
        {"username": "alice", "password": "short"},
        {"username": "alice"},
    ],
)
def test_invalid_registration(anon, credentials):
    assert anon.post("/api/auth/register", json=credentials).status_code == 422


def test_passwords_are_hashed(anon, db_path):
    anon.post("/api/auth/register", json={"username": "alice", "password": "wonderland"})
    conn = sqlite3.connect(db_path)
    (stored,) = conn.execute("SELECT password_hash FROM users WHERE username = 'alice'").fetchone()
    conn.close()
    assert "wonderland" not in stored
    assert db.check_password("wonderland", stored)
    assert not db.check_password("wonderlane", stored)


def test_logout_ends_the_session(client):
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/boards").status_code == 401


def test_old_session_token_is_invalid_after_logout(client):
    token = client.cookies["session"]
    client.post("/api/auth/logout")
    client.cookies.set("session", token)
    assert client.get("/api/auth/me").status_code == 401


def test_change_password(client):
    response = client.put("/api/auth/password", json={"current": "password", "new": "better-password"})
    assert response.status_code == 204
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"username": "user", "password": "password"}).status_code == 401
    assert client.post("/api/auth/login", json={"username": "user", "password": "better-password"}).status_code == 200


def test_change_password_needs_the_current_one(client):
    response = client.put("/api/auth/password", json={"current": "wrong", "new": "better-password"})
    assert response.status_code == 403


def test_change_password_validates_the_new_one(client):
    response = client.put("/api/auth/password", json={"current": "password", "new": "short"})
    assert response.status_code == 422


def test_delete_account_removes_everything(anon, db_path):
    alice = register("alice")
    assert alice.delete("/api/auth/me").status_code == 204
    assert alice.get("/api/auth/me").status_code == 401
    conn = sqlite3.connect(db_path)
    assert conn.execute("SELECT COUNT(*) FROM users WHERE username = 'alice'").fetchone() == (0,)
    assert conn.execute("SELECT COUNT(*) FROM sessions").fetchone() == (0,)
    # Only the demo user's board is left
    assert conn.execute("SELECT COUNT(*) FROM boards").fetchone() == (1,)
    conn.close()
    assert anon.post("/api/auth/login", json={"username": "alice", "password": "secret-pass"}).status_code == 401


@pytest.mark.parametrize(
    "method, path",
    [
        ("get", "/api/auth/me"),
        ("put", "/api/auth/password"),
        ("delete", "/api/auth/me"),
        ("get", "/api/boards"),
        ("post", "/api/boards"),
        ("get", "/api/boards/1"),
        ("put", "/api/boards/1"),
        ("patch", "/api/boards/1"),
        ("delete", "/api/boards/1"),
        ("post", "/api/boards/1/chat"),
    ],
)
def test_routes_need_a_session(anon, method, path):
    assert anon.request(method, path, json={}).status_code == 401


def test_unknown_session_cookie_is_rejected(anon):
    anon.cookies.set("session", "made-up")
    assert anon.get("/api/boards").status_code == 401
