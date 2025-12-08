/*
 * lint-staged configuration for Nx workspace (affected-based)
 * Converts staged file paths to repo-relative to satisfy Nx CLI expectations.
 */
const path = require('path');

const rel = files => files.map(f => path.relative(process.cwd(), f));

module.exports = {
  '{apps,libs,tools}/**/*.{ts,tsx}': files => {
    const list = rel(files).join(',');
    return `nx affected --target=type-check --files=${list}`;
  },
  '{apps,libs,tools}/**/*.{js,ts,jsx,tsx,json}': [
    files => `nx affected --target=lint --files=${rel(files).join(',')}`,
    files => `nx format:write --files=${rel(files).join(',')}`,
  ],
};
