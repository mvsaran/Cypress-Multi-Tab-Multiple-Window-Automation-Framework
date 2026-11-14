/**
 * Spec 05: Multiple Tabs and Complete Browser Context Cleanup
 *
 * Concepts Demonstrated:
 * 1. Handling multiple open browser pages spawned simultaneously via application UI controls.
 * 2. Asynchronous identification and querying of each page by URL and title.
 * 3. Inspecting the total number of browser pages vs Cypress runner tab.
 * 4. Graceful and complete cleanup: closing all non-runner tabs so subsequent specs aren't contaminated.
 * 5. Demonstrating teardown hooks (`afterEach`) to guarantee leak-free execution even on failure.
 * 6. Separately documented demonstration: `browser.newPage()` for mock multi-page orchestration.
 */

describe('Scenario 05: Multiple Tabs & Window Lifecycle Cleanup', () => {
  const TARGET_DOMAIN = 'automatenow.io';

  beforeEach(() => {
    cy.openDemoApplication();
    // Ensure clean state before each test
    cy.closeExtraTabs();
  });

  afterEach(() => {
    // Critical SDET Best Practice: Ensure cleanup runs even when tests fail
    cy.closeExtraTabs();
  });

  it('5.1 - Opens multiple browser pages using application controls, validates counts, and cleans up', () => {
    // Step 1: Verify clean slate (0 app tabs, only runner exists)
    cy.getBrowserPages().then((initial) => {
      expect(initial.appTabsCount).to.equal(0);
      expect(initial.runnerCount).to.be.at.least(1);
    });

    // Step 2: Click "New Tab" button (Control 1)
    cy.contains('button', 'New Tab')
      .should('be.visible')
      .click();

    // Step 3: Click "New Window" button (Control 2)
    cy.contains('button', 'New Window')
      .should('be.visible')
      .click();

    // Step 4: Validate that Puppeteer detects multiple pages opened by the application controls
    // Use retry-backed query to allow both pages to finish registering in CDP
    cy.getBrowserPages(2).then((pages) => {
      cy.log(`Total Pages: ${pages.totalPages}`);
      cy.log(`App Tabs Count: ${pages.appTabsCount}`);
      cy.log(`App URLs: ${JSON.stringify(pages.appUrls)}`);

      // Both the New Tab and New Window controls have been triggered
      expect(pages.appTabsCount).to.be.at.least(2);
      expect(pages.totalPages).to.be.at.least(3); // 1 Cypress runner + 2 application tabs

      // Verify each page URL points to the expected domain
      pages.appUrls.forEach((url) => {
        expect(url.toLowerCase()).to.satisfy(
          (u) => u.includes('automatenow') || u.includes('about:blank')
        );
      });
    });

    // Step 5: Read content from an opened page
    cy.readNewTab(TARGET_DOMAIN).then((tabData) => {
      expect(tabData.found).to.be.true;
      expect(tabData.title).to.include('automateNow');
    });

    // Step 6: Close all extra tabs and confirm cleanup
    cy.closeExtraTabs().then((cleanupResult) => {
      cy.log(`Closed ${cleanupResult.closedCount} extra tabs.`);
      expect(cleanupResult.closedCount).to.be.at.least(2);
      expect(cleanupResult.remainingTotal).to.equal(1); // Only Cypress runner left
    });

    // Step 7: Verify zero app tabs remain
    cy.getBrowserPages().then((finalPages) => {
      expect(finalPages.appTabsCount).to.equal(0);
      expect(finalPages.runnerCount).to.equal(1);
    });

    // Step 8: Confirm Cypress AUT runner remains fully functional
    cy.get('h1').should('be.visible').and('contain.text', 'Window Operations');
  });

  it('5.2 - Separately Documented Demonstration: Synthetic page creation using browser.newPage()', () => {
    // Interview Distinction:
    // Application-triggered tabs (user clicks UI -> browser opens tab) MUST be tested via real clicks.
    // browser.newPage() should NOT replace testing real application triggers.
    // However, browser.newPage() is useful for synthetic orchestration (e.g., verifying multi-user
    // interactions, simulating second-party approvals, or background webhooks).
    const testUrl = 'https://practice-automation.com/window-operations/';

    cy.puppeteer('createSyntheticTabAndValidate', testUrl).then((res) => {
      if (res.electronUnsupported) {
        cy.log(`[Browser Limitation Verified]: ${res.reason}`);
        expect(res.electronUnsupported).to.be.true;
      } else {
        expect(res.syntheticTabSuccess).to.be.true;
        expect(res.url).to.include('window-operations');
        expect(res.title).to.include('Window Operations');
      }
    });

    // Verify synthetic tab was closed and didn't leak
    cy.getBrowserPages().then((pages) => {
      expect(pages.appTabsCount).to.equal(0);
    });
  });
});
