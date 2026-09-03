import tempfile
import unittest

from app.dashboard import build_dashboard_summary
from app.repository import FinanceRepository


class DashboardSummaryTests(unittest.TestCase):
    def test_summary_returns_total_balance_accounts_categories_and_transactions(self):
        with tempfile.NamedTemporaryFile() as db:
            repo = FinanceRepository(db.name)
            repo.initialize()
            user_id = repo.create_user("Test User", "test-user")
            bri = repo.create_account(user_id, "BRI", "bank", 1_000_000)
            jenius = repo.create_account(user_id, "Jenius", "bank", 500_000)
            food = repo.create_category(user_id, "Makan", "expense")
            salary = repo.create_category(user_id, "Gaji", "income")
            repo.create_transaction(user_id, "income", 2_000_000, destination_account_id=jenius, category_id=salary, note="gajian")
            repo.create_transaction(user_id, "expense", 125_000, source_account_id=bri, category_id=food, note="makan")

            summary = build_dashboard_summary(repo, user_id)

            self.assertEqual(summary["total_balance"], 3_375_000)
            self.assertEqual(summary["reset_day"], 25)
            self.assertEqual(len(summary["accounts"]), 2)
            self.assertEqual(len(summary["categories"]), 2)
            self.assertEqual(len(summary["recent_transactions"]), 2)
            self.assertEqual(summary["accounts_by_id"][jenius]["balance"], 2_500_000)


if __name__ == "__main__":
    unittest.main()
