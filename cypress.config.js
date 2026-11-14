const { defineConfig } = require('cypress');
const { setup, retry } = require('@cypress/puppeteer');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://practice-automation.com',
    taskTimeout: 60000,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    viewportWidth: 1280,
    viewportHeight: 800,
    chromeWebSecurity: false, // Allows cross-origin handling without strict CORS blocking

    setupNodeEvents(on, config) {
      // Register all @cypress/puppeteer message handlers in a single setup() call
      setup({
        on,
        onMessage: {
          /**
           * Handler 1: Read a newly opened tab or window by URL match
           * Uses retry() for asynchronous tab opening and returns serializable data
           */
          async readNewTab(browser, expectedUrlSubstring) {
            return await retry(
              async () => {
                const pages = await browser.pages();
                // Exclude Cypress internal runner tab
                const appPages = pages.filter((page) => !page.url().includes('/__/'));

                const targetPage = appPages.find((page) =>
                  page.url().toLowerCase().includes(expectedUrlSubstring.toLowerCase())
                );

                if (!targetPage) {
                  const currentUrls = appPages.map((p) => p.url()).join(', ') || 'none';
                  throw new Error(
                    `Tab matching "${expectedUrlSubstring}" not found. Open tabs: [${currentUrls}]`
                  );
                }

                // Wait for the target page to finish initial document loading
                await targetPage
                  .waitForFunction(() => document.readyState === 'complete', { timeout: 8000 })
                  .catch(() => {});

                const url = targetPage.url();
                const title = await targetPage.title();

                // Extract primary heading (h1 or h2)
                const heading = await targetPage.evaluate(() => {
                  const h1 = document.querySelector('h1');
                  if (h1 && h1.innerText && h1.innerText.trim()) {
                    return h1.innerText.trim();
                  }
                  const h2 = document.querySelector('h2');
                  if (h2 && h2.innerText && h2.innerText.trim()) {
                    return h2.innerText.trim();
                  }
                  return '';
                });

                return {
                  url,
                  title,
                  heading,
                  found: true,
                };
              },
              { timeout: 15000, delayBetweenTries: 300 }
            );
          },

          /**
           * Handler 2: Detect a new window / popup and validate its details
           */
          async detectNewWindow(browser, expectedUrlSubstring) {
            return await retry(
              async () => {
                const pages = await browser.pages();
                const appPages = pages.filter((page) => !page.url().includes('/__/'));

                const popupPage = appPages.find((page) =>
                  page.url().toLowerCase().includes(expectedUrlSubstring.toLowerCase())
                );

                if (!popupPage) {
                  throw new Error(`Popup window matching "${expectedUrlSubstring}" not found.`);
                }

                await popupPage
                  .waitForFunction(() => document.readyState === 'complete', { timeout: 8000 })
                  .catch(() => {});

                const url = popupPage.url();
                const title = await popupPage.title();
                const heading = await popupPage.evaluate(() => {
                  const h1 = document.querySelector('h1');
                  if (h1 && h1.innerText && h1.innerText.trim()) {
                    return h1.innerText.trim();
                  }
                  const h2 = document.querySelector('h2');
                  if (h2 && h2.innerText && h2.innerText.trim()) {
                    return h2.innerText.trim();
                  }
                  return '';
                });

                return {
                  url,
                  title,
                  heading,
                  isWindow: true,
                };
              },
              { timeout: 15000, delayBetweenTries: 300 }
            );
          },

          /**
           * Handler 3: Return URL, title, and heading of any tab matching expectedUrlSubstring
           */
          async getTabDetails(browser, expectedUrlSubstring) {
            return await retry(
              async () => {
                const pages = await browser.pages();
                const appPages = pages.filter((p) => !p.url().includes('/__/'));
                const page = appPages.find((p) =>
                  p.url().toLowerCase().includes(expectedUrlSubstring.toLowerCase())
                );

                if (!page) {
                  throw new Error(`Page matching "${expectedUrlSubstring}" not found.`);
                }

                const url = page.url();
                const title = await page.title();
                const heading = await page.evaluate(() => {
                  const h = document.querySelector('h1, h2');
                  return h ? (h.innerText || '').trim() : '';
                });

                return { url, title, heading };
              },
              { timeout: 10000, delayBetweenTries: 250 }
            );
          },

          /**
           * Handler 4: Close an additional tab matching the given URL substring
           */
          async closeTab(browser, expectedUrlSubstring) {
            return await retry(
              async () => {
                const pages = await browser.pages();
                const appPages = pages.filter((p) => !p.url().includes('/__/'));
                const pageToClose = appPages.find((p) =>
                  p.url().toLowerCase().includes(expectedUrlSubstring.toLowerCase())
                );

                if (!pageToClose) {
                  // If it's already closed, return success
                  return { closed: true, message: 'Tab was already closed or not found' };
                }

                const closedUrl = pageToClose.url();
                await pageToClose.close();

                return {
                  closed: true,
                  closedUrl,
                };
              },
              { timeout: 10000, delayBetweenTries: 250 }
            );
          },

          /**
           * Handler 5: Count all open browser pages (total, runner, and application tabs)
           * Uses retry() to wait until at least expectedMinimumAppTabs are registered in CDP
           */
          async countBrowserPages(browser, expectedMinimumAppTabs = 0) {
            return await retry(
              async () => {
                const pages = await browser.pages();
                const runnerPages = pages.filter((p) => p.url().includes('/__/'));
                const appPages = pages.filter((p) => !p.url().includes('/__/'));

                if (appPages.length < expectedMinimumAppTabs) {
                  throw new Error(
                    `Expected at least ${expectedMinimumAppTabs} app tabs, but found ${appPages.length}. Open pages: [${pages.map((p) => p.url()).join(', ')}]`
                  );
                }

                return {
                  totalPages: pages.length,
                  runnerCount: runnerPages.length,
                  appTabsCount: appPages.length,
                  appUrls: appPages.map((p) => p.url()),
                };
              },
              { timeout: 10000, delayBetweenTries: 250 }
            );
          },

          /**
           * Handler 6: Close ALL extra tabs, leaving only the Cypress runner tab intact
           */
          async closeAllExtraTabs(browser) {
            const pages = await browser.pages();
            let closedCount = 0;

            for (const page of pages) {
              const url = page.url();
              // Never close the Cypress runner tab!
              if (!url.includes('/__/')) {
                try {
                  await page.close();
                  closedCount++;
                } catch (err) {
                  // Page might have already closed
                }
              }
            }

            const remainingPages = await browser.pages();
            return {
              closedCount,
              remainingTotal: remainingPages.length,
              remainingUrls: remainingPages.map((p) => p.url()),
            };
          },

          /**
           * Handler 7: Separately documented demonstration:
           * Demonstrates browser.newPage() synthetic tab workflow when an application does not have
           * clickable UI controls, or for synthetic multi-user / multi-session simulation.
           * Note: Electron does not support Target.createTarget (browser.newPage()). Only Chrome/Chromium does.
           */
          async createSyntheticTabAndValidate(browser, testUrl) {
            try {
              const page = await browser.newPage();
              await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
              const title = await page.title();
              const url = page.url();
              await page.close();

              return {
                syntheticTabSuccess: true,
                url,
                title,
              };
            } catch (err) {
              if (
                err.message &&
                (err.message.includes('Target.createTarget') || err.message.includes('Not supported'))
              ) {
                return {
                  syntheticTabSuccess: false,
                  electronUnsupported: true,
                  reason:
                    'Electron does not support CDP Target.createTarget (browser.newPage()). Run in Chrome, Chromium, or Edge.',
                };
              }
              throw err;
            }
          },
        },
      });

      return config;
    },
  },
});
