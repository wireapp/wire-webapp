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
 *
 *
 * send-results-to-testiny.ts
 *
 * Processes a Playwright JSON report and pushes test results to Testiny via REST API.
 *
 * Usage:
 *   node apps/webapp/test/e2e_tests/scripts/send-playwright-results-to-testiny.ts \
 *     --report   path/to/playwright-report.json \
 *     --run-name "{TESTINY_RUN_NAME}"
 *
 * Environment variables (required):
 *   TESTINY_API_KEY   - Testiny API key
 */

import fs from 'node:fs';
import path from 'node:path';
import type {JSONReport, JSONReportSuite, JSONReportTestResult} from '@playwright/test/reporter';

type TestinyStatus = 'PASSED' | 'FAILED' | 'SKIPPED' | 'BLOCKED' | 'NOTRUN';
type Body = Record<string, unknown> | unknown[];

interface FlatTest {
  title: string;
  fullTitle: string;
  tags: string[];
  results: JSONReportTestResult[];
}
interface Result {
  runId: number;
  testCaseId: number;
  status: TestinyStatus;
}
interface Run {
  id: number;
  title: string;
  description?: string;
}
interface SlateDoc {
  t: 'slate';
  v: 1;
  c: SlateParagraph[];
}
interface SlateParagraph {
  t: 'p';
  children: (SlateText | SlateLink)[];
}
interface SlateText {
  text: string;
}
interface SlateLink {
  t: 'a';
  url: string;
  children: SlateText[];
}

function collectTests(suites: JSONReportSuite[] | undefined, parentPath = ''): FlatTest[] {
  return (suites ?? []).flatMap(suite => {
    const suitePath = parentPath ? `${parentPath} > ${suite.title}` : suite.title;
    const specTests = (suite.specs ?? []).flatMap(spec =>
      (spec.tests ?? []).map(test => ({
        title: spec.title,
        fullTitle: `${suitePath} > ${spec.title}`,
        tags: spec.tags ?? [],
        results: test.results ?? [],
      })),
    );
    return [...specTests, ...collectTests(suite.suites, suitePath)];
  });
}

function extractTcTags(title: string, tags: string[]): string[] {
  const matches = new Set<string>();
  for (const t of [title, ...tags]) {
    String(t)
      .match(/@?TC-\d+/gi)
      ?.forEach(m => matches.add(m.replace(/^@/, '').toUpperCase()));
  }
  return [...matches];
}

function mapStatus(status: string | undefined): TestinyStatus {
  switch (status) {
    case 'passed':
      return 'PASSED';
    case 'failed':
    case 'timedOut':
      return 'FAILED';
    case 'skipped':
      return 'SKIPPED';
    case 'interrupted':
      return 'BLOCKED';
    default:
      return 'NOTRUN';
  }
}

function resolveStatus(test: FlatTest): TestinyStatus {
  return mapStatus(test.results.at(-1)?.status ?? 'failed');
}

function parseSlateDoc(raw: string | undefined): SlateDoc {
  try {
    const parsed = JSON.parse(raw ?? '') as SlateDoc;
    if (parsed.t === 'slate') return parsed;
  } catch {
    /* fall through */
  }
  return {t: 'slate', v: 1, c: []};
}

function linkParagraph(label: string, url: string): SlateParagraph {
  return {t: 'p', children: [{text: `${label} `}, {t: 'a', url, children: [{text: url}]}, {text: ''}]};
}

const BASE_URL = process.env.TESTINY_BASE_URL ?? 'https://app.testiny.io/api/v1';
const API_KEY = process.env.TESTINY_API_KEY;
const PROJECT = process.env.TESTINY_PROJECT ?? '3';

const projectField = Number.isNaN(Number(PROJECT)) ? {project_key: PROJECT} : {project_id: Number(PROJECT)};

async function testinyRequest<T>(method: string, endpoint: string, body?: Body): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {'Content-Type': 'application/json', 'X-Api-Key': API_KEY},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => res.text());
  if (!res.ok) throw new Error(`Testiny ${method} ${endpoint} → ${res.status}: ${JSON.stringify(json)}`);
  return json as T;
}

async function resolveRun(title: string): Promise<number> {
  const found = await testinyRequest<{data?: Run[]}>('POST', '/testrun/find', {filter: {title, ...projectField}});
  if (found.data?.[0] !== undefined) {
    console.log(`  ✓ Found existing run "${title}" (ID ${found.data[0].id})`);
    return found.data[0].id;
  }
  console.log(`  → Creating test run "${title}"…`);
  const run = await testinyRequest<Run>('POST', '/testrun', {title, ...projectField});
  console.log(`  ✓ Created run with ID ${run.id}`);
  return run.id;
}

async function findTestCaseId(tcKey: string): Promise<number | null> {
  const numericId = Number.parseInt(tcKey.replace(/^TC-/i, ''), 10);
  if (Number.isNaN(numericId)) return null;
  try {
    const tc = await testinyRequest<{id: number}>('GET', `/testcase/${numericId}`);
    return tc.id;
  } catch {
    return null;
  }
}

async function bulkAddResults(results: Result[]): Promise<void> {
  await testinyRequest(
    'POST',
    '/testrun/mapping/bulk/testcase:testrun?op=add_or_update',
    results.map(({runId, testCaseId, status}) => ({
      ids: {testcase_id: testCaseId, testrun_id: runId},
      mapped: {result_status: status, assigned_to: 'OWNER'},
    })),
  );
}

async function appendCiDescription(runId: number): Promise<void> {
  const {GITHUB_SERVER_URL: srv, GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: id} = process.env;
  if (srv == null || repo == null || id == null) return;

  const url = `${srv}/${repo}/actions/runs/${id}`;
  console.log(`\n📝  Appending build URL: ${url}`);
  try {
    const run = await testinyRequest<Run>('GET', `/testrun/${runId}`);
    const doc = parseSlateDoc(run.description);
    doc.c.push(linkParagraph('Build URL:', url));
    await testinyRequest('PUT', `/testrun/${runId}?force=true`, {description: JSON.stringify(doc)});
    console.log('  ✓ Description updated');
  } catch (err: unknown) {
    console.warn(`  ⚠️  Could not update description: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
  }
}

function validateArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i === -1 ? undefined : args[i + 1];
  };
  const reportPath = get('--report');
  const runName = get('--run-name');

  if (reportPath == null) {
    throw new Error('--report <path> is required');
  }
  if (runName == null) {
    throw new Error('--run-name <n> is required');
  }
  if (API_KEY == null) {
    throw new Error('TESTINY_API_KEY env var missing');
  }

  const reportAbsPath = path.resolve(reportPath);
  if (!fs.existsSync(reportAbsPath)) {
    throw new Error(`Report file not found: ${reportAbsPath}`);
  }
  return {reportAbsPath, runName};
}

async function resolveTestCases(allTests: FlatTest[], runId: number) {
  const pending: Result[] = [];
  let skippedNoTag = 0,
    skippedNotFound = 0,
    resolveErrors = 0;

  for (const test of allTests) {
    const tcKeys = extractTcTags(test.title, test.tags);
    if (tcKeys.length === 0) {
      console.warn(`  ⚠️  SKIP (no @TC tag): ${test.fullTitle}`);
      skippedNoTag++;
      continue;
    }

    const status = resolveStatus(test);
    for (const tcKey of tcKeys) {
      process.stdout.write(`  ${tcKey}  ${test.title}  → ${status}  … `);
      try {
        const testCaseId = await findTestCaseId(tcKey);
        if (testCaseId === null) {
          console.log('NOT FOUND in Testiny');
          skippedNotFound++;
          continue;
        }
        pending.push({runId, testCaseId, status});
        console.log('queued');
      } catch (err: unknown) {
        console.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
        resolveErrors++;
      }
    }
  }

  return {pending, skippedNoTag, skippedNotFound, resolveErrors};
}

async function main(): Promise<void> {
  const {reportAbsPath, runName} = validateArgs();

  const report = JSON.parse(fs.readFileSync(reportAbsPath, 'utf8')) as JSONReport;
  const allTests = collectTests(report.suites);
  console.log(`\n📋  Playwright report loaded: ${allTests.length} test(s) found`);

  console.log('\n🔗  Resolving Testiny test run…');
  const runId = await resolveRun(runName);

  // Phase 1 - resolve TC tag to Testiny test case ID
  console.log('\n🔍  Resolving test case IDs…\n');

  const {pending, skippedNoTag, skippedNotFound, resolveErrors} = await resolveTestCases(allTests, runId);

  // Phase 2 - deduplicate (keeping the last status per TC)
  const deduped = new Map(pending.map(r => [`${r.testCaseId}:${r.runId}`, r]));
  const dedupedResults = [...deduped.values()];
  const dupes = pending.length - dedupedResults.length;
  if (dupes > 0) console.log(`\nℹ️   Removed ${dupes} duplicate(s) (kept last status per TC)`);

  // Phase 3 - bulk send the results to Testiny
  let sent = 0,
    sendError = 0;
  if (dedupedResults.length > 0) {
    console.log(`\n🚀  Sending ${dedupedResults.length} result(s) in a single bulk request…`);
    try {
      await bulkAddResults(dedupedResults);
      sent = dedupedResults.length;
      console.log('  ✓ Bulk upload successful');
    } catch (err: unknown) {
      console.error(`  ❌ Bulk upload failed: ${err instanceof Error ? err.message : String(err)}`);
      sendError = 1;
    }
  } else {
    console.log('\nℹ️   No results to send.');
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`✅  Results sent      : ${sent}`);
  console.log(`⚠️   No @TC tag        : ${skippedNoTag}`);
  console.log(`🔍  TC not in Testiny  : ${skippedNotFound}`);
  console.log(`❌  Resolve errors     : ${resolveErrors}`);
  console.log(`❌  Bulk send error    : ${sendError}`);
  console.log('─────────────────────────────────────────\n');

  if (resolveErrors > 0 || sendError > 0) process.exitCode = 1;

  // Phase 4 (optional) - append CI link to run description
  appendCiDescription(runId).catch((err: unknown) =>
    console.warn(`  ⚠️  Could not update run description: ${err instanceof Error ? err.message : String(err)}`),
  );
}

function crash(err: unknown): void {
  const message = err instanceof Error ? err.message : JSON.stringify(err);
  console.error('Fatal error:', message);
  process.exitCode = 1;
}

await main().catch(crash);
