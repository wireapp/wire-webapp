/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import type {JSONReport, JSONReportSuite, JSONReportTest} from '@playwright/test/reporter';

import {readFileSync, writeFileSync} from 'fs';
import {resolve} from 'path';

const jsonPath = resolve('playwright-report', 'report.json');
let report: JSONReport;

try {
  report = JSON.parse(readFileSync(jsonPath, 'utf-8'));
} catch (error) {
  const errorMessage = `❌ Error: report.json not found at ${jsonPath} ❌`;
  writeFileSync('playwright-report-summary.txt', errorMessage);
  process.exit(1);
}

const getTests = (suite: JSONReportSuite): (JSONReportTest & {file: string; title: string; tags: string[]})[] => {
  return [
    ...(suite.specs.flatMap(spec =>
      spec.tests.map(test => ({
        ...test,
        file: spec.file,
        // If no title is provided the file would be used which is redundant
        title: spec.file !== suite.title ? `${suite.title} > ${spec.title}` : spec.title,
        tags: spec.tags,
      })),
    ) ?? []),
    ...(suite.suites?.flatMap(suite => getTests(suite)) ?? []),
  ];
};

const tests = report.suites.flatMap(suite => getTests(suite));
const failedOrFlakyTests = tests.filter(test => test.status === 'unexpected' || test.status === 'flaky');
const testFilesToReport = Object.groupBy(failedOrFlakyTests, test => test.file);

const testDetails = Object.values(testFilesToReport).reduce((acc, testFile) => {
  if (!testFile?.length) {
    return acc;
  }

  const failedTests = testFile
    .filter(test => test.status === 'unexpected')
    .map(({title, tags}) => `❌ ${title} (tags: ${tags.join(', ')})`);

  const flakyTests = testFile
    .filter(test => test.status === 'flaky')
    .map(({title, tags}) => `⚠️ ${title} (tags: ${tags.join(', ')})`);

  acc += `
<details>
  <summary>${testFile[0].file} (❌ ${failedTests.length} failed, ⚠️ ${flakyTests.length} flaky)</summary>

  ${[...failedTests, ...flakyTests].join('\n  ')}
</details>
`;

  return acc;
}, '');

const formatDuration = (duration: number) => {
  const minutes = Math.floor(duration / 60000);
  const totalSeconds = Math.round((duration % 60000) / 1000);
  const seconds = totalSeconds % 60;
  return `~ ${minutes} min ${seconds} sec`;
};

const summary = `
### 🧪 Playwright Test Summary

- ✅ **Passed:** ${report.stats.expected}
- ❌ **Failed:** ${report.stats.unexpected}
- ⏭ **Skipped:** ${report.stats.skipped}
- 🔁 **Flaky:** ${report.stats.flaky}
- 📊 **Total:** ${report.stats.expected + report.stats.unexpected + report.stats.skipped + report.stats.flaky}
- ⏱ **Total Runtime:** ${(report.stats.duration / 1000).toFixed(1)}s (${formatDuration(report.stats.duration)})

${testDetails}
`;

writeFileSync('playwright-report-summary.txt', summary);
