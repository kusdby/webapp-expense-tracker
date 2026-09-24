# Balance visibility verification

## Delivered behavior
- The 44px eye button sits at the right of Total Saldo. Open eye means visible; struck-through eye means hidden. Accessible action labels are `Sembunyikan nominal` and `Tampilkan nominal`, with matching pressed state.
- Hidden read-only monetary values become `****`: balance, expenses, income, net cashflow, accounts, chart legend amounts, period transaction rows, global search and transaction-delete confirmation. Percentages and dates remain readable. Intentional edit inputs retain their values.
- Only the boolean `finance.hideAmounts` preference is stored. It is read before rendering, survives reload, and gracefully falls back to session behavior if storage is blocked. This is display privacy, not encryption or removal of financial data from browser memory/DOM.
- Existing minimalist direction and ENERGY 2 / RHYTHM 2 / MOTION 1 retained. The eye communicates visibility, its right-side position preserves the primary balance hierarchy, and the reserved grid column keeps the touch target clear of long values. No unrelated theme, dependency or server change.

## Automated evidence
- `node --test tests/ui-behavior.cjs`: 20 passed, 0 failed. Docker Node 22 with existing jsdom kit, no installation. Includes masking/restoration, no fetch, retained focus/form inputs, preference-before-render and blocked storage.
- `python3 -m unittest discover -s tests`: 31 passed.
- `python3 scripts/smoke_auth.py`: `smoke ok 3525000 25 3`, using its isolated smoke database.
- `git diff --check`: clean.
- Logs: `/DATA/fin-balance-unit.log`, `/DATA/fin-balance-python.log`, `/DATA/fin-balance-smoke.log`.

## Real Chromium verification
Isolated fixture on port 18098 with synthetic data only. No production create/edit/delete operations.

`/DATA/fin-balance-browser.js`, executed with `/DATA/fin-reaudit-cdp.mjs`, produced `/DATA/fin-balance-browser-results.json`:
- Real mouse click hides every monetary node and retains focus.
- Enter reveals with open eye; Space hides.
- Period navigation, Detail and global search remain masked after rendering.
- Widths 320, 390, 768 and 1440: no horizontal overflow in hidden mode; visible long balance does not overlap the 44px eye button or escape its card.
- Reload preserves masking; a document-start MutationObserver observed no raw monetary-node flash.
- No raw amount title/ARIA label on masked nodes; hidden button label and pressed state correct.
- Fixture completes after reload; zero runtime exceptions.

Screenshots: `/DATA/fin-balance-{hidden,visible}-{320,390,768,1440}.png`. Visual inspection of hidden 320/768 and visible 390/1440 confirms placement, masking and long-value wrapping. Scope is this feature, not a new whole-app accessibility certification. Existing untracked fixture was corrected to check formatted/masked edited values instead of requiring literal `2.500` after a hidden reload; it remains excluded from the source commit.

## Deployment and safety
- Inspected existing `scripts/deploy_ui_audit.py` and executed only after successful tests/browser verification.
- Private backup: `/DATA/fin-account-cards-private-20260918-142917` (0700 directory, 0600 SQLite backup and container snapshot).
- New container: `7d8222cad4ddb65b07a15411cfa36ed010f71fafce38fb0ae3d2fc38d8b10df6`, named `webapp-expense-tracker`.
- Image: `sha256:2e64712e01b52ea3658de938f87831e8b834470fcac80f95906e96d024bc7e9e`.
- Environment and mounts preserved exactly. SQLite logical SHA-256 remained `12d185590431d7fbdc3e57b057e2ad660738da47d951f2c0d28b16e56c7ce59b` through deployment and subsequent public verification.
- Local port 8099 and Chromium HTTPS `https://fin.kusdby.com/` returned HTML/CSS/JS matching repository SHA-256 byte-for-byte. All public requests HTTP 200; asset version `balance-visibility-v1`.
- Evidence: `/DATA/fin-balance-deploy.log`, `/DATA/fin-balance-local-assets.json`, `/DATA/fin-balance-public-results.json`. Prior container retained for rollback; no credentials included in this report.
