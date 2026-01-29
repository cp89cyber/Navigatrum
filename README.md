# Navigatrum

An open source web browser alternative.

## Quick Start

Prerequisites:
- Node.js 20.x (current LTS recommended)

Install dependencies (requires network access to download Electron):

```bash
npm install
```

Run tests:

```bash
npm test
```

Start the app:

```bash
npm start
```

## Current Scope

This is a focused Electron prototype with:
- An address bar
- Back/forward/reload controls
- A single browsing surface powered by a `webview`

## uBlock Origin

Navigatrum bundles uBlock Origin 1.69.0 as an unpacked extension and loads it
into the webview session. Use the uBO button in the toolbar to check for
updates and install stable or prerelease builds (prereleases include a warning).
Updates are fetched from GitHub Releases and stored in the app userData folder.

See `docs/security-notes.md` for important security considerations.
