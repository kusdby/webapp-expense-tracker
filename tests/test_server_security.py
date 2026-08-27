import os
import tempfile
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer

from app.repository import FinanceRepository
from app.server import FinanceHandler


class ServerSecurityTests(unittest.TestCase):
    def test_static_handler_does_not_serve_files_outside_web_directory(self):
        with tempfile.NamedTemporaryFile() as db:
            FinanceHandler.repo = FinanceRepository(db.name)
            FinanceHandler.repo.initialize()
            FinanceHandler.user_id = FinanceHandler.repo.ensure_demo_user("testpass")
            FinanceHandler.sessions = {}
            httpd = ThreadingHTTPServer(("127.0.0.1", 0), FinanceHandler)
            thread = threading.Thread(target=httpd.serve_forever, daemon=True)
            thread.start()
            try:
                port = httpd.server_address[1]
                body = urllib.request.urlopen(f"http://127.0.0.1:{port}/../app/server.py", timeout=2).read().decode("utf-8")
                self.assertNotIn("from __future__ import annotations", body)
                self.assertIn("<!doctype html>", body)
            finally:
                httpd.shutdown()
                thread.join(timeout=2)
                httpd.server_close()


if __name__ == "__main__":
    unittest.main()
