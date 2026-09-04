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
    income_by_category: dict[str, int] = {}
    category_colors = {category["name"]: category.get("color") or "#a78bfa" for category in categories}
    for tx in period_transactions:
        name = tx.get("category_name") or "Tanpa kategori"
        if tx["type"] == "expense":
            expense_by_category[name] = expense_by_category.get(name, 0) + tx["amount"]
        elif tx["type"] == "income":
            income_by_category[name] = income_by_category.get(name, 0) + tx["amount"]

    expense_category_breakdown = _category_breakdown(expense_by_category, category_colors)
    income_category_breakdown = _category_breakdown(income_by_category, category_colors)

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
        "income_by_category": income_by_category,
        "expense_category_breakdown": expense_category_breakdown,
        "income_category_breakdown": income_category_breakdown,
        "recent_transactions": transactions[:10],
    }


def _category_breakdown(totals: dict[str, int], category_colors: dict[str, str]) -> list[dict[str, Any]]:
    total_amount = sum(totals.values())
    if total_amount <= 0:
        return []
    breakdown = []
    for name, amount in sorted(totals.items(), key=lambda item: item[1], reverse=True):
        breakdown.append({
            "name": name,
            "amount": amount,
            "percentage": round((amount / total_amount) * 100, 1),
            "color": category_colors.get(name, "#64748b"),
        })
    return breakdown
