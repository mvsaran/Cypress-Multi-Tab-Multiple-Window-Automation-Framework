/**
 * Spec 04: Open a New Browser Window (Popup Handling)
 *
 * Concepts Demonstrated:
 * 1. Distinction between a new browser tab vs a new popup window (`window.open` with window features).
 * 2. How Chrome creates a separate window when features (width, height, top, left) are supplied.
 * 3. Detecting popup windows via Puppeteer and CDP.
 * 4. Reading popup URL, title, and heading.
 * 5. Closing the popup window and confirming the primary Cypress AUT page remains intact.
 */

describe('Scenario 04: Open a New Browser Window (Popup Window)', () => {
  const TARGET_DOMAIN = 'automatenow.io';

  beforeEach(() => {
    cy.openDemoApplication();
    cy.closeExtraTabs();
  });

  afterEach(() => {
    cy.closeExtraTabs();
  });

  it('4.1 - Clicks "New Window", detects popup window in Puppeteer, validates content, and closes it', () => {
    // 1. Initial check: verify no extra tabs/windows open
    cy.getBrowserPages().then((pages) => {
      expect(pages.appTabsCount).to.equal(0);
    });

    // 2. Click "New Window" button:
    // Triggers: window.open("https://www.automatenow.io", "_blank", "toolbar=yes, scrollbars=yes, resizable=yes, top=200, left=200, width=600, height=600")
    cy.contains('button', 'New Window')
      .should('be.visible')
      .click();

    // 3. Detect and extract data from the popup window via Puppeteer
    cy.puppeteer('detectNewWindow', TARGET_DOMAIN).then((popupData) => {
      cy.log(`Detected Window URL: ${popupData.url}`);
      cy.log(`Detected Window Title: ${popupData.title}`);
      cy.log(`Detected Window Heading: ${popupData.heading}`);

      expect(popupData.isWindow).to.be.true;
      expect(popupData.url).to.include(TARGET_DOMAIN);
      expect(popupData.title).to.include('automateNow');
      expect(popupData.heading).to.include('Start learning');
    });

    // 4. Close the popup window
    cy.closeTab(TARGET_DOMAIN).then((res) => {
      expect(res.closed).to.be.true;
    });

    // 5. Confirm that the popup window was closed
    cy.getBrowserPages().then((pages) => {
      expect(pages.appTabsCount).to.equal(0);
    });

    // 6. Confirm original Cypress page is still active and accessible
    cy.get('h1').should('be.visible').and('contain.text', 'Window Operations');
    cy.contains('button', 'Replace Window').should('be.visible');
  });

  it('4.2 - Details the architectural distinction between tabs and popup windows', () => {
    // Technical Deep Dive:
    // - New Tab: window.open(url, '_blank') without features opens in the browser's tab strip.
    // - New Window: window.open(url, '_blank', 'width=600,height=600,...') signals the OS/Chromium
    //   window manager to spawn a standalone framed window.
    // - For Cypress: Both escape Cypress's single iframe execution sandbox.
    // - For Puppeteer: Both are Target instances of type "page", accessible through browser.pages().
    cy.get('button.custom_btn')
      .should('have.length', 3)
      .and('be.visible');
  });
});
