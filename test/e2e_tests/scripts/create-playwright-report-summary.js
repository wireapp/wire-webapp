const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve('playwright-report', 'report.json');
let report;

try {
  report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
} catch (error) {
  const errorMessage = `❌ Error: report.json not found at ${jsonPath} ❌`;
  fs.writeFileSync('playwright-report-summary.txt', errorMessage);
  process.exit(1);
}

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

// Recursively get all specs no matter in how many suites they are nested
const getSpecs = suite => {
  if (suite.suites?.length) {
    return [...suite.suites.flatMap(suite => getSpecs(suite)), ...(suite.specs ?? [])];
  } else {
    return suite.specs ?? [];
  }
};

const specs = getSpecs(report);
for (const spec of specs) {
  for (const test of spec.tests) {
    const title = `${spec.title} (tags: ${spec.tags.join(', ')})`;
    const specLocation = `${spec.file}:${spec.line}`;
    const retries = test.results.length - 1;
    const hasPassed = test.results.some(r => r.status === 'passed');
    const hasRetries = retries > 0;

    // Only include in failures if no retries succeeded
    if (!hasPassed) {
      const lastResult = test.results[test.results.length - 1];

      if (lastResult.status !== 'passed' && lastResult.status !== 'skipped') {
        // Show only the last (final) failure
        let failureInfo = `<details> \n <summary> ❌ ${title} </summary><br> \n\n  Location: **${specLocation}**\n  Duration: **${lastResult.duration}ms**\n`;

        if (lastResult.errors?.length) {
          failureInfo += `\n**Errors:**\n`;
          lastResult.errors.forEach(e => {
            failureInfo += `\n\`\`\`\n${stripAnsi(e?.message ?? '')}\n\`\`\``;
          });
        }

        failureInfo += `\n</details>`;
        failures.push(failureInfo);
      }
    }

    // Test is flaky if it passed after retries
    if (hasRetries && hasPassed) {
      const retryDetails = test.results
        .map((result, index) => {
          const errors = (result.errors || [])
            .map((err, i) => {
              const clean = stripAnsi(err.message || '');
              return `\n\`\`\`\n${clean}\n\`\`\``;
            })
            .join('\n\n');

          if (!errors) {
            return `**Attempt ${index + 1}** \n Result: ✅ **Passed** \n Duration: **${result.duration}ms**`;
          }
          return `**Attempt ${index + 1}** \n Result: ❌ **Failed** \n Duration: **${result.duration}ms** \n\n **Errors:** \n ${errors}`.trim();
        })
        .join('\n\n');

      flakyTests.push(
        `<details> \n <summary> ⚠️ ${title} </summary><br> \n\n  Location: **${specLocation}**\n\n${retryDetails}\n</details>`,
      );
    }
  }
}

const minutes = Math.floor(totalDuration / 60000);
const totalSeconds = Math.round((totalDuration % 60000) / 1000);
const seconds = totalSeconds % 60;
const formattedTime = `~ ${minutes} min ${seconds} sec`;

const summary = `
### 🧪 Playwright Test Summary

- ✅ **Passed:** ${passed}
- ❌ **Failed:** ${failed}
- ⏭ **Skipped:** ${skipped}
- 🔁 **Flaky:** ${flaky}
- 📊 **Total:** ${total}
- ⏱ **Total Runtime:** ${(totalDuration / 1000).toFixed(1)}s (${formattedTime})

${failures.length > 0 ? `### **Failed Tests:** \n\n ${failures.join('\n\n')}` : '🎉 All tests passed!'}

${
  flakyTests.length > 0
    ? `\n\n### **Flaky Tests:**
${flakyTests.join('\n\n')}`
    : ''
}
`;

fs.writeFileSync('playwright-report-summary.txt', summary);
