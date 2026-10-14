/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import assert from 'node:assert';

import {Task} from 'true-myth';

import {runWebAppReleasePreparationCommand, serializeWebAppReleasePreparation} from './webAppReleasePreparationCli.ts';
import type {
  WebAppReleasePreparationCommandDependencies,
  WebAppReleasePreparationCommandOptions,
} from './webAppReleasePreparationCli.ts';
import type {
  PrepareWebAppReleaseOptions,
  WebAppReleasePreparation,
} from '../release-metadata/webappReleaseReservation.ts';
import {validateWebAppVersion} from '../release-metadata/webappVersion.ts';

const dispatchCommitSha = 'a'.repeat(40);
const stableBaseCommitSha = 'b'.repeat(40);

function createPreparation(operation: 'start' | 'continue'): WebAppReleasePreparation {
  const versionResult = validateWebAppVersion('1.1.0');
  const stableBaseVersionResult = validateWebAppVersion('1.0.0');
  assert(versionResult.isOk);
  assert(stableBaseVersionResult.isOk);

  return {
    operation,
    version: versionResult.value,
    releaseBranch: 'release/1.1.0',
    releaseCommitSha: dispatchCommitSha,
    stableBaseVersion: stableBaseVersionResult.value,
    stableBaseTag: 'v1.0.0',
    stableBaseCommitSha,
    action: operation === 'start' ? 'created' : 'reused',
  };
}

function createRuntimeEnvironment(): NodeJS.ProcessEnv {
  return {
    GITHUB_API_URL: 'https://api.github.com',
    GITHUB_REPOSITORY: 'wireapp/wire-webapp',
    GITHUB_TOKEN: 'github-token',
  };
}

function createCommandDependencies(
  preparation: WebAppReleasePreparation,
  preparedOptions: PrepareWebAppReleaseOptions[],
  outputMessages: string[],
  errorMessages: string[],
): WebAppReleasePreparationCommandDependencies {
  function prepareRelease(options: PrepareWebAppReleaseOptions): Task<WebAppReleasePreparation, Error> {
    preparedOptions.push(options);

    return Task.resolve(preparation);
  }

  function writeOutput(message: string): void {
    outputMessages.push(message);
  }

  function writeError(message: string): void {
    errorMessages.push(message);
  }

  return {prepareRelease, writeOutput, writeError};
}

function createCommandOptions(
  operation: 'start' | 'continue',
  targetCommit: string | undefined,
): WebAppReleasePreparationCommandOptions {
  return {
    commandLineArguments: targetCommit === undefined ? [operation] : [operation, targetCommit],
    environment: createRuntimeEnvironment(),
  };
}

describe('WebApp release preparation CLI', () => {
  it('serializes authoritative preparation fields as deterministic JSON', () => {
    const preparation = createPreparation('start');
    const expectedSerializedPreparation = JSON.stringify(
      {
        operation: 'start',
        version: '1.1.0',
        release_branch: 'release/1.1.0',
        release_commit: dispatchCommitSha,
        release_branch_action: 'created',
        stable_base_version: '1.0.0',
        stable_base_tag: 'v1.0.0',
        stable_base_commit: stableBaseCommitSha,
      },
      null,
      2,
    );

    expect(serializeWebAppReleasePreparation(preparation)).toBe(expectedSerializedPreparation);
  });

  it('passes the exact dispatch SHA to the start operation', async (): Promise<void> => {
    const preparedOptions: PrepareWebAppReleaseOptions[] = [];
    const outputMessages: string[] = [];
    const errorMessages: string[] = [];
    const commandExitCode = await runWebAppReleasePreparationCommand(
      createCommandOptions('start', dispatchCommitSha),
      createCommandDependencies(createPreparation('start'), preparedOptions, outputMessages, errorMessages),
    );

    expect(commandExitCode).toBe(0);
    expect(preparedOptions).toEqual([{operation: 'start', targetCommit: dispatchCommitSha}]);
    expect(errorMessages).toEqual([]);
    expect(outputMessages).toHaveLength(1);
  });

  it('does not accept or plan a version for continue', async (): Promise<void> => {
    const preparedOptions: PrepareWebAppReleaseOptions[] = [];
    const outputMessages: string[] = [];
    const errorMessages: string[] = [];
    const commandExitCode = await runWebAppReleasePreparationCommand(
      createCommandOptions('continue', undefined),
      createCommandDependencies(createPreparation('continue'), preparedOptions, outputMessages, errorMessages),
    );

    expect(commandExitCode).toBe(0);
    expect(preparedOptions).toEqual([{operation: 'continue'}]);
    expect(errorMessages).toEqual([]);
    expect(outputMessages).toHaveLength(1);
  });

  it('rejects start without a full commit SHA before calling release preparation', async (): Promise<void> => {
    const preparedOptions: PrepareWebAppReleaseOptions[] = [];
    const outputMessages: string[] = [];
    const errorMessages: string[] = [];
    const commandExitCode = await runWebAppReleasePreparationCommand(
      createCommandOptions('start', 'short-sha'),
      createCommandDependencies(createPreparation('start'), preparedOptions, outputMessages, errorMessages),
    );

    expect(commandExitCode).toBe(1);
    expect(preparedOptions).toEqual([]);
    expect(outputMessages).toEqual([]);
    expect(errorMessages).toEqual(['Start requires a full 40-character main commit SHA\n']);
  });
});
