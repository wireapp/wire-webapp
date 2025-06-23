const fs = require('fs');
const path = require('path');

console.log('Checking if report exists...');
console.log('report exists:', fs.existsSync('playwright-report/index.html'));

const jsonPath = path.resolve('playwright-report', 'report.json');
const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

function waitForFile(filePath, timeout = 5000, interval = 200) {
  const absolutePath = path.resolve(filePath);

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      if (fs.existsSync(absolutePath)) {
        return resolve(true);
      }
      if (Date.now() - startTime > timeout) {
        return reject(new Error(`File not found: ${absolutePath} (after ${timeout}ms)`));
      }
      setTimeout(check, interval);
    };

    check();
  });
}

(async () => {
  try {
    await waitForFile('playwright-report/index.html', 10000);
    console.log('✅ Report is ready. Continuing...');

    // Your summary logic here
  } catch (err) {
    console.error('❌ Report not found in time:', err.message);
    process.exit(1);
  }
})();

let passed = 0,
  failed = 0,
  skipped = 0,
  total = 0;
let failures = [];

for (const suite of report.suites) {
  for (const spec of suite.specs) {
    for (const test of spec.tests) {
      total++;
      const result = test.results[0];
      if (result.status === 'passed') passed++;
      else if (result.status === 'failed') {
        failed++;
        const location = `${spec.file}:${test.location.line}`;
        const err = result.error?.message || 'Unknown error';
        failures.push(`- ❌ **${test.title}**\n  📂 \`${location}\`\n  🧵 \`${err.split('\n')[0]}\``);
      } else skipped++;
    }
  }
}

const summary = `
### 🧪 Playwright Test Summary
- ✅ Passed: ${passed}
- ❌ Failed: ${failed}
- ⏭ Skipped: ${skipped}
- 📊 Total: ${total}

${failures.length > 0 ? `#### ❗ Failures:\n${failures.join('\n\n')}` : '🎉 All tests passed!'}
`;

fs.writeFileSync('playwright-summary.txt', summary);
