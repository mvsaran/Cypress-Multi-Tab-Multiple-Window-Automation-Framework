// Import @cypress/puppeteer support to register the cy.puppeteer() command
import '@cypress/puppeteer/support';

/**
 * Handle uncaught exceptions originating from the application under test (e.g., third-party trackers, WordPress plugins)
 * returning false here prevents Cypress from failing the test on unhandled application errors
 */
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignore harmless third-party errors from live sites
  return false;
});

/**
 * Custom Command: cy.openDemoApplication()
 * Navigates directly to the Window Operations practice application
 */
Cypress.Commands.add('openDemoApplication', (path = '/window-operations/') => {
  cy.visit(path);
  cy.get('h1').should('be.visible').and('contain.text', 'Window Operations');
});

/**
 * Custom Command: cy.getBrowserPages(expectedMinimumAppTabs)
 * Queries Puppeteer for all active browser pages and counts with retry support
 */
Cypress.Commands.add('getBrowserPages', (expectedMinimumAppTabs = 0) => {
  return cy.puppeteer('countBrowserPages', expectedMinimumAppTabs);
});

/**
 * Custom Command: cy.readNewTab(expectedUrlSubstring)
 * Uses Puppeteer to read URL, title, and heading of an opened tab
 */
Cypress.Commands.add('readNewTab', (expectedUrlSubstring) => {
  return cy.puppeteer('readNewTab', expectedUrlSubstring);
});

/**
 * Custom Command: cy.closeTab(expectedUrlSubstring)
 * Uses Puppeteer to close a specific opened tab
 */
Cypress.Commands.add('closeTab', (expectedUrlSubstring) => {
  return cy.puppeteer('closeTab', expectedUrlSubstring);
});

/**
 * Custom Command: cy.closeExtraTabs()
 * Ensures all non-runner tabs are closed to prevent test contamination
 */
Cypress.Commands.add('closeExtraTabs', () => {
  return cy.puppeteer('closeAllExtraTabs');
});
