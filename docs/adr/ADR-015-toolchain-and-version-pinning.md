# ADR-015: Toolchain and version pinning

**Status:** Accepted  
**Date:** 2026-08-08  
**Owners:** InboxRail maintainers  
**Supersedes:** None  
**Related:** ADR-001, ADR-013, P0-002, P0-003

## Context

InboxRail depends on Electron's Chromium/Node runtime, Electron Forge packaging, an experimental Forge Vite plugin, a native SQLite module, and a small React shell. Unbounded version ranges would make security, native-module packaging, lifecycle measurements, and release artifacts difficult to reproduce.

The architecture already selects Electron, TypeScript, React, Vite, and Electron Forge. This decision selects the initial versions and defines how they are pinned and upgraded. P0-003 must still prove the complete development and packaged path; this ADR does not treat package metadata as package-smoke evidence.

## Decision

Use the following initial toolchain for the P0 spike and, after that spike passes, the P1 production repository.

| Component | Exact selection | Compatibility evidence and rationale |
|---|---:|---|
| Node.js development runtime | `24.18.0` x64 | Current LTS on the decision date and the Node version embedded in Electron 43.2.0. Production code still runs in Electron's embedded Node runtime. |
| Package manager | `pnpm 10.33.2` | Supports Node `>=18.12`; selected Node satisfies that constraint. pnpm 11.20 rejects Forge 7.11's transitive Git-based `@electron/node-gyp` dependency under its default exotic-subdependency policy. Pinning the latest pnpm 10 release preserves Forge compatibility without weakening that pnpm 11 security default. |
| Electron | `43.2.0` | Current stable on the decision date, embedding Chromium 150.0.7871.129 and Node 24.18.0. Electron's package requires Node `>=22.12.0` for installation tooling. |
| Electron Forge | `7.11.2` | Current stable Forge line; its CLI requires Node `>=16.4.0`. All direct `@electron-forge/*` packages must use this identical version. |
| Forge Vite plugin | `@electron-forge/plugin-vite 7.11.2` | Matches Forge exactly. The plugin remains explicitly experimental and offers no API-stability guarantee. P0-003 is the go/no-go test for ADR-013. |
| Vite | `7.3.1` | Latest Vite 7 patch and the stable major used by Forge 7.11's Vite integration. It requires Node `^20.19.0 || >=22.12.0`; selected Node satisfies the constraint. Vite 8 is deferred because Forge 8 remains prerelease. |
| React Vite plugin | `@vitejs/plugin-react 5.2.0` | Declares compatibility with Vite 7 (and Node `^20.19.0 || >=22.12.0`); selected versions satisfy both constraints. |
| TypeScript | `7.0.2` | Current stable compiler; requires Node `>=16.20.0`. Strict project boundaries and source checks are established in P1-002/P1-011. Dependency declaration checking is skipped because Forge 7.11 publishes unresolved internal/optional declaration references; the Forge compile/package path remains an executable gate. |
| React | `19.2.8` | Current stable UI library. |
| React DOM | `19.2.8` | Kept exactly aligned with React and declares React `^19.2.8` as its peer. |

Do not introduce `electron-vite` or another packaging stack alongside Forge during the spike. If the Forge Vite plugin fails P0-003 because of an experimental API limitation, record the failure and replace ADR-013/ADR-015 through a focused ADR. Do not work around a packaging failure by relaxing sandboxing, context isolation, web security, ASAR integrity, or remote-view boundaries.

## Pinning policy

1. Set `engines.node` to `24.18.0` and `packageManager` to `pnpm@10.33.2` in the spike and production `package.json` files. Add a repository Node-version file with the same exact Node version.
2. Use exact versions, without `^`, `~`, `latest`, workspace wildcards, or prerelease tags, for every direct production and development dependency.
3. Commit `pnpm-lock.yaml`. CI and clean-checkout verification use `pnpm install --frozen-lockfile`; a lockfile change is reviewed as source code. Configure `node-linker=hoisted` in `.npmrc`, as required by Forge's pnpm guidance.
4. Keep every direct `@electron-forge/*` package on the same exact Forge version. Keep `react` and `react-dom` on the same exact version.
5. Never install Electron or Forge globally for repository commands. Invoke repository-local binaries through package scripts.
6. Do not use pnpm overrides, ignored build scripts, or patched packages to conceal peer/engine incompatibility. Any necessary exception requires a reason beside the configuration and a package-smoke test.
7. Allow dependency install scripts only for reviewed packages that need them, notably Electron downloads and native-module builds. P0-003/P0-008 must prove the resulting clean install and packaged artifact.

## Upgrade cadence

- Review Electron/Chromium security advisories continuously. Expedite supported-line patch updates that contain relevant security fixes.
- Review the complete pinned toolchain at least quarterly and when an Electron major approaches end of support. Electron supports only its latest three stable majors, so InboxRail must not ship on an Electron line after it leaves that window.
- Upgrade one coupled set at a time: Electron; Forge and its plugins; Vite and its plugins; React and React DOM; or TypeScript. Do not combine a toolchain upgrade with unrelated product behavior.
- Every upgrade runs clean install, lint, typecheck, unit/integration/security tests, Electron E2E, native SQLite package smoke, and Windows package launch smoke. Electron/Chromium upgrades also rerun lifecycle and performance comparisons.
- Commit the manifest and lockfile together and record material compatibility, security-boundary, packaging, or performance consequences in a new ADR.

## Consequences

Builds and benchmarks are reproducible from a reviewed lockfile, and the Node used by development tooling matches Electron's embedded Node major/minor at the initial pin. The cost is deliberate upgrade work and potentially faster intervention when Electron's eight-week release cadence moves version 43 toward end of support.

The Forge Vite plugin remains the main uncertainty. Exact pinning limits surprise changes but does not make its API stable; P0-003 must package and launch the spike before this toolchain can seed P1. Pnpm 11 must not be adopted until Forge removes the exotic transitive dependency or pnpm provides a narrowly scoped, reviewed compatibility mechanism.

## Verification sources

All version and constraint data was checked on 2026-08-08.

- [Electron 43.2.0 release metadata](https://releases.electronjs.org/release/v43.2.0)
- [Electron release and support policy](https://www.electronjs.org/docs/latest/tutorial/electron-timelines)
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [Electron package metadata](https://www.npmjs.com/package/electron/v/43.2.0)
- [Electron Forge CLI package metadata](https://www.npmjs.com/package/@electron-forge/cli/v/7.11.2)
- [Forge Vite plugin documentation](https://www.electronforge.io/config/plugins/vite)
- [Forge Vite plugin package metadata](https://www.npmjs.com/package/@electron-forge/plugin-vite/v/7.11.2)
- [Vite package metadata](https://www.npmjs.com/package/vite/v/7.3.1)
- [React package metadata](https://www.npmjs.com/package/react/v/19.2.8)
- [TypeScript package metadata](https://www.npmjs.com/package/typescript/v/7.0.2)
