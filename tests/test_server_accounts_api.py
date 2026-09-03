import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

from app.repository import FinanceRepository
from app.server import FinanceHandler


class ServerAccountsApiTests(unittest.TestCase):
    def test_user_can_update_current_account_balance_and_delete_account_via_api(self):
        with tempfile.NamedTemporaryFile() as db:
            FinanceHandler.repo = FinanceRepository(db.name)
            FinanceHandler.repo.initialize()
            user_id = FinanceHandler.repo.create_user("Maskus", "maskus", password="secret123")
            account_id = FinanceHandler.repo.create_account(user_id, "BCA", "bank", 1_000_000)
            category_id = FinanceHandler.repo.create_category(user_id, "Makan", "expense")
            FinanceHandler.repo.create_transaction(user_id, "expense", 250_000, source_account_id=account_id, category_id=category_id)
            FinanceHandler.user_id = user_id
            FinanceHandler.sessions = {}
            httpd = ThreadingHTTPServer(("127.0.0.1", 0), FinanceHandler)
            thread = threading.Thread(target=httpd.serve_forever, daemon=True)
            thread.start()
            try:
                base_url = f"http://127.0.0.1:{httpd.server_address[1]}"
                cookie = self._login(base_url)

                self._json_request(
                    f"{base_url}/api/accounts/{account_id}/balance",
                    method="PUT",
                    payload={"balance": 2_000_000},
                    cookie=cookie,
                )
                summary = self._json_request(f"{base_url}/api/summary", cookie=cookie)
                account = next(item for item in summary["accounts"] if item["id"] == account_id)
                self.assertEqual(account["balance"], 2_000_000)

                self._json_request(f"{base_url}/api/accounts/{account_id}", method="DELETE", cookie=cookie)
                summary = self._json_request(f"{base_url}/api/summary", cookie=cookie)
                self.assertNotIn(account_id, [item["id"] for item in summary["accounts"]])
            finally:
                httpd.shutdown()
                thread.join(timeout=2)
                httpd.server_close()

    def test_user_can_create_update_and_delete_category_via_api(self):
        with tempfile.NamedTemporaryFile() as db:
            FinanceHandler.repo = FinanceRepository(db.name)
            FinanceHandler.repo.initialize()
            user_id = FinanceHandler.repo.create_user("Maskus", "maskus", password="secret123")
            account_id = FinanceHandler.repo.create_account(user_id, "BCA", "bank", 1_000_000)
            category_id = FinanceHandler.repo.create_category(user_id, "Makan", "expense")
            FinanceHandler.repo.create_transaction(user_id, "expense", 20_000, source_account_id=account_id, category_id=category_id)
            FinanceHandler.user_id = user_id
            FinanceHandler.sessions = {}
            httpd = ThreadingHTTPServer(("127.0.0.1", 0), FinanceHandler)
            thread = threading.Thread(target=httpd.serve_forever, daemon=True)
            thread.start()
            try:
                base_url = f"http://127.0.0.1:{httpd.server_address[1]}"
                cookie = self._login(base_url)

                created = self._json_request(
                    f"{base_url}/api/categories",
                    method="POST",
                    payload={"name": "Transport", "type": "expense", "color": "#f97316", "icon": "car"},
                    cookie=cookie,
                )
                new_category_id = created["id"]
                self._json_request(
                    f"{base_url}/api/categories/{new_category_id}",
                    method="PUT",
                    payload={"name": "Bensin", "type": "expense", "color": "#f59e0b", "icon": "fuel"},
                    cookie=cookie,
                )
                summary = self._json_request(f"{base_url}/api/summary", cookie=cookie)
                category = next(item for item in summary["categories"] if item["id"] == new_category_id)
                self.assertEqual(category["name"], "Bensin")
                self.assertEqual(category["color"], "#f59e0b")
                self.assertEqual(category["icon"], "fuel")

                self._json_request(f"{base_url}/api/categories/{category_id}", method="DELETE", cookie=cookie)
                summary = self._json_request(f"{base_url}/api/summary", cookie=cookie)
                self.assertNotIn(category_id, [item["id"] for item in summary["categories"]])
                transactions = self._json_request(f"{base_url}/api/transactions", cookie=cookie)
                original = next(item for item in transactions if item["amount"] == 20_000)
                self.assertIsNone(original["category_id"])
                self.assertIsNone(original["category_name"])
            finally:
                httpd.shutdown()
                thread.join(timeout=2)
                httpd.server_close()

    def test_user_can_update_and_delete_transaction_via_api_and_balance_changes(self):
        with tempfile.NamedTemporaryFile() as db:
            FinanceHandler.repo = FinanceRepository(db.name)
            FinanceHandler.repo.initialize()
            user_id = FinanceHandler.repo.create_user("Maskus", "maskus", password="secret123")
            account_id = FinanceHandler.repo.create_account(user_id, "BCA", "bank", 1_000_000)
            category_id = FinanceHandler.repo.create_category(user_id, "Makan", "expense")
            tx_id = FinanceHandler.repo.create_transaction(user_id, "expense", 100_000, source_account_id=account_id, category_id=category_id, note="awal")
            FinanceHandler.user_id = user_id
            FinanceHandler.sessions = {}
            httpd = ThreadingHTTPServer(("127.0.0.1", 0), FinanceHandler)
            thread = threading.Thread(target=httpd.serve_forever, daemon=True)
            thread.start()
            try:
                base_url = f"http://127.0.0.1:{httpd.server_address[1]}"
                cookie = self._login(base_url)

                self._json_request(
                    f"{base_url}/api/transactions/{tx_id}",
                    method="PUT",
                    payload={"type": "expense", "amount": 250_000, "source_account_id": account_id, "category_id": category_id, "note": "diubah"},
                    cookie=cookie,
                )
                summary = self._json_request(f"{base_url}/api/summary", cookie=cookie)
                self.assertEqual(summary["accounts"][0]["balance"], 750_000)
                transactions = self._json_request(f"{base_url}/api/transactions", cookie=cookie)
                self.assertEqual(transactions[0]["note"], "diubah")

                self._json_request(f"{base_url}/api/transactions/{tx_id}", method="DELETE", cookie=cookie)
                summary = self._json_request(f"{base_url}/api/summary", cookie=cookie)
                self.assertEqual(summary["accounts"][0]["balance"], 1_000_000)
                self.assertEqual(self._json_request(f"{base_url}/api/transactions", cookie=cookie), [])
            finally:
                httpd.shutdown()
                thread.join(timeout=2)
                httpd.server_close()

    def _login(self, base_url: str) -> str:
        req = urllib.request.Request(
            f"{base_url}/api/login",
            data=json.dumps({"username": "maskus", "password": "secret123"}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=2) as res:
            return res.headers["Set-Cookie"].split(";", 1)[0]

    def _json_request(self, url: str, *, method: str = "GET", payload: dict | None = None, cookie: str | None = None):
        headers = {"Content-Type": "application/json"}
        if cookie:
            headers["Cookie"] = cookie
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=2) as res:
            return json.loads(res.read().decode("utf-8") or "{}")


if __name__ == "__main__":
    unittest.main()
