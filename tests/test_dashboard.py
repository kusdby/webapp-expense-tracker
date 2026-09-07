import datetime as dt
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
            self.assertEqual(summary["expense_category_breakdown"], [{"name": "Makan", "amount": 125_000, "percentage": 100.0, "color": "#a78bfa"}])
            self.assertEqual(summary["income_category_breakdown"], [{"name": "Gaji", "amount": 2_000_000, "percentage": 100.0, "color": "#a78bfa"}])

    def test_dashboard_periods_keep_history_separate(self):
        with tempfile.NamedTemporaryFile() as db:
            repo = FinanceRepository(db.name)
            repo.initialize()
            user_id = repo.create_user("Test User", "test-user")
            account = repo.create_account(user_id, "BRI", "bank", 1_000_000)
            food = repo.create_category(user_id, "Makan", "expense")
            salary = repo.create_category(user_id, "Gaji", "income")
            repo.create_transaction(user_id, "expense", 100_000, source_account_id=account, category_id=food, note="periode lama 1", occurred_at=dt.datetime(2026, 8, 25, 9, 0))
            repo.create_transaction(user_id, "expense", 200_000, source_account_id=account, category_id=food, note="periode lama 2", occurred_at=dt.datetime(2026, 9, 24, 23, 59))
            repo.create_transaction(user_id, "expense", 300_000, source_account_id=account, category_id=food, note="periode baru expense", occurred_at=dt.datetime(2026, 9, 25, 0, 0))
            repo.create_transaction(user_id, "income", 400_000, destination_account_id=account, category_id=salary, note="periode baru income", occurred_at=dt.datetime(2026, 10, 24, 12, 0))
            repo.create_transaction(user_id, "income", 500_000, destination_account_id=account, category_id=salary, note="periode depan", occurred_at=dt.datetime(2026, 10, 25, 0, 0))

            old_period = build_dashboard_summary(repo, user_id, today=dt.date(2026, 9, 24))
            new_period = build_dashboard_summary(repo, user_id, today=dt.date(2026, 9, 25))

            self.assertEqual(old_period["period_start"], "2026-08-25")
            self.assertEqual(old_period["period_end"], "2026-09-24")
            self.assertEqual(old_period["period_expense"], 300_000)
            self.assertEqual(old_period["period_income"], 0)
            self.assertEqual([tx["note"] for tx in old_period["recent_transactions"]], ["periode lama 2", "periode lama 1"])
            self.assertEqual(new_period["period_start"], "2026-09-25")
            self.assertEqual(new_period["period_end"], "2026-10-24")
            self.assertEqual(new_period["period_expense"], 300_000)
            self.assertEqual(new_period["period_income"], 400_000)
            self.assertEqual([tx["note"] for tx in new_period["recent_transactions"]], ["periode baru income", "periode baru expense"])

    def test_dashboard_can_load_a_specific_saved_period(self):
        with tempfile.NamedTemporaryFile() as db:
            repo = FinanceRepository(db.name)
            repo.initialize()
            user_id = repo.create_user("Test User", "test-user")
            account = repo.create_account(user_id, "BRI", "bank", 1_000_000)
            food = repo.create_category(user_id, "Makan", "expense")
            salary = repo.create_category(user_id, "Gaji", "income")
            repo.create_transaction(user_id, "expense", 150_000, source_account_id=account, category_id=food, note="agustus", occurred_at=dt.datetime(2026, 8, 25, 8, 0))
            repo.create_transaction(user_id, "income", 2_000_000, destination_account_id=account, category_id=salary, note="september", occurred_at=dt.datetime(2026, 9, 25, 8, 0))

            summary = build_dashboard_summary(repo, user_id, today=dt.date(2026, 12, 1), period_start=dt.date(2026, 8, 25))

            self.assertEqual(summary["period_start"], "2026-08-25")
            self.assertEqual(summary["period_end"], "2026-09-24")
            self.assertEqual(summary["period_expense"], 150_000)
            self.assertEqual(summary["period_income"], 0)
            self.assertEqual([tx["note"] for tx in summary["recent_transactions"]], ["agustus"])


if __name__ == "__main__":
    unittest.main()
