import datetime as dt
import unittest

from app.finance import (
    Account,
    Transaction,
    calculate_account_balances,
    calculate_salary_period,
    filter_transactions,
)


class FinanceCoreTests(unittest.TestCase):
    def test_income_expense_and_transfer_update_only_related_account_balances(self):
        accounts = [
            Account(id="bri", name="BRI", type="bank", initial_balance=1_000_000),
            Account(id="jenius", name="Jenius", type="bank", initial_balance=500_000),
            Account(id="gopay", name="GoPay", type="e-wallet", initial_balance=100_000),
        ]
        transactions = [
            Transaction(id="t1", type="income", amount=2_000_000, occurred_at=dt.datetime(2026, 8, 25, 9), destination_account_id="jenius", category="Gaji"),
            Transaction(id="t2", type="expense", amount=125_000, occurred_at=dt.datetime(2026, 8, 25, 12), source_account_id="bri", category="Makan"),
            Transaction(id="t3", type="transfer", amount=50_000, occurred_at=dt.datetime(2026, 8, 26, 8), source_account_id="bri", destination_account_id="gopay", category="Top Up"),
        ]

        balances = calculate_account_balances(accounts, transactions)

        self.assertEqual(balances["jenius"], 2_500_000)
        self.assertEqual(balances["bri"], 825_000)
        self.assertEqual(balances["gopay"], 150_000)
        self.assertEqual(sum(balances.values()), 3_475_000)

    def test_salary_period_defaults_to_25th_until_24th_next_month(self):
        start, end = calculate_salary_period(dt.date(2026, 8, 24))
        self.assertEqual(start, dt.date(2026, 7, 25))
        self.assertEqual(end, dt.date(2026, 8, 24))

        start, end = calculate_salary_period(dt.date(2026, 8, 25))
        self.assertEqual(start, dt.date(2026, 8, 25))
        self.assertEqual(end, dt.date(2026, 9, 24))

    def test_filter_transactions_by_period_account_category_and_type(self):
        transactions = [
            Transaction(id="t1", type="expense", amount=50_000, occurred_at=dt.datetime(2026, 8, 25, 12), source_account_id="bri", category="Makan", note="bakso"),
            Transaction(id="t2", type="expense", amount=90_000, occurred_at=dt.datetime(2026, 8, 26, 20), source_account_id="jenius", category="Hiburan", note="movie"),
            Transaction(id="t3", type="income", amount=2_000_000, occurred_at=dt.datetime(2026, 9, 1, 9), destination_account_id="jenius", category="Gaji", note="salary"),
            Transaction(id="t4", type="expense", amount=30_000, occurred_at=dt.datetime(2026, 9, 25, 9), source_account_id="bri", category="Makan", note="soto"),
        ]

        result = filter_transactions(
            transactions,
            start_date=dt.date(2026, 8, 25),
            end_date=dt.date(2026, 9, 24),
            account_ids={"bri"},
            categories={"Makan"},
            types={"expense"},
            query="bak",
        )

        self.assertEqual([tx.id for tx in result], ["t1"])


if __name__ == "__main__":
    unittest.main()
