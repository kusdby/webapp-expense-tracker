import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class StaticUiTests(unittest.TestCase):
    def test_pastel_balance_hierarchy(self):
        html = (ROOT / "web" / "index.html").read_text()
        css = (ROOT / "web" / "styles.css").read_text()
        self.assertIn('class="card balance-card"', html)
        self.assertIn('class="card expense-card"', html)
        self.assertIn('class="card income-card"', html)
        self.assertIn('class="cashflow-summary"', html)
        self.assertIn('--balance: #f8df72;', css)
        self.assertIn('--expense-card: #f3d0c9;', css)
        self.assertIn('--income-card: #ded6f5;', css)
        self.assertIn('grid-template-areas: "balance balance" "expense income";', css)
        self.assertNotIn('Account number', html)
        self.assertNotIn('Expire date', html)

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
