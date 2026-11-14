/**
 * Cross-platform Cypress execution runner.
 * Ensures ELECTRON_RUN_AS_NODE is stripped from the environment so Cypress can launch
 * Chrome, Chromium, and Electron without argument parsing issues.
 */
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const cleanEnv = { ...process.env };
delete cleanEnv.ELECTRON_RUN_AS_NODE;

const isWindows = process.platform === 'win32';
const cypressCmd = isWindows ? 'npx.cmd' : 'npx';

const result = spawnSync(cypressCmd, ['cypress', ...args], {
  stdio: 'inherit',
  env: cleanEnv,
  shell: true,
});

process.exit(result.status || 0);
