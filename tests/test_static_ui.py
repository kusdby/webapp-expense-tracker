import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class StaticUiTests(unittest.TestCase):
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
