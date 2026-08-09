# InboxRail Performance Baseline

**Status:** Reference environment recorded; measurements pending P0-006/P0-007  
**Captured:** 2026-08-08  
**Task:** P0-001  
**Privacy:** This document intentionally excludes the Windows account name, device name, serial numbers, IP addresses, and user-specific paths.

## Reference environment

| Category | Reference value |
|---|---|
| Operating system | Microsoft Windows 11 Home, version 25H2, x64 |
| OS build | 10.0.26200.8973 |
| CPU | Intel Core i9-14900KF, 24 physical cores, 32 logical processors, x64 |
| Memory | 64 GiB installed (2 x 32 GiB), configured at 6400 MT/s |
| Workspace storage | Lexar SSD NQ700 2 TB, NVMe SSD, NTFS |
| GPU | NVIDIA GeForce RTX 4080 SUPER, driver 32.0.15.9649 |
| Primary benchmark display | 3440 x 1440 at 144 Hz |
| Display scaling | 100% (96 DPI) |
| Locale | `en-US` |
| Time zone | Eastern Time (`America/New_York`) |
| Node.js | 22.14.0, x64 |
| npm | 11.12.1 |
| Corepack | 0.31.0 |
| pnpm | 10.33.2 |
| Yarn | Not installed |
| Git | 2.50.0.windows.1 |

The benchmark workspace is on the internal NVMe system drive. External USB drives are not part of the benchmark path. Available disk space is transient and therefore is not an equivalence requirement; keep at least 20 GiB free before packaging or running a benchmark.

These tool versions describe the host at capture time. ADR-015 subsequently selected Node 24.18.0 and pnpm 10.33.2 for repository-controlled work; performance measurements must use those pinned versions rather than the host Node/npm inventory above.

## Equivalent benchmark environment

Another machine is suitable for comparative measurements when it has:

- a Microsoft-supported Windows 11 x64 release with current security updates;
- an x64 CPU with at least 8 physical cores and hardware virtualization enabled;
- at least 32 GiB RAM with no active memory pressure;
- the repository and Electron user-data fixtures on an internal SSD;
- one display at 100% scaling, or an explicitly recorded scaling difference;
- the repository-pinned Node, package-manager, Electron, and dependency versions; and
- the same power mode, application scenario, provider fixtures, network conditions, warm-up, and sampling procedure.

Absolute product-budget acceptance runs use the reference machine above. Results from an equivalent machine are useful for regression comparison but do not silently replace the reference baseline.

## Electron and Windows support policy

- InboxRail V1 targets Windows 11 x64 only. Windows 10, Windows on ARM, macOS, and Linux are outside the V1 support matrix.
- Supported Windows releases must still be serviced by Microsoft. Security updates are expected; a Windows feature update requires a smoke run and a refreshed environment record before it becomes the benchmark OS.
- P0-002 will select and exactly pin one stable Electron major and its compatible Node, Forge, Vite, TypeScript, and React toolchain. A globally installed Electron version is not part of this baseline.
- The production app supports the repository-pinned Electron version, not an open-ended range of Electron majors. Electron upgrades are deliberate changes with clean install, package smoke, security, lifecycle, and performance verification.
- Critical Electron/Chromium security fixes are evaluated promptly. Otherwise, compatibility is reviewed at least quarterly and upgrades are not combined with unrelated feature work.
- Provider pages are external dependencies. Any provider or Chromium change that materially alters process count, memory, startup, or interaction timing triggers a new comparable benchmark run.

## Measurement controls

P0-006 and P0-007 will append raw and summarized results using these controls:

1. Reboot or reach an idle desktop, connect AC power, and use the same Windows power mode.
2. Record the exact commit, Electron version, package artifact, OS build, display setup, and whether GPU acceleration is enabled.
3. Close unrelated foreground applications and allow background update/indexing activity to settle. Do not disable normal security software.
4. Use dedicated fixture accounts or deterministic local fixtures. Never record account addresses, message metadata, cookies, tokens, or credentials.
5. Use a fresh, task-scoped Electron user-data directory for cold scenarios and a documented retained fixture for restart/session scenarios.
6. Warm each scenario for its specified interval, sample the entire InboxRail process tree, and retain per-process role plus total working set.
7. Run each scenario at least three times. Report every raw sample, median, minimum, maximum, and percentage variance from the median.
8. Treat a result as invalid when Windows Update, antivirus scanning, provider outage, authentication prompts, or unrelated heavy activity overlaps the sample; record the reason and rerun it.

The initial acceptance budgets remain those in `ARCHITECTURE.md` section 15. They may change only through the evidence-backed ADR allowed by the architecture and roadmap.

## Pending evidence

| Evidence | Owner task | State |
|---|---|---|
| Renderer process-count and cleanup loop | P0-006 | Pending |
| Shell-only, one-view, two-view, and six-view samples | P0-007 | Pending |
| Raw samples and variance summary | P0-007 | Pending |
| Budget acceptance or evidence-backed revision ADR | P0-007 | Pending |

## Re-capture checklist

When refreshing this record, collect values through Windows system APIs and repository-local tool commands. Review the output before committing it and remove machine/user identifiers. At minimum, recapture OS edition/build, processor/core count, installed RAM, workspace storage type, display resolution/scaling, locale/time zone, and the pinned tool versions.
