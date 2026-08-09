# InboxRail Delivery Roadmap

**Status:** Execution plan  
**Target:** Windows 11 V1  
**Architecture source:** [ARCHITECTURE.md](./ARCHITECTURE.md)  
**Executable work items:** [TASKS.md](./TASKS.md)

## 1. How to use this roadmap

This roadmap orders work by risk and dependency, not by UI visibility. InboxRail’s largest uncertainties are remote-content security, provider authentication, `WebContentsView` lifecycle behavior, native SQLite packaging, and real memory usage. Those are proven before the product accumulates features on top of them.

Each phase has:

- an outcome that can be demonstrated;
- prerequisites and allowed parallel work;
- required deliverables;
- a verification plan;
- exit criteria that must all pass before the next dependent phase;
- task IDs in [TASKS.md](./TASKS.md).

Do not mark a phase complete because its code paths exist. A phase completes only when its exit evidence is committed: tests, benchmark output, screenshots where useful, ADRs for changed decisions, and updated documentation.

## 2. Release strategy

### 2.1 Milestones

| Milestone | Phases | Demonstrable result |
|---|---|---|
| M0 — Feasibility locked | P0 | Risk spikes pass and architectural decisions are evidence-backed |
| M1 — Secure shell | P1 | Packaged local React shell with typed IPC, CI, and security defaults |
| M2 — Multi-session browser | P2–P3 | Independent Gmail/Outlook tabs persist sessions and obey lifecycle caps |
| M3 — Background intelligence | P4–P6 | Gmail/Graph monitoring feeds normalized data, rules, badges, and notifications |
| M4 — Windows-ready beta | P7–P8 | Tray/startup/recovery, security/performance gates, signed installer, beta evidence |
| V1 — Stable local release | P9 | Upgrade-tested, documented, monitored release candidate promoted to V1 |

### 2.2 Quality policy

- `main` must remain buildable and testable after every merged task.
- Feature flags or disabled navigation are used when an internal slice is incomplete; half-secured remote content is never exposed.
- Provider network behavior is tested with fixtures/mocks in CI. Real mailbox tests are opt-in and run with dedicated test accounts.
- Security, lifecycle cleanup, and secret handling failures block merges.
- Memory budgets become blocking after the P0 benchmark protocol is approved.
- Version pins are deliberate. Dependency upgrades are separate, reviewable changes.

## 3. Dependency map

```text
P0 Feasibility and decisions
 └── P1 Secure application foundation
      ├── P2 Persistence, account domain, and shell UX
      │    └── P3 Session isolation and renderer lifecycle
      └── P4 OAuth and provider framework
           ├── P5 Gmail monitoring
           └── P6 Microsoft monitoring

P2 + P5 + P6
 └── P7 Ingestion, rules, badges, and notifications
      └── P8 Windows integration, hardening, and performance
           └── P9 Packaging, beta, and V1 release
```

P3 and P4 may proceed in parallel after P1 if their shared account contracts from P2 are stabilized first. P5 and P6 may proceed in parallel after the provider contract and credential-store interfaces in P4 are frozen. P7 must not assume that provider adapters emit changes in the same order or with identical replay behavior.

## 4. Cross-phase gates

### Gate A — Architecture viability

Required before P1 is considered stable:

- Gmail and Microsoft sign-in pages render under secure `WebContentsView` settings.
- Two partitions demonstrate cookie isolation and persistence after restart.
- Explicit `webContents.close()` returns renderer count/memory near baseline.
- `better-sqlite3` loads in development and a packaged Windows artifact.
- A basic native notification displays and activates the application.
- Gmail desktop OAuth and MSAL public-client flow are documented with redirect and distribution constraints.
- Electron Forge + Vite behavior is pinned or replaced through an ADR if the experimental plugin is unsuitable.

### Gate B — Security boundary

Required before connecting real personal mailboxes beyond dedicated test accounts:

- no Node integration/preload/app IPC in remote views;
- navigation, popup, permission, download, and external-link policies have negative tests;
- shell IPC validates sender and payload;
- credentials are encrypted at rest and redaction tests pass;
- threat model is reviewed and high-risk findings are resolved.

### Gate C — Monitoring correctness

Required before notifications can be enabled by default:

- initial baselines are quiet;
- replay and retry are idempotent;
- Gmail history reset and Graph delta reset recover cleanly;
- cursor advancement is transactional with ingestion;
- backoff honors throttling and does not synchronize the same account concurrently;
- message metadata remains within the documented privacy boundary.

### Gate D — Release readiness

Required before V1 distribution:

- real-provider smoke matrix passes;
- memory/startup/CPU/leak budgets pass;
- dependency/security/package inspection passes;
- signed installer upgrade/uninstall/notification identity pass on supported Windows 11 builds;
- Gmail restricted-scope verification/distribution decision is resolved;
- backup/recovery and known limitations are documented.

## 5. Phase plan

## P0 — Feasibility, threat model, and measurable baselines

**Objective:** Convert architectural assumptions into proven constraints before building the application foundation.

**Depends on:** Nothing.  
**Tasks:** `P0-001` through `P0-014`.  
**Size:** Medium, high uncertainty.

### Deliverables

- Decision log/ADRs for the current Electron major, package manager, Forge/Vite setup, SQLite driver, test framework, and Windows packaging maker.
- A disposable spike that composes a local shell and secure `WebContentsView`.
- Evidence of two persistent, isolated provider sessions.
- Renderer creation/destruction instrumentation and an initial process-tree memory report.
- Packaged native SQLite smoke test.
- Native Windows notification/tray smoke test.
- Gmail OAuth and MSAL proof/configuration notes using dedicated test registrations/accounts.
- Initial threat model and data-flow diagram.
- `docs/performance-baseline.md` with reference machine and repeatable sampling protocol.

### Verification

- Restart the spike and prove each partition retains only its own provider login.
- Inspect remote views for Node, preload, and app bridge absence.
- Repeatedly create/destroy a view and compare process count/working set.
- Run the packaged executable on a clean Windows user profile.
- Confirm no tokens, codes, cookies, email metadata, or test credentials appear in logs or Git status.

### Exit criteria

- Gate A passes.
- No high-severity threat-model item lacks an owner and target phase.
- Initial performance budgets are accepted or changed once through an evidence-backed ADR.
- The chosen foundation can package and launch on Windows 11 without manual copying of native files.
- The team knows whether intended Gmail distribution requires verification/security work beyond local test use and records that as a P9 dependency.

### Stop conditions

Stop and revise architecture if secure provider login cannot function with sandboxed/node-free views, partitions leak identity, destroying a view does not remove its renderer, or the SQLite driver cannot be packaged reproducibly. Do not work around these failures by weakening Electron security.

## P1 — Secure application foundation

**Objective:** Create a production-shaped Electron/TypeScript/React repository with enforced process boundaries and repeatable quality checks.

**Depends on:** P0 decisions and Gate A.  
**Tasks:** `P1-001` through `P1-016`.  
**Size:** Medium.

### Deliverables

- Electron Forge + Vite + TypeScript application with local React shell.
- Strict TypeScript projects/boundaries for main, preload, renderer, and shared contracts.
- Lint, formatting, unit test, integration test, Electron E2E, typecheck, and package scripts.
- Custom production protocol and restrictive CSP.
- Minimal versioned preload API; no generic IPC.
- Structured redacted logging, safe error mapping, single-instance behavior, and graceful shutdown skeleton.
- CI workflow that builds/tests on Windows and archives an unsigned development package.
- Dependency update and lockfile policy.

### Verification

- Production bundle contains no unexpected remote URLs or Node polyfills in the renderer.
- CSP/security warnings are treated as failures in development/E2E where practical.
- A malicious test page cannot access `require`, `process`, Electron, or arbitrary IPC.
- Clean checkout can install, typecheck, test, package, and launch using documented commands.

### Exit criteria

- Shell opens from packaged local content and shows version/build diagnostics.
- Typed IPC round-trip and event unsubscribe behavior pass tests.
- All automated foundation checks pass on Windows CI.
- No remote provider content is enabled yet unless Gate B controls protecting it already pass.

## P2 — Persistence, account domain, and rail shell

**Objective:** Implement the durable local model and complete account/tab UX without depending on live provider monitoring.

**Depends on:** P1.  
**Tasks:** `P2-001` through `P2-020`.  
**Size:** Large.

### Deliverables

- SQLite connection, WAL decision, migration runner, repositories, backup-on-migration safety, and corruption/migration failure UX.
- Account, settings, rules, sync-state, message-index, and alert-event schema baseline.
- Account creation/edit/removal service with immutable UUID partition name.
- React rail with provider icon, account color, display name, unread badge, status indicator, horizontal overflow, mouse drag, and keyboard reorder.
- Account settings/status screens and memory-mode selector.
- Typed shell subscription model for account/status updates.
- Seed/fake data mode for UI/E2E tests.

### Verification

- Migrations run on a new database and upgrade from every checked-in fixture version.
- Failed migration leaves the original database recoverable.
- Account names/colors/order survive restart; order remains valid under rapid concurrent-looking UI requests.
- Drag and keyboard reorder are accessible and persist the same result.
- Removing an account requires explicit confirmation and cascades only that account’s database rows.
- Invalid database values and IPC inputs are rejected safely.

### Exit criteria

- Six fake accounts can be created, recolored, reordered, disabled, and removed without provider code.
- The account rail meets keyboard/focus/contrast acceptance criteria.
- Database schema and repository contracts are stable enough for P3–P7.
- Migration, repository, and account-service tests pass in development and packaged smoke runs.

## P3 — Session isolation and renderer lifecycle

**Objective:** Deliver the central multi-account webmail experience while enforcing security and hard renderer caps.

**Depends on:** P1, account contract from P2, Gate B before real-account use.  
**Tasks:** `P3-001` through `P3-024`.  
**Size:** Large, high risk.

### Deliverables

- `ProviderWebPolicy`, `SessionManager`, `MailViewManager`, and `LifecyclePolicy`.
- Secure provider-specific partitions, navigation/popup/permission/download/external-link controls.
- Shell content-region measurement and safe native view layout.
- Explicit `ACTIVE/WARM/SUSPENDED` state machine with request-race protection.
- Lean/Balanced/Instant LRU/TTL policy and “Suspend now.”
- Loading, sign-in-required, network error, crash, and retry UX.
- Partition reset, cache clear, account removal cleanup, and shutdown cleanup.
- Lifecycle diagnostics and automated leak/process-count tests.

### Verification

- Six accounts can be represented while only the policy-permitted renderers exist.
- Switching rapidly cannot display the wrong account, overlap native views, or let a stale load steal focus.
- Each provider login persists after suspension and application restart.
- Cookies/local storage do not cross partitions.
- Unknown navigation, popups, permissions, certificate failures, unsafe downloads, and malicious external URLs are denied.
- Twenty lifecycle loops meet the renderer-count and provisional memory-leak gate.

### Exit criteria

- M2 multi-session demonstration passes with at least two Gmail sessions and two Microsoft sessions where test accounts are available.
- Remote security negative tests pass.
- All memory modes enforce their renderer caps under selection, timeout, crash, settings change, hide-to-tray, and shutdown.
- No DOM scraping or preload injection is present.

## P4 — OAuth, credential protection, and provider framework

**Objective:** Build the provider-independent monitoring control plane and secure delegated authorization.

**Depends on:** P1; account contract from P2.  
**Tasks:** `P4-001` through `P4-021`.  
**Size:** Large, high security sensitivity.

### Deliverables

- `MailProviderAdapter`, provider registry, normalized message/change/error contracts.
- OAuth coordinator with PKCE, state validation, cancellation, timeout, loopback binding, and system-browser launch.
- DPAPI-backed Google credential storage and encrypted MSAL cache persistence.
- Account identity verification/mismatch workflow.
- `MonitorScheduler` with injectable clock, jitter, per-account exclusion, global concurrency, backoff, offline/sleep/resume behavior.
- Provider-independent status states and shell UX.
- HTTP abstraction supporting abort, safe telemetry, `Retry-After`, fixtures, and contract tests.

### Verification

- OAuth state/PKCE/redirect attack tests fail closed.
- Credentials survive restart but appear nowhere in plaintext database scans, logs, renderer state, diagnostics, or crash data.
- Disconnect removes monitoring authorization without silently clearing the browser partition.
- Scheduler tests prove fairness, no overlapping per-account sync, bounded concurrency, and deterministic backoff.
- One account’s authorization failure does not pause other accounts.

### Exit criteria

- A fake provider completes baseline/incremental/error flows end-to-end through the scheduler.
- Gate B passes for the OAuth and credential boundary.
- Provider contracts are frozen for P5 and P6 except additive versioned changes.
- Monitoring remains functional with every corresponding mail view suspended.

## P5 — Gmail metadata monitoring

**Objective:** Implement quiet baseline, incremental Gmail change tracking, unread reconciliation, and recoverable authorization.

**Depends on:** P4.  
**Tasks:** `P5-001` through `P5-018`.  
**Size:** Medium to large.

### Deliverables

- Gmail desktop OAuth configuration and consent UX for `gmail.metadata`.
- Gmail identity lookup, baseline, history cursor, pagination, metadata header retrieval, unread reconciliation, and error classifier.
- Cursor-expiry/reset behavior.
- Recorded/redacted fixtures for normal, paginated, replayed, throttled, auth-expired, and history-invalid scenarios.
- Real Gmail test-account smoke procedure.

### Verification

- Baseline unread count is correct and emits zero alerts.
- A newly delivered unread message produces one normalized event with correct sender/subject/date.
- Mark-read/delete/label changes update local state without being treated as new mail.
- Replayed history pages and retry after transaction failure do not duplicate the event.
- Invalid history ID rebuilds state quietly and resumes incremental sync.
- API requests never ask for or retain bodies/attachments.

### Exit criteria

- Gmail contract and dedicated-account smoke suites pass.
- Provider scope and public-distribution implications are documented in the UI/privacy/release checklist.
- Gmail account stays healthy through restart, sleep/resume, temporary offline state, throttling, and forced reauthorization.

## P6 — Microsoft Graph metadata monitoring

**Objective:** Implement MSAL-backed quiet baseline and Graph message delta synchronization for personal and work/school accounts.

**Depends on:** P4.  
**Tasks:** `P6-001` through `P6-018`.  
**Size:** Medium to large.

### Deliverables

- MSAL public-client registration/configuration and `Mail.ReadBasic` consent UX.
- Personal Microsoft account and organizational tenant identity handling.
- Inbox folder resolution, quiet baseline, delta pagination, selected basic properties, unread reconciliation, and error classifier.
- Delta replay and invalidation/reset behavior.
- Recorded/redacted fixtures and real Outlook.com/Microsoft 365 test procedures.

### Verification

- Initial delta round follows all `nextLink` values, commits only the terminal `deltaLink`, and emits no old-mail alerts.
- Created/updated/deleted messages are idempotent and correctly normalized.
- Same change replayed across pages/rounds does not duplicate an alert.
- Expired/invalid delta token triggers a quiet reset.
- Throttling honors `Retry-After`; consent/admin-policy errors become actionable account states.
- Only basic properties are selected and persisted.

### Exit criteria

- Outlook.com and Microsoft 365 work/school smoke cases pass, or an unavailable tenant type is explicitly recorded as a release limitation.
- MSAL cache persists securely and silent token acquisition works after restart.
- Graph monitoring remains independent of Outlook web-view state.

## P7 — Ingestion, rules, badges, and notification engine

**Objective:** Turn provider changes into deterministic, low-distraction account state and Windows alerts.

**Depends on:** P2, P5, P6; Gate C.  
**Tasks:** `P7-001` through `P7-027`.  
**Size:** Large.

### Deliverables

- Transactional message ingestion, dedupe keys, bounded retention, cursor commit, and unread/priority aggregation.
- Versioned rule schema, validator/compiler, deterministic evaluator, safe regex policy, and simulator.
- Rule editor/list/reorder UI with sender, domain, subject, account, provider, importance, and unread conditions.
- Silent/normal/important/critical actions, suppression, sound, bounded tab pulse, badge label, acknowledgment.
- Quiet hours, per-account mute, app-wide pause, rate limiting, catch-up grouping, and alert history.
- Native notification icons/groups, activation routing, and Windows capability/error UX.
- Tab/tray badges fed only by normalized stored state.

### Verification

- A provider replay cannot create a second toast or alert row.
- Rule order, field replacement, terminal behavior, suppression, regex rejection, Unicode/case normalization, and default actions have exhaustive unit tables.
- Quiet hours/mute/pause/critical bypass combinations are deterministic under a fixed clock.
- Notification activation after app restart validates opaque IDs and selects the correct account.
- Flood scenario groups/rate-limits normal mail while preserving critical alerts according to settings.
- Subjects/senders do not enter logs or tray tooltips.

### Exit criteria

- M3 demonstration: six accounts monitored with only policy-permitted renderers; new test mail updates the right colored tab; rule-matched mail creates the expected Windows alert; clicking it selects the account.
- Gate C passes.
- Notification behavior passes on at least two supported Windows 11 builds/settings profiles.

## P8 — Windows integration, hardening, recovery, and performance

**Objective:** Make InboxRail dependable as an all-day Windows application and close security/performance gaps before packaging.

**Depends on:** P3 and P7.  
**Tasks:** `P8-001` through `P8-025`.  
**Size:** Large.

### Deliverables

- Tray menu, hide-to-tray education, explicit quit, pause/resume, start-with-Windows, start-hidden, single-instance activation.
- Sleep/resume/network transition behavior and graceful cancellation/checkpointing.
- Database recovery UI, crash-loop protection, renderer recovery, stale partition cleanup, and account-scoped error surfaces.
- Electron fuse configuration, ASAR integrity, dependency/SBOM checks, security regression suite, and finalized threat model.
- Redacted diagnostics screen/export.
- Automated lifecycle leak benchmark and repeatable real-provider Windows performance report for all memory modes.
- Accessibility and high-DPI/multi-monitor review.

### Verification

- Window/tray/startup behavior is correct across sign-in, close, hide, second launch, OS restart, and explicit quit.
- Power/network transitions do not create duplicate alerts, stuck OAuth listeners, concurrent syncs, or notification storms.
- Corrupted rows/tokens/cursors and renderer crashes produce recoverable, account-scoped UX.
- Package inspection confirms fuses, ASAR, production dependencies, no source maps/secrets not intended for distribution, and no unsafe renderer settings.
- Performance budgets pass with recorded raw samples and summary.

### Exit criteria

- M4 security, reliability, accessibility, and performance report has no unresolved release blocker.
- Gate D items not requiring signing/beta are complete.
- A beta package can run all day on the reference machine without renderer-count growth, runaway CPU, or unrecoverable account state.

## P9 — Packaging, beta validation, and V1 release

**Objective:** Produce a signed, upgrade-safe Windows installer and promote an evidence-backed release candidate.

**Depends on:** P8 and Gate D.  
**Tasks:** `P9-001` through `P9-022`.  
**Size:** Medium, external dependencies possible.

### Deliverables

- Final application identity, icon set, version metadata, installer maker, and code-signing configuration.
- Clean install, in-place upgrade, rollback/recovery, and uninstall tests on supported Windows 11 versions.
- Persistent partition/database/token preservation across upgrade.
- Privacy statement, security model, setup guide, provider authorization instructions, troubleshooting, diagnostics instructions, and known limitations.
- Release notes, checksums/signature verification, SBOM, and third-party notices.
- Time-boxed beta feedback and issue triage report.
- V1 tag/artifacts and post-release support/update plan.

### Verification

- SmartScreen/signature/app identity and notification activation are correct in signed artifacts.
- Installer needs no unnecessary elevation and uninstall removes program files while following the documented user-data choice.
- Upgrade from the previous beta fixture preserves accounts, order, rules, credentials, partitions, and sync state.
- Fresh Windows user can install, add one Gmail and one Microsoft account, authorize monitoring, receive/test a rule notification, restart, and retain both sessions using only the setup guide.
- Release artifact hash, signature, dependency inventory, and provenance are recorded.

### Exit criteria

- All Gate D items pass.
- No open critical/high security issue, data-loss issue, secret leak, notification flood, session-isolation failure, or performance-budget regression.
- Known medium/low issues have documented workarounds/owners or are explicitly accepted.
- V1 artifacts are reproducible from the tagged source and locked dependencies.

## 6. Critical path and sequencing notes

The critical path is:

```text
P0 WebContentsView/SQLite/OAuth feasibility
→ P1 security/process foundation
→ P2 account contracts
→ P4 provider framework
→ P5 and P6 adapters
→ P7 ingestion/rules/notifications
→ P8 hardening/performance
→ P9 signed release
```

P3 is also release-critical but can overlap P4–P6 after the account domain stabilizes. Avoid coupling browser-session completion to monitoring completion: an account may have a valid web login but disconnected monitoring, or healthy monitoring but a web sign-in page.

UI polish can overlap provider work only when it uses fake providers and stable shared contracts. Do not block correctness work on final icons, and do not let placeholder UI invent fields that bypass runtime validation.

## 7. Risk register

| Risk | Likelihood / impact | Early signal | Mitigation / decision point |
|---|---|---|---|
| Gmail restricted scope complicates public distribution | High / High | consent verification requirements | Clarify local/personal vs public release in P0; complete verification or constrain distribution before P9 |
| Provider sign-in/navigation origins change | Medium / High | login redirect denied | Encapsulate provider policies; telemetry with safe origin/error only; provider smoke tests |
| Gmail/Outlook renderer memory exceeds initial budget | High / High | P0/P3 benchmarks | Hard caps, no preload, explicit close, LRU/TTL; revise budget once by ADR if evidence requires |
| Forge Vite plugin breaking change | Medium / Medium | packaging/config instability | Pin exact versions; validate in P0; ADR to supported alternative while retaining Vite |
| Native SQLite packaging/rebuild failure | Medium / High | packaged module load error | P0 go/no-go spike; pin Electron ABI; Forge native-unpack/rebuild; ADR fallback driver |
| Microsoft organizational consent policy blocks account | Medium / Medium | admin consent/conditional access error | Actionable account status; document tenant limitation; never request broader permission as workaround |
| Webmail popup/permission needs conflict with deny-by-default policy | Medium / Medium | dedicated smoke flow fails | Add narrow provider-specific rule with negative tests and threat review |
| API/browser identities differ | Medium / High | provider API email differs from configured account | Explicit mismatch state and confirmation; never auto-link based on display name |
| Delta/history cursor expires or replays | High / Medium | invalid cursor/repeated event | Quiet baseline reset, transactional cursor, idempotent event key |
| Notification styling cannot match account color fully | High / Low | Windows ignores color expectation | Promise icon/accent/account naming, not full toast chrome; test custom XML only if needed |
| Windows sleep/resume causes bursts | Medium / Medium | many due polls/alerts on resume | cancel, jittered resume schedule, bounded catch-up grouping |
| Secret appears in logs/diagnostics | Low / Critical | redaction scan failure | denylist + allowlisted structured fields; test fixtures with canary secrets; release blocker |
| Provider UI update breaks login/use | Medium / High | real smoke failure | No DOM dependencies; canonical URLs/allowlists isolated; current Electron cadence |
| Code-signing/SmartScreen delays release | Medium / High | certificate/procurement not ready | Begin identity/signing decision during P0; do not defer procurement to P9 |

## 8. Deferred roadmap after V1

These items must not enter V1 tasks without an approved scope change:

- hosted Gmail push via `users.watch` and Microsoft change notifications;
- body/recipient/CC/attachment rule conditions;
- provider write actions or notification quick-reply;
- per-message deep links after stable provider URL research;
- cloud sync, multi-device profiles, encrypted export/import;
- custom Windows toast XML beyond what native options can reliably provide;
- calendar/unified inbox features;
- macOS/Linux builds;
- extension/plugin API or local-command rules;
- automatic updates, if the V1 distribution channel cannot support them safely;
- enterprise deployment/admin policy.

Each deferred feature must be evaluated against the remote-content trust boundary, provider scopes, privacy promise, and lean-memory budgets before planning.

## 9. V1 success criteria

V1 is successful when a user can:

1. Install a signed InboxRail build on Windows 11.
2. Add at least six mixed Gmail/Microsoft accounts, choose names/colors, and reorder them with mouse or keyboard.
3. Sign into each provider webmail independently and retain all sessions across restart.
4. Authorize metadata monitoring separately and understand web/API status at a glance.
5. Operate one active mailbox while background accounts are suspended and still receive correct unread updates.
6. Define sender/subject/account rules and get silent, normal, important, or critical behavior predictably.
7. Click a Windows notification to restore InboxRail and select the correct account.
8. Leave InboxRail in the tray all day within accepted memory/CPU budgets.
9. Recover from network loss, sleep/resume, expired authorization, invalid sync cursor, and renderer crash without losing other accounts.
10. Inspect/export redacted diagnostics and remove/reset an account without affecting any other identity.

The release is not successful if it achieves these workflows by keeping every webmail renderer alive, weakening Electron security, scraping provider pages, storing broad mail content, or requesting provider permissions beyond the documented metadata-only boundary.
