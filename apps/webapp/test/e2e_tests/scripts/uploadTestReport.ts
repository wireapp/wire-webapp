/**
 * Script to upload report the result of a playwright test run to testiny.
 * It will create a new test run, add the results of the given report.json and close the report automatically.
 *
 * This is used instead of the cli published by Testiny since the CLI is limited by features.
 */

import path from 'node:path';
import {parseArgs} from 'node:util';
import * as fs from 'node:fs';
import type {JSONReport, JSONReportSpec, JSONReportSuite, JSONReportTest} from '@playwright/test/reporter';

const TESTINY_PROJECT_ID = 3; // 3 is the id of the WEB project in Testiny

const {values: args} = parseArgs({
  args: process.argv.slice(2),
  options: {
    testinyApiKey: {
      type: 'string',
      description: 'API key to connect to testiny',
      default: process.env.TESTINY_API_KEY,
    },
    reportPath: {
      type: 'string',
      description: 'Path to the playright report in json format',
    },
    runName: {
      type: 'string',
      description: 'Name of the test run',
    },
    testPlanId: {
      type: 'string',
      description: 'ID of the test plan this run should be associated with',
    },
    description: {
      type: 'string',
      description: 'Description to add to the run, supports markdown',
    },
  },
});

if (!args.testinyApiKey) throw new Error('Missing required arg testinyApiKey');
if (!args.reportPath) throw new Error('Missing required arg reportPath');
if (!args.runName) throw new Error('Missing required arg runName');

const getTests = (suite: JSONReportSuite): (JSONReportTest & Pick<JSONReportSpec, 'tags'>)[] => {
  return [
    ...(suite.specs.flatMap(spec => spec.tests.map(test => ({...test, tags: spec.tags}))) ?? []),
    ...(suite.suites?.flatMap(suite => getTests(suite)) ?? []),
  ];
};

type TestRun = {id: number};
async function createTestRun(options?: {testPlanId?: number; description?: string}): Promise<TestRun> {
  const body = {
    title: args.runName,
    project_id: TESTINY_PROJECT_ID,
    testplan_id: options?.testPlanId,
    description: options?.description,
  };
  console.log(`Creating test run with title: ${body.title}`, body);

  const res = await fetch('https://app.testiny.io/api/v1/testrun', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.testinyApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Failed to create test run ${JSON.stringify(await res.json(), undefined, 2)}`);
  }

  return await res.json();
}

async function closeTestRun(testRun: TestRun) {
  const res = await fetch(`https://app.testiny.io/api/v1/testrun/${testRun.id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${args.testinyApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({...testRun, is_closed: true}),
  });

  if (!res.ok) {
    throw new Error(`Failed to close test run ${JSON.stringify(await res.json(), undefined, 2)}`);
  }
}

async function deleteTestRun(runId: number) {
  const res = await fetch(`https://app.testiny.io/api/v1/testrun/${runId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${args.testinyApiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Couldn't delete test run ${runId}`);
  }
}

type TestinyTestCaseMapping = {
  ids: {testcase_id: number; testrun_id: number};
  mapped: {assigned_to: 'ANY'; result_status: 'NOTRUN' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED'};
};

function transformReportToTestinyMappings(report: JSONReport, runId: number) {
  // Mapping from playwrights status to the result expected by Testiny
  const resultMap: Record<JSONReportTest['status'], TestinyTestCaseMapping['mapped']['result_status']> = {
    expected: 'PASSED',
    unexpected: 'FAILED',
    flaky: 'PASSED',
    skipped: 'SKIPPED',
  };

  return report.suites
    .flatMap(suite => getTests(suite))
    .reduce<TestinyTestCaseMapping[]>((acc, test) => {
      const testIds = test.tags
        .filter(tag => tag.startsWith('TC-'))
        .map(tag => Number(tag.replace('TC-', '')))
        .filter(Number.isInteger);

      for (const testId of testIds) {
        acc.push({
          ids: {testrun_id: runId, testcase_id: testId},
          mapped: {assigned_to: 'ANY', result_status: resultMap[test.status]},
        });
      }

      return acc;
    }, []);
}

async function addTestResultsToRun(testCaseMappings: TestinyTestCaseMapping[]) {
  const res = await fetch('https://app.testiny.io/api/v1/testrun/mapping/bulk/testcase:testrun?op=add', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.testinyApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testCaseMappings),
  });

  if (!res.ok) {
    throw new Error(`Failed to add test results to test run ${JSON.stringify(await res.json(), undefined, 2)}`);
  }
}

async function main() {
  const reportAbsPath = path.resolve(args.reportPath);
  if (!fs.existsSync(reportAbsPath)) {
    throw new Error(`Report file not found: ${reportAbsPath}`);
  }

  const report: JSONReport = JSON.parse(fs.readFileSync(reportAbsPath, 'utf-8'));
  const testRun = await createTestRun({
    testPlanId: Number.isInteger(+args.testPlanId) ? +args.testPlanId : undefined,
    description: `<!--markdown-->\n${args.description}\n`,
  });
  console.log(`Created test run with id: ${testRun.id}`);

  try {
    const testResults = transformReportToTestinyMappings(report, testRun.id);

    await addTestResultsToRun(testResults);
    console.log(`Added ${testResults.length} test results to test run`);

    await closeTestRun(testRun);
    console.log('Successfully imported test results');
  } catch (e) {
    console.error('Failed to add test results to run, deleting test run');
    // In case adding the results failed delete the whole test run
    await deleteTestRun(testRun.id);
    throw e;
  }
}
main();
