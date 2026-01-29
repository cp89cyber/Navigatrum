# uBlock Origin Built-In + One-Click Updater Design

Date: 2026-01-29

## Goals
- Bundle uBlock Origin 1.69.0 with Navigatrum as an unpacked extension.
- Provide a one-click in-app updater that downloads the latest Chromium release asset from GitHub Releases.
- Support both stable and prerelease updates, with a warning for prereleases.
- Keep renderer locked down; all network/filesystem work happens in main.

## Architecture Overview
- Bundle a baseline uBO extension under the app resources for offline first-run.
- Install updates into a user-writable location:
  - `app.getPath('userData')/extensions/ublock/<version>`
- Prefer the userData install if present; fall back to bundled copy.
- Store update state in `userData/ublock/state.json` with:
  - `currentVersion`, `currentPath`, `lastCheckAt`, `latestStable`, `latestPrerelease`, `lastReleaseIds`

## Components
- `ublock-manager`: loads/unloads extensions, selects correct install path.
- `ublock-updater`: check/download/extract/update flow.
- `ublock-state`: read/write JSON metadata.
- `ublock-github`: GitHub Releases API fetch and asset selection.

## Data Flow
1. App start: `ublockManager.load()` chooses userData path if available, else bundled 1.69.0.
2. In parallel: `ublockUpdater.checkForUpdates()` calls `https://api.github.com/repos/gorhill/uBlock/releases?per_page=10`.
3. Parse stable and prerelease releases; select the Chromium zip asset (`uBlock0_<version>.chromium.zip`).
4. Compare versions and set `updateAvailable` flags.
5. Renderer shows badge and buttons via IPC status.
6. Update action:
   - Download asset to temp file under userData.
   - Validate zip integrity.
   - Extract to `extensions/ublock/<version>`.
   - Update state atomically.
   - Reload extension from new path.

## IPC
- `ublock:getStatus`
- `ublock:check`
- `ublock:update` (stable/prerelease)
- `ublock:openFolder`
- Events: `ublock:updateProgress`, `ublock:updateError`, `ublock:updateDone`

## Error Handling
- If GitHub unreachable: use cached state, display “Last checked” in settings.
- If asset missing or corrupt: keep current extension, surface actionable error.
- Only switch to new version after successful extraction.
- Prerelease updates require a warning confirmation.

## UX
- Toolbar Update button with badge when update is available.
- Settings panel shows:
  - Current version
  - Latest stable/prerelease
  - “Update to stable” and “Update to prerelease” (with warning)
  - “Check now” and “Open extension folder”

## Testing
- Unit tests: version comparison and release parsing.
- Integration tests: mocked zip extraction + install path selection.
- Smoke test: ensure extension loads in main process (e.g., `session.getAllExtensions()`).
