# Cypress Multi-Tab & Multi-Window SDET Interview Questions

This comprehensive guide contains **22 practical, in-depth interview questions and answers** frequently asked in Senior SDET, Test Automation Architect, and Lead QA technical interviews.

---

### Q1: Why can't Cypress natively switch between browser tabs like Selenium's `driver.switchTo().window()`?
**Answer:**
Cypress is architected to run inside the **same JavaScript execution loop** as the application under test (AUT). Unlike Selenium WebDriver or Playwright, which run out-of-process and send remote HTTP or WebSocket commands to browser drivers, Cypress injects its test runner inside an iframe on a single browser tab.
Because the browser's JavaScript security model strictly isolates execution contexts across top-level browser tabs, Cypress has direct DOM access only within its host window and iframes. It cannot natively manipulate or switch focus to another top-level browser tab without an out-of-process bridge such as Chrome DevTools Protocol (CDP) or `@cypress/puppeteer`.

---

### Q2: What is the classic Cypress workaround for links with `target="_blank"`, and what are its trade-offs?
**Answer:**
The classic workaround is to remove the `target` attribute using jQuery's `.removeAttr()` before clicking the link:

```javascript
cy.get('a#external-link')
  .invoke('removeAttr', 'target')
  .click();
```

**Trade-offs:**
- **Pros:** Fast, native to Cypress, requires no plugins or extra dependencies.
- **Cons:** It modifies the Application Under Test (MUT - Mutating Under Test), meaning you are not testing the exact user experience. If navigation leads cross-origin, you must wrap subsequent assertions in `cy.origin()`. It also fails if the link action is bound to a JavaScript `onclick` handler rather than an HTML anchor `href`.

---

### Q3: How do you validate new-tab behavior without actually opening or switching to the tab?
**Answer:**
You validate the **DOM Contract**. Under HTML5 specifications, an anchor element with `target="_blank"` guarantees that any compliant browser will open the destination in a new window or tab. Therefore, verifying the element's visibility, `target`, and `href` attributes fully verifies your application's behavior:

```javascript
cy.contains('a', 'Terms & Conditions')
  .should('be.visible')
  .and('have.attr', 'target', '_blank')
  .and('have.attr', 'href', '/legal/terms');
```
This is deterministic, lightning fast, and avoids network flakiness from third-party sites.

---

### Q4: What is the purpose of `cy.stub()` when dealing with window operations?
**Answer:**
`cy.stub()` creates a Sinon stub to spy on or intercept JavaScript function invocations on the `window` object. When an application triggers a new tab or popup via `window.open()`, you can stub `window.open` before the action triggers:

```javascript
cy.window().then((win) => {
  cy.stub(win, 'open').as('windowOpen');
});

cy.get('#btn-new-tab').click();

cy.get('@windowOpen')
  .should('be.calledOnce')
  .and('be.calledWith', 'https://example.com/dest', '_blank');
```
This validates that the application executed the correct function with expected parameters, preventing the browser from actually spawning a secondary tab.

---

### Q5: How does JavaScript `window.open()` behave, and how do window features determine tab vs popup behavior?
**Answer:**
The `window.open(url, target, windowFeatures)` method has three arguments:
1. `url`: The resource to load.
2. `target`: Name or special keyword (`_blank`, `_self`, `_parent`, `_top`).
3. `windowFeatures`: Comma-separated key-value pairs (e.g. `width=600,height=600,top=100,left=100`).

**Behavior:**
- If `windowFeatures` is **omitted**, browsers like Chrome open the URL in a new **tab** in the main tab strip.
- If `windowFeatures` (such as dimensions `width`, `height`) are **provided**, the browser window manager spawns a standalone **popup window**.
- If `target` is `_self`, it navigates the **current window** in place.

---

### Q6: What is `@cypress/puppeteer` and how does it work under the hood?
**Answer:**
`@cypress/puppeteer` is the official Cypress plugin (published by Cypress.io) that provides a bridge between Cypress tests and Puppeteer.
When Cypress launches a Chromium browser, it opens a remote debugging port. `@cypress/puppeteer` connects a Puppeteer `Browser` instance to this existing browser process over CDP (Chrome DevTools Protocol).
From the spec, invoking `cy.puppeteer(messageName, ...args)` sends an IPC task to Node.js, where a custom message handler runs asynchronous Puppeteer commands against the browser, returning serializable results back to Cypress.

---

### Q7: What is the difference between `browser.pages()` and `browser.newPage()` in Puppeteer?
**Answer:**
- `browser.pages()`: Queries Chromium for an array of **existing** open `Page` targets (both tabs and windows) that are already running in the browser context. This is what you use to inspect tabs opened by the application's UI controls.
- `browser.newPage()`: Programmatically tells Chromium to **instantiate a new blank tab**.
> **Interview Rule:** In real E2E testing, never use `browser.newPage()` as a fake substitute for testing application triggers. Use `browser.pages()` to find the tab that the user's click created.

---

### Q8: Why must you always exclude the Cypress runner tab when inspecting `browser.pages()`?
**Answer:**
The Cypress Test Runner itself occupies a top-level browser tab in Chrome (its URL contains the internal pattern `/__/`, e.g. `http://localhost:<port>/__/#/specs/runner...`).
If you do not exclude `/__/`:
1. You may accidentally read or assert on the Cypress runner UI instead of the application.
2. If you execute a cleanup command (like `page.close()`), you could accidentally close the runner tab, instantly crashing the entire Cypress test run.

```javascript
const appPages = pages.filter((page) => !page.url().includes('/__/'));
```

---

### Q9: Why should Puppeteer `Page` objects never be stored or reused across `cy.puppeteer()` calls?
**Answer:**
1. **Process Boundaries:** Cypress specs run in the browser sandbox; Puppeteer runs in Node.js. Objects cannot be passed directly across this process boundary.
2. **Stale References & Race Conditions:** Pages can navigate, redirect, reload, or close between Cypress commands. Storing a `Page` instance in a Node global leads to `TargetClosedError` or stale execution contexts.
3. **Best Practice:** Always re-query `browser.pages()` freshly inside each message handler invocation.

---

### Q10: What is the difference between `cy.origin()` and `@cypress/puppeteer`?
**Answer:**
- `cy.origin()`: Designed for **same-tab cross-origin navigation** (e.g. your app redirects the current window to an OAuth login provider like Okta or Google, then returns). Both origins run sequentially in the single Cypress runner iframe.
- `@cypress/puppeteer`: Designed for **multiple simultaneous tabs or windows**. `cy.origin()` cannot reach into a separate top-level browser tab; you must use Puppeteer to automate external tabs.

---

### Q11: How do you handle asynchronous tab creation to prevent race conditions in Puppeteer?
**Answer:**
When a button is clicked, Chromium creates the new OS tab and establishes the CDP target asynchronously. Querying `browser.pages()` instantaneously might return an empty array.
Use the `retry()` utility exported by `@cypress/puppeteer`:

```javascript
import { retry } from '@cypress/puppeteer';

const targetPage = await retry(async () => {
  const pages = await browser.pages();
  const appPages = pages.filter(p => !p.url().includes('/__/'));
  const found = appPages.find(p => p.url().includes('expected-domain.com'));
  if (!found) throw new Error('Tab not ready yet');
  return found;
}, { timeout: 10000, delayBetweenTries: 250 });
```

---

### Q12: How do you safely close extra tabs and restore context in Cypress?
**Answer:**
Implement a dedicated cleanup handler in `cypress.config.js` and call it inside Mocha lifecycle hooks (`beforeEach` and `afterEach`):

```javascript
// In cypress.config.js:
async closeAllExtraTabs(browser) {
  const pages = await browser.pages();
  for (const page of pages) {
    if (!page.url().includes('/__/')) {
      await page.close().catch(() => {});
    }
  }
}

// In test spec:
afterEach(() => {
  cy.closeExtraTabs();
});
```
This guarantees that even if an assertion fails midway through a test, subsequent tests start with a clean browser context.

---

### Q13: What are the limitations of running multi-tab tests in Electron compared to Chrome?
**Answer:**
- **Electron:** Does not support Puppeteer's `browser.newPage()` API (throws `Protocol error (Target.createTarget): Not supported`). However, tabs/windows spawned by the application itself via `window.open()` do work.
- **Chrome / Chromium:** Fully supports the entire Chrome DevTools Protocol, including all target creation, multi-window orchestration, and headless/headed modes.

---

### Q14: How does Cypress handle cross-origin navigation when an action replaces the current window (`_self`)?
**Answer:**
In Cypress 12 and above, `cy.origin(targetOrigin, callback)` enables testing cross-origin domains within the same window:

```javascript
cy.contains('button', 'Replace Window').click();

cy.origin('https://automatenow.io', () => {
  cy.url().should('include', 'automatenow.io');
  cy.title().should('include', 'automateNow');
});
```

---

### Q15: How can data be extracted from an external tab and passed back to Cypress for assertions?
**Answer:**
In the Puppeteer message handler, evaluate JavaScript inside the target page, construct a plain JavaScript object, and return it. The value is yielded to Cypress's `.then()` chain:

```javascript
// In cypress.config.js:
async readTabContent(browser, domain) {
  const page = await findTab(browser, domain);
  return {
    url: page.url(),
    title: await page.title(),
    h1: await page.$eval('h1', el => el.innerText).catch(() => '')
  };
}

// In Cypress spec:
cy.puppeteer('readTabContent', 'automatenow.io').then((data) => {
  expect(data.title).to.include('automateNow');
  expect(data.h1).to.not.be.empty;
});
```

---

### Q16: Why can't you pass a Puppeteer `ElementHandle` or `Page` object directly to `cy.then()`?
**Answer:**
Cypress commands run in the browser execution context, while Puppeteer message handlers run in the Node.js background process. Communication between them occurs via Node's IPC protocol, which serializes data to JSON strings.
DOM elements, functions, and complex class instances like `Page` cannot be serialized into JSON and will result in circular reference errors or stripped objects (`{}`).

---

### Q17: What happens if a tab redirects (e.g. HTTP 301 from `https://www.automatenow.io` to `https://automatenow.io/`)?
**Answer:**
If your test searches for an exact URL string (`https://www.automatenow.io`), it may fail because the browser quickly redirects to the canonical URL (`https://automatenow.io/`).
**Best Practice:** Search using substring matching or regular expressions against the root domain:

```javascript
const page = appPages.find(p => p.url().includes('automatenow.io'));
```

---

### Q18: What is "test pollution" in the context of multi-tab automation, and how do you prevent it?
**Answer:**
Test pollution occurs when a test opens tabs or popups that remain open when the next test begins. Extra tabs consume browser memory, cause CPU throttling on inactive tabs, and may cause subsequent queries for `browser.pages()` to select the wrong tab.
**Prevention:**
1. Call `cy.closeExtraTabs()` in `beforeEach()` to guarantee an initial clean state.
2. Call `cy.closeExtraTabs()` in `afterEach()` to guarantee teardown even upon test assertion failures.

---

### Q19: When should you choose Playwright over Cypress if your application heavily relies on multi-tab workflows?
**Answer:**
If an application's core user journey inherently requires continuous back-and-forth multi-tab interactions (e.g., Tab A triggers an action, Tab B receives a notification, user performs an action in Tab B, and Tab A immediately updates):
- **Playwright** supports native multi-page orchestration with first-class `context.waitForEvent('page')`, `page.bringToFront()`, and native step-by-step reporting across all pages.
- **Cypress** is optimized for single-page component and end-to-end flows. While `@cypress/puppeteer` bridges multi-tab needs cleanly, a suite with 80%+ multi-tab back-and-forth orchestration is more naturally suited to Playwright.

---

### Q20: How do you verify whether a newly opened page is a popup window or a standard tab?
**Answer:**
In Chromium, popup windows are created when `windowFeatures` (such as `width`, `height`, `menubar`, `toolbar`) are passed to `window.open()`.
In Puppeteer, you can evaluate the window properties:

```javascript
const isPopup = await page.evaluate(() => {
  return window.opener !== null && (window.innerWidth < screen.availWidth || window.innerHeight < screen.availHeight);
});
```

---

### Q21: What is the significance of `chromeWebSecurity: false` in `cypress.config.js`?
**Answer:**
By default, browsers enforce the Same-Origin Policy (SOP). Cypress's proxy injects scripts into pages. Setting `chromeWebSecurity: false` instructs Chrome to disable web security flags (`--disable-web-security`), allowing Cypress to interact with cross-origin iframes and links without CORS errors.

---

### Q22: What is the recommended strategy for an SDET when presenting multi-tab testing in an interview?
**Answer:**
A Senior SDET should articulate the **Pyramid of Solutions**:
1. **Level 1 (DOM Contract):** Validate `target="_blank"` and `href` attributes whenever possible. It's fastest, least flaky, and tests your application's logic.
2. **Level 2 (API Stubbing):** Stub `window.open()` using `cy.stub()` for JavaScript-triggered popups.
3. **Level 3 (Current Context Navigation):** Use `.invoke('removeAttr', 'target')` or `cy.origin()` when testing destination content within the same tab.
4. **Level 4 (Out-of-Process CDP Bridge):** Use `@cypress/puppeteer` when business requirements strictly mandate validating that a real secondary browser tab or OS popup window actually opened, rendered, and closed.
