"""Disk-backed regressions for the actual initialize/bootstrap startup path."""
import sqlite3
import tempfile
import unittest

from app.repository import FinanceRepository


class PersistenceTests(unittest.TestCase):
    def snapshot(self, path):
        with sqlite3.connect(path) as conn:
            return {table: conn.execute(f'SELECT * FROM {table} ORDER BY 1').fetchall()
                    for table in ('users', 'settings', 'accounts', 'categories', 'transactions')}

    def test_deleted_or_renamed_transfer_survives_repeated_bootstrap(self):
        for action in ('delete', 'rename'):
            for pre_marker in (False, True):
                with self.subTest(action=action, pre_marker=pre_marker), tempfile.TemporaryDirectory() as tmp:
                    path = tmp + '/finance.db'
                    repo = FinanceRepository(path)
                    repo.initialize()
                    uid = repo.ensure_initial_user('test', 'password')
                    transfer_id = repo.create_category(uid, 'Transfer', 'income')
                    transfer = next(c for c in repo.list_categories(uid) if c['id'] == transfer_id)
                    if action == 'delete':
                        self.assertTrue(repo.delete_category(uid, transfer['id']))
                    else:
                        self.assertTrue(repo.update_category(uid, transfer['id'], name='Custom income', category_type='income'))
                    # Simulate upgrading a database predating durable markers.
                    if pre_marker:
                        with sqlite3.connect(path) as conn:
                            conn.execute('DROP TABLE IF EXISTS user_migrations')
                    expected = self.snapshot(path)
                    for _ in range(3):
                        reopened = FinanceRepository(path)
                        reopened.initialize()
                        self.assertEqual(reopened.ensure_initial_user('test', 'ignored'), uid)
                        self.assertEqual(self.snapshot(path), expected)

    def test_legacy_migration_is_durable_and_respects_existing_income_taxonomy(self):
        for category_state in ('absent', 'deleted', 'renamed'):
            with self.subTest(category_state=category_state), tempfile.TemporaryDirectory() as tmp:
                path = tmp + '/finance.db'
                repo = FinanceRepository(path)
                repo.initialize()
                uid = repo.create_user('Test', 'test', 'password')
                account = repo.create_account(uid, 'Wallet', 'cash', 0)
                if category_state != 'absent':
                    category = repo.create_category(uid, 'Transfer', 'income')
                    if category_state == 'deleted':
                        repo.delete_category(uid, category)
                    else:
                        repo.update_category(uid, category, name='Renamed income', category_type='income')
                with sqlite3.connect(path) as conn:
                    conn.execute("INSERT INTO transactions (id,user_id,type,amount,destination_account_id,occurred_at,created_at) VALUES ('legacy',?,'transfer',10,?,'2026-01-01','2026-01-01')", (uid, account))
                self.assertEqual(repo.migrate_legacy_transfer_transactions(uid), 1)
                tx = repo.list_transactions(uid)[0]
                self.assertEqual(tx['type'], 'income')
                self.assertEqual(tx['category_name'], 'Transfer' if category_state == 'absent' else None)
                if category_state == 'absent':
                    repo.delete_category(uid, tx['category_id'])
                expected = self.snapshot(path)
                for _ in range(3):
                    repo = FinanceRepository(path)
                    repo.initialize()
                    self.assertEqual(repo.migrate_legacy_transfer_transactions(uid), 0)
                    repo.ensure_initial_user('test', 'ignored')
                    self.assertEqual(self.snapshot(path), expected)
                with sqlite3.connect(path) as conn:
                    self.assertEqual(conn.execute('SELECT COUNT(*) FROM user_migrations').fetchone()[0], 1)

    def test_all_user_edits_survive_reopening_and_bootstrap(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = tmp + '/finance.db'
            repo = FinanceRepository(path)
            repo.initialize()
            uid = repo.ensure_initial_user('test', 'password')
            account = repo.create_account(uid, 'Custom wallet', 'cash', 123)
            category = repo.create_category(uid, 'Custom expense', 'expense')
            repo.update_category(uid, category, name='Renamed expense', category_type='expense', color='#123456', icon='custom')
            tx = repo.create_transaction(uid, 'expense', 10, source_account_id=account, category_id=category)
            repo.update_transaction(uid, tx, tx_type='expense', amount=25, source_account_id=account, category_id=category, note='Edited note')
            deleted_tx = repo.create_transaction(uid, 'income', 20, destination_account_id=account)
            repo.delete_transaction(uid, deleted_tx)
            repo.set_account_balance(uid, account, 789)
            deleted_account = repo.create_account(uid, 'Temporary wallet', 'cash', 0)
            repo.delete_account(uid, deleted_account)
            deleted_category = repo.create_category(uid, 'Temporary category', 'expense')
            repo.delete_category(uid, deleted_category)
            expected = self.snapshot(path)
            for _ in range(3):
                repo = FinanceRepository(path)
                repo.initialize()
                repo.ensure_initial_user('test', 'ignored')
                self.assertEqual(self.snapshot(path), expected)
                self.assertEqual(repo.get_balances(uid)[account], 789)


if __name__ == '__main__':
    unittest.main()
