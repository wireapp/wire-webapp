const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve('playwright-report', 'report.json');
const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const stats = report.stats;

let passed = stats.expected,
  failed = stats.unexpected,
  skipped = stats.skipped,
  flaky = stats.flaky,
  total = passed + failed + skipped + flaky,
  totalDuration = stats.duration;

const failures = [];
const flakyTests = [];

const stripAnsi = str =>
  str.replace(
    // regex to match ANSI escape codes
    /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g,
    '',
  );

for (const suite of report.suites) {
  for (const spec of suite.specs) {
    for (const test of spec.tests) {
      const title = `${spec.title} (tags: ${spec.tags.join(', ')})`;
      const specLocation = `${spec.file}:${spec.line}`;
      const retries = test.results.length - 1;
      const hasPassed = test.results.some(r => r.status === 'passed');
      const hasRetries = retries > 0;

      // Only include in failures if no retries succeeded
      if (!hasPassed) {
        for (const result of test.results) {
          if (result.status !== 'passed') {
            let failureInfo = `- ❌ **${title}**\n  📂 \`${specLocation}\`\n  ⏱ Duration: ${result.duration}ms\n`;

            if (result.errors?.length) {
              failureInfo += `**Errors:**\n`;
              result.errors.forEach(e => {
                failureInfo += `\n \`${stripAnsi(e.message)}\``;
                if (e.location) {
                  failureInfo += ` at \`${e.location.file}:${e.location.line}:${e.location.column}\``;
                }
                failureInfo += '\n';
              });
            }

            failures.push(failureInfo);
          }
        }
      }

      // Mark as flaky if it passed after retries
      if (hasRetries && hasPassed) {
        const retryDetails = test.results
          .map((result, index) => {
            const errors = (result.errors || [])
              .map((err, i) => {
                const clean = stripAnsi(err.message || '');
                return `_Error ${i + 1}_:\n\`\`\`\n${clean}\n\`\`\``;
              })
              .join('\n\n');

            return `**Retry ${index + 1}** — 🕒 \`${result.duration}ms\`\n\n${errors}`.trim();
          })
          .join('\n\n---\n\n');

        flakyTests.push(`- ⚠️ **${title}**
📂 \`${specLocation}\`
🔁 Retries: ${retries}

${retryDetails}`);
      }
    }
  }
}

const summary = `
### 🧪 Playwright Test Summary

- ✅ **Passed:** ${passed}
- ❌ **Failed:** ${failed}
- ⏭ **Skipped:** ${skipped}
- 🔁 **Flaky:** ${flaky}
- 📊 **Total:** ${total}
- ⏱ **Total Runtime:** ${totalDuration}ms (~${(totalDuration / 1000).toFixed(1)}s)

${
  failures.length > 0
    ? `#### ❗ **Failures**

::group::🔽 Click to expand failures
${failures.join('\n\n')}
::endgroup::`
    : '🎉 All tests passed!'
}

${
  flakyTests.length > 0
    ? `\n---\n\n#### ⚠️ **Flaky Tests**
${flakyTests.join('\n\n')}`
    : ''
}
`;

fs.writeFileSync('playwright-report-summary.txt', summary);
