# InboxRail Architecture

**Status:** Implementation baseline  
**Target:** Windows 11, single-user desktop application  
**Stack:** Electron, TypeScript, React, Vite, SQLite  
**Related documents:** [ROADMAP.md](./ROADMAP.md), [TASKS.md](./TASKS.md)

## 1. Purpose

InboxRail is a Windows 11 desktop workspace for operating multiple Gmail and Outlook/Microsoft 365 web sessions without mixing identities. It gives each mailbox an isolated, persistent browser session; shows the selected mailbox in a full webmail interface; monitors all authorized accounts with provider APIs; and applies local notification rules so only important messages demand attention.

The architecture is intentionally not “six always-running browsers in one window.” Web rendering and mail monitoring are separate concerns:

- Gmail and Outlook remain the interactive mail clients.
- Gmail API and Microsoft Graph provide lightweight background metadata monitoring.
- At most a small, policy-controlled number of webmail renderers stay alive.
- SQLite stores configuration and derived local state.
- Secrets are protected with Windows-backed encryption and never exposed to a renderer.

This document is the source of truth for system boundaries and technical decisions. Implementation changes that contradict a decision in section 18 require an Architecture Decision Record (ADR) and matching updates to the roadmap and tasks.

## 2. Product boundaries

### 2.1 In scope for version 1

- Windows 11 desktop installation for one Windows user.
- Multiple Gmail, Outlook.com, and Microsoft 365 accounts.
- One persistent Electron session partition per account.
- A React shell with colored, reorderable account tabs and unread/priority badges.
- Gmail and Outlook web interfaces hosted in `WebContentsView` instances.
- `ACTIVE`, `WARM`, and `SUSPENDED` webmail renderer states.
- Lean, Balanced, and Instant memory policies.
- Delegated OAuth authorization for Gmail API and Microsoft Graph monitoring.
- Incremental/polling-based unread and new-message metadata synchronization.
- Local sender/subject/account/provider/importance rules.
- Native Windows notifications, account-specific visual identity, and tray behavior.
- Local SQLite migrations, settings, alert history, and diagnostics.
- Signed/packageable Windows builds; local development may use unsigned builds.

### 2.2 Explicit non-goals for version 1

- Reimplementing message reading, composing, search, calendar, or contacts.
- Sending, deleting, moving, labeling, or marking provider messages through APIs.
- Reading or storing message bodies, attachments, or full mailbox archives.
- DOM scraping, injected scripts, or provider-specific page automation.
- Sharing browser cookies with API OAuth tokens or vice versa.
- A cloud backend, hosted Gmail push endpoint, or Microsoft Graph webhooks.
- Cross-device synchronization, teams, enterprise administration, or remote policy.
- macOS/Linux support.
- Browser extensions, arbitrary websites, or general-purpose browsing.
- Automatic mailbox opening in response to a rule.
- Running local commands from mail rules.
- Guaranteed control over the full color or duration of a Windows toast; Windows retains final presentation control.

### 2.3 Privacy boundary

InboxRail processes the minimum metadata required for badges and rules: provider message ID, sender, subject, received time, unread state, importance, and conversation/thread ID when available. V1 does not request or persist body text or attachments. Logs must redact tokens, cookies, authorization codes, email subjects, sender addresses, and provider payloads by default.

## 3. Architectural principles

1. **Remote web content is untrusted.** Gmail and Outlook receive no Node.js access, preload bridge, application IPC, or filesystem access.
2. **Sessions are isolated by construction.** Every account has an immutable UUID-backed `persist:` partition. Email addresses and display names are never partition identifiers.
3. **Monitoring does not depend on a renderer.** Suspending a webmail view must not stop API monitoring.
4. **Renderers are a cache.** A `WebContentsView` may be destroyed at any time and recreated from its persistent session.
5. **Least privilege is the default.** Provider scopes, Electron permissions, IPC methods, navigation, and stored data are minimized.
6. **Initial sync is quiet.** Connecting an established mailbox must not emit a notification for every existing unread message.
7. **State transitions are explicit and testable.** Renderer lifecycle, monitor status, rule outcomes, and notification delivery are modeled states rather than UI side effects.
8. **Failures are account-scoped.** One expired token, provider outage, corrupted web session, or renderer crash must not disable other accounts.
9. **Lean claims are measured.** Memory and startup targets are enforced with repeatable Windows benchmarks, not inferred from renderer count alone.
10. **Provider websites are replaceable integrations.** URLs and navigation allowlists live behind provider policies and can change without leaking provider conditions through the application.

## 4. System context

```text
┌──────────────────────────────── Windows 11 ────────────────────────────────┐
│                                                                            │
│  User ──> InboxRail shell ──> ACTIVE Gmail/Outlook WebContentsView         │
│               │                         │                                  │
│               │                         └── HTTPS ──> provider webmail      │
│               │                                                            │
│               ├──> Account/session/lifecycle services                      │
│               ├──> Monitor scheduler ── HTTPS ──> Gmail API / Graph        │
│               ├──> Rules engine ──> Notification service ──> Windows toast │
│               ├──> SQLite                                                  │
│               └──> Windows tray / startup integration                      │
│                                                                            │
│  Windows DPAPI-backed protection <── OAuth credentials/token caches        │
└────────────────────────────────────────────────────────────────────────────┘
```

There is no InboxRail server in V1. Provider webmail, provider APIs, OAuth authorization endpoints, and optional release/update hosting are the only network systems.

## 5. Runtime topology and trust zones

### 5.1 Processes

| Process or surface | Trust | Responsibilities | Prohibited |
|---|---|---|---|
| Electron main process | Trusted | Windows lifecycle, sessions, views, OAuth orchestration, monitoring, rules, SQLite, notifications, tray | Rendering remote HTML; exposing secrets over IPC |
| InboxRail shell renderer | Trusted packaged UI | Tabs, settings, rules editor, account status, user commands | Direct database, filesystem, OAuth token, session, or Electron access |
| Shell preload | Narrow trusted bridge | Expose a versioned, typed API with specific commands/events | Generic IPC send/invoke, Node modules, raw Electron objects |
| Gmail/Outlook `WebContentsView` | Untrusted remote content | Provider-supplied interactive webmail | Preload, Node integration, app IPC, arbitrary navigation, native permissions by default |
| Provider APIs | External trusted-by-contract | Authorized metadata and change feeds | Application control instructions |
| SQLite database | Local untrusted-at-rest input | Configuration and derived state | Plaintext OAuth credentials or browser cookies |

The shell is loaded from a packaged custom protocol such as `app://inboxrail/index.html`, not from remote content. Mail views load only HTTPS provider origins. Main-process code validates every IPC sender by exact shell origin and the current shell `webContents` identity.

### 5.2 Window composition

Use one `BrowserWindow` for the local React shell. Attach account `WebContentsView` objects as child views in the content region below the tab strip. The shell reports content-region bounds after layout; the main process validates and applies those bounds. Resize events must recompute bounds without allowing the shell to position a mail view outside the window.

Do not use `<webview>` or deprecated `BrowserView`. Do not place Gmail or Outlook inside an `<iframe>`.

## 6. Logical components

### 6.1 Main-process application services

| Component | Owns | Key dependencies |
|---|---|---|
| `AppLifecycle` | single-instance lock, startup, graceful shutdown, close-to-tray, deep activation | WindowManager, MonitorScheduler |
| `WindowManager` | shell window, tray, focus/show/hide, content bounds | MailViewManager |
| `AccountService` | account CRUD, ordering, validation, account status | AccountRepository, SessionManager, CredentialStore |
| `SessionManager` | partition creation/configuration/reset, permissions, downloads, auth challenges | Electron `session` |
| `MailViewManager` | create/attach/detach/close `WebContentsView`, lifecycle state machine, crash recovery | SessionManager, ProviderWebPolicy |
| `LifecyclePolicy` | Lean/Balanced/Instant caps and warm TTL decisions | Clock, settings |
| `ProviderRegistry` | provider adapter and web-policy lookup | GmailProvider, MicrosoftGraphProvider |
| `OAuthCoordinator` | loopback authorization, identity verification, cancellation, reconnect | system browser, CredentialStore |
| `MonitorScheduler` | due work, jitter, backoff, concurrency, online/resume handling | ProviderRegistry, SyncStateRepository |
| `MessageIngestor` | normalize, deduplicate, update unread state, quiet-baseline semantics | RuleEngine, repositories |
| `RuleEngine` | deterministic rule compilation/evaluation and action plan | RuleRepository |
| `NotificationService` | toast creation, grouping, activation, sounds, rate limits, alert history | Electron Notification, WindowManager |
| `Database` | connection, migrations, transactions, health checks | `better-sqlite3` initially |
| `CredentialStore` | encrypt/decrypt Google credential material and persist MSAL cache securely | Electron `safeStorage` / DPAPI |
| `DiagnosticsService` | redacted structured logs, health snapshot, performance samples | all services via events |

Main-process components communicate through typed method calls and domain events. Avoid a global event bus for commands; events are acceptable for state changes such as `account.unreadChanged` or `view.lifecycleChanged`.

### 6.2 Shell modules

- `rail`: colored tabs, unread badges, priority state, drag/keyboard reorder, overflow.
- `mail-host`: empty/loading/error/suspended overlays and content-region measurement.
- `accounts`: add, rename, recolor, reconnect monitoring, reset web session, remove.
- `rules`: ordered rule list, editor, validation, test-message simulator.
- `settings`: memory mode, polling, notification, startup, close behavior, privacy.
- `status`: per-account web session, API authorization, last sync, retry/error state.

The shell uses Zustand for ephemeral UI state. Persisted domain state comes from the main process and SQLite; it must not be duplicated into browser local storage. TanStack Query is optional only if it materially simplifies main-process request caching; it is not required for a local event-driven store.

## 7. Account, session, and identity model

### 7.1 Account aggregate

```ts
type ProviderKind = 'gmail' | 'microsoft';
type ViewState = 'ACTIVE' | 'WARM' | 'SUSPENDED';
type MonitorState =
  | 'DISCONNECTED'
  | 'AUTHORIZING'
  | 'BASELINING'
  | 'HEALTHY'
  | 'BACKING_OFF'
  | 'AUTH_REQUIRED'
  | 'ERROR';

interface MailAccount {
  id: string;                    // UUID
  displayName: string;
  provider: ProviderKind;
  emailAddress: string | null;   // learned/confirmed after API auth
  partitionName: string;         // persist:inboxrail-account-<UUID>
  browserUrl: string;
  color: string;
  sortOrder: number;
  enabled: boolean;
  notificationsMuted: boolean;
  webSessionStatus: 'UNKNOWN' | 'READY' | 'SIGN_IN_REQUIRED' | 'ERROR';
  monitorState: MonitorState;
  unreadCount: number;
  priorityUnreadCount: number;
  createdAt: string;
  updatedAt: string;
}
```

`partitionName` is generated once, validated against the account UUID, and immutable. Removing an account is a two-step operation: delete logical configuration/credentials immediately after confirmation, then clear its partition storage and close its view. A failed cleanup is recorded for retry without resurrecting the account.

### 7.2 Two independent authorizations

Each account has two distinct authentication surfaces:

1. **Web session:** provider cookies and local web storage inside the account partition. This is used only by the interactive webmail page.
2. **Monitoring authorization:** delegated OAuth tokens/cache used only by the provider adapter in the main process.

InboxRail never copies cookies into API requests and never injects OAuth tokens into a mail view. After API authorization, the provider-reported email address is shown to the user. If it conflicts with an already confirmed account identity, monitoring remains paused until the user resolves the mismatch.

### 7.3 OAuth decisions

- Gmail uses the installed desktop application authorization-code flow with PKCE and a temporary `127.0.0.1` loopback listener on an ephemeral port. Authorization opens in the system browser. Request offline access only when background refresh is needed.
- The initial Gmail scope is `https://www.googleapis.com/auth/gmail.metadata`. It permits headers/labels required for sender/subject/unread rules but is classified by Google as a restricted scope. Public distribution therefore has a verification/compliance gate.
- Microsoft uses `@azure/msal-node` as a public client with authorization code/interactive flow and PKCE. Request `Mail.ReadBasic` plus identity/OpenID scopes required by MSAL; do not request `Mail.Read` unless a validated feature requires body/preview access.
- Google credential material is encrypted asynchronously with Electron `safeStorage` before SQLite persistence. Microsoft token persistence uses an MSAL cache plugin protected by DPAPI (for example MSAL Node Extensions) and stores only a cache reference in SQLite.
- Client IDs and redirect configuration are build-time public-client configuration, not secrets. No client secret ships in the application.
- Authorization codes, access tokens, refresh tokens, and token caches must never enter application logs, analytics, crash annotations, renderer state, or notification text.

## 8. Webmail view lifecycle

### 8.1 States

| State | View object | Renderer alive | Attached/visible | API monitoring |
|---|---:|---:|---:|---:|
| `ACTIVE` | yes | yes | yes | yes |
| `WARM` | yes | yes | no | yes |
| `SUSPENDED` | no | no | no | yes |

Only one account may be `ACTIVE`. `WARM` views are detached from the window but retained for a bounded time. On transition to `SUSPENDED`, the manager removes the child view, unregisters listeners, calls `webContents.close()`, releases all references, and records the transition. The persistent session partition remains on disk.

### 8.2 Allowed transitions

```text
SUSPENDED --select--> ACTIVE
ACTIVE --select other--> WARM or SUSPENDED (policy decision)
WARM --select--> ACTIVE
WARM --TTL/cap/memory pressure--> SUSPENDED
ACTIVE/WARM --crash--> SUSPENDED + recoverable error
ANY --account disabled/removed/reset/shutdown--> SUSPENDED
```

Creation is idempotent per account. Concurrent selections use a monotonic activation request ID; stale creation/load completions may not steal focus. Selection of a new tab displays a local loading surface until its view is attached and at least the initial document is ready. A failed load provides retry and “open status” actions without deleting the persistent session.

### 8.3 Memory modes

| Mode | Renderer cap | Default warm behavior | Intended tradeoff |
|---|---:|---|---|
| Lean | 1 | previous view suspends immediately after the new view is usable | lowest memory, slower return switching |
| Balanced | 2 | most recent inactive view stays warm for 2 minutes | default |
| Instant | 4 | recent views stay warm for 10 minutes, LRU eviction at cap | fastest switching, highest memory |

The cap includes `ACTIVE`. It is a hard invariant, not a suggestion. Lowering the mode immediately evicts least-recently-used warm views. No mail view is preloaded at startup except the selected/last-active account. A user-triggered “Suspend now” always wins over the policy.

Chromium renderer crashes, OS low-memory signals where available, and application shutdown all force cleanup. The implementation must explicitly close `WebContentsView.webContents`; merely closing the containing window is insufficient for composed views and risks leaks.

### 8.4 Web policy

Each provider implements a `ProviderWebPolicy` with:

- canonical start URL;
- allowed HTTPS main-frame origins for webmail and sign-in;
- rules for provider-owned popup flows;
- external-link classification;
- permission policy;
- downloadable-content policy;
- session sign-in detection hints that do not scrape message content.

`will-navigate`, redirects, `setWindowOpenHandler`, permission check/request handlers, certificate errors, downloads, and external URL opening are handled centrally. Unknown main-frame origins and non-HTTPS navigation are denied. Safe external HTTPS links open in the system browser only after URL parsing and policy approval. `shell.openExternal` never receives an unvalidated string.

## 9. Background monitoring

### 9.1 Provider contract

```ts
interface MailProviderAdapter {
  readonly kind: ProviderKind;
  authorize(accountId: string, signal: AbortSignal): Promise<ProviderIdentity>;
  disconnect(accountId: string): Promise<void>;
  createBaseline(accountId: string, signal: AbortSignal): Promise<SyncBatch>;
  fetchChanges(
    accountId: string,
    cursor: string,
    signal: AbortSignal,
  ): Promise<SyncBatch>;
  getUnreadCount(accountId: string, signal: AbortSignal): Promise<number>;
  classifyError(error: unknown): ProviderError;
}

interface SyncBatch {
  nextCursor: string;
  messages: NormalizedMessage[];
  removedMessageIds: string[];
  hasMore: boolean;
  observedAt: string;
}
```

Provider types do not escape the adapter. A cursor is opaque, encrypted if it contains sensitive provider state, and committed only in the same transaction as the ingested batch.

### 9.2 Gmail adapter

- Establish a quiet baseline from unread state and the current Gmail history ID.
- Use `users.history.list` for incremental changes and `users.messages.get` with metadata headers limited to `From`, `Subject`, and `Date` as required.
- Treat invalid/expired history cursors as a recoverable baseline reset, not message loss.
- Request and retain no body payload.
- Reconcile unread count periodically because incremental feeds and local process downtime can drift.

### 9.3 Microsoft adapter

- Resolve the Inbox folder and establish a quiet baseline.
- Use the messages delta endpoint with `$select` restricted to ID, sender/from, subject, received date/time, read state, importance, conversation ID, and only other required basic properties.
- Follow every opaque `@odata.nextLink` until the round produces `@odata.deltaLink`; commit the delta link only after the complete round succeeds.
- Handle replayed changes idempotently and `410 Gone`/expired delta state with a baseline reset.
- Use delegated `Mail.ReadBasic`; no application permissions.

### 9.4 Scheduler behavior

- Default interval: 60 seconds per healthy account, configurable to 30, 60, 120, or 300 seconds.
- Add per-account jitter so accounts do not poll simultaneously.
- Maximum two concurrent provider requests globally and one sync per account.
- Skip disabled, disconnected, or `AUTH_REQUIRED` accounts.
- Use exponential backoff with jitter for transient failures, honoring `Retry-After`; cap at 15 minutes.
- Network-offline state pauses due work without accumulating a burst. Resume schedules accounts across a jitter window.
- System sleep cancels in-flight requests. Resume performs bounded catch-up and cursor reconciliation.
- Authentication/consent errors transition only that account to `AUTH_REQUIRED` and never trigger an automatic interactive prompt.
- Application exit stops all monitoring; close-to-tray keeps it running.

### 9.5 Ingestion and deduplication

```ts
interface NormalizedMessage {
  accountId: string;
  providerMessageId: string;
  conversationId: string | null;
  senderName: string | null;
  senderAddress: string;
  subject: string;
  receivedAt: string;
  unread: boolean;
  importance: 'low' | 'normal' | 'high';
}
```

Normalize email addresses to trimmed lowercase for equality/domain operations while retaining a presentation value only in transient memory. Normalize rule text with Unicode normalization and locale-stable case folding. Provider changes are upserted by `(account_id, provider_message_id)`. Alert candidates use a unique event key so replays and retries cannot duplicate notifications.

Baseline data updates badges but emits no notification. After a restart, a bounded 15-minute catch-up window may produce at most three individual notifications; additional normal messages are grouped per account. This behavior is configurable, and tests use a fixed clock.

## 10. Rules engine

### 10.1 V1 condition vocabulary

- account is / is not;
- provider is / is not;
- sender address equals / contains;
- sender domain equals / is subdomain of;
- sender display name contains;
- subject contains / equals / contains any / regular expression;
- provider importance equals;
- message is unread.

Conditions within a rule are `ALL` or `ANY`. Rules are ordered, enabled/disabled, and optionally terminal (`stopProcessing`). Regex patterns have length and complexity limits and run through a safe-regex validation/timeout strategy to prevent catastrophic backtracking.

### 10.2 V1 actions

- suppress notification;
- notification level: silent, normal, important, critical;
- sound: none, default, priority;
- pulse the account tab for a bounded animation;
- add a short custom badge label from an allowlisted character/length set;
- mark the alert as requiring acknowledgment in InboxRail history.

There is no command execution, arbitrary sound path, auto-open, or provider write action in V1.

### 10.3 Deterministic evaluation

Rules evaluate by ascending `sortOrder`, then stable UUID as a tie-breaker. The engine starts with account default actions. Each match replaces fields explicitly set by that rule and leaves other action fields unchanged. A terminal rule ends evaluation. A suppress action is represented explicitly, not as notification level zero, and prevents toast creation while still updating badges/history.

The engine returns a pure result:

```ts
interface RuleEvaluation {
  matchedRuleIds: string[];
  finalActions: NotificationPlan;
  trace: RedactedRuleTrace;
}
```

Compilation validates rules when saved; ingestion never evaluates invalid rule JSON. Rule simulation in Settings uses the same compiled engine and does not send a real notification unless the user explicitly selects “Send test.”

## 11. Notifications and tray

### 11.1 Notification levels

| Level | Behavior |
|---|---|
| Silent | update tab/tray/history only |
| Normal | standard Windows toast, normal timeout |
| Important | account-colored icon/accent asset plus priority sound and grouping |
| Critical | critical urgency plus `timeoutType: 'never'`, subject to Windows settings |

Windows controls the final toast chrome. Account color is expressed through generated/cached local icons, account name, grouping, and in-app badges; the architecture does not promise a fully account-colored Windows toast.

Notifications are created only in the main process. They use deterministic IDs and per-account group IDs. Activation focuses or restores InboxRail and selects the originating account. V1 does not deep-link to a specific message because provider URL contracts are not stable enough for the baseline. Activation data contains opaque local IDs, not subjects or addresses.

Apply rate limits and grouping to avoid storms. Quiet hours and per-account mute are checked after rule evaluation and before delivery. Critical alerts may bypass quiet hours only through an explicit user setting.

### 11.2 Tray and window semantics

- A single tray icon exposes Show/Hide, Pause/Resume monitoring, account unread summary, Settings, and Quit.
- Default window close behavior is “hide to tray while monitoring”; the first close explains this and offers a setting.
- Explicit Quit closes all mail views, cancels monitoring, checkpoints SQLite, and removes tray state.
- A single-instance lock routes second-launch activation to the existing process.
- Start-with-Windows is opt-in and starts hidden only when the user selects that behavior.
- Tray tooltip/badge representation must not expose message subjects.

## 12. Persistence design

SQLite runs only in the main process, in WAL mode unless packaging/runtime tests reveal a Windows-specific issue. Every schema change is a numbered forward migration applied transactionally at startup. Failed migrations stop normal startup and offer a diagnostic/recovery path; they never silently recreate the database.

### 12.1 Core tables

| Table | Purpose | Important constraints |
|---|---|---|
| `accounts` | account identity, provider, partition, color, order, settings | UUID PK; unique immutable partition; unique sort order normalization |
| `provider_credentials` | encrypted Google blob or MSAL cache reference | FK account; never plaintext; provider type discriminator |
| `sync_state` | cursor, baseline flag, unread count, last success/error/backoff | one row per account; cursor transactionally updated |
| `message_index` | bounded metadata needed for dedupe/unread/rules | unique account + provider message ID; retention policy |
| `rules` | ordered, versioned condition/action JSON | validated schema version; stable sort order |
| `alert_events` | dedupe key, level, matched rules, delivery/ack status | unique event key; redacted retention |
| `settings` | typed application settings | key schema/validation; no secrets |
| `schema_migrations` | applied migration versions/checksums | append-only |

Message metadata retention defaults to 30 days and alert history to 90 days, both configurable downward. Cleanup runs in small batches. Deleting an account cascades its derived rows and credentials, but partition cleanup is handled separately by `SessionManager`.

### 12.2 Repository and transaction rules

- Services never issue ad hoc SQL; repositories own statements and mappings.
- All timestamps are UTC ISO strings at boundaries and integer UTC epochs internally if chosen consistently.
- Batch ingestion, alert dedupe, unread update, and cursor advance share one transaction.
- Sort-order changes are one transaction and compact to deterministic integer positions.
- Database access is synchronous only behind short repository methods; no network or notification call occurs inside a transaction.
- Backups/export are future work. V1 diagnostics may copy a redacted schema/state report but not the live credential table.

## 13. IPC contract

The preload exposes `window.inboxRail`, a frozen, versioned object generated from shared TypeScript schemas. Representative methods:

```ts
interface InboxRailApiV1 {
  accounts: {
    list(): Promise<AccountViewModel[]>;
    create(input: CreateAccountInput): Promise<AccountViewModel>;
    update(id: string, patch: UpdateAccountInput): Promise<AccountViewModel>;
    reorder(orderedIds: string[]): Promise<void>;
    remove(id: string, confirmation: RemoveConfirmation): Promise<void>;
    select(id: string): Promise<void>;
    authorizeMonitor(id: string): Promise<void>;
    resetWebSession(id: string): Promise<void>;
  };
  rules: { list(): Promise<Rule[]>; save(input: RuleInput): Promise<Rule>; reorder(ids: string[]): Promise<void>; simulate(input: SimulationInput): Promise<RuleEvaluation>; };
  settings: { get(): Promise<Settings>; update(patch: SettingsPatch): Promise<Settings>; };
  diagnostics: { getHealth(): Promise<RedactedHealth>; exportRedacted(): Promise<string>; };
  layout: { setMailContentBounds(bounds: Rect): Promise<void>; };
  events: { subscribe(listener: (event: ShellEvent) => void): () => void; };
}
```

Rules for every handler:

- validate sender frame, exact origin, payload schema, UUIDs, string lengths, enum values, colors, URLs, and array cardinality;
- return typed domain errors with safe messages, never raw stack traces/provider errors;
- authorize the operation against current account state;
- support cancellation for interactive/long operations;
- expose no generic channel name or arbitrary event subscription;
- remove listeners when the shell reloads or closes.

Mail views are never accepted IPC senders.

## 14. Security architecture

### 14.1 Required Electron settings

For the shell:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- `sandbox: true`;
- restrictive CSP allowing only packaged assets and required development exceptions outside production;
- custom secure standard `app://` protocol in production;
- no remote module, eval-based code, or unsafe inline script.

For every remote mail view:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- `sandbox: true`;
- no preload;
- `webSecurity: true`;
- `allowRunningInsecureContent: false`;
- no experimental/Blink feature overrides;
- per-account persistent partition;
- background throttling left enabled unless a measured, reviewed requirement proves otherwise.

### 14.2 Mandatory controls

- Provider-specific main-frame allowlists and HTTPS-only navigation.
- Default-deny permission request and permission check handlers on every partition. Provider page notifications are denied because InboxRail owns notifications. Media, geolocation, MIDI, serial, HID, Bluetooth, filesystem, and screen capture are denied in V1.
- Popup/new-window interception; approved OAuth or provider flows stay within policy, external links use validated system-browser opening.
- Download interception with explicit user confirmation and normal Windows save dialog; no silent download or automatic execution.
- Certificate errors fail closed. No bypass UI in production.
- IPC sender and payload validation.
- Secrets encrypted with DPAPI-backed facilities and excluded from logs.
- Electron fuses reviewed for packaged builds, including disabling `RunAsNode`, disallowing Node CLI options where compatible, enforcing ASAR integrity, and loading app code only from ASAR.
- ASAR packaging, dependency lockfile, production dependency audit, and software bill of materials.
- Current supported Electron major selected at implementation start and updated routinely; no unbounded automatic major upgrades.
- Windows code signing is a release gate before distributing beyond local development.

### 14.3 Threat cases that must have tests

- A compromised Gmail page tries to invoke app IPC or Node APIs.
- Remote content attempts navigation to `file:`, `javascript:`, custom schemes, localhost, or an unknown HTTPS origin.
- A popup tries to create an unrestricted window.
- A malicious shell payload sends oversized text, invalid UUIDs, unsafe regex, or arbitrary URL/path values.
- SQLite rows are modified to contain invalid providers, partitions, rule schemas, or encrypted blobs.
- OAuth state/PKCE mismatch, loopback request from the wrong flow, token response log leakage, or identity mismatch.
- Notification activation contains a forged account ID.
- A renderer crashes during activation or shutdown and leaves an orphan process/reference.

## 15. Performance and lean-memory requirements

Provider pages dominate resource use, so targets are measured across the complete Electron process tree on a documented Windows 11 reference machine. `PERF-001` establishes and records the machine, provider state, sampling commands, warm-up, network conditions, and repeat count.

Initial acceptance budgets, subject to one evidence-backed ADR after the spike:

| Metric | Initial target |
|---|---|
| Shell ready, no mail view, 60 seconds idle | at most 250 MiB total working set |
| Balanced mode, six monitored accounts, one `ACTIVE` + one `WARM`, 5 minutes steady | at most 850 MiB total working set |
| Incremental steady memory per fully suspended account | average at most 20 MiB beyond shared shell/services |
| Balanced vs. six simultaneously live provider views | at least 40% lower steady total working set on the same machine/scenario |
| 20 repeated activate/suspend cycles | final steady memory at most 15% above the equivalent post-start baseline; no renderer-count growth |
| Shell visible after cold launch | p95 at most 4 seconds on reference machine |
| Warm tab switch to attached view | p95 at most 500 ms |
| Suspended tab recreation to first usable provider page | p95 at most 8 seconds excluding authentication/provider outage |
| Background CPU, all accounts healthy and window hidden between polls | p95 below 1% process-tree CPU over a 5-minute sample, excluding poll bursts |

These are product budgets, not universal guarantees: provider web applications and Chromium versions change. CI runs deterministic lifecycle/leak tests; scheduled/manual Windows benchmarks guard the external-page budgets. A change that exceeds a budget cannot be accepted merely because the feature works.

## 16. Reliability, observability, and recovery

### 16.1 Failure handling

- Provider errors are classified as transient, throttled, auth-required, cursor-invalid, permanent configuration, or unknown.
- Retries are bounded and never interactive.
- Renderer crashes transition the account to `SUSPENDED`, show a local error, and allow one user-driven reload; repeated crash loops back off.
- Unclean shutdown is detected. SQLite WAL recovery and migration integrity run before monitors start.
- The last active account is restored only after the shell is ready. If invalid/disabled, select the first enabled account without rewriting unrelated settings.
- OAuth loopback listeners close on success, cancellation, timeout, or shutdown.

### 16.2 Structured diagnostics

Use structured local logs with event name, timestamp, level, correlation ID, account UUID (not email), provider kind, duration, and safe error code. Default rolling retention is seven days with a conservative size cap. Sensitive fields are redacted at the logger boundary.

The diagnostics screen shows:

- application/Electron/Chromium version;
- database schema version and health;
- active view count and state per account;
- process-tree memory snapshot;
- last successful sync, next due time, backoff, and safe provider error code;
- notification support and Windows app identity status;
- encryption availability;
- update/signature channel status.

A redacted export must be inspectable before saving and must exclude credentials, cookies, subjects, senders, message IDs, raw cursors, database file, and partition contents.

## 17. Testing and release gates

### 17.1 Test layers

- **Unit:** lifecycle policy/state machine, rules, normalization, error classification, scheduler/backoff, notification plan, repositories, schema validation.
- **Contract:** Gmail/Graph adapters against recorded redacted fixtures and HTTP mocks; pagination, cursor expiry, replay, throttling, and auth failure.
- **Integration:** SQLite migrations/transactions, credential encryption, session partition isolation, IPC sender/payload validation, tray/window lifecycle.
- **Electron end-to-end:** shell launch, account CRUD, tab reorder, view selection, warm/suspend behavior, crash recovery, notification activation, close-to-tray, explicit quit.
- **Security:** navigation/popup/permission denials, Node/IPC absence in remote views, CSP, fuse/package inspection, dependency audit.
- **Performance:** process count, working set, lifecycle leak loop, launch/switch timing, hidden-window background CPU.
- **Manual provider smoke:** real Gmail consumer, Outlook.com, and Microsoft 365 work/school account on Windows 11.

Network tests are deterministic by default and must not require developer mailboxes. Real-account tests are opt-in, use dedicated test accounts, never print provider data, and are excluded from pull-request CI.

### 17.2 Definition of done for any implementation task

- Acceptance criteria pass and are demonstrated by automated tests where feasible.
- New IPC/database/provider schemas include runtime validation and migration/compatibility handling.
- Logs and user-facing errors are redacted.
- Security boundary changes include negative tests.
- Resource lifecycle changes include cleanup/leak tests.
- Documentation and task status are updated in the same change.
- Lint, typecheck, unit, integration, Electron E2E, package smoke, and applicable security checks pass.
- No unexplained warning, uncaught rejection, orphan renderer, or plaintext secret is left behind.

### 17.3 Release gates

1. Architecture spikes prove `WebContentsView`, native SQLite packaging, OAuth, notifications, and memory assumptions.
2. Threat model and Electron security suite pass.
3. Gmail restricted-scope distribution decision is resolved for the intended audience.
4. Real-provider smoke matrix passes.
5. Lean-memory benchmarks pass on the reference Windows 11 machine.
6. Installer is code signed, uninstall is clean, upgrade preserves data, and rollback/recovery is documented.

## 18. Architectural decisions

| ID | Decision | Rationale | Consequence |
|---|---|---|---|
| ADR-001 | Electron + TypeScript + React + Vite | Matches requested stack and supports a small typed shell | Chromium cost must be actively managed |
| ADR-002 | `BrowserWindow` shell composed with `WebContentsView` mail views | Modern supported composition without `<webview>` | Main process owns bounds and explicit cleanup |
| ADR-003 | UUID-backed persistent partition per account | Stable isolated cookies/storage across rename/restart | Account removal must explicitly clear partition data |
| ADR-004 | `ACTIVE/WARM/SUSPENDED` lifecycle with hard renderer caps | Makes memory usage policy-driven | Suspended tab switching reloads provider UI |
| ADR-005 | Gmail API and Graph monitor independently of web views | Preserves notifications with suspended renderers | Separate OAuth consent and credentials are required |
| ADR-006 | Polling/incremental cursors in V1; no hosted push | Local-only, lower operational complexity | New-mail latency is bounded by interval/backoff |
| ADR-007 | Metadata-only provider access | Supports sender/subject rules while minimizing data | Gmail metadata scope is still restricted and may affect distribution |
| ADR-008 | SQLite in main process with migrations; start with `better-sqlite3` | Durable relational ordering/rules/dedupe and simple transactions | Native module packaging/rebuild is an early go/no-go spike |
| ADR-009 | OS-backed encrypted credential storage | Tokens are sensitive at rest | Same-user malicious processes are outside DPAPI’s full protection boundary |
| ADR-010 | Pure deterministic ordered rules engine | Testable, explainable alerts | V1 action vocabulary is deliberately constrained |
| ADR-011 | Native Electron notifications and tray | Best Windows integration with minimal runtime | Final toast visuals remain controlled by Windows |
| ADR-012 | No preload or app bridge in remote mail views | Strongest practical isolation from provider content | All integration occurs outside provider pages |
| ADR-013 | Electron Forge packaging, subject to Vite plugin spike | Official Electron-recommended packaging path and requested Vite stack | Pin versions; Forge’s Vite support must be validated before foundation lock |
| ADR-014 | No cloud service in V1 | Privacy, simplicity, and local operation | No push notifications or cross-device sync |
| ADR-015 | Exact-pinned Node 24.18, pnpm 10.33, Electron 43.2, Forge 7.11, Vite 7.3, TypeScript 7.0, and React 19.2 toolchain | Reproducible security, native packaging, and performance validation | Coupled upgrades are isolated changes; experimental Forge Vite support remains gated by P0-003 |

## 19. Proposed repository structure

```text
inboxrail/
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ ROADMAP.md
│  ├─ TASKS.md
│  ├─ adr/
│  ├─ threat-model.md
│  └─ performance-baseline.md
├─ src/
│  ├─ main/
│  │  ├─ app/
│  │  ├─ accounts/
│  │  ├─ database/
│  │  ├─ diagnostics/
│  │  ├─ ipc/
│  │  ├─ notifications/
│  │  ├─ oauth/
│  │  ├─ providers/gmail/
│  │  ├─ providers/microsoft/
│  │  ├─ rules/
│  │  ├─ sessions/
│  │  └─ views/
│  ├─ preload/
│  ├─ renderer/
│  │  ├─ app/
│  │  ├─ features/accounts/
│  │  ├─ features/rail/
│  │  ├─ features/rules/
│  │  ├─ features/settings/
│  │  └─ styles/
│  └─ shared/
│     ├─ contracts/
│     ├─ domain/
│     └─ validation/
├─ migrations/
├─ assets/
├─ scripts/
├─ tests/
│  ├─ unit/
│  ├─ contract/
│  ├─ integration/
│  ├─ e2e/
│  ├─ security/
│  └─ performance/
└─ forge.config.ts
```

Do not create a catch-all `utils` directory. Shared code must have a named domain purpose and must not import Electron main-process modules into the renderer bundle.

## 20. Architecture acceptance criteria

The architecture is implemented when all of the following are true:

- Six configured accounts retain independent web login state across restart with no cookie leakage.
- Exactly one account is active, renderer caps are enforced for all memory modes, and suspended accounts have no live `webContents`.
- API monitoring and rule evaluation continue while all non-selected accounts are suspended and while the main window is hidden to tray.
- Initial baselines produce correct badges without notification floods; incremental replay cannot duplicate an alert.
- Gmail history and Graph delta invalidation recover without deleting the account or notifying old mail as new.
- Rule order, terminal behavior, suppression, quiet hours, and notification levels are deterministic and covered by tests.
- Clicking a Windows notification restores/selects the correct account without trusting unvalidated activation data.
- Remote mail content cannot access Node, shell preload APIs, generic IPC, arbitrary navigation, popup windows, or native permissions.
- OAuth tokens/caches are OS-protected at rest and absent from logs/renderer/database plaintext scans.
- SQLite upgrades are transactional, downgrade/recovery behavior is documented, and packaged native modules load on Windows 11.
- The signed installer, upgrade, uninstall, tray, startup, and explicit-quit flows pass the release matrix.
- The measured memory, leak, startup, switching, and background CPU gates in section 15 pass or are revised once through an approved evidence-backed ADR before feature completion.

## 21. Primary references

- [Electron WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view)
- [Electron BaseWindow resource management](https://www.electronjs.org/docs/latest/api/base-window#resource-management)
- [Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron sessions](https://www.electronjs.org/docs/latest/api/session)
- [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)
- [Electron notifications](https://www.electronjs.org/docs/latest/api/notification)
- [Electron fuses](https://www.electronjs.org/docs/latest/tutorial/fuses)
- [Electron performance guidance](https://www.electronjs.org/docs/latest/tutorial/performance)
- [Electron Forge Vite template](https://www.electronforge.io/templates/vite)
- [Google OAuth for desktop apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Gmail API scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Gmail history](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list)
- [MSAL Node overview](https://learn.microsoft.com/en-us/entra/msal/overview)
- [Microsoft Graph message delta](https://learn.microsoft.com/en-us/graph/api/message-delta?view=graph-rest-1.0)
- [Microsoft Graph permissions](https://learn.microsoft.com/en-us/graph/permissions-reference)
