from __future__ import annotations

import datetime as dt
from typing import Any

from app.finance import calculate_salary_period
from app.repository import FinanceRepository


def build_dashboard_summary(repo: FinanceRepository, user_id: str, today: dt.date | None = None) -> dict[str, Any]:
    today = today or dt.date.today()
    reset_day = repo.get_reset_day(user_id)
    period_start, period_end = calculate_salary_period(today, reset_day)
    balances = repo.get_balances(user_id)
    accounts = repo.list_accounts(user_id)
    categories = repo.list_categories(user_id)
    transactions = repo.list_transactions(user_id)

    for account in accounts:
        account["balance"] = balances.get(account["id"], account["initial_balance"])

    period_transactions = [
        tx for tx in transactions
        if period_start <= dt.datetime.fromisoformat(tx["occurred_at"]).date() <= period_end
    ]
    period_income = sum(tx["amount"] for tx in period_transactions if tx["type"] == "income")
    period_expense = sum(tx["amount"] for tx in period_transactions if tx["type"] == "expense")

    expense_by_category: dict[str, int] = {}
    for tx in period_transactions:
        if tx["type"] == "expense":
            name = tx.get("category_name") or "Tanpa kategori"
            expense_by_category[name] = expense_by_category.get(name, 0) + tx["amount"]

    return {
        "total_balance": sum(account["balance"] for account in accounts),
        "period_income": period_income,
        "period_expense": period_expense,
        "net_cashflow": period_income - period_expense,
        "reset_day": reset_day,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "accounts": accounts,
        "accounts_by_id": {account["id"]: account for account in accounts},
        "categories": categories,
        "expense_by_category": expense_by_category,
        "recent_transactions": transactions[:10],
    }
