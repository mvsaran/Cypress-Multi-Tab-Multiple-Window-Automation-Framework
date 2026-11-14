/**
 * Spec 03: Replace Window Navigation
 *
 * Concepts Demonstrated:
 * 1. Handling window.open(url, "_self") which replaces the current window context.
 * 2. Cross-origin domain navigation in Cypress using `cy.origin()`.
 * 3. Why Puppeteer is NOT needed when navigation remains within the current window.
 * 4. Senior SDET Guideline: Never use external plugins when native Cypress handles it natively.
 */

describe('Scenario 03: Replace Window Navigation', () => {
  beforeEach(() => {
    cy.openDemoApplication();
  });

  it('3.1 - Validates Replace Window navigates current window to automatenow.io using cy.origin()', () => {
    // Confirm initial origin
    cy.url().should('include', 'practice-automation.com/window-operations');

    // Click "Replace Window" button which invokes:
    // window.open("https://www.automatenow.io", "_self", ...)
    cy.contains('button', 'Replace Window')
      .should('be.visible')
      .click();

    // The browser replaces the current document with automatenow.io (cross-origin)
    // Handle cross-origin context using native cy.origin()
    cy.origin('https://automatenow.io', () => {
      // Assert the new destination URL
      cy.url().should('include', 'automatenow.io');

      // Assert destination page title
      cy.title().should('include', 'automateNow');

      // Assert heading on the new page
      cy.get('h2').first().should('be.visible').and('contain.text', 'Start learning');
    });
  });

  it('3.2 - Explains why Replace Window is fundamentally different from New Tab', () => {
    // 1. Browsing Context:
    //    - "New Tab" / "_blank" creates a secondary window target in Chrome.
    //    - "Replace Window" / "_self" modifies the existing window target's location.
    // 2. Cypress Capabilities:
    //    - Cypress controls the runner iframe. When the iframe location changes to another origin,
    //      Cypress 12+ supports `cy.origin()` to switch the command execution context.
    //    - Puppeteer is strictly required when a NEW top-level browser tab/window is spawned.
    // 3. Tab Count Verification:
    //    - Replace Window does NOT increase browser page count.
    cy.getBrowserPages().then((pages) => {
      expect(pages.appTabsCount).to.equal(0);
    });
  });
});
