# Minimal flat redesign verification

## Scope
Replaced the accumulated CSS cascade with a single warm-neutral flat system. Updated live HTML surfaces and cache version (`minimal-flat-v1`). No framework migration, API, database, salary-period or JavaScript behavior changes. DESIGN.md records the supplied brief separately from derived implementation choices.

## Executed evidence
- RED: revised balance aesthetic contract failed against the old pastel stylesheet before implementation.
- GREEN: `python3 -m unittest discover -s tests`: **31 passed**.
- `node --test tests/ui-behavior.cjs` in node:22 with existing read-only kit dependencies: **18 passed**.
- `python3 scripts/smoke_auth.py`: `smoke ok 3525000 25 3`.
- `git diff --check`: clean.
- Computed text contrast: muted on secondary surface **5.44:1**, expense on white **6.17:1**, income on white **7.10:1**.
- Real Chromium isolated synthetic fixture: dashboard and Detail at **320, 390, 768, 1440** with no horizontal page overflow.
- Account/category/transaction/search dialogs opened at all four widths; Tab and Escape exercised.
- Click-submitted fixture account creation and balance edit, category creation, transaction creation/edit. Fixture deletion actions executed. No production writes.
- Existing fixture checked salary boundaries, global search across periods, refreshed search after edit, balance focus and 44px targets.
- Actual summary fetch failure injected in browser: visible error; clicking retry after restoring fetch recovered successfully.
- Browser Runtime.exceptionThrown events: **0** during primary harness.
- Both category groups populated beyond three entries in Chromium. Measured three-row viewport and independent overflow at all four widths: 319px at 320, 223px at 390/768/1440.

## Visual evidence (local, synthetic data only)
`/DATA/fin-flat-browser-results.json` records the primary browser run.
Screenshots `/DATA/fin-flat-{dashboard,detail,account,category,transaction,search}-{320,390,768,1440}.png`; additional ledger, categories, login, loading, empty, error and network-error captures use the same prefix. Large synthetic balances and deliberately overlong names test reflow, not actual personal finances.

Inspected screenshots: desktop dashboard and ledger, 320 dashboard and transaction dialog, 390 Detail, 1440 category section and login. They show neutral surfaces, divider-led ledger, visible focus and no page clipping. Huge fixture amounts wrap rather than disappear. Individual account carousel edges intentionally scroll horizontally.

## Gate status and remaining work
- Purpose / direction / palette / meaningful controls: verified by source and DESIGN.md; no invented sidebar pages, identities or card metadata.
- Responsive and functional checks above passed; this is not a claim of exhaustive accessibility certification.
- Loading/empty screenshots were directly rendered states; network error/retry was subsequently exercised through actual fetch failure.
- Follow-up real keyboard login at 320/390/768/1440: invalid credentials show the actual error; Tab reaches password then submit; Enter with valid synthetic credentials signs in. Submit focus has a solid 3px outline. No horizontal login overflow or runtime exceptions. Evidence: `/DATA/fin-flat-finish-results.json` and `fin-flat-login-real-{width}.png`.
- 200% CSS zoom at a 1440px viewport: Dashboard/Detail have no horizontal page overflow; account/category/transaction/search dialogs retain keyboard focus and close with Escape. This is CSS zoom, not browser toolbar zoom; physical mobile virtual keyboards were not tested.
- Additional vision inspection: 320px populated category panels show three readable rows per independently scrolling group; actual 320px login wraps its heading/error without horizontal clipping and shows strong input focus; 200% Detail remains legible without collisions.
- Remaining coverage limits: exhaustive color pairings (especially user-assigned chart colors), browser toolbar zoom, physical mobile keyboards, screen readers, and keyboard-only end-to-end CRUD are not certified. Existing source has no logout UI; none was fabricated. This is a scoped verification report, not an all-rules accessibility PASS.

## Deployment verification
- Fresh rerun: 31 Python tests and 18 JavaScript tests passed; smoke returned `smoke ok 3525000 25 3`; diff whitespace check clean.
- Executed inspected `python3 scripts/deploy_ui_audit.py`; rebuilt image and replaced the application container. Container `a7d727a72df688ae342a3a9e82c46653ff3896d4b78fcc7de7094ec6f3bf05f9` verified running.
- Private backup: `/DATA/fin-account-cards-private-20260917-155104` (directory 0700; metadata and database backup 0600). Environment and mounts preserved by exact assertions. Full SQLite logical SHA-256 remained `12d185590431d7fbdc3e57b057e2ad660738da47d951f2c0d28b16e56c7ce59b`, including a post-readiness check.
- Local port 8099 returned 200 and `minimal-flat-v1`; served CSS matched source exactly.
- Direct Python public request encountered HTTP 403. Real Chromium public fetches then returned 200 for HTML/CSS/JS, with `minimal-flat-v1` in HTML. Evidence `/DATA/fin-flat-public-results.json`; no production CRUD or personal screenshots.
- Public CSS SHA-256: `ab122f75f2e6754d05733ea3b5670452dbfb073de03026677ff310116204238d`. Public asset hashes checked against local source before commit.
