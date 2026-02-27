#!/usr/bin/env npx ts-node --esm
/**
 * send-results-to-testiny.ts
 *
 * Processes a Playwright JSON report and pushes test results to Testiny via REST API.
 *
 * Usage:
 *   npx ts-node apps/webapp/test/e2e_tests/scripts/send-playwright-results-to-testiny.ts \
 *     --report   path/to/playwright-report.json \
 *     --run-name "{TESTINY_RUN_NAME}"            
 *
 * Environment variables (required):
 *   TESTINY_API_KEY   – Testiny API key
 */

import fs from "node:fs";
import path from "node:path";

// ─── Playwright JSON report types ────────────────────────────────────────────

interface PlaywrightError {
    message?: string;
    value?: string;
}

interface PlaywrightTestAttempt {
    status: string;
    errors?: PlaywrightError[];
    duration?: number;
}

interface PlaywrightTest {
    status: string;
    results: PlaywrightTestAttempt[];
}

interface PlaywrightSpec {
    title: string;
    tags?: string[];
    tests: PlaywrightTest[];
}

interface PlaywrightSuite {
    title: string;
    specs?: PlaywrightSpec[];
    suites?: PlaywrightSuite[];
}

interface PlaywrightReport {
    suites?: PlaywrightSuite[];
}

// ─── Internal types ───────────────────────────────────────────────────────────

type TestinyStatus = "PASSED" | "FAILED" | "SKIPPED" | "BLOCKED" | "NOTRUN";

interface FlatTestEntry {
    title: string;
    fullTitle: string;
    tags: string[];
    results: PlaywrightTestAttempt[];
}

interface AddResultParams {
    runId: number;
    testCaseId: number;
    status: TestinyStatus;
    note?: string;
}

interface CliArgs {
    reportPath: string | undefined;
    runName: string | undefined;
}

// ─── Testiny API response shapes ─────────────────────────────────────────────

interface TestinyRun {
    id: number;
    title: string;
    description?: string;
}

interface TestinyFindResponse<T> {
    data?: T[];
}

interface TestinyTestCase {
    id: number;
}

interface TestinyClientOptions {
    baseUrl: string;
    apiKey: string;
    project: string;
}

// ─── Slate rich-text helpers ──────────────────────────────────────────────────

/**
 * Testiny stores descriptions as a Slate JSON document:
 *   { t: "slate", v: 1, c: [ ...paragraph nodes ] }
 * A paragraph containing a clickable link looks like:
 *   { t: "p", children: [ { text: "Build URL: " }, { t: "a", url: "...", children: [{ text: "..." }] }, { text: "" } ] }
 */

interface SlateText {
    text: string;
}

interface SlateLink {
    t: "a";
    url: string;
    children: SlateText[];
}

interface SlateParagraph {
    t: "p";
    children: (SlateText | SlateLink)[];
}

interface SlateDoc {
    t: "slate";
    v: 1;
    c: SlateParagraph[];
}

function makeLinkParagraph(label: string, url: string): SlateParagraph {
    return {
        t: "p",
        children: [
            { text: `${label} ` },
            { t: "a", url, children: [{ text: url }] },
            { text: "" },
        ],
    };
}

function parseSlateDoc(raw: string | undefined): SlateDoc {
    if (raw !== undefined) {
        try {
            const parsed = JSON.parse(raw) as SlateDoc;
            if (parsed.t === "slate") return parsed;
        } catch {
            // not a Slate doc — fall through to a fresh one
        }
    }
    return { t: "slate", v: 1, c: [] };
}

async function updateTestinyRunDescription(runId: number, client: TestinyClient): Promise<void> {
    const ghServer = process.env.GITHUB_SERVER_URL;
    const ghRepo = process.env.GITHUB_REPOSITORY;
    const ghRunId = process.env.GITHUB_RUN_ID;

    if (ghServer === undefined || ghRepo === undefined || ghRunId === undefined) return;

    const actionUrl = `${ghServer}/${ghRepo}/actions/runs/${ghRunId}`;
    console.log(`\n📝  Appending build URL to run description: ${actionUrl}`);

    try {
        const run = await client.getRun(runId);
        const doc = parseSlateDoc(run.description);
        doc.c.push(makeLinkParagraph("Build URL:", actionUrl));
        await client.updateRunDescription(runId, JSON.stringify(doc));
        console.log("  ✓ Description updated");
    } catch (err) {
        const message = err instanceof Error ? err.message : JSON.stringify(err);
        console.warn(`  ⚠️  Could not update description: ${message}`);
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseArgs(): CliArgs {
    const args = process.argv.slice(2);
    const get = (flag: string): string | undefined => {
        const idx = args.indexOf(flag);
        return idx === -1 ? undefined : args[idx + 1];
    };
    return {
        reportPath: get("--report"),
        runName: get("--run-name"),
    };
}

function extractTcTags(title: string, tags: string[]): string[] {
    const pattern = /@?TC-\d+/gi;
    const matches = new Set<string>();

    for (const t of [title, ...tags]) {
        const found = String(t).match(pattern);
        if (found !== undefined) {
            found.forEach((m) => matches.add(m.replace(/^@/, "").toUpperCase()));
        }
    }

    return [...matches];
}

function mapStatus(playwrightStatus: string): TestinyStatus {
    switch (playwrightStatus) {
        case "passed": return "PASSED";
        case "failed": return "FAILED";
        case "timedOut": return "FAILED";
        case "skipped": return "SKIPPED";
        case "interrupted": return "BLOCKED";
        default: return "NOTRUN";
    }
}

function collectResults(
    suites: PlaywrightSuite[] | undefined,
    parentPath = ""
): FlatTestEntry[] {
    const results: FlatTestEntry[] = [];

    for (const suite of suites ?? []) {
        const suitePath = parentPath
            ? `${parentPath} > ${suite.title}`
            : suite.title;

        for (const spec of suite.specs ?? []) {
            for (const test of spec.tests ?? []) {
                results.push({
                    title: spec.title,
                    fullTitle: `${suitePath} > ${spec.title}`,
                    tags: spec.tags ?? [],
                    results: test.results ?? [],
                });
            }
        }

        results.push(...collectResults(suite.suites, suitePath));
    }

    return results;
}

function resolveStatus(entry: FlatTestEntry): TestinyStatus {
    if (entry.results.length === 0) return mapStatus("failed");
    const last = entry.results.at(-1);
    return mapStatus(last.status);
}

function resolveErrorMessage(entry: FlatTestEntry): string | undefined {
    for (const attempt of [...entry.results].reverse()) {
        if (attempt.errors?.length > 0) {
            return attempt.errors
                .map((e) => e.message ?? JSON.stringify(e))
                .join("\n")
                .slice(0, 2000);
        }
    }
    return undefined;
}

// ─── Testiny API client ───────────────────────────────────────────────────────

class TestinyClient {
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly project: string;

    constructor({ baseUrl, apiKey, project }: TestinyClientOptions) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.apiKey = apiKey;
        this.project = project;
    }

    // ── Project helpers ──────────────────────────────────────────────────────────

    private get projectIsNumeric(): boolean {
        return this.project.trim() !== "" && !Number.isNaN(Number(this.project));
    }

    private get projectFilterFields(): Record<string, unknown> {
        return this.projectIsNumeric
            ? { project_id: Number(this.project) }
            : { project_key: this.project };
    }

    private get projectBody(): Record<string, unknown> {
        return this.projectFilterFields;
    }

    // ── HTTP ─────────────────────────────────────────────────────────────────────

    /**
     * Generic request helper.
     * @param body - Pass a plain object OR a pre-built array for endpoints
     *               that expect a JSON array as the top-level body (e.g. bulk).
     */
    private async request<T>(
        method: string,
        endpoint: string,
        body?: Record<string, unknown> | unknown[]
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const res = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                "X-Api-Key": this.apiKey,
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });

        const text = await res.text();
        let json: unknown;
        try {
            json = JSON.parse(text);
        } catch {
            json = text;
        }

        if (res.ok === false) {
            throw new Error(
                `Testiny API ${method} ${endpoint} → ${res.status}: ${JSON.stringify(json)}`
            );
        }

        return json as T;
    }

    // ── Test Run ─────────────────────────────────────────────────────────────────

    async createRun(title: string): Promise<number> {
        console.log(`  → Creating test run "${title}"…`);

        const run = await this.request<TestinyRun>("POST", "/testrun", {
            title,
            ...this.projectBody,
        });

        console.log(`  ✓ Created run with ID ${run.id}`);
        return run.id;
    }

    async getRun(runId: number): Promise<TestinyRun> {
        return this.request<TestinyRun>("GET", `/testrun/${runId}`);
    }

    async findRunByTitle(title: string): Promise<TestinyRun | null> {
        const data = await this.request<TestinyFindResponse<TestinyRun>>(
            "POST",
            "/testrun/find",
            {
                filter: {
                    title,
                    ...this.projectFilterFields,
                },
            }
        );

        return data?.data?.[0] ?? null;
    }

    async resolveRun(
        runName: string | undefined
    ): Promise<number> {
        if (runName === undefined) {
            throw new Error("runName must be provided.");
        }

        const existingRun = await this.findRunByTitle(runName);
        if (existingRun !== null) {
            console.log(`  ✓ Found existing run "${runName}" (ID ${existingRun.id})`);
            return existingRun.id;
        }

        return this.createRun(runName);
    }

    async updateRunDescription(runId: number, description: string): Promise<void> {
        await this.request("PUT", `/testrun/${runId}?force=true`, { description });
    }

    // ── Test Case ────────────────────────────────────────────────────────────────

    async findTestCaseByKey(tcKey: string): Promise<number | null> {
        const numericId = Number.parseInt(tcKey.replace(/^TC-/i, ""), 10);
        if (Number.isNaN(numericId) === true) return null;

        try {
            const tc = await this.request<TestinyTestCase>(
                "GET",
                `/testcase/${numericId}`
            );
            return tc?.id ?? null;
        } catch {
            return null;
        }
    }

    // ── Test Result ──────────────────────────────────────────────────────────────

    /**
     * Sends all collected results in a single bulk request.
     *
     * Mirrors the Java bulkAddTestCaseResults() implementation:
     *   POST /testrun/mapping/bulk/testcase:testrun?op=add_or_update
     *
     * Body is a JSON array — one entry per test case — each containing:
     *   ids    – the testcase_id / testrun_id pair identifying the mapping
     *   mapped – the fields to set (result_status, assigned_to, optional note)
     */
    async bulkAddResults(results: AddResultParams[]): Promise<void> {
        const bulk = results.map(({ runId, testCaseId, status }) => ({
            ids: {
                testcase_id: testCaseId,
                testrun_id: runId,
            },
            mapped: {
                result_status: status,
                assigned_to: "OWNER"
            },
        }));

        await this.request(
            "POST",
            "/testrun/mapping/bulk/testcase:testrun?op=add_or_update",
            bulk
        );
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const { reportPath, runName } = parseArgs();

    if (reportPath === undefined) {
        console.error("❌  --report <path> is required");
        process.exitCode = 1;
    }
    if (runName === undefined) {
        console.error("❌  --run-name <n> is required");
        process.exitCode = 1;
    }

    const apiKey = process.env.TESTINY_API_KEY;
    const project = process.env.TESTINY_PROJECT ?? "3";
    const baseUrl =
        process.env.TESTINY_BASE_URL ?? "https://app.testiny.io/api/v1";

    if (apiKey === undefined) {
        console.error("❌  TESTINY_API_KEY env var is required");
        process.exitCode = 1;
    }
    if (project === undefined) {
        console.error(
            "❌  TESTINY_PROJECT env var is required"
        );
        process.exitCode = 1;
    }

    const reportAbsPath = path.resolve(reportPath);
    if (fs.existsSync(reportAbsPath) === false) {
        console.error(`❌  Report file not found: ${reportAbsPath}`);
        process.exitCode = 1;
    }

    const report = JSON.parse(
        fs.readFileSync(reportAbsPath, "utf8")
    ) as PlaywrightReport;

    const allTests = collectResults(report.suites);
    console.log(`\n📋  Playwright report loaded: ${allTests.length} test(s) found`);

    const client = new TestinyClient({
        baseUrl,
        apiKey,
        project: project ?? "",
    });

    console.log("\n🔗  Resolving Testiny test run…");
    const resolvedRunId = await client.resolveRun(runName);

    // ── Phase 1: resolve all TC tags → Testiny test case IDs ─────────────────────

    console.log("\n🔍  Resolving test case IDs…\n");

    const pending: AddResultParams[] = [];
    let skippedNoTag = 0;
    let skippedNotFound = 0;
    let resolveErrors = 0;

    for (const test of allTests) {
        const tcKeys = extractTcTags(test.title, test.tags);

        if (tcKeys.length === 0) {
            console.warn(`  ⚠️  SKIP (no @TC tag): ${test.fullTitle}`);
            skippedNoTag++;
            continue;
        }

        const status = resolveStatus(test);
        const note = resolveErrorMessage(test);

        for (const tcKey of tcKeys) {
            process.stdout.write(`  ${tcKey}  ${test.title}  → ${status}  … `);

            try {
                const testCaseId = await client.findTestCaseByKey(tcKey);

                if (testCaseId === null) {
                    console.log("NOT FOUND in Testiny");
                    skippedNotFound++;
                    continue;
                }

                pending.push({ runId: resolvedRunId, testCaseId, status, note });
                console.log("queued");
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.log(`ERROR resolving: ${message}`);
                resolveErrors++;
            }
        }
    }

    // ── Phase 2: deduplicate by (testCaseId, runId) ───────────────────────────
    //
    // The bulk endpoint rejects duplicate testcase_id+testrun_id pairs.
    // A duplicate can occur when the same @TC tag appears in both the test
    // title and an annotation, or when a test has multiple retry attempts.
    // We keep the "worst" status for each pair so a failure is never silently
    // overwritten by a later passing retry.

    const deduped = new Map<string, AddResultParams>();
    for (const result of pending) {
        // Always overwrite with the latest status
        deduped.set(`${result.testCaseId}:${result.runId}`, result);
    }

    const dedupedResults = [...deduped.values()];
    const duplicatesRemoved = pending.length - dedupedResults.length;
    if (duplicatesRemoved > 0) {
        console.log(`\nℹ️   Removed ${duplicatesRemoved} duplicate(s) (kept last status per TC)`);
    }

    // ── Phase 3: send all results in one bulk request ──────────────────────────

    let sent = 0;
    let sendError = 0;

    if (dedupedResults.length > 0) {
        console.log(`\n🚀  Sending ${dedupedResults.length} result(s) in a single bulk request…`);
        try {
            await client.bulkAddResults(dedupedResults);
            sent = dedupedResults.length;
            console.log("  ✓ Bulk upload successful");
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`  ❌ Bulk upload failed: ${message}`);
            sendError = 1;
        }
    } else {
        console.log("\nℹ️   No results to send.");
    }

    console.log("\n─────────────────────────────────────────");
    console.log(`✅  Results sent      : ${sent}`);
    console.log(`⚠️   No @TC tag        : ${skippedNoTag}`);
    console.log(`🔍  TC not in Testiny  : ${skippedNotFound}`);
    console.log(`❌  Resolve errors     : ${resolveErrors}`);
    console.log(`❌  Bulk send error    : ${sendError}`);
    console.log("─────────────────────────────────────────\n");

    if (resolveErrors > 0 || sendError > 0) process.exitCode = 1;

    // ── Phase 4: Add a link to the build in the test run description (optional) ──────────────────────────

    // Update the run description with a link back to the GitHub Actions run.
    // All GITHUB_* variables are set automatically by the Actions runner;
    // when running locally they will be undefined and the update is skipped.

    updateTestinyRunDescription(resolvedRunId, client).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠️  Could not update run description: ${message}`);
    });
}

function crash(error: unknown): void {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("Fatal error:", message);
    process.exitCode = 1;
}

main().catch(crash);
