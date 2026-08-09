# InboxRail UI design reference

These files are the Claude Code design exploration supplied for InboxRail. The artifact uses the working product name **Aviary** and the term **Perches** for accounts; production implementation should use **InboxRail** and the account terminology established by the application domain unless a later product decision says otherwise.

## Contents

- `Aviary.dc.html` — seven design screens covering the main window, suspended account state, account settings, rules, notifications, focus/quiet hours, and tray menu.
- `support.js` — generated support runtime used by the design artifact.
- `Aviary design screens review.zip` — original review bundle, including its preview image.

## Implementation boundary

This directory is a versioned design reference, not production source. Re-create the interface in the local React shell using reviewed, repository-owned components and CSS. Do not import or ship `support.js`, its dynamic evaluation/runtime behavior, CDN scripts, or remote fonts. Provider pages remain native remote views and must not be restyled, scraped, or coupled to their DOM.

The phase-by-phase implementation plan is documented in [the UI design implementation map](../docs/ui-design-implementation.md) and linked from the delivery roadmap.
