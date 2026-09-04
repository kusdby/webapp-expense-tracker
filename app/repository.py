from __future__ import annotations

import datetime as dt
import hashlib
import hmac
import secrets
import sqlite3
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from app.finance import Account, Transaction, calculate_account_balances


class FinanceRepository:
    def __init__(self, db_path: str):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    def initialize(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                PRAGMA foreign_keys = ON;

                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    username TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS settings (
                    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    reset_day INTEGER NOT NULL DEFAULT 25
                );

                CREATE TABLE IF NOT EXISTS accounts (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    initial_balance INTEGER NOT NULL DEFAULT 0,
                    color TEXT NOT NULL DEFAULT '#38bdf8',
                    icon TEXT NOT NULL DEFAULT 'wallet',
                    is_archived INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS categories (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    color TEXT NOT NULL DEFAULT '#a78bfa',
                    icon TEXT NOT NULL DEFAULT 'tag',
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS transactions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    type TEXT NOT NULL,
                    amount INTEGER NOT NULL,
                    source_account_id TEXT REFERENCES accounts(id),
                    destination_account_id TEXT REFERENCES accounts(id),
                    category_id TEXT REFERENCES categories(id),
                    note TEXT NOT NULL DEFAULT '',
                    occurred_at TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )

    def create_user(self, name: str, username: str, password: str = "changeme") -> str:
        user_id = _id()
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO users (id, name, username, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
                (user_id, name, username, _hash_password(password), _now()),
            )
            conn.execute("INSERT INTO settings (user_id, reset_day) VALUES (?, 25)", (user_id,))
        return user_id

    def get_user(self, user_id: str) -> dict[str, Any]:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise ValueError("User not found")
        return dict(row)

    def verify_login(self, username: str, password: str) -> str | None:
        with self._connect() as conn:
            row = conn.execute("SELECT id, password_hash FROM users WHERE username = ?", (username,)).fetchone()
        if not row:
            return None
        if _verify_password(password, row["password_hash"]):
            return row["id"]
        return None

    def ensure_initial_user(self, username: str, password: str, name: str | None = None) -> str:
        with self._connect() as conn:
            row = conn.execute("SELECT id FROM users WHERE username = ? LIMIT 1", (username,)).fetchone()
            if row:
                user_id = row["id"]
                self.ensure_transfer_income_category(user_id)
                self.migrate_legacy_transfer_transactions(user_id)
                return user_id
        user_id = self.create_user(name or username, username, password=password)
        bri = self.create_account(user_id, "BRI", "bank", 1_000_000, color="#3b82f6")
        jenius = self.create_account(user_id, "Jenius", "bank", 500_000, color="#06b6d4")
        gopay = self.create_account(user_id, "GoPay", "e-wallet", 100_000, color="#22c55e")
        food = self.create_category(user_id, "Makan & Minum", "expense", color="#fb7185")
        salary = self.create_category(user_id, "Gaji", "income", color="#34d399")
        transfer = self.ensure_transfer_income_category(user_id)
        self.create_transaction(user_id, "income", 2_000_000, destination_account_id=jenius, category_id=salary, note="Gajian")
        self.create_transaction(user_id, "expense", 125_000, source_account_id=bri, category_id=food, note="Makan siang")
        self.create_transaction(user_id, "income", 50_000, destination_account_id=gopay, category_id=transfer, note="Top up GoPay")
        return user_id

    def ensure_transfer_income_category(self, user_id: str) -> str:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT id FROM categories WHERE user_id = ? AND name = 'Transfer' AND type = 'income' AND is_active = 1 LIMIT 1",
                (user_id,),
            ).fetchone()
            if row:
                return row["id"]
            category_id = _id()
            conn.execute(
                """
                INSERT INTO categories (id, user_id, name, type, color, icon, created_at)
                VALUES (?, ?, 'Transfer', 'income', '#60a5fa', '', ?)
                """,
                (category_id, user_id, _now()),
            )
        return category_id

    def migrate_legacy_transfer_transactions(self, user_id: str) -> int:
        transfer_category_id = self.ensure_transfer_income_category(user_id)
        with self._connect() as conn:
            cur = conn.execute(
                """
                UPDATE transactions
                SET type = 'income', source_account_id = NULL, category_id = ?
                WHERE user_id = ? AND type = 'transfer'
                """,
                (transfer_category_id, user_id),
            )
        return cur.rowcount

    def create_account(self, user_id: str, name: str, account_type: str, initial_balance: int, *, color: str = "#38bdf8", icon: str = "wallet") -> str:
        account_id = _id()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO accounts (id, user_id, name, type, initial_balance, color, icon, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (account_id, user_id, name, account_type, initial_balance, color, icon, _now()),
            )
        return account_id

    def create_category(self, user_id: str, name: str, category_type: str, *, color: str = "#a78bfa", icon: str = "tag") -> str:
        category_id = _id()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO categories (id, user_id, name, type, color, icon, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (category_id, user_id, name, category_type, color, icon, _now()),
            )
        return category_id

    def update_category(
        self,
        user_id: str,
        category_id: str,
        *,
        name: str,
        category_type: str,
        color: str = "#a78bfa",
        icon: str = "tag",
    ) -> bool:
        with self._connect() as conn:
            cur = conn.execute(
                """
                UPDATE categories
                SET name = ?, type = ?, color = ?, icon = ?
                WHERE id = ? AND user_id = ? AND is_active = 1
                """,
                (name, category_type, color, icon, category_id, user_id),
            )
        return cur.rowcount == 1

    def delete_category(self, user_id: str, category_id: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute(
                "UPDATE categories SET is_active = 0 WHERE id = ? AND user_id = ? AND is_active = 1",
                (category_id, user_id),
            )
            if cur.rowcount == 1:
                conn.execute(
                    "UPDATE transactions SET category_id = NULL WHERE user_id = ? AND category_id = ?",
                    (user_id, category_id),
                )
        return cur.rowcount == 1

    def create_transaction(
        self,
        user_id: str,
        tx_type: str,
        amount: int,
        *,
        source_account_id: str | None = None,
        destination_account_id: str | None = None,
        category_id: str | None = None,
        note: str = "",
        occurred_at: dt.datetime | None = None,
    ) -> str:
        _validate_transaction_type(tx_type)
        tx_id = _id()
        occurred_at = occurred_at or dt.datetime.now()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO transactions
                (id, user_id, type, amount, source_account_id, destination_account_id, category_id, note, occurred_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (tx_id, user_id, tx_type, amount, source_account_id, destination_account_id, category_id, note, occurred_at.isoformat(), _now()),
            )
        return tx_id

    def update_transaction(
        self,
        user_id: str,
        tx_id: str,
        *,
        tx_type: str,
        amount: int,
        source_account_id: str | None = None,
        destination_account_id: str | None = None,
        category_id: str | None = None,
        note: str = "",
        occurred_at: dt.datetime | None = None,
    ) -> bool:
        _validate_transaction_type(tx_type)
        occurred_at = occurred_at or dt.datetime.now()
        with self._connect() as conn:
            cur = conn.execute(
                """
                UPDATE transactions
                SET type = ?, amount = ?, source_account_id = ?, destination_account_id = ?, category_id = ?, note = ?, occurred_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (tx_type, amount, source_account_id, destination_account_id, category_id, note, occurred_at.isoformat(), tx_id, user_id),
            )
        return cur.rowcount == 1

    def delete_transaction(self, user_id: str, tx_id: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id))
        return cur.rowcount == 1

    def list_accounts(self, user_id: str) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM accounts WHERE user_id = ? AND is_archived = 0 ORDER BY created_at", (user_id,)).fetchall()
        return [dict(row) for row in rows]

    def set_account_balance(self, user_id: str, account_id: str, target_balance: int) -> bool:
        balances = self.get_balances(user_id)
        if account_id not in balances:
            return False
        adjustment = int(target_balance) - balances[account_id]
        with self._connect() as conn:
            cur = conn.execute(
                "UPDATE accounts SET initial_balance = initial_balance + ? WHERE id = ? AND user_id = ? AND is_archived = 0",
                (adjustment, account_id, user_id),
            )
        return cur.rowcount == 1

    def delete_account(self, user_id: str, account_id: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute(
                "UPDATE accounts SET is_archived = 1 WHERE id = ? AND user_id = ? AND is_archived = 0",
                (account_id, user_id),
            )
        return cur.rowcount == 1

    def list_categories(self, user_id: str) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM categories WHERE user_id = ? AND is_active = 1 ORDER BY type, name", (user_id,)).fetchall()
        return [dict(row) for row in rows]

    def list_transactions(
        self,
        user_id: str,
        *,
        category_id: str | None = None,
        account_id: str | None = None,
        query: str | None = None,
    ) -> list[dict[str, Any]]:
        sql = """
            SELECT t.*, c.name AS category_name, sa.name AS source_account_name, da.name AS destination_account_name
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
            LEFT JOIN accounts sa ON sa.id = t.source_account_id AND sa.user_id = t.user_id
            LEFT JOIN accounts da ON da.id = t.destination_account_id AND da.user_id = t.user_id
            WHERE t.user_id = ?
        """
        params: list[Any] = [user_id]
        if category_id:
            sql += " AND t.category_id = ?"
            params.append(category_id)
        if account_id:
            sql += " AND (t.source_account_id = ? OR t.destination_account_id = ?)"
            params.extend([account_id, account_id])
        if query:
            sql += " AND LOWER(t.note || ' ' || COALESCE(c.name, '') || ' ' || t.amount) LIKE ?"
            params.append(f"%{query.lower()}%")
        sql += " ORDER BY t.occurred_at DESC, t.created_at DESC"
        with self._connect() as conn:
            rows = conn.execute(sql, params).fetchall()
        return [dict(row) for row in rows]

    def get_balances(self, user_id: str) -> dict[str, int]:
        accounts = [Account(id=row["id"], name=row["name"], type=row["type"], initial_balance=row["initial_balance"]) for row in self.list_accounts(user_id)]
        active_account_ids = {account.id for account in accounts}
        transactions = []
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM transactions WHERE user_id = ? ORDER BY occurred_at", (user_id,)).fetchall()
        for row in rows:
            if row["source_account_id"] and row["source_account_id"] not in active_account_ids:
                continue
            if row["destination_account_id"] and row["destination_account_id"] not in active_account_ids:
                continue
            transactions.append(
                Transaction(
                    id=row["id"],
                    type=row["type"],
                    amount=row["amount"],
                    source_account_id=row["source_account_id"],
                    destination_account_id=row["destination_account_id"],
                    category=row["category_id"] or "",
                    note=row["note"],
                    occurred_at=dt.datetime.fromisoformat(row["occurred_at"]),
                )
            )
        return calculate_account_balances(accounts, transactions)

    def get_reset_day(self, user_id: str) -> int:
        with self._connect() as conn:
            row = conn.execute("SELECT reset_day FROM settings WHERE user_id = ?", (user_id,)).fetchone()
        return int(row["reset_day"]) if row else 25

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()


def _id() -> str:
    return uuid.uuid4().hex[:12]


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000).hex()
    return f"pbkdf2_sha256${salt}${digest}"


def _verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, salt, expected = password_hash.split("$", 2)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000).hex()
    return hmac.compare_digest(actual, expected)


def _now() -> str:
    return dt.datetime.now().isoformat()


def _validate_transaction_type(tx_type: str) -> None:
    if tx_type not in {"income", "expense"}:
        raise ValueError("Transaction type must be income or expense")
