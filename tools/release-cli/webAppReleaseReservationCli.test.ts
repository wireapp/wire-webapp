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

import type {WebAppReleaseReservation} from '../release-metadata/webappReleaseReservation.ts';
import {validateWebAppVersion} from '../release-metadata/webappVersion.ts';
import {runWebAppReleaseReservationCommand} from './webAppReleaseReservationCli.ts';
import type {WebAppReleaseReservationCommandOptions} from './webAppReleaseReservationCli.ts';

type CommandOutput = {
  readonly exitCode: number;
  readonly standardError: string;
  readonly standardOutput: string;
};

const targetCommit = 'b'.repeat(40);
const runtimeEnvironment: NodeJS.ProcessEnv = {
  GITHUB_API_URL: 'https://api.github.com',
  GITHUB_REPOSITORY: 'wireapp/wire-webapp',
  GITHUB_TOKEN: 'secret-token',
};

function ignoreOutput(message: string): void {
  assert.equal(typeof message, 'string');
}

function createTestReservation(): WebAppReleaseReservation {
  const versionResult = validateWebAppVersion('1.1.0');
  const stableBaseVersionResult = validateWebAppVersion('1.0.0');
  assert(versionResult.isOk);
  assert(stableBaseVersionResult.isOk);

  return Object.freeze({
    version: versionResult.value,
    releaseBranch: 'release/1.1.0',
    releaseCommitSha: targetCommit,
    stableBaseVersion: stableBaseVersionResult.value,
    stableBaseTag: 'v1.0.0',
    stableBaseCommitSha: 'a'.repeat(40),
    action: 'created',
  });
}

function createCommandOptions(
  overrides: Partial<WebAppReleaseReservationCommandOptions> = {},
): WebAppReleaseReservationCommandOptions {
  return {
    environment: runtimeEnvironment,
    async reserveWebAppRelease() {
      return Result.ok(createTestReservation());
    },
    writeError: ignoreOutput,
    writeOutput: ignoreOutput,
    ...overrides,
  };
}

function runCliImportWithoutEntrypoint(): CommandOutput {
  const cliEntrypointPath = `${process.cwd()}/tools/release-cli/reserveWebappRelease.mts`;
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

describe('WebApp release reservation CLI behavior', () => {
  it('prints deterministic machine-readable JSON for a successful reservation', async () => {
    const outputMessages: string[] = [];
    let actualCommandOptions: Parameters<WebAppReleaseReservationCommandOptions['reserveWebAppRelease']>[0] | undefined;
    const commandOptions = createCommandOptions({
      async reserveWebAppRelease(options) {
        actualCommandOptions = options;

        return Result.ok(createTestReservation());
      },
      writeOutput(message) {
        outputMessages.push(message);
      },
    });

    const actualExitCode = await runWebAppReleaseReservationCommand([targetCommit], commandOptions);

    expect(actualExitCode).toBe(0);
    expect(actualCommandOptions).toEqual({
      targetCommit,
      githubApiUrl: new URL('https://api.github.com'),
      githubRepository: 'wireapp/wire-webapp',
      githubToken: 'secret-token',
    });
    expect(outputMessages).toEqual([
      `${JSON.stringify(
        {
          version: '1.1.0',
          release_branch: 'release/1.1.0',
          release_commit: targetCommit,
          stable_base_version: '1.0.0',
          stable_base_tag: 'v1.0.0',
          stable_base_commit: 'a'.repeat(40),
          action: 'created',
        },
        null,
        2,
      )}\n`,
    ]);
  });

  it('rejects a malformed target commit without invoking reservation', async () => {
    let reservationWasCalled = false;
    const errorMessages: string[] = [];
    const commandOptions = createCommandOptions({
      async reserveWebAppRelease() {
        reservationWasCalled = true;

        return Result.ok(createTestReservation());
      },
      writeError(message) {
        errorMessages.push(message);
      },
    });

    const actualExitCode = await runWebAppReleaseReservationCommand(['malformed-sha'], commandOptions);

    expect(actualExitCode).not.toBe(0);
    expect(reservationWasCalled).toBe(false);
    expect(errorMessages.join('')).toContain('Invalid target commit');
  });

  it('rejects missing GitHub environment before invoking reservation', async () => {
    let reservationWasCalled = false;
    const errorMessages: string[] = [];
    const commandOptions = createCommandOptions({
      environment: {},
      async reserveWebAppRelease() {
        reservationWasCalled = true;

        return Result.ok(createTestReservation());
      },
      writeError(message) {
        errorMessages.push(message);
      },
    });

    const actualExitCode = await runWebAppReleaseReservationCommand([targetCommit], commandOptions);

    expect(actualExitCode).not.toBe(0);
    expect(reservationWasCalled).toBe(false);
    expect(errorMessages.join('')).toContain('GITHUB_API_URL');
  });

  it('redacts GitHub tokens from reservation diagnostics', async () => {
    const errorMessages: string[] = [];
    const outputMessages: string[] = [];
    const commandOptions = createCommandOptions({
      async reserveWebAppRelease() {
        return Result.err(new Error('GitHub request failed using secret-token'));
      },
      writeError(message) {
        errorMessages.push(message);
      },
      writeOutput(message) {
        outputMessages.push(message);
      },
    });

    const actualExitCode = await runWebAppReleaseReservationCommand([targetCommit], commandOptions);

    expect(actualExitCode).not.toBe(0);
    expect(errorMessages.join('')).toBe('GitHub request failed using [REDACTED]\n');
    expect(outputMessages).toEqual([]);
  });

  it('redacts GitHub tokens from thrown reservation failures', async () => {
    const errorMessages: string[] = [];
    const commandOptions = createCommandOptions({
      async reserveWebAppRelease() {
        throw new Error('Unexpected failure with secret-token');
      },
      writeError(message) {
        errorMessages.push(message);
      },
    });

    const actualExitCode = await runWebAppReleaseReservationCommand([targetCommit], commandOptions);

    expect(actualExitCode).not.toBe(0);
    expect(errorMessages.join('')).toBe('Unexpected failure with [REDACTED]\n');
  });

  it('does not run the CLI when its entrypoint module is imported', () => {
    const actualImportResult = runCliImportWithoutEntrypoint();

    expect(actualImportResult.exitCode).toBe(0);
    expect(actualImportResult.standardOutput).toBe('');
    expect(actualImportResult.standardError).toBe('');
  });
});
