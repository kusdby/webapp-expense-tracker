import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class StaticUiTests(unittest.TestCase):
    def test_flat_balance_hierarchy(self):
        html = (ROOT / "web" / "index.html").read_text()
        css = (ROOT / "web" / "styles.css").read_text()
        self.assertIn('class="card balance-card"', html)
        self.assertIn('class="card expense-card"', html)
        self.assertIn('class="card income-card"', html)
        self.assertIn('class="cashflow-summary"', html)
        self.assertIn('--bg: #eeedea;', css)
        self.assertIn('--expense: #a44320;', css)
        self.assertIn('--income: #286344;', css)
        self.assertEqual(css.count(':root {'), 1)
        self.assertNotIn('linear-gradient', css)
        self.assertNotIn('[data-palette=', css)
        self.assertIn('.ledger-heading', css)
        self.assertIn('class="ledger-heading"', html)
        self.assertIn('minimal-flat-v1', html)
        self.assertIn('grid-template-areas: "balance balance" "expense income";', css)
        self.assertNotIn('Account number', html)
        self.assertNotIn('Expire date', html)

    def test_redesign_only_exposes_existing_destinations(self):
        html = (ROOT / "web" / "index.html").read_text()
        self.assertNotIn('href="#"', html)
        self.assertNotIn('<aside', html)
        for fake in ('Notifications', 'Reports', 'Mastercard', 'Visa', 'Sajibur', '🔍'):
            self.assertNotIn(fake, html)
        for hook in ('dashboardPage', 'detailPage', 'transactionPanel', 'accountDialog', 'categoryDialog', 'balanceDialog'):
            self.assertIn(f'id="{hook}"', html)
        self.assertIn('class="ledger-heading" aria-hidden="true"', html)
        self.assertIn('id="loginError" class="error" role="alert"', html)

    def test_dashboard_has_period_navigation_controls(self):
        html = (ROOT / "web" / "index.html").read_text()
        js = (ROOT / "web" / "app.js").read_text()

        self.assertIn('id="periodNavigator"', html)
        self.assertIn('onclick="shiftPeriod(-1)"', html)
        self.assertIn('onclick="shiftPeriod(1)"', html)
        self.assertIn("function shiftPeriod", js)
        self.assertIn("/api/summary?", js)
        self.assertIn("period_start", js)
        self.assertIn("formatPeriodRange", js)

    def test_header_has_global_search_button_and_dialog(self):
        html = (ROOT / "web" / "index.html").read_text()
        js = (ROOT / "web" / "app.js").read_text()

        self.assertIn('id="globalSearchButton"', html)
        self.assertIn('onclick="openGlobalSearch()"', html)
        self.assertIn('id="globalSearchDialog"', html)
        self.assertIn('id="globalSearchInput"', html)
        self.assertIn('id="globalSearchResults"', html)
        self.assertIn("function openGlobalSearch", js)
        self.assertIn("function runGlobalSearch", js)
        self.assertIn("renderGlobalSearchResults", js)
        self.assertIn("/api/transactions?", js)


if __name__ == "__main__":
    unittest.main()
