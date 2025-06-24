const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve('playwright-report', 'report.json');
const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

let passed = 0,
  failed = 0,
  skipped = 0,
  flaky = 0,
  total = 0,
  totalDuration = 0;

const failures = [];
const flakyTests = [];

for (const suite of report.suites) {
  for (const spec of suite.specs) {
    for (const test of spec.tests) {
      total++;

      const result = test.results[0]; // First result is assumed representative
      const status = result.status;
      const duration = result.duration || 0;
      totalDuration += duration;

      const location = `${spec.file}:${test.location.line}`;
      const retries = test.results.length - 1;

      if (status === 'passed') {
        passed++;
      } else if (status === 'failed') {
        failed++;
        const errMsg = result.error?.message?.split('\n')[0] || 'Unknown error';
        failures.push(`- ❌ **${test.title}**
  📂 \`${location}\`
  🧵 \`${errMsg}\`
  🕒 \`${duration}ms\``);
      } else {
        skipped++;
      }

      if (retries > 0) {
        flaky++;
        flakyTests.push(`- ⚠️ **${test.title}**
  📂 \`${location}\`
  🔁 Retries: ${retries}
  🕒 Last duration: \`${duration}ms\``);
      }
    }
  }
}

const summary = `
### 🧪 Playwright Test Summary ###

- ✅ **Passed:** ${passed}
- ❌ **Failed:** ${failed}
- ⏭ **Skipped:** ${skipped}
- 🔁 **Flaky:** ${flaky}
- 📊 **Total:** ${total}
- ⏱ **Total Runtime:** ${totalDuration}ms (~${(totalDuration / 1000).toFixed(1)}s)

${
  failures.length > 0
    ? `#### ❗ **Failures**
${failures.join('\n\n')}`
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
