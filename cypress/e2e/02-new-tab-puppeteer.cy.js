/**
 * Spec 02: Open and Read Actual New Tab Using Puppeteer
 *
 * Concepts Demonstrated:
 * 1. Overcoming Cypress single-tab limitation using `@cypress/puppeteer`.
 * 2. Asynchronous tab detection with `retry()` in Node.js message handlers.
 * 3. Excluding the Cypress internal runner tab (`/__/`).
 * 4. Extracting real URL, title, and heading from the external tab.
 * 5. Safely closing the extra tab and returning focus/control to Cypress.
 */

describe('Scenario 02: Real New Tab Automation Using Puppeteer', () => {
  const EXPECTED_DESTINATION_DOMAIN = 'automatenow.io';

  beforeEach(() => {
    cy.openDemoApplication();
    // Ensure clean state before each test
    cy.closeExtraTabs();
  });

  afterEach(() => {
    // Teardown: ensure any open tab is closed even if assertions fail
    cy.closeExtraTabs();
  });

  it('2.1 - Clicks "New Tab", reads new tab contents via Puppeteer, asserts, and closes tab', () => {
    // 1. Verify initial state: only the Cypress runner tab is open
    cy.getBrowserPages().then((initialPages) => {
      expect(initialPages.appTabsCount).to.equal(0);
    });

    // 2. Click the application's "New Tab" button
    // This triggers window.open("https://www.automatenow.io") in the live browser
    cy.contains('button', 'New Tab')
      .should('be.visible')
      .click();

    // 3. Delegate to Puppeteer via cy.puppeteer() message handler
    // The handler queries browser.pages(), excludes /__/, retries until the tab appears,
    // and returns serialized data { url, title, heading }
    cy.readNewTab(EXPECTED_DESTINATION_DOMAIN).then((tabData) => {
      // 4. Assertions on the real tab's properties
      cy.log(`Read Tab URL: ${tabData.url}`);
      cy.log(`Read Tab Title: ${tabData.title}`);
      cy.log(`Read Tab Heading: ${tabData.heading}`);

      expect(tabData.found).to.be.true;
      expect(tabData.url).to.include(EXPECTED_DESTINATION_DOMAIN);
      expect(tabData.title).to.include('automateNow');
      expect(tabData.heading).to.include('Start learning');
    });

    // 5. Close the newly opened tab
    cy.closeTab(EXPECTED_DESTINATION_DOMAIN).then((closeResult) => {
      expect(closeResult.closed).to.be.true;
    });

    // 6. Verify tab count restored: only Cypress runner tab remains
    cy.getBrowserPages().then((finalPages) => {
      expect(finalPages.appTabsCount).to.equal(0);
    });

    // 7. Verify the original Cypress AUT page is still responsive
    cy.get('h1').should('be.visible').and('contain.text', 'Window Operations');
  });

  it('2.2 - Demonstrates resilient polling for asynchronous tab navigation', () => {
    // Click New Tab again
    cy.contains('button', 'New Tab').click();

    // Directly call cy.puppeteer('getTabDetails', ...)
    cy.puppeteer('getTabDetails', EXPECTED_DESTINATION_DOMAIN).then((details) => {
      expect(details.url).to.include(EXPECTED_DESTINATION_DOMAIN);
      expect(details.title).to.be.a('string').and.not.be.empty;
    });

    // Clean up
    cy.closeTab(EXPECTED_DESTINATION_DOMAIN);
  });
});
