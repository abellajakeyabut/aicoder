# Security Remediation Plan

Fixes for the two highest-priority findings of the security review (2026-11-09). Each part has steps to check off, tests, and success criteria. Status: awaiting review. No code has been changed yet.

## Decisions for review

1. Demo account: remove it by default and enable it only when `DEMO_PASSWORD` is set in `.env` (recommended), or delete it entirely.
2. Registration: keep it open but rate limited (recommended), or add `ALLOW_REGISTRATION=false` so only existing accounts can sign in.
3. Git history: amend the last commit and force-push `feature/aicoder/1.0` (recommended, since the file is only in the tip commit), or leave history as is and rely on password rotation.
4. Also drop `pm-app-arm64.tar` (77 MB, in the same commit) from git while rewriting. Recommended: yes. It holds no secrets, but it is a build artifact.

## Part 1: Remove the leaked database backup (finding #1)

`app.db.bak` was added in commit `5e39e9e` (2026-11-08), the tip of `feature/aicoder/1.0`, which is pushed to the public repo `github.com/abellajakeyabut/aicoder`. It contains the kanban users `user` and `test` (scrypt hashes), one session token and two boards. No database admin credentials or API keys are in it.

Steps

- [ ] Revoke what leaked, on every running instance (local Docker and the Pi): delete all rows from `sessions` so the leaked token stops working, then sign in as `test` and change its password. If that password is used anywhere else, change it there too.
- [ ] Add `*.bak` and `*.tar` to `.gitignore`.
- [ ] Remove the files from git and keep the local copies: `git rm --cached app.db.bak pm-app-arm64.tar`.
- [ ] Rewrite history (decision 3): `git commit --amend` so `5e39e9e` no longer contains the files, then `git push --force-with-lease origin feature/aicoder/1.0`. Nobody else has to re-clone, because nobody else works on this branch.
- [ ] Move or delete the local `app.db.bak` once it is no longer needed.

Note: after a force-push, GitHub can still serve the old commit by its SHA for a while, and anyone may already have cloned it. So the revocation step is what actually removes the risk. The history rewrite only stops further exposure.

Tests

- `git ls-files | grep -E '\.bak|\.tar'` prints nothing.
- `git log --all -- app.db.bak` prints nothing after the rewrite.
- Signing in as `test` with the old password returns 401.

Success criteria

- [ ] The file is not in any branch on `origin`.
- [ ] The leaked session token and the `test` password no longer work.
- [ ] `.gitignore` stops the same mistake from happening again.

## Part 2: Lock down the demo account, sign-up and the AI chat (finding #2)

Currently `init_db` (`backend/app/db.py`) always creates `user` / `password` and resets its password if it is blank. Registration is open, and nothing limits login, register or chat requests. Anyone who reaches port 8000 can sign in and spend the OpenRouter key.

Steps

- [ ] Make the demo account opt-in (decision 1). `init_db` creates `user` only when the `DEMO_PASSWORD` env var is set, and uses that value as the password. If it is unset, no demo account is created, and an existing `user` account is left untouched.
- [ ] Remove the hardcoded `DEMO_PASSWORD` constant from `db.py`.
- [ ] On the Pi: change the existing `user` account's password in the account dialog, or delete the account. The step above does not change an account that already exists.
- [ ] Add rate limiting with `slowapi`, the popular FastAPI limiter, which keeps counts in memory and keys them by client IP:
  - `POST /api/auth/login`: 5 per minute
  - `POST /api/auth/register`: 3 per hour
  - `POST /api/boards/{id}/chat`: 20 per minute

  Over the limit, the response is `429` with a short `detail` message.
- [ ] Run uvicorn with `--proxy-headers` so client IPs are correct if a reverse proxy is added later.
- [ ] Frontend: `AuthForm` and `ChatSidebar` show the 429 `detail` text ("Too many attempts, try again in a minute"). Errors are already displayed, so this only needs a message mapping in `AuthForm.messageFor`.
- [ ] Optional (decision 2): if `ALLOW_REGISTRATION=false`, `POST /api/auth/register` returns 403 and the sign-up tab is hidden. This requires a small `GET /api/auth/config` endpoint, so skip it unless chosen.
- [ ] Outside the code: set a monthly credit limit on the OpenRouter key in the OpenRouter dashboard. This caps the cost even if every other control fails.
- [ ] Update docs: README (the demo account is now opt-in through `DEMO_PASSWORD`), `docs/deploy.md` and `docs/DATABASE.md`.

Tests

Backend (pytest)
- `conftest.py` sets `DEMO_PASSWORD` for the existing `client` fixture, so the current tests keep passing.
- With `DEMO_PASSWORD` unset, startup creates no `user` account, and logging in as `user` / `password` returns 401.
- With `DEMO_PASSWORD=x`, `user` / `x` signs in.
- An existing `user` account keeps its password when `DEMO_PASSWORD` is unset.
- The 6th login in a minute returns 429. The 4th register in an hour returns 429. The 21st chat request in a minute returns 429 (with the AI mocked).
- A fixture resets the limiter between tests so limits don't leak from one test to the next.

Frontend
- Unit (vitest): `AuthForm` shows the rate-limit message for a 429.
- E2E (playwright): the existing specs still pass. They register their own users and do not depend on the demo account.

Success criteria

- [ ] A fresh deploy without `DEMO_PASSWORD` has no known credentials.
- [ ] Repeated login, register and chat requests from one IP are throttled with 429.
- [ ] The OpenRouter key has a spending cap.
- [ ] All backend, unit and e2e tests pass.

## Out of scope

The other findings from the security review: HTTPS, request size limits, server-side session expiry, non-root container, and security headers. They will get their own plan.
