# Cypress Multi-Tab & Multiple Window Automation Framework

[![Cypress](https://img.shields.io/badge/Cypress-14.5.4-04C38C.svg?logo=cypress)](https://www.cypress.io/)
[![@cypress/puppeteer](https://img.shields.io/badge/@cypress/puppeteer-1.0.0-0288D1.svg)](https://github.com/cypress-io/cypress/tree/develop/npm/puppeteer)
[![Node](https://img.shields.io/badge/Node.js-18+-339933.svg?logo=node.js)](https://nodejs.org/)
[![Chrome](https://img.shields.io/badge/Browser-Chrome%20157-4285F4.svg?logo=googlechrome)](https://www.google.com/chrome/)
[![Status](https://img.shields.io/badge/Tests-11%20Passed%20%7C%200%20Failed-success.svg)]()

> A production-grade, interview-ready Cypress automation framework demonstrating **Multi-Tab Handling, Multiple Windows, Popup Handling, and Cross-Tab Automation** using `@cypress/puppeteer` and native Cypress techniques against a live target application.

---

## Executive Summary & Solution Matrix

| Scenario | Objective | Technical Approach | Tab Switching? | Tools Used |
| :--- | :--- | :--- | :--- | :--- |
| **01: New Tab Basic** | Validate links opening new tabs without switching | DOM Contract assertion (`target="_blank"` & `href`) + `cy.stub(win, 'open')` | No (Not Needed) | Native Cypress |
| **02: New Tab Puppeteer** | Access real opened tab, read URL, title & content | CDP Target Inspection via `@cypress/puppeteer` message handler | Yes (Real Tab) | `@cypress/puppeteer` + Chrome |
| **03: Replace Window** | Handle `window.open(..., '_self')` replacing current page | Cross-origin context switching via `cy.origin()` | No (Same Window) | Native Cypress `cy.origin()` |
| **04: New Window / Popup** | Handle OS popup window (`window.open` with features) | CDP Window Target detection via `@cypress/puppeteer` | Yes (Real Window) | `@cypress/puppeteer` + Chrome |
| **05: Multiple Tabs & Cleanup** | Handle 2+ open tabs/windows, count, and clean up | Multi-target CDP orchestration & leak-free teardown | Yes (Multi-Page) | `@cypress/puppeteer` + Chrome |

---

## Live Application DOM Inspection Findings

Before writing test scripts, the target application (`https://practice-automation.com/window-operations/`) was inspected directly. Here are the empirical DOM attributes and behaviors:

### 1. Application Metadata
- **URL:** `https://practice-automation.com/window-operations/`
- **Page Heading:** `<h1 itemprop="headline">Window Operations</h1>`
- **Page Title:** `Window Operations | Practice Automation`

### 2. Descriptive Anchor Link
- **Element:** `<a href="https://www.youtube.com/watch?v=vZi_Xw8IvHo" target="_blank" rel="noreferrer noopener">multiple open windows</a>`
- **Mechanism:** Standard HTML anchor with `target="_blank"`.
- **Destination:** YouTube video.

### 3. "New Tab" Control
- **Element:** `<button class="custom_btn btn_hover" onclick="newTab()" style="background-color:#00aaef"><b>New Tab</b></button>`
- **Mechanism:** JavaScript `onclick="newTab()"`.
- **Underlying Script:**
  ```javascript
  function newTab() {
    window.open("https://www.automatenow.io");
  }
  ```
- **Behavior:** `window.open` with omitted target defaults to `_blank`, opening `https://www.automatenow.io` in a new tab strip.
- **Redirect:** HTTP 301 redirects to canonical `https://automatenow.io/`.
- **Destination Title:** `automateNow | The Best FREE Software Online Training Platform`.
- **Destination Heading:** `<h2 class="wp-block-heading"><strong>Start learning</strong></h2>`.

### 4. "Replace Window" Control
- **Element:** `<button class="custom_btn btn_hover" onclick="newWindowSelf()" style="background-color:#00aaef"><b>Replace Window</b></button>`
- **Mechanism:** JavaScript `onclick="newWindowSelf()"`.
- **Underlying Script:**
  ```javascript
  function newWindowSelf() {
    window.open("https://www.automatenow.io", "_self", "toolbar=yes, scrollbars=yes, resizable=yes, top=200, left=200, width=600, height=600");
  }
  ```
- **Behavior:** The `_self` target instructs the browser to replace the current page inside the same window/frame.

### 5. "New Window" Control
- **Element:** `<button class="custom_btn btn_hover" onclick="newWindow()" style="background-color:#00aaef"><b>New Window</b></button>`
- **Mechanism:** JavaScript `onclick="newWindow()"`.
- **Underlying Script:**
  ```javascript
  function newWindow() {
    window.open("https://www.automatenow.io", "_blank", "toolbar=yes, scrollbars=yes, resizable=yes, top=200, left=200, width=600, height=600");
  }
  ```
- **Behavior:** Because specific window features (`width=600, height=600, top=200, left=200`) are supplied, Chromium opens a separate OS popup window rather than a tab strip tab.

---

## Step-by-Step Learning Documentation

> 📖 **Looking for a concise reference?** Check out the [Practical Guide](practical-guide.md) ([docs/practical-guide.md](docs/practical-guide.md)) for quick decision matrices, handler rules, limitations, and troubleshooting tables!

### Step 1: What is multi-tab handling?
- **What are we doing?** Understanding the technical concept of multi-tab and multi-window web browsing.
- **Why are we doing it?** Web applications routinely launch external authorization portals (OAuth/SAML), document viewers (PDFs), payment gateways (Stripe/PayPal), and external help centers into separate tabs or windows. In test automation, multi-tab handling refers to the ability to detect, inspect, interact with, and assert upon multiple browser execution contexts.
- **Expected result:** Clear clarity on how browser processes isolate tabs and why automation engines must bridge execution contexts.
- **Common mistakes:** Confusing an `iframe` (an embedded document inside the same window) with a `window` or `tab` (a standalone top-level browsing context).

---

### Step 2: Why Cypress does not support native tab switching
- **What are we doing?** Analyzing the architectural design of Cypress.
- **Why are we doing it?** In SDET interviews, candidates are invariably asked: *"Why doesn't Cypress have `cy.switchTo().window()` like Selenium?"*
- **Technical Explanation:**
  Selenium and Playwright operate **out-of-process**, communicating remotely via HTTP or WebSockets to browser drivers. Cypress runs **in-process** inside the exact same browser tab as your application, wrapped in an iframe.
  Browsers enforce the **Same-Origin Policy** and strict security sandboxes preventing scripts in one tab from accessing or manipulating other tabs. Because Cypress lives inside the browser's JavaScript event loop, it cannot jump across top-level browser tab boundaries natively.
- **Common mistakes:** Assuming this is a bug or oversight in Cypress. It is an intentional trade-off that allows Cypress to offer deterministic DOM waiting, time-travel debugging, and superior speed.

---

### Step 3: Difference between a new tab, new window, popup, and replace-window navigation
- **What are we doing?** Defining the 4 distinct browsing context behaviors.
- **Why are we doing it?** Selecting the correct automation approach requires knowing the exact window mechanism.

| Navigation Type | Code Trigger | Browser Action | Cypress Strategy |
| :--- | :--- | :--- | :--- |
| **New Tab** | `<a target="_blank">` or `window.open(url, '_blank')` | Creates an adjacent tab in the browser's tab strip. | DOM contract / `cy.stub` OR `@cypress/puppeteer` |
| **New Window / Popup** | `window.open(url, '_blank', 'width=600,height=600')` | Creates a floating OS window with explicit dimensions. | `@cypress/puppeteer` CDP target inspection |
| **Replace Window** | `window.open(url, '_self')` or `<a target="_self">` | Replaces current document in the existing tab. | Native Cypress + `cy.origin()` if cross-domain |
| **Same-Origin Link** | `<a href="/dest">` | Navigates the current frame within same domain. | Native Cypress `cy.visit()` / `cy.click()` |

---

### Step 4: Create the Cypress project
- **What are we doing?** Initializing the project repository and directory structure.
- **Why are we doing it?** Establishing clean separation between configuration, test specs, support commands, and architecture documentation.
- **Code:**
  ```bash
  mkdir cypress-multitab-demo
  cd cypress-multitab-demo
  npm init -y
  ```
- **Project Structure:**
  ```
  cypress-multitab-demo/
  │
  ├── cypress/
  │   ├── e2e/
  │   │   ├── 01-new-tab-basic.cy.js
  │   │   ├── 02-new-tab-puppeteer.cy.js
  │   │   ├── 03-replace-window.cy.js
  │   │   ├── 04-new-window.cy.js
  │   │   └── 05-multiple-tabs.cy.js
  │   ├── support/
  │   │   └── e2e.js
  │   └── downloads/
  │
  ├── docs/
  │   ├── architecture.md
  │   ├── execution-guide.md
  │   └── interview-questions.md
  │
  ├── cypress.config.js
  ├── package.json
  ├── run-cypress.js
  ├── .gitignore
  └── README.md
  ```
- **Common mistakes:** Placing custom commands in ad-hoc spec files rather than in `cypress/support/e2e.js`.

---

### Step 5: Install Cypress and `@cypress/puppeteer`
- **What are we doing?** Installing Cypress and the official `@cypress/puppeteer` bridge.
- **Why are we doing it?** `@cypress/puppeteer` connects to the browser's CDP port and allows Node.js message handlers to query and control real browser pages.
- **Installation Code:**
  ```bash
  npm install --save-dev cypress@^14.1.0 @cypress/puppeteer@^1.0.0
  npx cypress install --force
  ```
- **Common mistakes:** Installing standalone `puppeteer` separately with mismatched `puppeteer-core` versions, causing binary duplication or protocol version conflicts.

---

### Step 6: Understand Cypress configuration
- **What are we doing?** Creating `cypress.config.js` with `defineConfig` and setting up the environment.
- **Why are we doing it?** Configures the `baseUrl`, timeouts, and node event lifecycles.
- **Key Lines in `cypress.config.js`:**
  ```javascript
  const { defineConfig } = require('cypress');

  module.exports = defineConfig({
    e2e: {
      baseUrl: 'https://practice-automation.com',
      taskTimeout: 60000,
      defaultCommandTimeout: 10000,
      chromeWebSecurity: false,
      setupNodeEvents(on, config) {
        // Registered in Step 7
        return config;
      },
    },
  });
  ```
- **Explanation:**
  - `chromeWebSecurity: false`: Disables Chromium's CORS/Same-Origin restrictions so cross-domain testing can proceed without security blocking.
  - `taskTimeout: 60000`: Allows sufficient time for asynchronous tab detection and external page asset loading.
- **Common mistakes:** Setting timeouts too short (e.g. 2000ms), causing intermittent failures on slow network connections.

---

### Step 7: Register Puppeteer message handlers
- **What are we doing?** Implementing reusable Node.js message handlers inside a single `setup()` call.
- **Why are we doing it?** `@cypress/puppeteer` requires all handlers to be registered in one `setup()` invocation inside `setupNodeEvents()`.
- **Complete Code (`cypress.config.js`):**
  ```javascript
  const { setup, retry } = require('@cypress/puppeteer');

  setup({
    on,
    onMessage: {
      async readNewTab(browser, expectedUrlSubstring) {
        return await retry(async () => {
          const pages = await browser.pages();
          const appPages = pages.filter((page) => !page.url().includes('/__/'));
          const targetPage = appPages.find((p) => p.url().toLowerCase().includes(expectedUrlSubstring.toLowerCase()));
          if (!targetPage) throw new Error('Tab not found');

          await targetPage.waitForFunction(() => document.readyState === 'complete', { timeout: 8000 }).catch(() => {});
          const url = targetPage.url();
          const title = await targetPage.title();
          const heading = await targetPage.evaluate(() => {
            const h = document.querySelector('h1, h2');
            return h ? (h.innerText || '').trim() : '';
          });

          return { url, title, heading, found: true };
        }, { timeout: 15000, delayBetweenTries: 300 });
      },

      async closeTab(browser, expectedUrlSubstring) {
        const pages = await browser.pages();
        const page = pages.find((p) => !p.url().includes('/__/') && p.url().includes(expectedUrlSubstring));
        if (page) await page.close();
        return { closed: true };
      },

      async countBrowserPages(browser, expectedMinimumAppTabs = 0) {
        return await retry(async () => {
          const pages = await browser.pages();
          const appPages = pages.filter((p) => !p.url().includes('/__/'));
          if (appPages.length < expectedMinimumAppTabs) throw new Error('Tabs still opening');
          return { totalPages: pages.length, appTabsCount: appPages.length, appUrls: appPages.map((p) => p.url()) };
        }, { timeout: 10000, delayBetweenTries: 250 });
      },

      async closeAllExtraTabs(browser) {
        const pages = await browser.pages();
        for (const page of pages) {
          if (!page.url().includes('/__/')) {
            await page.close().catch(() => {});
          }
        }
        const remaining = await browser.pages();
        return { remainingTotal: remaining.length };
      },
    },
  });
  ```
- **Important Lines:**
  - `pages.filter((page) => !page.url().includes('/__/'))`: Critical! Excludes the Cypress internal runner tab.
  - `retry(async () => { ... })`: Continuously polls until the new tab finishes opening.
- **Common mistakes:** Returning the Puppeteer `Page` object directly. Only JSON-serializable primitives can cross the IPC bridge!

---

### Step 8: Implement the first test without Puppeteer
- **What are we doing?** Demonstrating native Cypress DOM validation in `cypress/e2e/01-new-tab-basic.cy.js`.
- **Why are we doing it?** Validating the DOM contract or stubbing `window.open` is faster, more reliable, and sufficient for 90% of business scenarios.
- **Complete Code:**
  ```javascript
  describe('Scenario 01: Validate New Tab Without Switching', () => {
    beforeEach(() => {
      cy.openDemoApplication();
    });

    it('1.1 - Validates link with target="_blank" and href without switching tabs', () => {
      cy.contains('a', 'multiple open windows')
        .should('be.visible')
        .and('have.attr', 'target', '_blank')
        .and('have.attr', 'href', 'https://www.youtube.com/watch?v=vZi_Xw8IvHo');
    });

    it('1.2 - Validates JavaScript window.open() on "New Tab" button using cy.stub()', () => {
      cy.window().then((win) => {
        cy.stub(win, 'open').as('windowOpen');
      });

      cy.contains('button', 'New Tab').should('be.visible').click();

      cy.get('@windowOpen')
        .should('be.calledOnce')
        .and('be.calledWith', 'https://www.automatenow.io');
    });
  });
  ```
- **Expected Result:** Both tests pass in ~3 seconds.
- **Common mistakes:** Manually removing `target` when simple attribute assertion is all that is required.

---

### Step 9: Implement actual tab handling using Puppeteer
- **What are we doing?** Handling real browser tabs in `cypress/e2e/02-new-tab-puppeteer.cy.js`.
- **Why are we doing it?** Verifying that the target page actually opens, navigates, renders content, and can be closed cleanly.
- **Complete Code:**
  ```javascript
  describe('Scenario 02: Real New Tab Automation Using Puppeteer', () => {
    const DOMAIN = 'automatenow.io';

    beforeEach(() => {
      cy.openDemoApplication();
      cy.closeExtraTabs();
    });

    afterEach(() => {
      cy.closeExtraTabs();
    });

    it('2.1 - Clicks "New Tab", reads new tab contents via Puppeteer, asserts, and closes tab', () => {
      cy.contains('button', 'New Tab').should('be.visible').click();

      cy.readNewTab(DOMAIN).then((tabData) => {
        expect(tabData.found).to.be.true;
        expect(tabData.url).to.include(DOMAIN);
        expect(tabData.title).to.include('automateNow');
        expect(tabData.heading).to.include('Start learning');
      });

      cy.closeTab(DOMAIN);
      cy.get('h1').should('contain.text', 'Window Operations');
    });
  });
  ```
- **Expected Result:** Test passes in ~4 seconds on Chrome.
- **Common mistakes:** Hardcoding exact redirected URLs instead of matching the domain substring.

---

### Step 10: Implement `window.open()` handling
- **What are we doing?** Handling popup windows in `cypress/e2e/04-new-window.cy.js`.
- **Why are we doing it?** When `window.open` includes feature strings (`width`, `height`), Chrome spawns a popup window instead of a tab.
- **Complete Code:**
  ```javascript
  it('4.1 - Clicks "New Window", detects popup window in Puppeteer, validates content, and closes it', () => {
    cy.contains('button', 'New Window').should('be.visible').click();

    cy.puppeteer('detectNewWindow', 'automatenow.io').then((popupData) => {
      expect(popupData.isWindow).to.be.true;
      expect(popupData.title).to.include('automateNow');
    });

    cy.closeTab('automatenow.io');
    cy.get('h1').should('contain.text', 'Window Operations');
  });
  ```
- **Common mistakes:** Assuming tabs and windows behave differently in CDP. In Puppeteer, both appear in `browser.pages()`.

---

### Step 11: Implement replace-window navigation
- **What are we doing?** Handling `window.open(url, '_self')` in `cypress/e2e/03-replace-window.cy.js`.
- **Why are we doing it?** This replaces the current window without opening a new tab. Because the domain changes cross-origin, native `cy.origin()` is the correct approach.
- **Complete Code:**
  ```javascript
  it('3.1 - Validates Replace Window navigates current window using cy.origin()', () => {
    cy.contains('button', 'Replace Window').click();

    cy.origin('https://automatenow.io', () => {
      cy.url().should('include', 'automatenow.io');
      cy.title().should('include', 'automateNow');
      cy.get('h2').first().should('contain.text', 'Start learning');
    });
  });
  ```
- **Senior SDET Note:** Puppeteer is unnecessary here because the execution remains within the Cypress runner iframe.

---

### Step 12: Implement multiple-tab cleanup
- **What are we doing?** Opening 2+ tabs/windows simultaneously in `cypress/e2e/05-multiple-tabs.cy.js` and guaranteeing complete teardown.
- **Why are we doing it?** Preventing "tab leakage" and test pollution across spec files.
- **Complete Code:**
  ```javascript
  it('5.1 - Opens multiple browser pages using application controls, validates counts, and cleans up', () => {
    cy.contains('button', 'New Tab').click();
    cy.contains('button', 'New Window').click();

    cy.getBrowserPages(2).then((pages) => {
      expect(pages.appTabsCount).to.be.at.least(2);
      expect(pages.totalPages).to.be.at.least(3);
    });

    cy.closeExtraTabs().then((res) => {
      expect(res.remainingTotal).to.equal(1); // Only Cypress runner tab left!
    });
  });
  ```
- **Common mistakes:** Closing tabs without verifying the runner tab was preserved.

---

### Step 13: Execute tests in Chrome
- **What are we doing?** Running the test suite in headless and headed Chrome.
- **Why are we doing it?** Validating that the framework executes reliably in CI and local developer workstations.
- **Execution Command:**
  ```bash
  npm run test:multitab
  ```
- **Execution Result:**
  ```
  All specs passed! (11 tests passed in 19 seconds)
  ```

---

### Step 14: Troubleshoot common failures
1. **`ELECTRON_RUN_AS_NODE: bad option`:** Resolved by running through `run-cypress.js` to scrub this variable.
2. **`cy.task timed out`:** Ensure your search substring matches the canonical domain (`automatenow.io`).
3. **`TargetClosedError`:** Never persist Puppeteer `Page` handles across commands. Always re-query `browser.pages()`.

---

## Architecture & Communication Flow

See the dedicated documentation in [docs/architecture.md](docs/architecture.md) for full Mermaid flowcharts and component responsibility tables.

---

## SDET Interview Preparation

See the comprehensive collection of 22 interview questions and answers in [docs/interview-questions.md](docs/interview-questions.md).

---

## Test Execution Guide

See the step-by-step test execution guide in [docs/execution-guide.md](docs/execution-guide.md).
