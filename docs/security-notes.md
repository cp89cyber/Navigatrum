# Security Notes

This project uses Electron's `webview` tag for a minimal browser prototype. The `webview` tag is powerful but has security trade-offs.

Current mitigations:
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- A restrictive renderer Content Security Policy
- uBlock Origin loads as an unpacked extension in the `persist:navigatrum` session

Future improvements:
- Navigation allow/block lists
- Permission prompts
- Download handling
- Certificate error handling
- Session partitioning per tab

Additional considerations:
- The updater downloads extension assets from GitHub Releases. Future hardening
  should include integrity verification and explicit update prompts.
