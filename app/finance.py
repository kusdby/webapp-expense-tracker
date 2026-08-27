from __future__ import annotations

import calendar
import datetime as dt
from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class Account:
    id: str
    name: str
    type: str
    initial_balance: int


@dataclass(frozen=True)
class Transaction:
    id: str
    type: str
    amount: int
    occurred_at: dt.datetime
    source_account_id: str | None = None
    destination_account_id: str | None = None
    category: str = ""
    note: str = ""


def calculate_account_balances(accounts: Iterable[Account], transactions: Iterable[Transaction]) -> dict[str, int]:
    balances = {account.id: account.initial_balance for account in accounts}

    for tx in transactions:
        if tx.amount < 0:
            raise ValueError("Transaction amount cannot be negative")

        if tx.type == "income":
            _add_to_account(balances, tx.destination_account_id, tx.amount)
        elif tx.type == "expense":
            _add_to_account(balances, tx.source_account_id, -tx.amount)
        elif tx.type == "transfer":
            _add_to_account(balances, tx.source_account_id, -tx.amount)
            _add_to_account(balances, tx.destination_account_id, tx.amount)
        elif tx.type == "adjustment":
            _add_to_account(balances, tx.destination_account_id or tx.source_account_id, tx.amount)
        else:
            raise ValueError(f"Unsupported transaction type: {tx.type}")

    return balances


def calculate_salary_period(today: dt.date, reset_day: int = 25) -> tuple[dt.date, dt.date]:
    if reset_day < 1 or reset_day > 31:
        raise ValueError("reset_day must be between 1 and 31")

    current_start = _safe_date(today.year, today.month, reset_day)
    if today >= current_start:
        start = current_start
        next_month = _add_month(today.year, today.month)
        end = _safe_date(next_month[0], next_month[1], reset_day) - dt.timedelta(days=1)
    else:
        prev_month = _subtract_month(today.year, today.month)
        start = _safe_date(prev_month[0], prev_month[1], reset_day)
        end = current_start - dt.timedelta(days=1)
    return start, end


def filter_transactions(
    transactions: Iterable[Transaction],
    *,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    account_ids: set[str] | None = None,
    categories: set[str] | None = None,
    types: set[str] | None = None,
    query: str | None = None,
) -> list[Transaction]:
    normalized_query = (query or "").strip().lower()
    results: list[Transaction] = []

    for tx in transactions:
        tx_date = tx.occurred_at.date()
        if start_date and tx_date < start_date:
            continue
        if end_date and tx_date > end_date:
            continue
        if account_ids and tx.source_account_id not in account_ids and tx.destination_account_id not in account_ids:
            continue
        if categories and tx.category not in categories:
            continue
        if types and tx.type not in types:
            continue
        if normalized_query:
            haystack = f"{tx.note} {tx.category} {tx.amount} {tx.source_account_id or ''} {tx.destination_account_id or ''}".lower()
            if normalized_query not in haystack:
                continue
        results.append(tx)

    return results


def _add_to_account(balances: dict[str, int], account_id: str | None, amount: int) -> None:
    if not account_id:
        raise ValueError("Transaction is missing account id")
    if account_id not in balances:
        raise ValueError(f"Unknown account id: {account_id}")
    balances[account_id] += amount


def _safe_date(year: int, month: int, day: int) -> dt.date:
    last_day = calendar.monthrange(year, month)[1]
    return dt.date(year, month, min(day, last_day))


def _add_month(year: int, month: int) -> tuple[int, int]:
    if month == 12:
        return year + 1, 1
    return year, month + 1


def _subtract_month(year: int, month: int) -> tuple[int, int]:
    if month == 1:
        return year - 1, 12
    return year, month - 1
