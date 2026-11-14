# Multi-Tab Testing in Cypress with `@cypress/puppeteer`: Practical Guide

*Based on the official Cypress `@cypress/puppeteer` architecture and documentation.*

---

## 1. What It Is and How It Works

Cypress runs your test inside a single browser tab. The `@cypress/puppeteer` plugin lets your spec reach other tabs, popups, and windows outside it.

The plugin has two halves:

1. **Config Side (Node.js):** You register named message handlers with `setup()` in `cypress.config.js`. Each handler receives a Puppeteer `Browser` instance connected to the same browser Cypress launched.
2. **Spec Side (Browser):** `cy.puppeteer('handlerName', ...args)` runs that handler and yields its return value to your command chain, where you can use `.should()` or `.then()` as usual.

> **Under the Hood:** `cy.puppeteer()` runs on top of `cy.task()`. For each call, the plugin connects Puppeteer to the browser, runs your handler, then disconnects. The browser stays open throughout.

---

## 2. First Decide: Do You Even Need It?

The official Cypress documentation recommends this check before adding the plugin. If nothing passes between the tabs, you can test from the Cypress tab alone, and the test works in every browser Cypress supports.

| Situation | Approach | Needs Plugin? |
| :--- | :--- | :--- |
| Link opens a new tab, you only care that the link is right | Assert `target="_blank"` and `href` | **No** |
| You want to check the destination page | `.invoke('removeAttr', 'target').click()` | **No** |
| App calls `window.open()` | `cy.stub(win, 'open')` in `onBeforeLoad` | **No** |
| Navigation to another origin in the same tab | `cy.origin()` | **No** |
| Read content inside the new tab | `@cypress/puppeteer` | **Yes** |
| Popup that reports back via `postMessage` | `@cypress/puppeteer` | **Yes** |
| Cross-tab sync (`localStorage`, sign-out everywhere) | `@cypress/puppeteer` | **Yes** |
| Two users at once (chat, comments, shared docs) | `@cypress/puppeteer` with a separate browser context | **Yes** |

---

## 3. Installation, Step by Step

### Step 1: Install the plugin
```bash
npm install @cypress/puppeteer --save-dev
```
*Yarn, pnpm, and Bun equivalents also work. The plugin bundles its own copy of `puppeteer-core`, so don’t install Puppeteer separately.*

### Step 2: Add the support file import
This registers the `cy.puppeteer()` command:
```javascript
// cypress/support/e2e.js
import '@cypress/puppeteer/support'
```

### Step 3: Register handlers in your Cypress config
```javascript
// cypress.config.js
const { defineConfig } = require('cypress')
const { setup, retry } = require('@cypress/puppeteer')

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      setup({
        on,
        onMessage: {
          async readNewTab(browser, urlPart) {
            const page = await retry(async () => {
              const pages = await browser.pages()
              const tab = pages.find((p) => p.url().includes(urlPart))
              if (!tab) throw new Error(`No tab with a URL containing "${urlPart}"`)
              return tab
            })
            const heading = await page.waitForSelector('h1')
            const text = await heading?.evaluate((el) => el.textContent)
            await page.close()
            return text
          },
        },
      })
    },
  },
})
```

### Step 4 (TypeScript only): Add the types
```json
{
  "compilerOptions": {
    "types": ["cypress", "@cypress/puppeteer/support"]
  }
}
```

### Step 5: Call the handler from your spec
```javascript
cy.visit('/order.html')
cy.contains('a', 'View receipt').click()
cy.puppeteer('readNewTab', 'receipt').should('equal', 'Receipt for order #1234')
```

### Step 6: Run in a Chromium-based browser
```bash
npx cypress run --browser chrome
```

---

## 4. Rules to Follow When Writing Handlers

1. **Register everything in one `setup()` call.** A second call replaces the handlers from the first. Merge your `onMessage` objects.
2. **Skip the Cypress tab.** `browser.pages()` includes it, and its URL contains `/__/`. Filter it out or you may close your own test.
3. **Look up pages fresh in every handler.** Each call gets a new connection, so never keep a `Page` or element handle for the next call.
4. **Handlers don’t retry automatically.** `cy.puppeteer()` runs once. Wait for slow operations inside the handler using `retry()` or `page.waitForSelector()`. `retry()` gives up after 4 seconds by default; pass `{ timeout: 10000 }` if needed.
5. **Everything must be serializable.** Arguments and return values cross a `cy.task()` bridge. A handler returning `undefined` yields `null`.
6. **Mind the timeout.** A handler running longer than `taskTimeout` (60 seconds by default) fails.
7. **Errors surface in the test.** If a handler throws, the test fails immediately with its error message.

---

## 5. Common Patterns from the Docs

- **Read a new tab:** `readNewTab` with `retry()`, as demonstrated above.
- **Complete a popup flow:** A handler finds the popup, calls `bringToFront()`, and clicks “Allow”. The docs use `popup.$eval('button#allow', b => b.click())` because the app closes the popup immediately, and `popup.click()` can fail with *“Target closed”*. The spec then asserts on the main tab.
- **Cross-tab updates:** `browser.newPage()` opens a second tab that shares `localStorage` with the Cypress tab. Change something there and assert in the original tab. The same pattern covers the sign-out-everywhere check.
- **Two users at once:** `browser.createBrowserContext()` gives separate cookies and storage, acting like a different user session. A plain `newPage()` would be the same user.
- **Cleanup between tests:** A `closeExtraTabs` handler called from `afterEach`, guarded with `Cypress.browser.family === 'chromium'`.
- **Debugging failures:** A `screenshotOtherTabs` handler that saves one image per tab to `screenshotsFolder`. Upload that folder as a CI artifact.

---

## 6. Limitations

### Browser Support
- **Chromium-based browsers only** (Chrome, Chrome for Testing, Chromium, Edge, Electron). Firefox and WebKit fail with an error.
- **Headed Google Chrome 137 and later fails to launch** once `setup()` is registered, even for specs that never call `cy.puppeteer()`. Chrome removed the `--load-extension` flag the plugin needs. Headless runs work in any Chrome version. For headed runs, use **Chrome for Testing** or **Chromium**.
- **Electron is restricted.** It can read and control tabs your app opens, but it can’t use `browser.newPage()`, can’t create browser contexts, and can’t screenshot other tabs (`page.screenshot()` hangs until `taskTimeout`). Popups also get `window.opener` as `null`, which breaks `postMessage` flows.

### Design Constraints
- No automatic retry of the handler itself.
- Serializable data only.
- Only one `setup()` call is effective.
- You write real Puppeteer code in Node.js, so there is a small learning curve beyond plain Cypress.
- Default `retry()` is 4 seconds, so slow pages need a longer timeout.

> [!NOTE]
> **Headed vs Headless:** In newer Google Chrome releases (v137+), Google Chrome works in **headless mode** (`cypress run --browser chrome`). If you run headed mode (`cypress open`), use **Chrome for Testing** or **Chromium**.

---

## 7. How It Helps QA

- **Covers real-world flows previously untestable in Cypress:** OAuth and payment popups, receipt and invoice tabs, document previews.
- **Tests cross-tab behavior:** Session sync and settings propagation, which are common sources of bugs.
- **Supports multi-user scenarios:** Chat and collaboration flows in a single test.
- **Stays inside the Cypress workflow:** Handlers appear as `puppeteer` steps in the Command Log, with normal assertions and error reporting.
- **Reduces flakiness:** `retry()` replaces fixed waits, and cleanup hooks prevent tab leakage between tests.
- **Improves CI debugging:** Screenshots of every tab on failure.
- **Encourages the right level of testing:** The docs push you to use simple DOM or stub checks when a second tab isn’t needed, so the plugin is used only where it adds genuine value.

---

## 8. Troubleshooting Quick Reference

| Error | Cause | Fix |
| :--- | :--- | :--- |
| `Could not find message handler` | Name mismatch, or a second `setup()` replaced handlers | Check the name and merge into one `setup()` |
| `Failed retrying after 4000ms` | Tab didn’t open or the URL doesn’t match | Verify the match string, or raise the `retry()` timeout |
| `cy.task('__cypressPuppeteer__') timed out` | Handler exceeded `taskTimeout` | Look for a stuck wait or an Electron screenshot, or raise `taskTimeout` |
| `Target.createTarget: Not supported` | `newPage()` or contexts in Electron | Use Chrome, Chromium, or Edge |
| `Only Chromium family supported` | Ran in Firefox or WebKit | Switch browser |
| `Doesn’t work in Chrome v137+` | Headed Chrome 137+ | Use headless, Chrome for Testing, or Chromium |
| `Cannot communicate with the Chrome extension` | Extension disabled or blocked by policy | Enable it at `chrome://extensions/` or allow it in browser policy |
| `Lost reference to the browser` | Config reloaded without a browser relaunch | Close and reopen the browser from Cypress |
