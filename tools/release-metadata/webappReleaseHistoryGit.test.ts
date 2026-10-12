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

import {readWebAppReleaseHistory} from './webappReleaseHistoryGit.ts';
import type {ExecuteWebAppReleaseGitCommand} from './webappReleaseHistoryGit.ts';

type FakeGitExecutionOptions = {
  readonly baseCommit: string;
  readonly targetCommit: string;
  readonly commits: readonly string[];
  readonly unrelatedCommitCount?: number;
  readonly failingCommand?: 'base-resolution' | 'target-resolution' | 'commit-list';
};

type FakeGitExecution = {
  readonly executeGitCommand: ExecuteWebAppReleaseGitCommand;
  readonly commandHistory: readonly (readonly string[])[];
};

function createFakeGitExecution(options: FakeGitExecutionOptions): FakeGitExecution {
  const commandHistory: string[][] = [];

  return {
    commandHistory,
    async executeGitCommand(commandArguments) {
      commandHistory.push([...commandArguments]);

      if (commandArguments.at(0) === 'rev-parse') {
        const revisionArgument = commandArguments.at(-1);
        if (revisionArgument === undefined) {
          throw new Error('Expected revision argument');
        }

        if (revisionArgument.startsWith(options.baseCommit) && options.failingCommand === 'base-resolution') {
          throw new Error('Unknown base object');
        }

        if (revisionArgument.startsWith(options.targetCommit) && options.failingCommand === 'target-resolution') {
          throw new Error('Unknown target object');
        }

        if (revisionArgument.startsWith(options.baseCommit)) {
          return options.baseCommit;
        }

        return options.targetCommit;
      }

      if (commandArguments.at(0) === 'rev-list' && commandArguments.includes('--left-right')) {
        const unrelatedCommitCount = options.unrelatedCommitCount ?? 0;

        return `${unrelatedCommitCount}\t${options.commits.length}`;
      }

      if (commandArguments.at(0) === 'rev-list' && commandArguments.includes('--reverse')) {
        if (options.failingCommand === 'commit-list') {
          throw new Error('Unable to inspect commit range');
        }

        return options.commits.join('\n');
      }

      throw new Error(`Unexpected Git command: ${commandArguments.join(' ')}`);
    },
  };
}

describe('WebApp release Git history adapter', () => {
  const baseCommit = 'a'.repeat(40);
  const targetCommit = 'b'.repeat(40);
  const firstCommit = 'c'.repeat(40);
  const secondCommit = 'd'.repeat(40);

  it('resolves an ancestor range in deterministic first-parent order', async () => {
    const fakeGitExecution = createFakeGitExecution({baseCommit, targetCommit, commits: [firstCommit, secondCommit]});

    const actualHistoryResult = await readWebAppReleaseHistory({
      baseCommit,
      targetCommit,
      executeGitCommand: fakeGitExecution.executeGitCommand,
    });

    assert(actualHistoryResult.isOk);
    const actualHistory = actualHistoryResult.value;
    const expectedHistory = {baseCommit, targetCommit, commits: [firstCommit, secondCommit]};
    expect(actualHistory).toEqual(expectedHistory);
    expect(fakeGitExecution.commandHistory).toContainEqual([
      'rev-list',
      '--reverse',
      '--first-parent',
      `${baseCommit}..${targetCommit}`,
    ]);
  });

  it('accepts an empty ancestor range', async () => {
    const fakeGitExecution = createFakeGitExecution({baseCommit, targetCommit, commits: []});

    const actualHistoryResult = await readWebAppReleaseHistory({
      baseCommit,
      targetCommit,
      executeGitCommand: fakeGitExecution.executeGitCommand,
    });

    assert(actualHistoryResult.isOk);
    expect(actualHistoryResult.value.commits).toEqual([]);
  });

  it('rejects a malformed base commit before executing Git', async () => {
    const fakeGitExecution = createFakeGitExecution({baseCommit, targetCommit, commits: []});

    const actualHistoryResult = await readWebAppReleaseHistory({
      baseCommit: 'not-a-commit',
      targetCommit,
      executeGitCommand: fakeGitExecution.executeGitCommand,
    });

    assert(actualHistoryResult.isErr);
    expect(actualHistoryResult.error.message).toContain('Invalid base commit');
    expect(fakeGitExecution.commandHistory).toEqual([]);
  });

  it('rejects a base value that Git cannot resolve to a commit', async () => {
    const fakeGitExecution = createFakeGitExecution({
      baseCommit,
      targetCommit,
      commits: [],
      failingCommand: 'base-resolution',
    });

    const actualHistoryResult = await readWebAppReleaseHistory({
      baseCommit,
      targetCommit,
      executeGitCommand: fakeGitExecution.executeGitCommand,
    });

    assert(actualHistoryResult.isErr);
    expect(actualHistoryResult.error.message).toContain('Unable to resolve base commit');
  });

  it('rejects a target value that Git cannot resolve to a commit', async () => {
    const fakeGitExecution = createFakeGitExecution({
      baseCommit,
      targetCommit,
      commits: [],
      failingCommand: 'target-resolution',
    });

    const actualHistoryResult = await readWebAppReleaseHistory({
      baseCommit,
      targetCommit,
      executeGitCommand: fakeGitExecution.executeGitCommand,
    });

    assert(actualHistoryResult.isErr);
    expect(actualHistoryResult.error.message).toContain('Unable to resolve target commit');
  });

  it('rejects a base commit that is not an ancestor of the target', async () => {
    const fakeGitExecution = createFakeGitExecution({
      baseCommit,
      targetCommit,
      commits: [firstCommit],
      unrelatedCommitCount: 1,
    });

    const actualHistoryResult = await readWebAppReleaseHistory({
      baseCommit,
      targetCommit,
      executeGitCommand: fakeGitExecution.executeGitCommand,
    });

    assert(actualHistoryResult.isErr);
    expect(actualHistoryResult.error.message).toBe('Base commit is not an ancestor of target commit');
  });

  it('fails with a diagnostic when Git cannot inspect the commit range', async () => {
    const fakeGitExecution = createFakeGitExecution({
      baseCommit,
      targetCommit,
      commits: [],
      failingCommand: 'commit-list',
    });

    const actualHistoryResult = await readWebAppReleaseHistory({
      baseCommit,
      targetCommit,
      executeGitCommand: fakeGitExecution.executeGitCommand,
    });

    assert(actualHistoryResult.isErr);
    expect(actualHistoryResult.error.message).toContain('Git command failed');
  });
});
