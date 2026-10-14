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

import {Result} from 'true-myth';

import {runWebAppReleaseContinuationCommand} from './webAppReleaseContinuationCli.ts';
import type {WebAppReleaseContinuationCommandOptions} from './webAppReleaseContinuationCli.ts';

import type {WebAppReleaseReservation} from '../release-metadata/webappReleaseReservation.ts';
import {validateWebAppVersion} from '../release-metadata/webappVersion.ts';

type CreateTestReservationOptions = {
  readonly releaseCommitSha: string;
};

type CreateCommandOptions = {
  readonly continueActiveWebAppRelease?: WebAppReleaseContinuationCommandOptions['continueActiveWebAppRelease'];
  readonly writeOutput?: WebAppReleaseContinuationCommandOptions['writeOutput'];
  readonly writeError?: WebAppReleaseContinuationCommandOptions['writeError'];
};

const activeReleaseCommit = 'b'.repeat(40);
const stableCommit = 'a'.repeat(40);

function createTestReservation(options: CreateTestReservationOptions): WebAppReleaseReservation {
  const {releaseCommitSha} = options;
  const versionResult = validateWebAppVersion('1.1.0');
  const stableBaseVersionResult = validateWebAppVersion('1.0.0');
  assert(versionResult.isOk);
  assert(stableBaseVersionResult.isOk);

  return Object.freeze({
    version: versionResult.value,
    releaseBranch: 'release/1.1.0',
    releaseCommitSha,
    stableBaseVersion: stableBaseVersionResult.value,
    stableBaseTag: 'v1.0.0',
    stableBaseCommitSha: stableCommit,
    action: 'reused',
  });
}

async function continueWithTestReservation(): Promise<Result<WebAppReleaseReservation, Error>> {
  return Result.ok(createTestReservation({releaseCommitSha: activeReleaseCommit}));
}

function discardCommandMessage(commandMessage: string): void {
  void commandMessage;
}

function createCommandOptions(options: CreateCommandOptions = {}): WebAppReleaseContinuationCommandOptions {
  const {continueActiveWebAppRelease, writeOutput, writeError} = options;

  return {
    continueActiveWebAppRelease: continueActiveWebAppRelease ?? continueWithTestReservation,
    writeError: writeError ?? discardCommandMessage,
    writeOutput: writeOutput ?? discardCommandMessage,
  };
}

describe('WebApp release continuation CLI command', () => {
  it('writes the reservation JSON on success', async () => {
    const outputMessages: string[] = [];
    const errorMessages: string[] = [];

    function collectOutputMessage(outputMessage: string): void {
      outputMessages.push(outputMessage);
    }

    function collectErrorMessage(errorMessage: string): void {
      errorMessages.push(errorMessage);
    }

    const commandOptions = createCommandOptions({
      writeOutput: collectOutputMessage,
      writeError: collectErrorMessage,
    });

    const actualExitCode = await runWebAppReleaseContinuationCommand(commandOptions);

    assert(actualExitCode === 0);
    expect(outputMessages).toEqual([
      `${JSON.stringify(
        {
          version: '1.1.0',
          release_branch: 'release/1.1.0',
          release_commit: activeReleaseCommit,
          stable_base_version: '1.0.0',
          stable_base_tag: 'v1.0.0',
          stable_base_commit: stableCommit,
          action: 'reused',
        },
        null,
        2,
      )}\n`,
    ]);
    expect(errorMessages).toEqual([]);
  });

  it('writes domain failures to standard error without output', async () => {
    const outputMessages: string[] = [];
    const errorMessages: string[] = [];

    async function returnNoActiveRelease(): Promise<Result<WebAppReleaseReservation, Error>> {
      return Result.err(new Error('No active WebApp SemVer release exists'));
    }

    function collectOutputMessage(outputMessage: string): void {
      outputMessages.push(outputMessage);
    }

    function collectErrorMessage(errorMessage: string): void {
      errorMessages.push(errorMessage);
    }

    const commandOptions = createCommandOptions({
      continueActiveWebAppRelease: returnNoActiveRelease,
      writeOutput: collectOutputMessage,
      writeError: collectErrorMessage,
    });

    const actualExitCode = await runWebAppReleaseContinuationCommand(commandOptions);

    expect(actualExitCode).not.toBe(0);
    expect(outputMessages).toEqual([]);
    expect(errorMessages).toEqual(['No active WebApp SemVer release exists\n']);
  });

  it('normalizes thrown failures to useful standard error', async () => {
    const errorMessages: string[] = [];

    async function throwGitFailure(): Promise<Result<WebAppReleaseReservation, Error>> {
      throw new Error('Git is unavailable');
    }

    function collectErrorMessage(errorMessage: string): void {
      errorMessages.push(errorMessage);
    }

    const commandOptions = createCommandOptions({
      continueActiveWebAppRelease: throwGitFailure,
      writeError: collectErrorMessage,
    });

    const actualExitCode = await runWebAppReleaseContinuationCommand(commandOptions);

    expect(actualExitCode).not.toBe(0);
    expect(errorMessages).toEqual(['Git is unavailable\n']);
  });
});
