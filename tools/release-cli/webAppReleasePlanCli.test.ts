/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import assert from 'node:assert';

import {spawnSync} from 'node:child_process';
import process from 'node:process';
import {pathToFileURL} from 'node:url';
import {Result} from 'true-myth';

import {validateWebAppVersion} from '../release-metadata/webappVersion.ts';
import {runWebAppReleasePlanCommand} from './webAppReleasePlanCli.ts';
import type {WebAppReleasePlanCommandOptions} from './webAppReleasePlanCli.ts';
import type {WebAppReleasePlan} from '../release-metadata/webappReleasePlan.ts';

type CommandOutput = {
  readonly exitCode: number;
  readonly standardError: string;
  readonly standardOutput: string;
};

const baseCommit = 'a'.repeat(40);
const targetCommit = 'b'.repeat(40);
const planningEnvironment: NodeJS.ProcessEnv = {
  GITHUB_API_URL: 'https://api.github.com',
  GITHUB_REPOSITORY: 'wireapp/wire-webapp',
  GITHUB_TOKEN: 'secret-token',
};

function createTestPlan(): WebAppReleasePlan {
  const currentVersionResult = validateWebAppVersion('1.0.0');
  const nextVersionResult = validateWebAppVersion('1.1.0');
  assert(currentVersionResult.isOk);
  assert(nextVersionResult.isOk);

  return {
    baseCommit,
    targetCommit,
    currentVersion: currentVersionResult.value,
    versionBump: 'minor',
    nextVersion: nextVersionResult.value,
    pullRequests: [{number: 12345, title: 'Add a release planning feature', releaseImpact: 'minor'}],
  };
}

function createCommandOptions(
  overrides: Partial<WebAppReleasePlanCommandOptions> = {},
): WebAppReleasePlanCommandOptions {
  return {
    environment: planningEnvironment,
    async planWebAppRelease() {
      return Result.ok(createTestPlan());
    },
    writeError() {},
    writeOutput() {},
    ...overrides,
  };
}

function runImportWithoutEntrypoint(): CommandOutput {
  const cliEntrypointPath = `${process.cwd()}/tools/release-cli/planWebappRelease.mts`;
  const importStatement = `import(${JSON.stringify(pathToFileURL(cliEntrypointPath).toString())})`;
  const childProcessResult = spawnSync(process.execPath, ['--input-type=module', '--eval', importStatement], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {...process.env, NODE_NO_WARNINGS: '1'},
  });

  return {
    exitCode: childProcessResult.status ?? 1,
    standardError: childProcessResult.stderr,
    standardOutput: childProcessResult.stdout,
  };
}

describe('WebApp release plan CLI', () => {
  it('accepts valid arguments and GitHub environment and prints deterministic JSON', async () => {
    const outputMessages: string[] = [];
    let actualPlanningOptions: Parameters<WebAppReleasePlanCommandOptions['planWebAppRelease']>[0] | undefined;
    const commandOptions = createCommandOptions({
      async planWebAppRelease(options) {
        actualPlanningOptions = options;

        return Result.ok(createTestPlan());
      },
      writeOutput(message) {
        outputMessages.push(message);
      },
    });

    const actualExitCode = await runWebAppReleasePlanCommand(['1.0.0', baseCommit, targetCommit], commandOptions);

    expect(actualExitCode).toBe(0);
    expect(actualPlanningOptions).toEqual({
      currentVersion: '1.0.0',
      baseCommit,
      targetCommit,
      githubApiUrl: new URL('https://api.github.com'),
      githubRepository: 'wireapp/wire-webapp',
      githubToken: 'secret-token',
    });
    expect(outputMessages).toEqual([
      `${JSON.stringify(
        {
          base_commit: baseCommit,
          target_commit: targetCommit,
          current_version: '1.0.0',
          version_bump: 'minor',
          next_version: '1.1.0',
          pull_requests: [{number: 12345, title: 'Add a release planning feature', release_impact: 'minor'}],
        },
        null,
        2,
      )}\n`,
    ]);
  });

  it('rejects a malformed current version without invoking planning', async () => {
    const errorMessages: string[] = [];
    let planningWasCalled = false;
    const commandOptions = createCommandOptions({
      async planWebAppRelease() {
        planningWasCalled = true;

        return Result.ok(createTestPlan());
      },
      writeError(message) {
        errorMessages.push(message);
      },
    });

    const actualExitCode = await runWebAppReleasePlanCommand(
      ['1.0.0-beta.1', baseCommit, targetCommit],
      commandOptions,
    );

    expect(actualExitCode).not.toBe(0);
    expect(planningWasCalled).toBe(false);
    expect(errorMessages.join('')).toContain('Invalid WebApp version: 1.0.0-beta.1');
  });

  it.each([
    {description: 'base commit', currentVersion: '1.0.0', baseCommit: 'bad-base', targetCommit},
    {description: 'target commit', currentVersion: '1.0.0', baseCommit, targetCommit: 'bad-target'},
  ])('rejects a malformed $description before invoking planning', async testCase => {
    const errorMessages: string[] = [];
    let planningWasCalled = false;
    const commandOptions = createCommandOptions({
      async planWebAppRelease() {
        planningWasCalled = true;

        return Result.ok(createTestPlan());
      },
      writeError(message) {
        errorMessages.push(message);
      },
    });

    const actualExitCode = await runWebAppReleasePlanCommand(
      [testCase.currentVersion, testCase.baseCommit, testCase.targetCommit],
      commandOptions,
    );

    expect(actualExitCode).not.toBe(0);
    expect(planningWasCalled).toBe(false);
    expect(errorMessages.join('')).toContain(`Invalid ${testCase.description}`);
  });

  it('rejects missing GitHub runtime environment before invoking planning', async () => {
    const errorMessages: string[] = [];
    let planningWasCalled = false;
    const commandOptions = createCommandOptions({
      environment: {},
      async planWebAppRelease() {
        planningWasCalled = true;

        return Result.ok(createTestPlan());
      },
      writeError(message) {
        errorMessages.push(message);
      },
    });

    const actualExitCode = await runWebAppReleasePlanCommand(['1.0.0', baseCommit, targetCommit], commandOptions);

    expect(actualExitCode).not.toBe(0);
    expect(planningWasCalled).toBe(false);
    expect(errorMessages.join('')).toContain('GITHUB_API_URL');
  });

  it('fails without emitting successful JSON when planning fails', async () => {
    const outputMessages: string[] = [];
    const errorMessages: string[] = [];
    const commandOptions = createCommandOptions({
      async planWebAppRelease() {
        return Result.err(new Error('Planning failed'));
      },
      writeError(message) {
        errorMessages.push(message);
      },
      writeOutput(message) {
        outputMessages.push(message);
      },
    });

    const actualExitCode = await runWebAppReleasePlanCommand(['1.0.0', baseCommit, targetCommit], commandOptions);

    expect(actualExitCode).not.toBe(0);
    expect(outputMessages).toEqual([]);
    expect(errorMessages.join('')).toContain('Planning failed');
  });

  it('does not run the CLI when its entrypoint module is imported', () => {
    const actualImportResult = runImportWithoutEntrypoint();

    expect(actualImportResult.exitCode).toBe(0);
    expect(actualImportResult.standardOutput).toBe('');
    expect(actualImportResult.standardError).toBe('');
  });
});
