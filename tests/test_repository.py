import tempfile
import unittest

from app.repository import FinanceRepository


class FinanceRepositoryTests(unittest.TestCase):
    def test_user_can_create_custom_accounts_categories_and_transactions(self):
        with tempfile.NamedTemporaryFile() as db:
            repo = FinanceRepository(db.name)
            repo.initialize()

            user_id = repo.create_user("Maskus", "maskus")
            bri_id = repo.create_account(user_id, "BRI", "bank", 1_000_000)
            jenius_id = repo.create_account(user_id, "Jenius", "bank", 500_000)
            food_id = repo.create_category(user_id, "Makan", "expense")
            salary_id = repo.create_category(user_id, "Gaji", "income")

            repo.create_transaction(user_id, "income", 2_000_000, destination_account_id=jenius_id, category_id=salary_id, note="gajian")
            repo.create_transaction(user_id, "expense", 125_000, source_account_id=bri_id, category_id=food_id, note="makan")

            balances = repo.get_balances(user_id)
            self.assertEqual(balances[jenius_id], 2_500_000)
            self.assertEqual(balances[bri_id], 875_000)

            filtered = repo.list_transactions(user_id, category_id=food_id, account_id=bri_id, query="mak")
            self.assertEqual(len(filtered), 1)
            self.assertEqual(filtered[0]["note"], "makan")

    def test_users_cannot_see_each_others_accounts_or_transactions(self):
        with tempfile.NamedTemporaryFile() as db:
            repo = FinanceRepository(db.name)
            repo.initialize()

            user_a = repo.create_user("A", "a")
            user_b = repo.create_user("B", "b")
            a_account = repo.create_account(user_a, "A BCA", "bank", 100_000)
            b_account = repo.create_account(user_b, "B BRI", "bank", 200_000)
            a_cat = repo.create_category(user_a, "A Food", "expense")
            b_cat = repo.create_category(user_b, "B Food", "expense")
            repo.create_transaction(user_a, "expense", 10_000, source_account_id=a_account, category_id=a_cat)
            repo.create_transaction(user_b, "expense", 20_000, source_account_id=b_account, category_id=b_cat)

            self.assertEqual(set(repo.get_balances(user_a)), {a_account})
            self.assertEqual(set(repo.get_balances(user_b)), {b_account})
            self.assertEqual(len(repo.list_transactions(user_a)), 1)
            self.assertEqual(len(repo.list_transactions(user_b)), 1)

    def test_user_can_set_current_account_balance(self):
        with tempfile.NamedTemporaryFile() as db:
            repo = FinanceRepository(db.name)
            repo.initialize()

            user_id = repo.create_user("Maskus", "maskus")
            account_id = repo.create_account(user_id, "BCA", "bank", 1_000_000)
            food_id = repo.create_category(user_id, "Makan", "expense")
            repo.create_transaction(user_id, "expense", 250_000, source_account_id=account_id, category_id=food_id)

            repo.set_account_balance(user_id, account_id, 2_000_000)

            self.assertEqual(repo.get_balances(user_id)[account_id], 2_000_000)

    def test_user_can_delete_own_account_without_deleting_other_users_account(self):
        with tempfile.NamedTemporaryFile() as db:
            repo = FinanceRepository(db.name)
            repo.initialize()

            user_a = repo.create_user("A", "a")
            user_b = repo.create_user("B", "b")
            account_a = repo.create_account(user_a, "A BCA", "bank", 100_000)
            account_b = repo.create_account(user_b, "B BRI", "bank", 200_000)

            deleted = repo.delete_account(user_a, account_a)
            not_deleted = repo.delete_account(user_a, account_b)

            self.assertTrue(deleted)
            self.assertFalse(not_deleted)
            self.assertEqual(repo.list_accounts(user_a), [])
            self.assertEqual([account["id"] for account in repo.list_accounts(user_b)], [account_b])

    def test_user_can_update_and_delete_category_without_affecting_other_users(self):
        with tempfile.NamedTemporaryFile() as db:
            repo = FinanceRepository(db.name)
            repo.initialize()

            user_a = repo.create_user("A", "a")
            user_b = repo.create_user("B", "b")
            category_a = repo.create_category(user_a, "Makan", "expense", color="#fb7185", icon="food")
            category_b = repo.create_category(user_b, "Transport", "expense")
            account_a = repo.create_account(user_a, "A BCA", "bank", 100_000)
            tx_id = repo.create_transaction(user_a, "expense", 10_000, source_account_id=account_a, category_id=category_a)

            updated = repo.update_category(user_a, category_a, name="Jajan", category_type="expense", color="#f97316", icon="snack")
            not_updated = repo.update_category(user_a, category_b, name="Hack", category_type="expense")
            deleted = repo.delete_category(user_a, category_a)
            not_deleted = repo.delete_category(user_a, category_b)

            self.assertTrue(updated)
            self.assertFalse(not_updated)
            self.assertTrue(deleted)
            self.assertFalse(not_deleted)
            self.assertEqual(repo.list_categories(user_a), [])
            self.assertEqual([category["id"] for category in repo.list_categories(user_b)], [category_b])
            transaction = repo.list_transactions(user_a)[0]
            self.assertEqual(transaction["id"], tx_id)
            self.assertIsNone(transaction["category_id"])
            self.assertIsNone(transaction["category_name"])


if __name__ == "__main__":
    unittest.main()
