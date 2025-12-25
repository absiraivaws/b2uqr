# LankaQR Electron Overlay

This is a minimal Electron overlay that opens an always-on-top window and loads your QR app URL. Use it to display QR codes in a floating window that stays above normal windows.

Getting started

1. Install dependencies:

```bash
cd electron-overlay
npm install
```

2. Start the overlay pointing to your app URL (default: `http://localhost:9002`):

```bash
# using env var
APP_URL="https://your-app.example.com" npm start

# or using CLI arg
npm start -- --appUrl=https://your-app.example.com
```

Notes
- The overlay window uses `alwaysOnTop: true` but OS/window manager policies still apply.
- For better UX, open a dedicated route in your web app (e.g. `/overlay`) that renders a minimal QR-only view. Point the overlay to that route.
- If your overlay needs to interact with the main web app (e.g., close when QR is used), implement a small postMessage or IPC flow.
