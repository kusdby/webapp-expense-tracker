from __future__ import annotations

import json
import os
import secrets
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from app.dashboard import build_dashboard_summary
from app.repository import FinanceRepository

ROOT = Path(__file__).resolve().parent.parent
STATIC_DIR = ROOT / "web"
DB_PATH = os.environ.get("FINANCE_DB", str(ROOT / "data" / "finance.db"))
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")


class FinanceHandler(BaseHTTPRequestHandler):
    repo = FinanceRepository(DB_PATH)
    user_id: str | None = None
    sessions: dict[str, str] = {}

    def do_GET(self) -> None:
        try:
            self._do_GET()
        except PermissionError:
            self._json({"error": "Login required"}, HTTPStatus.UNAUTHORIZED)

    def _do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/me":
            user_id = self._session_user_id()
            if not user_id:
                self._json({"authenticated": False}, HTTPStatus.UNAUTHORIZED)
                return
            user = self.repo.get_user(user_id)
            self._json({"authenticated": True, "user": {"id": user["id"], "name": user["name"], "username": user["username"]}})
            return
        if parsed.path == "/api/summary":
            self._json(build_dashboard_summary(self.repo, self._require_user_id()))
            return
        if parsed.path == "/api/transactions":
            params = parse_qs(parsed.query)
            self._json(self.repo.list_transactions(
                self._require_user_id(),
                category_id=_first(params, "category_id"),
                account_id=_first(params, "account_id"),
                query=_first(params, "query"),
            ))
            return
        self._static(parsed.path)

    def do_POST(self) -> None:
        try:
            self._do_POST()
        except PermissionError:
            self._json({"error": "Login required"}, HTTPStatus.UNAUTHORIZED)

    def _do_POST(self) -> None:
        if self.path == "/api/login":
            data = self._read_json()
            user_id = self.repo.verify_login(data.get("username", ""), data.get("password", ""))
            if not user_id:
                self._json({"error": "Invalid username or password"}, HTTPStatus.UNAUTHORIZED)
                return
            session_id = secrets.token_urlsafe(32)
            self.__class__.sessions[session_id] = user_id
            self._json({"ok": True}, headers={"Set-Cookie": f"finance_session={session_id}; HttpOnly; SameSite=Lax; Path=/"})
            return
        if self.path == "/api/accounts":
            data = self._read_json()
            account_id = self.repo.create_account(
                self._require_user_id(),
                data["name"].strip(),
                data.get("type", "bank"),
                _rupiah_to_int(data.get("initial_balance", 0)),
                color=data.get("color", "#38bdf8"),
                icon=data.get("icon", "wallet"),
            )
            self._json({"id": account_id}, HTTPStatus.CREATED)
            return
        if self.path == "/api/categories":
            data = self._read_json()
            category_id = self.repo.create_category(
                self._require_user_id(),
                data["name"].strip(),
                data.get("type", "expense"),
                color=data.get("color", "#a78bfa"),
                icon=data.get("icon", "tag"),
            )
            self._json({"id": category_id}, HTTPStatus.CREATED)
            return
        if self.path == "/api/transactions":
            data = self._read_json()
            tx_id = self.repo.create_transaction(
                self._require_user_id(),
                data["type"],
                _rupiah_to_int(data["amount"]),
                source_account_id=data.get("source_account_id") or None,
                destination_account_id=data.get("destination_account_id") or None,
                category_id=data.get("category_id") or None,
                note=data.get("note", ""),
            )
            self._json({"id": tx_id}, HTTPStatus.CREATED)
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def _require_user_id(self) -> str:
        user_id = self._session_user_id()
        if not user_id:
            raise PermissionError("Login required")
        return user_id

    def _session_user_id(self) -> str | None:
        cookie = self.headers.get("Cookie", "")
        for part in cookie.split(";"):
            key, _, value = part.strip().partition("=")
            if key == "finance_session":
                return self.__class__.sessions.get(value)
        return None

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length).decode("utf-8")
        return json.loads(body or "{}")

    def _json(self, payload, status: HTTPStatus = HTTPStatus.OK, headers: dict[str, str] | None = None) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        if headers:
            for key, value in headers.items():
                self.send_header(key, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _static(self, path: str) -> None:
        requested = "index.html" if path in ("/", "") else path.lstrip("/")
        candidate = (STATIC_DIR / requested).resolve()
        static_root = STATIC_DIR.resolve()
        if not candidate.is_file() or not candidate.is_relative_to(static_root):
            candidate = static_root / "index.html"
        content = candidate.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", _content_type(candidate))
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


def run(host: str = "0.0.0.0", port: int = 8089) -> None:
    if not ADMIN_PASSWORD:
        raise RuntimeError("ADMIN_PASSWORD environment variable is required")
    FinanceHandler.repo.initialize()
    FinanceHandler.user_id = FinanceHandler.repo.ensure_demo_user(ADMIN_PASSWORD)
    server = ThreadingHTTPServer((host, port), FinanceHandler)
    print(f"Expense tracker running at http://{host}:{port}")
    server.serve_forever()


def _first(params: dict[str, list[str]], key: str) -> str | None:
    values = params.get(key) or []
    return values[0] if values and values[0] else None


def _rupiah_to_int(value) -> int:
    if isinstance(value, int):
        return value
    return int(str(value).replace(".", "").replace(",", "").strip() or 0)


def _content_type(path: Path) -> str:
    if path.suffix == ".css":
        return "text/css; charset=utf-8"
    if path.suffix == ".js":
        return "application/javascript; charset=utf-8"
    return "text/html; charset=utf-8"


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8089"))
    run(port=port)
