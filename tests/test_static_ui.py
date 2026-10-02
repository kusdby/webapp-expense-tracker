import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class StaticUiTests(unittest.TestCase):
    def test_react_build_entry_and_version(self):
        html = (ROOT / "web" / "index.html").read_text()
        self.assertIn('id="root"', html)
        self.assertIn('finance-pwa-v1.0.1', html)
        self.assertIn('/assets/index-', html)
        self.assertIn('<script type="module"', html)
        self.assertNotIn('/app.js', html)
        self.assertNotIn('/styles.css', html)

    def test_source_uses_shadcn_style_components_and_preserves_finance_hooks(self):
        app = (ROOT / "src" / "App.jsx").read_text()
        self.assertIn("@/components/ui/button", app)
        self.assertIn("@/components/ui/card", app)
        self.assertIn("@/components/ui/form", app)
        self.assertIn("@/components/ui/modal", app)
        for text in (
            "Total Saldo",
            "Sembunyikan nominal",
            "Cari transaksi semua periode",
            "Akun Saldo",
            "Kategori",
            "Transaksi periode terpilih",
            "Periode ini",
        ):
            self.assertIn(text, app)
        for fake in ("Mastercard", "Visa", "Expire", "Account number", "Sajibur"):
            self.assertNotIn(fake, app)

    def test_minimal_flat_theme_and_responsive_detail_layout(self):
        css = (ROOT / "src" / "styles.css").read_text()
        self.assertIn('--bg: #f6f6f4;', css)
        self.assertIn('--black: #050505;', css)
        self.assertIn('--white: #ffffff;', css)
        self.assertIn('--expense: #7f1d1d;', css)
        self.assertIn('--income: #14532d;', css)
        self.assertEqual(css.count(':root {'), 1)
        self.assertNotIn('linear-gradient', css)
        self.assertIn('.balance-card', css)
        self.assertIn('.ledger-heading', css)
        self.assertIn('.category-columns', css)
        self.assertIn('grid-template-columns: repeat(2, minmax(0, 1fr));', css)
        self.assertIn('max-height: 352px;', css)
        self.assertIn('env(safe-area-inset-top)', css)

    def test_pwa_installation_and_ios_shell_are_present(self):
        source_html = (ROOT / "index.html").read_text()
        manifest = (ROOT / "public" / "manifest.webmanifest").read_text()
        worker = (ROOT / "public" / "service-worker.js").read_text()
        main = (ROOT / "src" / "main.jsx").read_text()

        self.assertIn('rel="manifest"', source_html)
        self.assertIn('apple-mobile-web-app-capable', source_html)
        self.assertIn('apple-mobile-web-app-status-bar-style', source_html)
        self.assertIn('apple-touch-icon', source_html)
        self.assertIn('apple-touch-icon.png', source_html)
        self.assertIn('maximum-scale=1', source_html)
        self.assertIn('user-scalable=no', source_html)
        self.assertIn('"display": "standalone"', manifest)
        self.assertIn('"start_url": "/"', manifest)
        self.assertIn('"purpose": "any maskable"', manifest)
        self.assertTrue((ROOT / "public" / "icons" / "icon-192.png").is_file())
        self.assertTrue((ROOT / "public" / "icons" / "icon-512.png").is_file())
        self.assertIn("serviceWorker.register('/service-worker.js')", main)
        self.assertIn("url.pathname.startsWith('/api/')", worker)
        self.assertIn('event.waitUntil', worker)
        self.assertNotIn('caches.match(request)', worker.split("url.pathname.startsWith('/api/')", 1)[0])

    def test_period_and_search_behavior_present_in_react_source(self):
        app = (ROOT / "src" / "App.jsx").read_text()
        self.assertIn('function shiftPeriod', app)
        self.assertIn('/api/summary?period_start=', app)
        self.assertIn('period_start', app)
        self.assertIn('className="period-range-button"', app)
        self.assertIn('showPicker', app)
        self.assertIn('className="period-picker-input"', app)
        self.assertNotIn('Mulai periode', app)
        self.assertIn('function runGlobalSearch', app)
        self.assertIn('/api/transactions?', app)
        self.assertIn('globalResults', app)


if __name__ == "__main__":
    unittest.main()
