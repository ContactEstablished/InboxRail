# UI design implementation map

## Purpose and source

The files in [`_ui`](../_ui/README.md) are the visual reference for InboxRail. They define a compact dark Windows desktop shell with a horizontal account rail, account colors and badges, provider content region, suspended-state overlay, settings, rules, notification controls, focus/quiet hours, and a tray menu.

The artifact is labeled **Aviary** and calls accounts **Perches**. Implementation will retain the layout, visual hierarchy, restrained motion, and state vocabulary while applying the InboxRail identity and the terminology defined by product/domain contracts.

The artifact is not production-ready code. Its generated support runtime uses remote dependencies and dynamic evaluation, and the HTML requests remote fonts. InboxRail will rebuild the design in its local React/CSS shell with no remote scripts, runtime evaluation, or unreviewed remote font dependency. Remote provider content stays in sandboxed `WebContentsView` instances below trusted shell controls.

## Screen inventory and roadmap placement

| Design area | Roadmap implementation | Acceptance focus |
|---|---|---|
| Theme, typography, spacing, surfaces, controls, window shell | P1, beginning with `P1-003` | Local-only assets, production CSP, visible keyboard focus, contrast, reduced-motion foundation |
| Main window account rail, color marker, selected state, badges, add/edit/remove, overflow and reorder | P2, primarily `P2-011` through `P2-018` | Six-to-twenty accounts, keyboard and pointer operation, persisted order, deterministic fake-state coverage |
| Provider content region and suspended-account overlay | P3, primarily `P3-011` and `P3-016` | Trusted rail is never covered; loading, sign-in, error and suspended states reflect lifecycle truth without provider DOM coupling |
| Connected identity, authorization and monitoring status in account settings | P4, especially `P4-020`, then provider-specific P5/P6 status tasks | Browser-session and monitoring status stay distinct; no token or raw provider error is displayed |
| Rule list, editor and simulator | P7, `P7-012` through `P7-015` | Accessible ordering/editing, validated conditions/actions, deterministic preview |
| Badges, bounded pulse, mute, pause, focus/quiet-hours and notification preferences/history | P7, `P7-018` through `P7-024` | Reduced-motion behavior, explicit scope/duration, no notification flood, application action-level terminology |
| Tray menu, close-to-tray, pause/resume, startup and start-hidden states | P8, beginning with `P8-001` | Native Windows behavior, unambiguous Quit, status parity between shell and tray |
| Keyboard, screen-reader, high-contrast, DPI and mixed-monitor visual verification | P8, `P8-023` and `P8-024` | No mouse/color-only dependency; native view remains aligned at 100–200% scaling |
| Final InboxRail name, icons and release assets | P9, beginning with `P9-001` | Consistent installed identity and signed-release assets; `_ui` remains reference-only |

## Translation rules

- Reproduce the account rail and trusted shell as local application UI; render provider-owned pages only in the bounded remote content region.
- Treat the design's notification wording as visual copy, not a domain change. Production levels and actions follow the contracts established in P7.
- Windows controls final native notification and tray rendering. Match identity, account naming, iconography, and state where the platform permits rather than promising pixel-identical native chrome.
- Use account color as a supporting cue only. Every status also needs text, iconography, or an accessible name.
- Preserve the design's restrained motion and honor `prefers-reduced-motion`; pulses must be bounded and never be the only signal.
- Keep the original three supplied artifacts unchanged so later implementation can be compared with the source reference.

## Visual acceptance cadence

P1 establishes reusable tokens and shell primitives. P2 and P3 are the first end-to-end visual checkpoint using fake accounts and provider-view fixtures. P7 adds the state-rich rules and notification screens. P8 completes accessibility, DPI, tray, and Windows integration QA. P9 changes identity/release assets only; it is not the phase for a wholesale UI rewrite.
