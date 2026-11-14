# Test Execution Guide

This guide provides complete instructions for configuring, running, and debugging the Cypress Multi-Tab and Multiple Window Automation Framework.

---

## 1. Prerequisites

Before executing the tests, verify the following dependencies on your system:

| Prerequisite | Minimum Version | Verified Version | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | 18.x or later | `v24.18.0` | Required by `@cypress/puppeteer` (bundled `puppeteer-core` v24). |
| **npm** | 9.x or later | `12.2.2` | Comes bundled with Node.js. |
| **Google Chrome** | 100+ | `Chrome 157+` | Standard Chrome or Chromium installation. |
| **Operating System** | Windows, macOS, Linux | Windows 11 x64 | Framework includes cross-platform runner `run-cypress.js`. |

---

## 2. Installation

1. Clone or navigate to the project directory:
   ```bash
   cd c:\Users\mvsar\Projects\CYMULTITAB
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Verify Cypress executable:
   ```bash
   npx cypress verify
   ```

> **Windows Tip:** If your environment has `ELECTRON_RUN_AS_NODE=1` set globally by developer IDEs or harness processes, all `npm run` scripts in this project automatically route through `run-cypress.js`, which strips this variable cleanly before launching Cypress.

---

## 3. Available NPM Scripts

The project includes pre-configured scripts in `package.json`:

| Command | Action | Browser | Mode |
| :--- | :--- | :--- | :--- |
| `npm run cy:open` | Opens the interactive Cypress GUI runner. | Google Chrome | Interactive / Headed |
| `npm run cy:run` | Executes all specs in headless mode. | Google Chrome | Headless |
| `npm run cy:chrome` | Explicit headless run in Google Chrome. | Google Chrome | Headless |
| `npm run cy:electron` | Runs specs in Electron browser. | Electron | Headless |
| `npm run test:multitab` | Runs the full multi-tab test suite. | Google Chrome | Headless |
| `npm run test:01` | Runs Scenario 01 (DOM validation without switching). | Google Chrome | Headless |
| `npm run test:02` | Runs Scenario 02 (New Tab with Puppeteer). | Google Chrome | Headless |
| `npm run test:03` | Runs Scenario 03 (Replace Window navigation). | Google Chrome | Headless |
| `npm run test:04` | Runs Scenario 04 (New Window / Popup handling). | Google Chrome | Headless |
| `npm run test:05` | Runs Scenario 05 (Multiple tabs & context cleanup). | Google Chrome | Headless |

---

## 4. Running the Tests

### Option A: Run the Entire Test Suite
To run all 5 test scenarios sequentially in Google Chrome:
```bash
npm run test:multitab
```

**Expected Suite Output:**
```
====================================================================================================
  (Run Finished)

       Spec                                              Tests  Passing  Failing  Pending  Skipped  
  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ √  01-new-tab-basic.cy.js                   00:03        3        3        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ √  02-new-tab-puppeteer.cy.js               00:04        2        2        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ √  03-replace-window.cy.js                  00:04        2        2        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ √  04-new-window.cy.js                      00:03        2        2        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ √  05-multiple-tabs.cy.js                   00:04        2        2        -        -        - │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘
    √  All specs passed!                        00:19       11       11        -        -        -  
```

### Option B: Run an Individual Spec
To focus on a single scenario during development or interview demonstration:
```bash
# Example: Run Scenario 02 (Puppeteer Tab Handling)
npm run test:02
```

### Option C: Interactive Mode (Cypress App)
To open the graphical Cypress runner:
```bash
npm run cy:open
```
1. Click **E2E Testing**.
2. Select **Chrome**.
3. Click any spec (e.g. `02-new-tab-puppeteer.cy.js`) to view real-time execution in the browser.

---

## 5. Browser Compatibility Notes

### Google Chrome (Headless & Headed)
- Google Chrome is the recommended browser for multi-tab automation.
- In headless mode (`cypress run --browser chrome`), Puppeteer seamlessly interfaces with the Chrome DevTools Protocol (CDP) WebSocket port.
- In Chrome 137+, Google restricted command-line extension loading. If you run headed mode in newer Chrome releases and see an extension warning, headless execution (`npm run cy:run`) or **Chrome for Testing** / **Chromium** provides 100% full support.

### Electron
- Electron is supported for native Cypress tests and for application-triggered tabs/windows.
- Note: Electron's internal architecture does not support Puppeteer's synthetic `browser.newPage()` method. Application-triggered tabs (via `window.open`) are fully supported.

---

## 6. Troubleshooting Common Issues

### Issue 1: `ELECTRON_RUN_AS_NODE: bad option: --smoke-test`
- **Cause:** Some tools (like VS Code terminals or background daemons) set `ELECTRON_RUN_AS_NODE=1`. When Electron launches, it expects Node flags rather than Electron flags.
- **Fix:** Use the bundled npm scripts (`npm run test:multitab`), which invoke `node run-cypress.js` to strip the offending variable before running Cypress.

### Issue 2: `cy.task('__cypressPuppeteer__') timed out after waiting 60000ms`
- **Cause:** The target tab URL did not match the string passed to `readNewTab`, or the target site was unreachable.
- **Fix:** Ensure the expected domain substring matches the actual navigation URL (e.g. `automatenow.io`), and verify network access.

### Issue 3: Tabs leaking between tests
- **Cause:** A previous test failed before reaching its tab-closing step.
- **Fix:** Always register tab cleanup inside both `beforeEach()` and `afterEach()` hooks using `cy.closeExtraTabs()`.
