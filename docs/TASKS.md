# InboxRail Granular Task Plan

**Status:** Ready for execution  
**Phase plan:** [ROADMAP.md](./ROADMAP.md)  
**Technical boundaries:** [ARCHITECTURE.md](./ARCHITECTURE.md)

## 1. Codex execution protocol

Use this file as the implementation queue. Work in phase order unless a dependency explicitly permits overlap.

For every task:

1. Read the cited architecture and roadmap sections plus the task’s dependencies.
2. Inspect the repository and preserve unrelated/user changes.
3. Implement the smallest complete change that satisfies the task.
4. Add or update the specified automated tests and fixtures.
5. Run the narrow tests first, then the repository’s required quality suite.
6. Record material design changes as an ADR and update all three planning documents if IDs, scope, or gates change.
7. Mark the checkbox complete only when the acceptance statement is demonstrably true.

Tasks may be combined in one change only when they share the same boundary and every individual acceptance statement remains auditable. Never combine a security-negative test with a later cleanup task; boundary enforcement and its tests land together.

### Global completion requirements

Every task must preserve these invariants:

- Remote mail views have no Node, preload, app IPC, arbitrary navigation, or default native permissions.
- Browser partitions and API credentials remain separate and account-scoped.
- Secrets and mail metadata do not enter logs unless the architecture explicitly permits a redacted field.
- A suspended account has no live `WebContentsView` or `webContents`, but monitoring can continue.
- Provider baselines do not notify old mail; replays do not duplicate alerts.
- Main remains lint-clean, type-safe, testable, and packageable.

### Status notation

- `[ ]` not started
- `[~]` in progress; include a short note in the implementation PR/commit, not in this baseline file
- `[x]` accepted with evidence
- `[!]` blocked; document the blocker, attempted alternatives, and decision owner

## 2. P0 — Feasibility, threat model, and baselines

### P0-001 — Record the reference environment

- [x] **Depends:** none. **Do:** capture Windows build, CPU, RAM, storage, display scaling, Node/package-manager version, and intended Electron support policy in `docs/performance-baseline.md`. **Accept:** another developer can identify an equivalent benchmark environment without guessing; no machine username or secret is recorded.

### P0-002 — Select and pin the toolchain

- [x] **Depends:** P0-001. **Do:** evaluate the current supported Electron major, Node LTS, package manager, TypeScript, React, Vite, and Electron Forge compatibility; add ADR-015 with exact-version/pinning policy. **Accept:** a compatibility table and upgrade cadence exist, and all choices respect ADR-001/013.

### P0-003 — Spike the Forge/Vite/TypeScript package path

- [x] **Depends:** P0-002. **Do:** create a disposable minimal Forge Vite TypeScript app and produce a Windows package. **Accept:** clean install/build/package commands are recorded; the packaged app launches without a dev server; any experimental-plugin limitation has a decision.

### P0-004 — Spike secure shell/view composition

- [x] **Depends:** P0-003. **Do:** compose a local shell with one `WebContentsView`, resize it below a mock tab strip, and load dedicated provider sign-in test pages using production-equivalent web preferences. **Accept:** Gmail and Microsoft sign-in render without enabling Node, preload, insecure content, experimental features, or disabled sandbox/web security.

### P0-005 — Prove persistent partition isolation

- [ ] **Depends:** P0-004. **Do:** create two UUID-backed `persist:` partitions and sign into two dedicated test identities or use a deterministic cookie fixture. **Accept:** identity/cookie/local-storage state does not cross partitions and both partitions retain their own state after full application restart.

### P0-006 — Prove explicit renderer cleanup

- [ ] **Depends:** P0-004. **Do:** instrument process IDs/count and process-tree working set while creating, detaching, closing, and releasing a `WebContentsView` 20 times. **Accept:** `webContents.close()` removes each renderer, listeners/references do not grow, and results are attached to the baseline report.

### P0-007 — Establish initial memory scenarios

- [ ] **Depends:** P0-001, P0-004, P0-006. **Do:** measure shell-only, one live provider view, two live views, and six live views with a documented warm-up/sampling method and at least three runs. **Accept:** raw and summarized samples exist, variance is stated, and architecture budgets are accepted or revised through one evidence-backed ADR.

### P0-008 — Spike packaged SQLite native loading

- [ ] **Depends:** P0-003. **Do:** read/write/migrate a small database with `better-sqlite3` in development and packaged execution, including ASAR/native unpack behavior. **Accept:** both paths pass on Windows 11 from a clean checkout; otherwise an ADR selects and proves a fallback.

### P0-009 — Spike Windows notification and activation

- [ ] **Depends:** P0-003. **Do:** display normal and critical notifications with local icons/group IDs and restore/focus the app from activation. **Accept:** behavior and Windows limitations are recorded; notification content contains only fixture data; unsupported cases fail visibly.

### P0-010 — Spike tray and shutdown semantics

- [ ] **Depends:** P0-003. **Do:** add a disposable tray, hide/show flow, explicit Quit, and single-instance activation. **Accept:** hiding leaves the process alive, Quit closes it, second launch focuses the first instance, and no orphan renderer remains.

### P0-011 — Validate Gmail desktop OAuth constraints

- [ ] **Depends:** P0-002. **Do:** configure a dedicated Google test project/client, PKCE loopback flow, `gmail.metadata`, offline access, and identity lookup; document consent and restricted-scope distribution implications. **Accept:** authorization and refresh work without a client secret, callback state is validated, and tokens/codes are absent from logs/source.

### P0-012 — Validate Microsoft public-client OAuth constraints

- [ ] **Depends:** P0-002. **Do:** configure a dedicated Entra public client for MSAL Node with `Mail.ReadBasic`, test personal and work/school identities where available, and document tenant/admin constraints. **Accept:** interactive then silent acquisition works without a client secret and cache-protection approach is proven.

### P0-013 — Produce the threat model

- [ ] **Depends:** P0-004, P0-005, P0-011, P0-012. **Do:** document assets, trust boundaries, entry points, abuse cases, mitigations, and residual risk for remote content, IPC, OAuth, credentials, SQLite, notifications, downloads, update/install, and diagnostics. **Accept:** each high-risk threat maps to an owner task and no mitigation weakens ADR-012.

### P0-014 — Close Gate A

- [ ] **Depends:** P0-001 through P0-013. **Do:** assemble the feasibility report and decision checklist. **Accept:** every Gate A item in ROADMAP is linked to reproducible evidence; blockers are resolved by ADR or the project is explicitly stopped before P1.

## 3. P1 — Secure application foundation

### P1-001 — Initialize the production repository

- [ ] **Depends:** P0-014. **Do:** create the pinned Forge/Vite/TypeScript project with package metadata, editor settings, `.gitignore`, lockfile, and documented commands. **Accept:** a clean checkout installs and launches using only the README; no spike/test credentials or generated packages are tracked.

### P1-002 — Define source and TypeScript boundaries

- [ ] **Depends:** P1-001. **Do:** create `main`, `preload`, `renderer`, and `shared` projects/aliases with strict TypeScript flags and import restrictions. **Accept:** renderer/preload builds cannot import main-only Electron/database modules; deliberate violation fixtures fail lint/type checks.

### P1-003 — Configure the local shell renderer

- [ ] **Depends:** P1-002. **Do:** add the smallest React root, error boundary, theme variables, and router/settings placeholder without a component framework. **Accept:** shell renders in dev/package, an exception produces safe recovery UI, and no remote script/font is required.

### P1-004 — Register a secure production protocol

- [ ] **Depends:** P1-002. **Do:** serve packaged shell assets from a privileged `app://inboxrail` protocol with normalized path handling. **Accept:** traversal, unknown host, non-existent asset, and unsafe MIME tests fail closed; production does not use `file://`.

### P1-005 — Add the shell CSP and web preferences

- [ ] **Depends:** P1-003, P1-004. **Do:** enforce sandbox, context isolation, disabled Node integration, production CSP, and no unsafe inline/eval in the shell. **Accept:** Electron security warnings are absent in production-equivalent E2E and negative code cannot access Node/Electron globals.

### P1-006 — Define versioned shared schemas

- [ ] **Depends:** P1-002. **Do:** choose a runtime schema library and define safe IDs, colors, rectangles, account stubs, errors, commands, results, and events. **Accept:** schemas reject oversized strings, invalid UUID/color/rect, unknown fields where required, and prototype-pollution payloads.

### P1-007 — Implement the narrow preload bridge

- [ ] **Depends:** P1-005, P1-006. **Do:** expose a frozen `window.inboxRail` V1 API with one health/version query and event subscribe/unsubscribe. **Accept:** no generic send/invoke/channel API or Electron object is exposed; listener cleanup is tested on reload/unsubscribe.

### P1-008 — Implement IPC registration and sender validation

- [ ] **Depends:** P1-006, P1-007. **Do:** create typed handler registration that validates shell `webContents`, exact shell origin, payload, and safe error mapping. **Accept:** messages from a test remote view, subframe, stale shell, wrong origin, and malformed payload are rejected and logged only by safe code.

### P1-009 — Add structured redacted logging

- [ ] **Depends:** P1-002. **Do:** implement allowlisted structured fields, correlation IDs, rotation/size cap, safe error codes, and centralized redaction. **Accept:** canary tokens, auth codes, cookies, emails, subjects, query strings, and provider payloads never appear in unit/integration log snapshots.

### P1-010 — Add lifecycle and single-instance skeleton

- [ ] **Depends:** P1-003, P1-009. **Do:** implement single-instance lock, main-window create/show/focus, shutdown cancellation signal, and ordered service disposal. **Accept:** second launch focuses the first, shutdown completes once, and idempotent disposal tests pass.

### P1-011 — Configure code quality

- [ ] **Depends:** P1-002. **Do:** add formatter, ESLint/security/import rules, typecheck, unit tests, coverage reporting, and deterministic timezone/locale test settings. **Accept:** each command is independent, returns correct exit codes, and an intentional failure is detected.

### P1-012 — Configure integration and Electron E2E tests

- [ ] **Depends:** P1-003, P1-007, P1-010. **Do:** choose/configure the Electron-capable E2E runner, fixture user-data directories, screenshots/traces on failure, and cleanup. **Accept:** shell launch, preload health call, reload, and quit pass without sharing developer profile state.

### P1-013 — Add production build/package smoke

- [ ] **Depends:** P1-003 through P1-012. **Do:** package then launch the artifact in an isolated temporary user-data directory and verify version/health/exit. **Accept:** the smoke fails on missing assets/native dependencies and leaves no running process.

### P1-014 — Add Windows CI

- [ ] **Depends:** P1-011, P1-012, P1-013. **Do:** run install with lockfile, lint, typecheck, unit, integration, E2E, and package smoke on Windows; archive safe diagnostics on failure. **Accept:** CI has bounded timeouts/cancellation and never uploads user data or secrets.

### P1-015 — Document dependency and secret policy

- [ ] **Depends:** P1-001, P1-009. **Do:** document supported update cadence, lockfile review, production dependency audit, environment/config separation, and prohibition on client secrets. **Accept:** setup uses placeholder/public client IDs only and repository secret scan passes.

### P1-016 — Close the secure-foundation gate

- [ ] **Depends:** P1-001 through P1-015. **Do:** review foundation against architecture sections 5, 13, 14, and 17. **Accept:** M1 demo and all P1 verification pass; unresolved findings have blocking tasks before any live remote content is enabled.

## 4. P2 — Persistence, accounts, and rail shell

### P2-001 — Create database lifecycle service

- [ ] **Depends:** P1-016, P0-008. **Do:** open SQLite under the Electron user-data path, set busy timeout/foreign keys, decide WAL from spike evidence, and close/checkpoint on shutdown. **Accept:** concurrent-process lock and unclean-exit fixtures produce safe errors/recovery; paths never come from renderer input.

### P2-002 — Implement transactional migrations

- [ ] **Depends:** P2-001. **Do:** add numbered/checksummed forward migrations, schema version table, transaction handling, and pre-migration recoverable copy policy. **Accept:** new, upgrade, checksum mismatch, syntax failure, and interrupted migration tests prove no silent destructive reset.

### P2-003 — Create the V1 schema

- [ ] **Depends:** P2-002. **Do:** add tables/indexes/FKs for accounts, credentials references, sync state, bounded message index, rules, alerts, settings, and migrations. **Accept:** constraints prevent duplicate partition/message/event keys and cascade only documented account-owned data.

### P2-004 — Implement validated repository mappings

- [ ] **Depends:** P2-003, P1-006. **Do:** create named repositories with prepared statements, domain mapping, runtime validation, and safe corruption errors. **Accept:** services issue no ad hoc SQL and modified-row fixtures cannot create unsafe provider/partition/rule objects.

### P2-005 — Implement settings repository/service

- [ ] **Depends:** P2-004. **Do:** define typed defaults and persistence for memory mode, polling interval, close/start behavior, quiet hours, mute defaults, retention, and last active account. **Accept:** invalid/unknown values fall back or error per schema without rewriting unrelated settings.

### P2-006 — Implement account creation

- [ ] **Depends:** P2-004. **Do:** validate provider/name/color and generate UUID, immutable `persist:inboxrail-account-<UUID>`, canonical provider URL, and transactional sort order. **Accept:** duplicate/race-like requests create distinct valid accounts and no email address enters the partition name.

### P2-007 — Implement account update/enable behavior

- [ ] **Depends:** P2-006. **Do:** support rename, color, mute, and enabled changes while rejecting partition/provider mutation. **Accept:** rename does not change session identity; disabling emits the state change needed for later view/monitor cleanup.

### P2-008 — Implement transactional account reorder

- [ ] **Depends:** P2-006. **Do:** accept the complete ordered enabled-account ID set, validate membership/cardinality, and compact integer positions in one transaction. **Accept:** missing/duplicate/foreign IDs leave order unchanged; restart returns deterministic order.

### P2-009 — Implement account removal orchestration stub

- [ ] **Depends:** P2-006. **Do:** require a typed confirmation, delete logical rows/credentials reference transactionally, and emit a cleanup request for future SessionManager. **Accept:** cancel/no-match does nothing; one account’s removal cannot affect another; failed physical cleanup is retryable.

### P2-010 — Expose account/settings IPC

- [ ] **Depends:** P2-005 through P2-009, P1-008. **Do:** add typed list/create/update/reorder/remove/select/settings handlers and domain events. **Accept:** schema/sender/error tests cover every endpoint and remote views remain invalid senders.

### P2-011 — Build the account rail layout

- [ ] **Depends:** P1-003, P2-010. **Do:** render provider icon, color marker, name, unread placeholder, monitor/view status, selected state, add button, and horizontal overflow. **Accept:** six to twenty fixture accounts remain usable at 100–200% scaling and narrow supported window width.

### P2-012 — Add mouse/touch drag reorder

- [ ] **Depends:** P2-008, P2-011. **Do:** use `dnd-kit` horizontal sorting with optimistic visual movement and persisted commit/rollback. **Accept:** saved order matches visible order after restart; failed persistence restores server order with accessible feedback.

### P2-013 — Add keyboard-accessible reorder

- [ ] **Depends:** P2-012. **Do:** provide documented focus/keyboard reorder operations and announcements. **Accept:** all accounts can be selected/reordered without a pointer; focus remains predictable; accessibility test assertions pass.

### P2-014 — Build account create/edit UI

- [ ] **Depends:** P2-006, P2-007, P2-010. **Do:** add provider, display name, color palette/custom validated color, mute, enabled, save/cancel, and field errors. **Accept:** form cannot submit invalid data, keyboard/focus handling passes, and cancel persists nothing.

### P2-015 — Build safe account removal UI

- [ ] **Depends:** P2-009, P2-014. **Do:** explain browser/API data impact, require explicit account-name confirmation, and show cleanup result. **Accept:** default action is cancel, wrong text blocks removal, and another account stays selected/unchanged.

### P2-016 — Build settings shell

- [ ] **Depends:** P2-005, P2-010. **Do:** create memory mode, poll interval, quiet-hours, close/start, retention, privacy, and diagnostics placeholders with save/reset behavior. **Accept:** persisted settings restore after restart and invalid quiet-hour/range combinations are prevented.

### P2-017 — Add fake provider/state mode

- [ ] **Depends:** P2-010, P2-011. **Do:** supply deterministic fake accounts, unread/priority/status events, and errors only in test/development mode. **Accept:** production package cannot enable fake mode through renderer input or command-line options forbidden by policy.

### P2-018 — Add migration fixture matrix

- [ ] **Depends:** P2-002 through P2-005. **Do:** check in safe databases for empty/current/prior/corrupt/invalid-row cases and test upgrades. **Accept:** every checked-in schema version upgrades or presents the documented recovery path.

### P2-019 — Add account/rail E2E suite

- [ ] **Depends:** P2-011 through P2-017. **Do:** cover create, edit, color, select, mouse/keyboard reorder, overflow, disable, remove/cancel, reload, and restart. **Accept:** tests use isolated data and assert persisted state plus absence of uncaught errors.

### P2-020 — Close the account-domain phase

- [ ] **Depends:** P2-001 through P2-019. **Do:** review schema/contracts/UX and capture M2-precondition evidence with six fake accounts. **Accept:** P2 roadmap exit criteria pass and P3/P4 can consume stable account IDs, partitions, settings, and events.

## 5. P3 — Session isolation and renderer lifecycle

### P3-001 — Define provider web-policy contract

- [ ] **Depends:** P2-020, P0-004. **Do:** model canonical URLs, allowed main-frame origins, popup/external classification, permissions, downloads, and safe sign-in hints. **Accept:** Gmail and Microsoft policies are data-driven/testable; unknown provider/origin defaults to deny.

### P3-002 — Implement session retrieval/configuration

- [ ] **Depends:** P3-001. **Do:** create `SessionManager` that validates immutable partition names, calls `session.fromPartition`, applies handlers once, and returns account-scoped sessions. **Accept:** malformed/default/shared partitions are rejected and repeated retrieval does not duplicate listeners.

### P3-003 — Enforce permission deny-by-default

- [ ] **Depends:** P3-002. **Do:** install permission check/request handlers denying notifications, media, geolocation, MIDI, HID, serial, Bluetooth, filesystem, and capture. **Accept:** positive/negative test pages prove denied permissions never prompt and unsupported permission values fail closed.

### P3-004 — Enforce navigation policy

- [ ] **Depends:** P3-001, P3-002. **Do:** guard main-frame navigation/redirects by parsed HTTPS origin and provider policy; deny unsafe schemes, localhost, file paths, and unknown origins. **Accept:** a table-driven security suite covers allowed sign-in/webmail and hostile variants including lookalike hosts/userinfo/ports.

### P3-005 — Enforce window/popup policy

- [ ] **Depends:** P3-001, P3-002. **Do:** install `setWindowOpenHandler`, keep only approved provider flows, and reject or safely externalize other URLs. **Accept:** remote content cannot create unrestricted Electron windows; target/disposition/features cannot bypass URL validation.

### P3-006 — Implement validated external links

- [ ] **Depends:** P3-004, P3-005. **Do:** classify eligible HTTPS links and call `shell.openExternal` only with a normalized approved URL, optionally after confirmation. **Accept:** non-HTTPS, credential-bearing, local-network, oversized, malformed, and policy-denied URLs never reach the shell API.

### P3-007 — Implement safe download handling

- [ ] **Depends:** P3-002. **Do:** intercept downloads, require explicit save destination from native dialog, sanitize default names, expose progress/cancel, and never execute files. **Accept:** silent/path-traversal/duplicate-name/cancel tests pass and mail views cannot choose arbitrary paths.

### P3-008 — Define lifecycle state machine

- [ ] **Depends:** P2-005. **Do:** implement pure transitions/invariants for ACTIVE/WARM/SUSPENDED, one active account, activation request IDs, crashes, disable/remove/reset, and shutdown. **Accept:** exhaustive unit tests reject impossible/stale transitions.

### P3-009 — Implement lifecycle memory policies

- [ ] **Depends:** P3-008. **Do:** encode Lean cap 1, Balanced cap 2/TTL 2m, Instant cap 4/TTL 10m with LRU eviction and injectable clock. **Accept:** table tests cover cap reduction, TTL expiry, rapid reselection, disabled accounts, and explicit suspend.

### P3-010 — Create secure mail views

- [ ] **Depends:** P3-002 through P3-005, P3-008. **Do:** create `WebContentsView` with account partition and required secure preferences, no preload, registered listeners, and canonical load. **Accept:** runtime inspection tests prove Node/preload/app bridge absence and correct partition/provider URL.

### P3-011 — Implement safe native-view layout

- [ ] **Depends:** P3-010, P2-011. **Do:** accept validated shell content bounds, convert for DPI/window content coordinates, attach active view below rail, and update on resize/maximize. **Accept:** view cannot cover trusted controls or escape window bounds under invalid/racy bounds.

### P3-012 — Implement activation race control

- [ ] **Depends:** P3-008, P3-010, P3-011. **Do:** serialize/identify activation requests and ignore/close stale view creation/load completions. **Accept:** rapid A→B→C selections always end with C visible/active and no extra renderer beyond policy.

### P3-013 — Implement WARM detach/reattach

- [ ] **Depends:** P3-009 through P3-012. **Do:** detach inactive eligible view, retain bounded references/timer/LRU metadata, and instantly reattach when selected. **Accept:** warm view is invisible/non-overlapping, reattach uses same `webContents`, and timer cancellation has no leaks.

### P3-014 — Implement suspension cleanup

- [ ] **Depends:** P3-013. **Do:** remove child view, unregister listeners, close `webContents`, clear timers/references, and emit state/diagnostics. **Accept:** suspended account has no live view/webContents and repeated suspension/disposal is idempotent.

### P3-015 — Add startup/last-account restoration

- [ ] **Depends:** P3-012, P2-005. **Do:** wait for shell/layout readiness, select valid last account, and load no other view. **Accept:** disabled/missing last account falls back predictably; startup renderer count never exceeds one.

### P3-016 — Add loading/sign-in/error overlays

- [ ] **Depends:** P3-010 through P3-015. **Do:** map safe load/session/crash states to local shell overlays with retry/status actions. **Accept:** remote error text/URLs are not injected as HTML and retry cannot create duplicate views.

### P3-017 — Handle renderer crash/unresponsive events

- [ ] **Depends:** P3-014, P3-016. **Do:** transition crashed view to suspended/error, clean references, record safe code, and enforce user-driven retry/backoff after repeats. **Accept:** simulated crashes affect one account and leave lifecycle cap/invariants intact.

### P3-018 — Implement manual reload and suspend

- [ ] **Depends:** P3-012 through P3-017. **Do:** expose typed selected-account reload and any-account “Suspend now” commands with status feedback. **Accept:** reload stays in the same partition; suspend obeys explicit user request even in Instant mode.

### P3-019 — Implement cache/session reset

- [ ] **Depends:** P3-002, P3-014. **Do:** after explicit confirmation, suspend the account and clear only its partition cookies/storage/cache as specified. **Accept:** another partition is byte/state unchanged; failures are actionable; monitoring credentials are not removed.

### P3-020 — Complete account-removal partition cleanup

- [ ] **Depends:** P2-009, P3-019. **Do:** consume cleanup requests, close view, clear account partition, record retryable tombstone/result, and never reconstruct deleted account state. **Accept:** cleanup is idempotent and exact-target tests prove no cross-account deletion.

### P3-021 — Add shutdown cleanup

- [ ] **Depends:** P3-014, P1-010. **Do:** stop lifecycle timers, detach/close all views, remove listeners, and await bounded cleanup before quit. **Accept:** package smoke exits with no orphan Electron process and second disposal is harmless.

### P3-022 — Add session-isolation E2E tests

- [ ] **Depends:** P3-002 through P3-021. **Do:** test cookies/storage across at least two fixture partitions, restart persistence, reset one, and remove one. **Accept:** automated evidence detects any shared default session or cross-partition mutation.

### P3-023 — Add lifecycle/security E2E tests

- [ ] **Depends:** P3-003 through P3-021. **Do:** cover mode caps/TTL/LRU, rapid switching, crash/retry, unsafe navigation/popup/permission/download/external-link attempts, and shutdown. **Accept:** process count, visible account, denied action, and safe logs are asserted.

### P3-024 — Close the multi-session phase

- [ ] **Depends:** P3-001 through P3-023. **Do:** run M2 with dedicated real provider sessions where available plus lifecycle benchmark. **Accept:** P3 roadmap exit criteria and Gate B remote-view controls pass; evidence identifies provider-origin exceptions narrowly.

## 6. P4 — OAuth, credential protection, and provider framework

### P4-001 — Define normalized provider contracts

- [ ] **Depends:** P2-020, P1-006. **Do:** implement versioned TypeScript/runtime schemas for provider identity, normalized message, sync batch, cursor reference, provider error, and adapter methods. **Accept:** provider-specific fields cannot leak past adapters and invalid timestamps/addresses/importance/batches are rejected.

### P4-002 — Implement provider registry

- [ ] **Depends:** P4-001. **Do:** map provider kind to exactly one monitoring adapter and one web policy using explicit construction/dependency injection. **Accept:** unknown/duplicate provider registration fails at startup with a safe configuration error; tests can substitute fake adapters.

### P4-003 — Create abortable safe HTTP client

- [ ] **Depends:** P4-001, P1-009. **Do:** wrap the selected HTTP facility with timeout, `AbortSignal`, bounded response size, safe status/headers, `Retry-After` parsing, and redacted telemetry. **Accept:** URLs/query/auth/body never leak; timeout/cancel/oversize/malformed JSON/throttle tests return classified safe errors.

### P4-004 — Implement credential-store interface

- [ ] **Depends:** P2-003, P4-001. **Do:** define store/load/delete/availability operations keyed by account/provider with ciphertext/version metadata and no renderer exposure. **Accept:** invalid provider/account/blob versions fail account-scoped; repositories never return decrypted values outside credential services.

### P4-005 — Implement Google credential encryption

- [ ] **Depends:** P4-004. **Do:** use asynchronous Electron `safeStorage` after app-ready, persist ciphertext in SQLite, handle temporary unavailability/key rotation, and zero/release plaintext buffers where practical. **Accept:** restart/decrypt/delete work and canary refresh/access tokens are absent from DB plaintext scan/logs/IPC.

### P4-006 — Implement encrypted MSAL cache persistence

- [ ] **Depends:** P4-004, P0-012. **Do:** integrate an MSAL Node cache plugin protected by DPAPI and account-scoped locking/reference storage. **Accept:** silent acquisition survives restart, parallel access does not corrupt cache, delete disconnects only the target account, and cache bytes are not plaintext.

### P4-007 — Build OAuth loopback listener

- [ ] **Depends:** P1-010. **Do:** bind only `127.0.0.1` on an ephemeral port, accept one expected callback path/request, enforce timeout/body/header limits, return a minimal close-browser page, and dispose on all exits. **Accept:** wrong method/path/state/host, duplicate callback, timeout, cancel, and shutdown tests leave no listener.

### P4-008 — Implement PKCE/state transaction store

- [ ] **Depends:** P4-007. **Do:** generate cryptographically strong state/verifier/challenge, bind to account/provider/expiry, consume exactly once, and retain only transiently. **Accept:** replay, mismatch, expired transaction, and cross-account callback fail closed without logging values.

### P4-009 — Implement validated system-browser authorization launch

- [ ] **Depends:** P4-008, P3-006. **Do:** construct provider authorization URLs from allowlisted endpoints and encoded parameters, then use the system browser. **Accept:** no renderer-supplied URL/redirect/scope can alter the request and canceled/failed launch returns safe UX.

### P4-010 — Implement OAuth coordinator state machine

- [ ] **Depends:** P4-005 through P4-009. **Do:** model DISCONNECTED/AUTHORIZING/BASELINING/HEALTHY/AUTH_REQUIRED/ERROR transitions, per-account mutual exclusion, cancellation, and adapter handoff. **Accept:** concurrent clicks create one flow; stale completions cannot authorize the wrong account; restart never resumes an interactive flow automatically.

### P4-011 — Implement identity binding/mismatch flow

- [ ] **Depends:** P4-010, P2-007. **Do:** compare provider identity with confirmed account identity and require explicit resolution on mismatch; use normalized address comparison. **Accept:** monitoring remains paused until resolved, display-name similarity never auto-links, and browser cookies are never inspected for matching.

### P4-012 — Implement monitoring status persistence/view models

- [ ] **Depends:** P4-010, P2-004. **Do:** persist safe state, last success/error code, next due/backoff, baseline flag, and expose redacted shell status. **Accept:** transient process restart restores scheduler intent but never persists access tokens or raw provider errors in status.

### P4-013 — Implement injectable scheduler clock/randomness

- [ ] **Depends:** P4-001. **Do:** add clock, timer, and jitter interfaces so due work/backoff/sleep tests are deterministic. **Accept:** scheduler unit tests use no real sleep and can advance through days of behavior quickly.

### P4-014 — Implement scheduler due queue and fairness

- [ ] **Depends:** P4-002, P4-012, P4-013. **Do:** schedule enabled healthy accounts at configured interval with per-account jitter and fair ordering. **Accept:** six accounts do not poll simultaneously/starve; disabled/disconnected/auth-required accounts never enter the run queue.

### P4-015 — Enforce concurrency and account exclusion

- [ ] **Depends:** P4-014. **Do:** cap provider requests globally at two and active syncs per account at one, including pagination rounds. **Accept:** stress tests prove caps and queue recovery after throw/cancel/timeout.

### P4-016 — Implement retry/backoff classification

- [ ] **Depends:** P4-003, P4-015. **Do:** apply transient/throttle/auth/cursor/config/unknown policies, exponential jitter, `Retry-After`, and 15-minute cap. **Accept:** auth/config do not retry-loop, throttle is honored, success resets backoff, and one account cannot delay others.

### P4-017 — Handle offline and network recovery

- [ ] **Depends:** P4-014 through P4-016. **Do:** pause new syncs while offline, cancel/settle in-flight work safely, and stagger accounts after recovery. **Accept:** an offline interval creates no queued burst or false auth error and resume never overlaps prior work.

### P4-018 — Handle sleep/resume

- [ ] **Depends:** P4-014 through P4-017. **Do:** cancel at suspend, record safe checkpoint, and schedule bounded jittered reconciliation on resume. **Accept:** fixed-clock tests prove no duplicate timers/syncs/alerts and long sleep respects catch-up policy.

### P4-019 — Add fake provider end-to-end harness

- [ ] **Depends:** P4-001 through P4-018. **Do:** implement a deterministic test adapter for baseline, pagination, replay, throttle, auth expiry, cursor reset, cancellation, and malformed data. **Accept:** it drives the real coordinator/scheduler/status/credential seams without production activation.

### P4-020 — Expose authorization/status IPC and UI

- [ ] **Depends:** P4-010 through P4-012, P2-014. **Do:** add Connect/Reconnect/Cancel/Disconnect controls and separate web-session vs monitoring status. **Accept:** the user can distinguish both credentials, no sensitive provider error is shown, and disconnect never clears browser partition.

### P4-021 — Close the provider-framework phase

- [ ] **Depends:** P4-001 through P4-020. **Do:** run fake-provider flows, OAuth attack matrix, plaintext/log scans, scheduler stress, and suspended-view monitoring demo. **Accept:** P4 roadmap exit criteria and OAuth portions of Gate B pass; contracts are frozen for P5/P6.

## 7. P5 — Gmail metadata monitoring

### P5-001 — Add Gmail public-client configuration

- [ ] **Depends:** P4-021, P0-011. **Do:** define build-time Google client ID/redirect/scopes with environment validation and test-project setup docs. **Accept:** no client secret is accepted; missing/placeholder production config blocks Connect with actionable safe UI.

### P5-002 — Implement Gmail authorization adapter

- [ ] **Depends:** P5-001, P4-005, P4-007 through P4-010. **Do:** generate desktop PKCE authorization, exchange code, request offline access, store credential material, refresh as needed, and revoke/delete on disconnect. **Accept:** first auth/restart refresh/revocation/denial tests pass and secrets remain main-process only.

### P5-003 — Resolve Gmail identity

- [ ] **Depends:** P5-002, P4-011. **Do:** retrieve the authenticated profile email and stable provider identity needed for binding. **Accept:** normalized identity is returned without using browser cookies; mismatch path is covered.

### P5-004 — Implement Gmail API request layer

- [ ] **Depends:** P4-003, P5-002. **Do:** add authenticated request/retry refresh behavior, typed response validation, pagination token handling, and provider request correlation. **Accept:** one silent refresh retry is bounded, malformed/oversized responses are safe, and auth headers/URLs are redacted.

### P5-005 — Implement Gmail error classifier

- [ ] **Depends:** P5-004, P4-016. **Do:** map auth/consent, quota/throttle, transient network/server, invalid history cursor, forbidden scope, and invalid configuration errors. **Accept:** fixture table maps each case to the intended scheduler/account state without raw response text.

### P5-006 — Implement unread-count reconciliation

- [ ] **Depends:** P5-004. **Do:** query only required unread/inbox metadata and compute/store the provider count with pagination or estimate semantics explicitly documented. **Accept:** zero/large/paginated/malformed cases pass and no body data is requested.

### P5-007 — Implement quiet Gmail baseline

- [ ] **Depends:** P5-003, P5-006. **Do:** obtain current history ID plus unread state, seed required message index metadata without alert candidates, and return baseline cursor transactionally. **Accept:** established mailbox fixtures with many unread messages update badge and emit zero alerts.

### P5-008 — Implement history pagination

- [ ] **Depends:** P5-004, P5-007. **Do:** call `users.history.list` from cursor, follow page tokens, and collect relevant message/label changes with loop/page/size limits. **Accept:** empty, multi-page, duplicate-page-item, invalid-token, and malicious-loop fixtures are bounded.

### P5-009 — Fetch minimal message headers

- [ ] **Depends:** P5-008. **Do:** fetch changed message metadata limited to labels and `From`, `Subject`, `Date` headers; normalize absent/multiple/encoded headers. **Accept:** body/raw/attachments are never requested or persisted and malformed headers yield safe normalized defaults/errors.

### P5-010 — Map Gmail changes to normalized batch

- [ ] **Depends:** P5-008, P5-009, P4-001. **Do:** coalesce added/deleted/label changes, determine unread state, deduplicate message IDs, and emit next history cursor. **Accept:** message updated multiple ways in a round becomes one deterministic normalized change.

### P5-011 — Implement Gmail cursor-reset recovery

- [ ] **Depends:** P5-005, P5-007, P5-010. **Do:** on expired/invalid history ID, mark reset, rebuild quiet baseline, reconcile unread, and resume future incrementals. **Accept:** reset emits no historic notifications and does not disconnect/clear account credentials.

### P5-012 — Add periodic unread reconciliation policy

- [ ] **Depends:** P5-006, P5-010. **Do:** reconcile after configurable number/time of incremental rounds and after resume/reset, correcting drift safely. **Accept:** fixture-induced drift converges without treating count correction as new messages.

### P5-013 — Add Gmail contract fixtures

- [ ] **Depends:** P5-005 through P5-012. **Do:** create hand-authored/redacted responses for baseline, new unread, read, delete, label, pagination, replay, throttle, auth expiry, malformed data, and invalid history. **Accept:** fixtures contain no real account/token/message data and schema tests explain each scenario.

### P5-014 — Add Gmail adapter contract tests

- [ ] **Depends:** P5-013. **Do:** run the adapter against fixtures through the real HTTP abstraction/scheduler contract. **Accept:** cursor, request fields/scopes, normalized output, classifications, cancellation, and quiet behavior are asserted.

### P5-015 — Add Gmail account status UX

- [ ] **Depends:** P5-003, P5-005, P4-020. **Do:** show connected identity, last sync, backoff, permission/reconnect need, and metadata-only explanation. **Accept:** UI never displays tokens/raw errors and offers no broader-scope workaround.

### P5-016 — Create dedicated Gmail smoke procedure

- [ ] **Depends:** P5-014, P5-015. **Do:** document opt-in test-account setup and scenarios for connect, baseline, new mail, read, restart, sleep/offline, revoke, and reset. **Accept:** procedure prevents personal-data capture and includes cleanup/revocation.

### P5-017 — Run and record Gmail smoke evidence

- [ ] **Depends:** P5-016. **Do:** execute on a dedicated account and record redacted timings/state/results only. **Accept:** all scenarios pass or each failure has an owner/blocker; no message content/identity is committed.

### P5-018 — Close Gmail monitoring

- [ ] **Depends:** P5-001 through P5-017. **Do:** review scope, requests, state, recovery, privacy, and release implications. **Accept:** P5 roadmap exit criteria pass and Gmail monitoring continues with its web view suspended.

## 8. P6 — Microsoft Graph metadata monitoring

### P6-001 — Add Microsoft public-client configuration

- [ ] **Depends:** P4-021, P0-012. **Do:** define Entra client ID, authority/account audience, loopback redirect, `Mail.ReadBasic`, and identity scopes with validation/setup docs. **Accept:** no client secret/application permission is accepted and unsupported tenant config produces safe guidance.

### P6-002 — Implement MSAL authorization adapter

- [ ] **Depends:** P6-001, P4-006 through P4-010. **Do:** perform public-client interactive auth/PKCE, select exact cached account, acquire silently after restart, and remove target cache account on disconnect. **Accept:** personal/work flows where available, cancel/denial/cache-miss, and multi-account isolation tests pass.

### P6-003 — Resolve Microsoft identity

- [ ] **Depends:** P6-002, P4-011. **Do:** derive/verify stable home-account ID and primary display email/UPN using token/account claims or minimal profile request. **Accept:** identity binding handles aliases/tenant forms explicitly and never uses Outlook browser cookies.

### P6-004 — Implement Graph request layer

- [ ] **Depends:** P4-003, P6-002. **Do:** add token acquisition, typed Graph response validation, opaque next/delta link following, request bounds, and safe telemetry. **Accept:** links are accepted only from Graph HTTPS policy, auth is bounded, and tokens/query state are redacted.

### P6-005 — Implement Graph error classifier

- [ ] **Depends:** P6-004, P4-016. **Do:** classify consent/admin/conditional-access/auth, throttle, transient, invalid/expired delta, permission/config, and malformed response. **Accept:** fixture table produces intended account/backoff/reset state and honors `Retry-After`.

### P6-006 — Resolve Inbox folder safely

- [ ] **Depends:** P6-004. **Do:** use well-known Inbox or provider-supported lookup without localized-name assumptions and retain only required folder ID. **Accept:** personal/work fixtures resolve correctly and missing/inaccessible Inbox becomes actionable, not a broad mailbox query.

### P6-007 — Implement Graph unread reconciliation

- [ ] **Depends:** P6-004, P6-006. **Do:** query Inbox unread state/count using least data and document count semantics. **Accept:** zero/large/throttled/malformed fixtures pass and body/preview/attachments are never selected.

### P6-008 — Implement quiet initial delta round

- [ ] **Depends:** P6-006, P6-007. **Do:** issue Inbox messages delta with minimal `$select`, follow all `nextLink`s, seed index/unread, and commit terminal `deltaLink` without alerting. **Accept:** multi-page established mailbox updates badges and emits zero alerts; partial round commits no cursor.

### P6-009 — Implement incremental delta rounds

- [ ] **Depends:** P6-008. **Do:** follow stored opaque `deltaLink` and every `nextLink`, bound pages/size, handle created/updated/removed items, and return only the new terminal link. **Accept:** empty/multi-page/replayed/removed/malicious-loop fixtures are deterministic and bounded.

### P6-010 — Normalize Graph messages

- [ ] **Depends:** P6-009, P4-001. **Do:** map ID, sender/from, subject, received time, isRead, importance, and conversation ID; validate missing/null variants. **Accept:** no body/preview/attachment/extension enters output or storage and multiple changes coalesce by message ID.

### P6-011 — Implement Graph delta-reset recovery

- [ ] **Depends:** P6-005, P6-008, P6-009. **Do:** handle `410 Gone`/sync-state-not-found by quiet rebaseline and unread reconciliation. **Accept:** old mail does not notify, credentials/account remain connected, and future incrementals resume.

### P6-012 — Add periodic unread reconciliation policy

- [ ] **Depends:** P6-007, P6-009. **Do:** reconcile after configured rounds/time and resume/reset. **Accept:** artificial drift corrects without generating a new-message event.

### P6-013 — Add Graph contract fixtures

- [ ] **Depends:** P6-005 through P6-012. **Do:** create redacted personal/work fixtures for baseline, new/update/delete, pagination, replay, throttle, auth/admin failure, malformed data, and delta invalidation. **Accept:** no real tenant/account/token/message data exists and every fixture has expected state/output.

### P6-014 — Add Graph adapter contract tests

- [ ] **Depends:** P6-013. **Do:** exercise adapter through real HTTP/scheduler contracts. **Accept:** scopes, `$select`, opaque links, transactional-round assumptions, normalized output, classification, cancel, and quiet behavior are asserted.

### P6-015 — Add Microsoft account status UX

- [ ] **Depends:** P6-003, P6-005, P4-020. **Do:** show identity type, last sync/backoff, admin/permission/reconnect status, and metadata-only explanation. **Accept:** conditional-access/admin issues are actionable without suggesting broader permissions and no token/raw error is exposed.

### P6-016 — Create dedicated Microsoft smoke procedures

- [ ] **Depends:** P6-014, P6-015. **Do:** document opt-in Outlook.com and M365 work/school tests for connect, baseline, new/read/delete, restart, sleep/offline, revoke/admin denial, and reset. **Accept:** procedures use dedicated accounts/tenant, prevent data capture, and include cleanup.

### P6-017 — Run and record Microsoft smoke evidence

- [ ] **Depends:** P6-016. **Do:** execute all available account-type scenarios and record redacted state/timing/results. **Accept:** unsupported/unavailable tenant coverage becomes an explicit release limitation, not an untested claim.

### P6-018 — Close Microsoft monitoring

- [ ] **Depends:** P6-001 through P6-017. **Do:** review permissions, selected properties, cache, delta behavior, recovery, and privacy. **Accept:** P6 roadmap exit criteria pass and Graph monitoring continues with Outlook web view suspended.

## 9. P7 — Ingestion, rules, badges, and notifications

### P7-001 — Implement canonical text/address normalization

- [ ] **Depends:** P4-001, P5-018, P6-018. **Do:** add Unicode normalization, locale-stable case handling, email/domain parsing, subject handling, timestamp normalization, and presentation-vs-comparison fields. **Accept:** international, malformed, empty, alias/case, IDN, and oversized fixtures are deterministic and cannot throw during ingestion.

### P7-002 — Implement transactional sync-batch ingestion

- [ ] **Depends:** P2-004, P7-001. **Do:** validate batch, upsert/delete bounded message index, create candidate event keys, update counts, and commit cursor in one database transaction. **Accept:** injected failure at every step rolls back cursor/data/events together; network/notifications never run inside the transaction.

### P7-003 — Implement message/event idempotency keys

- [ ] **Depends:** P7-002. **Do:** define provider-neutral keys for message state and first-observed-new-unread alert transition with unique constraints. **Accept:** duplicate pages, round replay, scheduler retry, and process restart create one message state and at most one alert candidate.

### P7-004 — Integrate quiet baseline semantics

- [ ] **Depends:** P7-002, P5-007, P6-008. **Do:** mark baseline batches and seed counts/index/cursor without alert candidates. **Accept:** baselines from both providers with thousands of fixture unread items emit zero notifications and preserve future-change detection.

### P7-005 — Implement bounded restart catch-up

- [ ] **Depends:** P7-003, P2-005. **Do:** use fixed-clock 15-minute default window, cap individual notifications at three, group overflow by account, and distinguish first install/baseline. **Accept:** long-offline, clock-skew, many-account, and setting-disabled cases have deterministic outcomes without historic storms.

### P7-006 — Define the versioned rule schema

- [ ] **Depends:** P2-003, P7-001. **Do:** model ordered enabled rules, ALL/ANY conditions, V1 field/operator/value types, actions, and `stopProcessing` with schema version. **Accept:** every architecture V1 condition/action is representable and future/unknown versions fail safely.

### P7-007 — Implement rule validation and compilation

- [ ] **Depends:** P7-006. **Do:** validate cardinality/length/type combinations, normalize comparison values, compile to immutable evaluator objects, and return field-specific safe errors. **Accept:** invalid rule JSON never reaches ingestion and a saved rule produces identical compiled output after restart.

### P7-008 — Implement non-regex conditions

- [ ] **Depends:** P7-007. **Do:** implement account/provider/sender/domain/name/subject/importance/unread operators and ALL/ANY behavior as pure functions. **Accept:** table tests cover case/Unicode, exact-vs-contains, subdomain boundaries, empty values, and negative operators.

### P7-009 — Implement safe subject regex

- [ ] **Depends:** P7-007. **Do:** constrain pattern length/flags, reject known unsafe complexity, bound input length and execution strategy, and surface validation errors before save. **Accept:** catastrophic-pattern corpus is rejected or safely bounded and valid expressions have deterministic case/Unicode behavior.

### P7-010 — Implement deterministic rule evaluation

- [ ] **Depends:** P7-008, P7-009. **Do:** order by sort order then UUID, begin with account defaults, replace only explicitly set action fields, stop on terminal, and return matched IDs/redacted trace. **Accept:** exhaustive fixtures prove ordering, tie-break, field merge, suppression, terminal, disabled rules, and no mutation.

### P7-011 — Implement rule repository/service

- [ ] **Depends:** P7-006, P7-007, P2-004. **Do:** CRUD/reorder/enable rules transactionally with compilation-before-save and compact positions. **Accept:** invalid/duplicate/missing reorder inputs do nothing; delete/update affects no other rule; events update shell/ingestor cache.

### P7-012 — Add rule list and reorder UI

- [ ] **Depends:** P7-011, P2-012, P2-013. **Do:** show ordered name, enabled, condition summary, action level, terminal indicator, mouse/keyboard reorder, duplicate/delete. **Accept:** order/enable survive restart, focus/announcements pass, and summaries reveal no live mail data.

### P7-013 — Build rule condition editor

- [ ] **Depends:** P7-006 through P7-009, P7-011. **Do:** provide typed field/operator controls, ALL/ANY grouping, account/provider selectors, normalized preview, regex validation, and add/remove. **Accept:** impossible operator/value combinations cannot be saved and all validation is keyboard/screen-reader accessible.

### P7-014 — Build rule action editor

- [ ] **Depends:** P7-006, P7-011. **Do:** edit suppression/level/sound/pulse/badge/acknowledgment/terminal fields and explain precedence. **Accept:** mutually exclusive combinations are prevented and arbitrary paths/commands/auto-open are impossible.

### P7-015 — Implement rule simulator

- [ ] **Depends:** P7-010, P7-013, P7-014. **Do:** accept synthetic sender/subject/account/provider/importance/unread input, invoke the production evaluator, and display matched rules/final actions/redacted trace. **Accept:** simulation writes no message/alert state and sends no toast unless a separate explicit test-notification action is used.

### P7-016 — Implement notification-plan builder

- [ ] **Depends:** P7-010. **Do:** translate account defaults and rule evaluation into a pure plan containing suppression, level, sound, pulse, badge, acknowledgment, and safe account/event IDs. **Accept:** plan contains no raw credential/provider payload and table tests cover all combinations.

### P7-017 — Implement unread and priority aggregates

- [ ] **Depends:** P7-002, P7-010. **Do:** maintain/recompute account unread and priority unread totals from indexed state/rule outcomes with repair query. **Accept:** add/read/delete/rule-change/rebaseline/restart fixtures converge to the same counts and never go negative.

### P7-018 — Connect account rail badges and bounded pulse

- [ ] **Depends:** P7-017, P2-011. **Do:** send typed aggregate events to shell and render no-unread/unread/priority/badge/muted states with a time-limited reduced-motion-aware pulse. **Accept:** correct account/color updates without tab selection, animation settles, and high counts have defined display.

### P7-019 — Implement mute, pause, and quiet-hours policy

- [ ] **Depends:** P2-005, P7-016. **Do:** apply per-account mute, app-wide pause, local-time quiet hours, DST/overnight ranges, and explicit critical bypass after rules but before delivery. **Accept:** fixed-clock/timezone matrix proves precedence; badges/history continue while toast is suppressed.

### P7-020 — Implement rate limiting and grouping

- [ ] **Depends:** P7-005, P7-016, P7-019. **Do:** set per-account/global windows, group overflow, preserve allowed critical behavior, and persist minimal rate state needed across restart. **Accept:** flood tests bound toast count, never starve other accounts, and do not duplicate on restart.

### P7-021 — Build account-colored notification icon service

- [ ] **Depends:** P2-006. **Do:** generate/cache local Windows-compatible icon assets from allowlisted template and account color, with deterministic path/key and fallback. **Accept:** no remote image/path is accepted, cache cleanup is bounded, and contrast/render smoke passes across palette colors.

### P7-022 — Implement native notification delivery

- [ ] **Depends:** P7-016, P7-019 through P7-021, P0-009. **Do:** create deterministic notification/group IDs, safe title/body, level urgency/timeout, local icon, sound behavior, success/failure events, and explicit test notification. **Accept:** Windows-supported behavior matches architecture and failed delivery becomes safe status/history without retry storm.

### P7-023 — Implement notification activation routing

- [ ] **Depends:** P7-022, P3-012, P1-010. **Do:** centrally validate opaque activation ID, resolve retained alert/account, restore/focus window, and select account; handle cold/warm activation. **Accept:** forged/deleted/stale IDs do nothing harmful and real activation selects exactly the originating account without trusting subject/address.

### P7-024 — Implement alert history and acknowledgment

- [ ] **Depends:** P7-003, P7-016, P7-022. **Do:** persist redacted delivery/suppression/group/ack state and build filtered account/level/time UI with acknowledge/clear-expired operations. **Accept:** history retention works, no body/token/raw cursor is stored, and clearing history cannot alter unread provider state.

### P7-025 — Add exhaustive rules/policy tests

- [ ] **Depends:** P7-001 through P7-024. **Do:** create data-driven suites for normalization, each condition/operator, merge/terminal, regex attacks, DST quiet hours, mute/pause, grouping, rate limits, dedupe, and repair aggregates. **Accept:** mutation/branch coverage target chosen in P1 is met for rules/policy core with no real network/time.

### P7-026 — Add provider-to-notification E2E

- [ ] **Depends:** P5-018, P6-018, P7-025. **Do:** run fake Gmail/Graph batches through scheduler, ingestion, rules, badges, notification mock/native smoke, activation, history, restart, and replay. **Accept:** each account/color/level routes correctly, baseline is quiet, replay is single-delivery, and suspended views remain absent.

### P7-027 — Close background intelligence

- [ ] **Depends:** P7-001 through P7-026. **Do:** run M3 demo and Gate C review with six mixed fake/dedicated accounts. **Accept:** roadmap P7 exit criteria pass; native notifications remain opt-in/default-safe until all correctness checks are green.

## 10. P8 — Windows integration, hardening, recovery, and performance

### P8-001 — Implement production tray menu

- [ ] **Depends:** P7-027, P0-010. **Do:** add Show/Hide, monitoring Pause/Resume, safe unread summary, Settings, and Quit with dynamic enabled/check states. **Accept:** menu never includes subject/sender, works after shell reload, and disposes icon/listeners on Quit.

### P8-002 — Implement close-to-tray education and setting

- [ ] **Depends:** P8-001, P2-005. **Do:** default first close to an explanatory choice, persist “hide/quit/ask,” and keep monitoring only when hidden. **Accept:** cancel/hide/quit paths are unambiguous, keyboard accessible, and explicit Quit always exits.

### P8-003 — Implement monitoring pause/resume UX

- [ ] **Depends:** P8-001, P4-014. **Do:** pause new scheduled work, cancel or settle active work safely, show paused state in shell/tray, and stagger resume. **Accept:** cursor transactions remain valid, pause survives configured scope (session or persisted decision), and resume creates no burst.

### P8-004 — Implement start-with-Windows/start-hidden

- [ ] **Depends:** P8-002, P2-005. **Do:** use Electron/Windows login-item support, opt-in toggle, start-hidden option, and status verification. **Accept:** toggles reflect actual OS state, no elevation is requested, and disabled setting leaves no startup entry.

### P8-005 — Finalize single-instance activation

- [ ] **Depends:** P1-010, P7-023. **Do:** route second launches and approved notification activations through one validated activation queue during startup. **Accept:** rapid launches/activation before shell ready focus one instance and do not create duplicate windows/views/monitors.

### P8-006 — Integrate Windows power events

- [ ] **Depends:** P4-018, P8-003. **Do:** connect suspend/resume/lock/unlock signals to scheduler and diagnostics without weakening lifecycle policy. **Accept:** repeated power-event simulations produce one resume schedule, no stale listener, and no automatic auth prompt.

### P8-007 — Integrate network-state recovery

- [ ] **Depends:** P4-017, P8-003. **Do:** combine OS/HTTP evidence into conservative offline status and safe probe/resume behavior. **Accept:** captive/partial/provider-specific failure does not mark all credentials invalid or create tight probes.

### P8-008 — Finalize ordered graceful shutdown

- [ ] **Depends:** P3-021, P4-014, P8-001. **Do:** stop activation, timers, monitors/OAuth, notifications, views, database, logs, tray in documented bounded order. **Accept:** forced timeout path is safe, normal package exit leaves no process/listener/loopback port and next start reports clean state.

### P8-009 — Add database health and recovery screen

- [ ] **Depends:** P2-001, P2-002. **Do:** detect open/integrity/migration failure before monitors, preserve files, offer redacted diagnostics and documented restore/reset choices with explicit confirmation. **Accept:** no automatic destructive reset and fixture failures produce recoverable instructions.

### P8-010 — Add corrupted-state quarantine

- [ ] **Depends:** P2-004, P8-009. **Do:** quarantine account-scoped invalid rows/ciphertexts/cursors/rules, keep other accounts running, and expose safe repair/reset actions. **Accept:** corrupt fixtures never crash startup or broaden cleanup scope; exact data retained for recovery according to privacy policy.

### P8-011 — Add renderer crash-loop protection

- [ ] **Depends:** P3-017. **Do:** persist short-lived safe crash counters, back off repeated recreation, and offer reset session/status choices. **Accept:** crash fixture cannot spin CPU/processes and clearing one loop does not alter other accounts.

### P8-012 — Clean stale account artifacts safely

- [ ] **Depends:** P3-020, P7-021. **Do:** enumerate only application-owned partition tombstones/icon cache entries through validated manifest/database references and delete in bounded batches. **Accept:** dry-run/exact-path tests prove no broad directory/glob deletion and failures retry safely.

### P8-013 — Build diagnostics health screen

- [ ] **Depends:** P1-009, P4-012, P3-014. **Do:** show app/runtime/schema/encryption/notification status, view states/count, process memory, sync timing/backoff safe codes, signing/update channel. **Accept:** no subjects/senders/message IDs/raw cursors/credentials/cookies/partition paths appear.

### P8-014 — Implement redacted diagnostics export

- [ ] **Depends:** P8-013. **Do:** generate previewable bounded text/JSON report with allowlisted fields and native save dialog. **Accept:** canary secret/mail fields across DB/logs/errors are absent and renderer cannot choose/write arbitrary path directly.

### P8-015 — Configure Electron fuses

- [ ] **Depends:** P1-013, P0-003. **Do:** configure/review `RunAsNode`, Node options/inspect, ASAR integrity, app-only-from-ASAR, and other compatible fuses for packaged artifacts. **Accept:** package inspection test reads expected fuse values and application/E2E still function.

### P8-016 — Harden packaging and dependency inventory

- [ ] **Depends:** P8-015. **Do:** enforce ASAR/native unpack allowlist, production-dependency pruning, lockfile audit, license/SBOM generation, secret/source-map inspection, and artifact size report. **Accept:** unexpected executable/native/module/file causes the package check to fail.

### P8-017 — Complete automated security regression suite

- [ ] **Depends:** P3-023, P4-021, P7-023, P8-015. **Do:** test remote Node/IPC access, schemes/origins/popups/permissions/downloads, shell payloads, OAuth attacks, forged activation, corrupt DB, CSP, fuses, and plaintext canaries. **Accept:** each architecture threat case has at least one negative assertion and safe log check.

### P8-018 — Finalize threat model and residual risks

- [ ] **Depends:** P0-013, P8-017. **Do:** update controls/evidence, assess DPAPI same-user boundary, provider content, supply chain, installer/update, local data, and diagnostics. **Accept:** no unmitigated high risk; accepted residual risks appear in security/privacy documentation.

### P8-019 — Build repeatable performance harness

- [ ] **Depends:** P0-007, P3-023. **Do:** collect process-tree working set/private bytes/CPU/process count and launch/switch timings with warm-up, sampling, fixtures, run IDs, and machine metadata. **Accept:** three-run results are machine-readable/comparable and harness leaves no processes/profile data.

### P8-020 — Automate lifecycle leak benchmark

- [ ] **Depends:** P8-019, P3-014. **Do:** run at least 20 activate/warm/suspend cycles in each mode and assert final renderer count plus memory-growth gate. **Accept:** CI fixture version is deterministic and a real-provider manual variant is documented.

### P8-021 — Benchmark all memory modes with six accounts

- [ ] **Depends:** P8-019, P8-020, P5-017, P6-017. **Do:** measure shell, Lean, Balanced, Instant, and six-live-view comparison on reference Windows machine including hidden background CPU. **Accept:** raw/summary evidence evaluates every architecture budget with provider/network caveats.

### P8-022 — Resolve performance regressions

- [ ] **Depends:** P8-021. **Do:** profile and fix view leaks, eager imports/views, timers, animations, DB retention, poll bursts, or shell bundle costs without disabling security/background throttling. **Accept:** budgets pass or one permitted P0 evidence-backed budget ADR exists; no unexplained regression remains.

### P8-023 — Complete accessibility review

- [ ] **Depends:** P7-027, P8-001. **Do:** test keyboard-only flows, focus order/restoration, screen-reader names/live announcements, reduced motion, high contrast, color independence, and notification/rule forms. **Accept:** critical workflows need no mouse/color-only cue and automated/manual findings are resolved or release-blocked.

### P8-024 — Complete high-DPI/multi-monitor/window review

- [ ] **Depends:** P3-011, P8-023. **Do:** test 100/125/150/200% scaling, resize/maximize/snap, supported minimum size, mixed-DPI monitor movement, tray/menu, and native view alignment. **Accept:** remote view never covers rail, clips unsafe controls, or remains offscreen after display change.

### P8-025 — Close Windows-ready beta

- [ ] **Depends:** P8-001 through P8-024. **Do:** assemble M4 reliability/security/accessibility/performance evidence and run an all-day reference-machine soak. **Accept:** roadmap P8 exit criteria pass with no runaway CPU, renderer growth, unhandled error, orphan process, or cross-account failure.

## 11. P9 — Packaging, beta, and V1 release

### P9-001 — Finalize product identity and assets

- [ ] **Depends:** P8-025. **Do:** set final name/app ID/executable/company metadata, Windows icon sizes, tray/notification assets, version source, and legal ownership notes. **Accept:** identity is stable across installer, process, Start menu, Settings, notification attribution, and upgrades.

### P9-002 — Finalize Windows installer maker

- [ ] **Depends:** P9-001, P0-003. **Do:** configure the selected Forge maker, per-user install path, shortcuts, app identity, ASAR/native files, and deterministic artifact naming. **Accept:** package/make works from clean checkout and installer requests no unnecessary elevation.

### P9-003 — Configure code signing

- [ ] **Depends:** P9-002. **Do:** integrate certificate/secure signing service variables, timestamping, local unsigned path, and signature verification without storing private material in repository/logs. **Accept:** CI/release procedure yields valid signed binaries and fails closed when release signing is unavailable.

### P9-004 — Test clean install and first launch

- [ ] **Depends:** P9-003. **Do:** install signed candidate on clean Windows user/VM and verify shortcuts, identity, protocol/assets, SQLite/native module, notifications, tray, and first-close education. **Accept:** no prerequisite/manual file copy/admin rights are needed beyond documented Windows behavior.

### P9-005 — Create upgrade fixture releases

- [ ] **Depends:** P9-002, P2-018. **Do:** retain safe prior-beta installer/database/config/partition fixtures and scripted before/after assertions. **Accept:** fixtures contain no real credentials/mail but exercise all migrations and settings evolution.

### P9-006 — Test in-place upgrade preservation

- [ ] **Depends:** P9-005, P9-003. **Do:** upgrade a configured prior fixture and verify accounts/order/rules/settings, encrypted credential usability, partitions/web login fixture, sync cursors, icons, and startup entry. **Accept:** upgrade is non-destructive and failure/retry path is documented.

### P9-007 — Test downgrade/rollback recovery policy

- [ ] **Depends:** P9-006. **Do:** define whether downgrade is unsupported or restore-based, detect newer schema safely, and document recovery. **Accept:** an older build never silently mutates/resets a newer database.

### P9-008 — Test uninstall and user-data policy

- [ ] **Depends:** P9-004. **Do:** verify program/shortcut/startup removal and implement/document explicit user-data retention/removal choice without broad deletion. **Accept:** exact paths are verified, another app/profile is untouched, and recovery status is clear.

### P9-009 — Decide and document update channel

- [ ] **Depends:** P9-002, P9-003. **Do:** select manual download or supported signed auto-update for V1, including metadata/signature/rollback policy; do not add unproven update code. **Accept:** application accurately reports channel/version and security ownership; deferred auto-update is clearly documented if chosen.

### P9-010 — Write privacy and local-data documentation

- [ ] **Depends:** P8-018, P8-014. **Do:** explain metadata accessed/stored, retention, cookies vs API tokens, DPAPI limits, logs/diagnostics, provider scopes, no cloud backend, reset/remove/uninstall. **Accept:** statements match implementation and Gmail/Microsoft policies; no capability is overstated.

### P9-011 — Write installation and first-run guide

- [ ] **Depends:** P9-004. **Do:** document supported Windows, install/signature checks, first launch, tray/close behavior, memory modes, and account setup sequence. **Accept:** a fresh tester completes setup without source/dev tooling.

### P9-012 — Write provider authorization guide

- [ ] **Depends:** P5-018, P6-018. **Do:** explain separate web login/API monitoring, requested scopes, Google consent status, Microsoft tenant/admin cases, identity mismatch, reconnect/disconnect/revoke. **Accept:** guide never asks for passwords/client secrets or suggests weakening tenant/security controls.

### P9-013 — Write rules and notification guide

- [ ] **Depends:** P7-027. **Do:** document conditions/actions/order/terminal/suppression, examples, quiet hours/mute/pause, catch-up/grouping, Windows visual limits, test notification, activation. **Accept:** examples match evaluator tests and do not imply body rules or guaranteed toast coloring.

### P9-014 — Write troubleshooting and recovery guide

- [ ] **Depends:** P8-009 through P8-014. **Do:** cover web sign-in, API auth, tenant consent, offline/throttle, cursor reset, crash loop, notification settings, database recovery, session reset, diagnostics export. **Accept:** steps are reversible/scoped and never instruct deletion of broad user-data paths.

### P9-015 — Publish known limitations/support matrix

- [ ] **Depends:** P5-017, P6-017, P8-021, P8-024. **Do:** state tested Windows/provider/account types, polling latency, memory variability, notification controls, unavailable push/deep links/body rules, and tenant restrictions. **Accept:** each unsupported/unverified scenario is explicit and consistent with release claims.

### P9-016 — Finalize notices, licenses, and SBOM

- [ ] **Depends:** P8-016, P9-002. **Do:** review production dependencies/assets/licenses, generate notices/SBOM, and include required files in artifact. **Accept:** inventory matches packaged contents and has no unapproved/restricted asset or dependency.

### P9-017 — Define beta plan and consent

- [ ] **Depends:** P9-004 through P9-016. **Do:** choose dedicated/non-sensitive testers, scenarios, duration, feedback channels, data-handling rules, severity definitions, and rollback. **Accept:** beta does not collect mailbox content/secrets and participants understand experimental provider authorization.

### P9-018 — Execute beta and soak matrix

- [ ] **Depends:** P9-017. **Do:** run clean install/upgrade, mixed accounts, all memory modes, rules/alerts, tray/startup, sleep/offline, all-day use, diagnostics, remove/uninstall on supported Windows matrix. **Accept:** results use redacted issue IDs/evidence and every release blocker is reproducible/owned.

### P9-019 — Triage and close beta blockers

- [ ] **Depends:** P9-018. **Do:** fix/retest critical/high security, data-loss, isolation, notification-flood, crash, packaging, and budget issues; explicitly disposition lower severity. **Accept:** no prohibited blocker remains and fixes include regression tests plus updated docs.

### P9-020 — Produce release candidate/provenance

- [ ] **Depends:** P9-019. **Do:** build from tagged clean source/lockfile, sign/timestamp, generate checksums/SBOM/notices/release notes, verify signatures/fuses/package contents, and record build provenance. **Accept:** artifacts are reproducible to documented tolerance and no untracked code/config enters release.

### P9-021 — Run final V1 acceptance

- [ ] **Depends:** P9-020. **Do:** execute all architecture acceptance criteria, Gate D, clean-install/upgrade/uninstall, real-provider smoke, security suite, performance budgets, and fresh-user setup walkthrough against exact RC. **Accept:** signed evidence references exact artifact hashes and all tests pass or release stops.

### P9-022 — Promote and close V1

- [ ] **Depends:** P9-021. **Do:** publish/promote signed artifacts through the chosen channel, publish docs/release notes/known limitations, retain provenance, and define support/security/dependency review cadence. **Accept:** users can verify/download/install the exact accepted artifact and rollback/support ownership is explicit.

## 12. Final cross-check checklist

Before calling the project complete, confirm:

- [ ] Every task `P0-001` through `P9-022` is accepted or explicitly removed by an approved scope ADR.
- [ ] Every phase exit criterion and Gates A–D in ROADMAP have linked evidence.
- [ ] Architecture acceptance criteria all pass against the signed release candidate.
- [ ] No task introduced a cloud service, DOM scraping, message-body storage, API write scope, arbitrary site, local command rule, or cross-platform claim without an approved scope/architecture change.
- [ ] Downloadable release documentation, source tag, artifact hashes/signatures, SBOM, and known limitations refer to the same version.
