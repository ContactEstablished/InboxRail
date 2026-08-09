# P0 Electron foundation spike

This disposable application proves the pinned Electron Forge, Vite, TypeScript, React, and Windows x64 package path selected by ADR-015. Later P0 tasks extend this spike; production application code begins only after Gate A closes.

## Prerequisites

- Windows 11 x64
- Node.js 24.18.0
- Corepack with pnpm 10.33.2 activated

Do not use a global Electron or Forge installation.

The manifest explicitly allows install scripts only for the reviewed `electron` binary download and Vite's `esbuild` binary. Pnpm blocks unlisted dependency build scripts.

The spike uses strict TypeScript checks for repository source and `skipLibCheck` for dependency declarations. Forge 7.11's published declarations reference an internal `NewCtx` type and an undeclared optional `rxjs` type; validating those third-party declaration internals fails independently of InboxRail source. P0-003 verifies the actual Forge/Vite compile and package path instead.

## Clean install and verification

From this directory:

```powershell
corepack prepare pnpm@10.33.2 --activate
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run package
pnpm run smoke:package
pnpm run smoke:provider-views
pnpm run smoke:partitions
```

For the initial lockfile only, use `pnpm install`, review the entire generated lockfile, and then use `--frozen-lockfile` thereafter.

`pnpm run package` produces the ignored `out/InboxRail P0 Foundation Spike-win32-x64` directory. The smoke command launches that packaged executable with a task-scoped environment flag. The main process waits for its bundled renderer to finish loading, verifies `app.isPackaged`, exits with code zero, and never uses a Vite development server.

The provider-view smoke launches the same package once for Gmail and once for Microsoft. Each run creates one ephemeral, Node-free `WebContentsView` below the 72-pixel mock tab strip, follows only HTTPS provider allowlist navigation, waits for a provider-owned sign-in origin, captures the rendered surface in memory, and exits without saving page contents. No provider identity or credentials are required or recorded.

The partition smoke launches the package twice against one unique temporary user-data directory. The seed run loads a deterministic loopback fixture sequentially in two UUID-backed `persist:inboxrail-account-<UUID>` partitions; each partition stores a distinct synthetic cookie and local-storage identity. After that packaged process fully exits, the verify run reopens the same partitions and asserts that each retained only its own identity. The script removes its verified task-scoped temporary directory after the test.

For an interactive development view, set `INBOXRAIL_P0_PROVIDER` to `gmail` or `microsoft` before `pnpm start`. The remote view has no preload or application bridge; the local shell remains visible only in the tab-strip region above it.

## P0-003 result

**Result:** Passed on 2026-08-08 at commit worktree state preceding the P0-003 commit.

| Check | Evidence |
|---|---|
| Runtime | Portable official Node 24.18.0 x64; Corepack 0.35.0; pnpm 10.33.2 |
| Dependency install | Exact manifest pins produced `pnpm-lock.yaml`; reviewed build-script allowlist contains only `electron` and `esbuild`; `pnpm ignored-builds` reported none after reinstall |
| TypeScript | `pnpm run typecheck` passed with TypeScript 7.0.2 |
| Forge/Vite build | `pnpm run package` passed with Electron Forge/plugin-vite 7.11.2 and Vite 7.3.1 |
| Windows package | `out/InboxRail P0 Foundation Spike-win32-x64/inboxrail-p0-foundation-spike.exe` produced for win32 x64 |
| Packaged launch | `pnpm run smoke:package` passed; the executable loaded its bundled renderer, observed `app.isPackaged`, and exited with code 0 |
| Dev-server independence | The packaged branch uses the Forge-generated renderer asset path and `BrowserWindow.loadFile`; the smoke process does not start Forge or Vite |

### Experimental plugin decision

Forge's Vite plugin is viable for the P1 foundation at the exact `7.11.2` pin proven here. It remains experimental, so minor upgrades are treated as potentially breaking and require the full package smoke. Vite remains on 7.3.1 because Forge 7.11 is aligned with Vite 7; adopting Vite 8 waits for a stable compatible Forge line. Any future failure that would require weakening Electron security or manually copying packaged runtime files reopens ADR-013/ADR-015 rather than being accepted as a workaround.

### Compatibility findings retained

- pnpm 11.20.0 is not selected: its default exotic-subdependency policy rejects Forge 7.11's Git-based `@electron/node-gyp` transitive dependency. Pnpm 10.33.2 installs without disabling that pnpm 11 safeguard.
- Forge 7.11's dependency declarations contain unresolved internal/optional types, so dependency declaration checking is skipped while strict checking remains enabled for spike source. The executable Vite compile and package steps pass.

## P0-004 result

**Result:** Passed on 2026-08-08 against the packaged Windows x64 spike.

| Check | Evidence |
|---|---|
| Shell/view composition | One `BrowserWindow` local shell retains a 72-pixel mock tab strip; one child `WebContentsView` is bounded to the remaining content region and recomputes bounds on window resize |
| Gmail sign-in | The packaged smoke followed the Gmail entry URL to `accounts.google.com`, completed loading, and produced a non-empty in-memory render capture |
| Microsoft sign-in | The packaged smoke followed the Outlook entry URL to a Microsoft sign-in host, completed loading, and produced a non-empty in-memory render capture |
| Remote Node/preload boundary | Remote preferences explicitly disable Node in frames/workers, omit preload, enable context isolation and sandboxing, and disable the webview tag |
| Web security | HTTPS provider-host allowlists are enforced; web security remains enabled; insecure content and experimental features are disabled |
| Native capabilities | Permission checks and requests deny by default; popup creation is denied |
| Cleanup | Smoke shutdown detaches the child view, closes its `webContents`, destroys the shell window, and leaves no packaged spike process running |

The smoke writes only phase names and the provider kind to a unique temporary diagnostic file, then removes it. It does not store URLs, query strings, screenshots, provider payloads, identities, cookies, or credentials.

## P0-005 result

**Result:** Passed on 2026-08-08 against two consecutive launches of the packaged Windows x64 spike.

| Check | Evidence |
|---|---|
| UUID-backed names | Used `persist:inboxrail-account-11111111-1111-4111-8111-111111111111` and `persist:inboxrail-account-22222222-2222-4222-8222-222222222222`; startup validates the required prefix and UUID shape |
| Cookie isolation | The loopback fixture stored `alpha` and `beta` under the same origin/cookie name; each Electron session exposed exactly its expected persistent cookie |
| Local-storage isolation | The same-origin fixture observed empty storage in each partition before seeding, then reported only that partition's expected value without main-process script injection |
| Full restart retention | The seed package exited with code 0; a new package process using the same isolated user-data directory recovered `alpha` and `beta` in their respective partitions |
| Security boundary | Fixture server binds only to `127.0.0.1`, uses a strict self-only CSP, accepts bounded validated synthetic reports, denies popups/permissions, and uses sandboxed Node-free views |
| Cleanup | Both views are explicitly detached and closed, the loopback server and shell window close, and the PowerShell harness removes only its validated GUID-named temporary directory |

No real provider identity, session, credential, provider URL, or provider DOM automation is used. The test proves Chromium storage partition behavior independently of Gmail or Microsoft availability.
