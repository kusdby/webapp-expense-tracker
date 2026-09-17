# Expense Tracker design direction

## Supplied user brief (transcribed)
Personal finance for everyday tracking. Minimalist and flat, with meaningful color and selective shadow for depth. White / soft-gray shell, charcoal typography and primary controls. Restrained orange for expenses; green for income; saved category colors remain data encoding. Balances lead, income and expenses are subordinate. Real category breakdowns and a tidy ledger, not chunky repeated cards. Accounts show no invented numbers, expiry dates or logos. Only working Dashboard / Detail, search, transaction and management controls. Keep salary-period logic and separate Expenses / Incomes category groups, at most three visible rows with accessible scrolling.

Reference: supplied finance dashboard image, used for hierarchy and material treatment, not copied content or navigation.

ENERGY 2 / RHYTHM 2 / MOTION 1. Antislop applied during work.

## Derived implementation decisions (not owner identity claims)
- Warm-gray outer ground and off-white workspace distinguish the working canvas; white financial surfaces sit flat without individual shadows.
- One balance summary is the focal point. Adjacent income / expense metrics share its surface and use dividers rather than colored panels.
- Charcoal primary buttons communicate an action hierarchy, not a decorative accent. Burnt orange expense labels and green income labels retain redundant text meanings.
- Category swatches preserve saved colors without recoloring cards. Chart legends expose amounts and percentages so color is not the only way to read breakdowns.
- System sans-serif with tabular numbers avoids external font requests and keeps currency readable. Large, tightly set balances provide the typographic identity.
- 8px controls, 12px content surfaces and 18px desktop shell separate interaction scale from workspace scale. No pills, glow, texture or decorative gradients.
- Shadows exist only on the desktop workspace, login surface and modal layer, where they convey elevation.
- Ledger entries use separators and compact inline actions. Small screens reflow metadata and actions rather than hide controls.
- Account surfaces are neutral with large real balances; horizontal scrolling preserves account navigation without credit-card imitation.
- Category groups use the existing measured three-row scroll limit, allowing long labels to reflow.
- Motion is limited to immediate press feedback. Native dialogs keep keyboard handling and Escape dismissal.
- The supplied light reference is the explicit theme direction; no unrequested theme switch or fake destinations are added.

## Verification status
Implementation is subject to regression tests and real-browser fixture verification. This file records direction, not a claim that an accessibility or delivery gate has passed.
