# Clock - Time Tracker

A desktop time tracking app built with Electron and React.

## Getting Started

**Requirements:** [Node.js](https://nodejs.org) (v18 or later)

```bash
# 1. Install dependencies (only needed once after cloning)
npm install

# 2. Launch the app
npm run dev
```

## Building an Installer

To package the app as a distributable installer for your platform:

```bash
npm run package
```

Output will be in the `release/` folder:
- **Mac:** `Clock-1.0.0.dmg`
- **Windows:** `Clock Setup 1.0.0.exe`

> Note: To build a Windows installer you must run `npm run package` on a Windows machine, and vice versa for Mac.

## Installing the App (Security Warnings)

Since the app is unsigned, both Mac and Windows will show a warning the first time you open it.

**Mac:** Right-click the `.dmg` → Open → click "Open" in the dialog. Only needed once.

**Windows:** When running the `.exe` installer, click "More info" on the SmartScreen popup, then click "Run anyway". Only needed once.
