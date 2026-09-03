import tempfile
import unittest

from app.repository import FinanceRepository


class AuthRepositoryTests(unittest.TestCase):
    def test_user_password_is_hashed_and_login_verifies_credentials(self):
        with tempfile.NamedTemporaryFile() as db:
            repo = FinanceRepository(db.name)
            repo.initialize()

            user_id = repo.create_user("Test User", "test-user", password="secret123")

            self.assertEqual(repo.verify_login("test-user", "secret123"), user_id)
            self.assertIsNone(repo.verify_login("test-user", "wrong"))
            stored = repo.get_user(user_id)
            self.assertNotEqual(stored["password_hash"], "secret123")
            self.assertIn("pbkdf2_sha256$", stored["password_hash"])


if __name__ == "__main__":
    unittest.main()
