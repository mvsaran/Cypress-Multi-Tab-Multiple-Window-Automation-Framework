/**
 * Spec 01: Validate New Tab Without Switching
 *
 * Concepts Demonstrated:
 * 1. DOM Contract Testing: Validating `target="_blank"` and `href` attributes on anchor tags.
 * 2. Window API Stubbing: Stubbing `window.open()` on button triggers using `cy.stub()`.
 * 3. Why Cypress doesn't need to switch tabs to prove new-tab behavior.
 * 4. Maintaining clean test isolation without opening additional browser tabs.
 */

describe('Scenario 01: Validate New Tab Without Switching', () => {
  beforeEach(() => {
    cy.openDemoApplication();
  });

  it('1.1 - Validates link with target="_blank" and href without switching tabs', () => {
    // Locate the anchor link inside the page description
    cy.contains('a', 'multiple open windows')
      .should('be.visible')
      .and('have.attr', 'target', '_blank')
      .and('have.attr', 'href', 'https://www.youtube.com/watch?v=vZi_Xw8IvHo');

    // Architectural Explanation:
    // When a link has target="_blank", HTML specifications dictate that the browser MUST
    // open the specified href in a new browsing context (tab or window).
    // Validating target and href proves the contract without needing to switch tabs!
  });

  it('1.2 - Validates JavaScript window.open() on "New Tab" button using cy.stub()', () => {
    // Intercept window.open before triggering the button click
    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen');
    });

    // Locate and click the New Tab button
    cy.contains('button', 'New Tab')
      .should('be.visible')
      .click();

    // Verify window.open was triggered with the expected target URL
    cy.get('@windowOpen')
      .should('be.calledOnce')
      .and('be.calledWith', 'https://www.automatenow.io');
  });

  it('1.3 - Explains why DOM validation is often preferred over actual tab switching', () => {
    // 1. Speed: Avoiding real tab navigation saves network and rendering overhead.
    // 2. Determinism: No flaky asynchronous waits across browser processes.
    // 3. Flake Reduction: External sites (like YouTube or third-party portals) won't break your suite.
    // 4. Separation of Concerns: You are testing YOUR application's link logic, not the browser's tab manager.
    cy.get('button.custom_btn')
      .first()
      .should('be.visible')
      .and('contain.text', 'New Tab');
  });
});
