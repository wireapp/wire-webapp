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

const ESC = String.fromCharCode(27); // same as '\x1B' or '\u001b'
const ansiRegex = new RegExp(`${ESC}\\[[0-?]*[ -/]*[@-~]`, 'g');

const stripAnsi = str => str.replace(ansiRegex, '');

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
        const lastResult = test.results[test.results.length - 1];

        if (lastResult.status !== 'passed') {
          // Show only the last (final) failure
          let failureInfo = `<details> \n <summary> ❌ ${title} </summary><br> \n\n  Location: **${specLocation}**\n  Duration: **${lastResult.duration}ms**\n`;

          if (lastResult.errors?.length) {
            failureInfo += `\n**Errors:**\n`;
            lastResult.errors.forEach(e => {
              failureInfo += `\n\`\`\`\n${stripAnsi(e.message)}\n\`\`\``;
            });
          }

          failureInfo += `\n</details>`;
          failures.push(failureInfo);
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

${failures.length > 0 ? `### ❗ **Failures** \n\n ${failures.join('\n\n')}` : '🎉 All tests passed!'}

${
  flakyTests.length > 0
    ? `\n---\n\n#### ⚠️ **Flaky Tests**
${flakyTests.join('\n\n')}`
    : ''
}
`;

fs.writeFileSync('playwright-report-summary.txt', summary);
