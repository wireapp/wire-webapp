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
import {spawn} from 'node:child_process';

import {createFactory} from '@enormora/objectory';
import {Maybe, Result} from 'true-myth';

import {renderPersistentComment} from './releaseAppearance.ts';
import {
  executeReleaseAppearanceCommand,
  parseCommandLineArguments,
  prepareCommentOperation,
  readCommandEnvironment,
} from './releaseAppearanceCommand.ts';
import type {
  ExecuteReleaseAppearanceCommandOptions,
  ReleaseAppearanceCommandDependencies,
} from './releaseAppearanceCommand.ts';
import type {
  CreateIssueCommentOptions,
  GitHubClient,
  IssueCommentRecord,
  PullRequestRecord,
  UpdateIssueCommentOptions,
} from './githubClient.ts';
import type {ExecuteGitCommand} from './releaseHistory.ts';

const releaseCommit = 'a'.repeat(40);
const previousProductionCommit = 'b'.repeat(40);
const betaCommit = 'c'.repeat(40);
const previousProductionTag = '2026-01-01.1-production';
const betaTag = '2026-01-02.1-beta.1';
const productionTag = '2026-01-02.1-production';

const commandEnvironment: NodeJS.ProcessEnv = {
  GITHUB_API_URL: 'https://api.github.com',
  GITHUB_REPOSITORY: 'wireapp/wire-webapp',
  GITHUB_STEP_SUMMARY: '/tmp/release-appearance-summary.md',
  GITHUB_TOKEN: 'github-token',
};

type FakeGitHubClientOptions = {
  readonly pullRequestsByCommit?: ReadonlyMap<string, readonly PullRequestRecord[]>;
  readonly commentsByPullRequest?: ReadonlyMap<number, readonly IssueCommentRecord[]>;
  readonly createFailurePullRequests?: ReadonlySet<number>;
};

type FakeGitHubClientState = {
  readonly pullRequestCommits: string[];
  readonly commentPullRequests: number[];
  readonly createdComments: CreateIssueCommentOptions[];
  readonly updatedComments: UpdateIssueCommentOptions[];
};

type FakeGitHubClientFixture = {
  readonly githubClient: GitHubClient;
  readonly state: FakeGitHubClientState;
};

type RunCommandOptions = {
  readonly commandLineArguments: readonly string[];
  readonly executeGitCommand: ExecuteGitCommand;
  readonly githubClient: GitHubClient;
};

const issueCommentRecordFactory = createFactory<IssueCommentRecord>(
  function createIssueCommentRecord(): IssueCommentRecord {
    return {
      id: 1,
      body: 'comment',
    };
  },
);

function createSuccess<valueType>(value: valueType): Result<valueType, Error> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string): Result<valueType, Error> {
  return Result.err<valueType, Error>(new Error(message));
}

function createPullRequest(number: number): PullRequestRecord {
  return {
    number,
    baseBranch: 'main',
    mergedAt: Maybe.just('2026-01-02T00:00:00Z'),
  };
}

function createFakeGitHubClient(fakeGitHubClientOptions: FakeGitHubClientOptions = {}): FakeGitHubClientFixture {
  const state: FakeGitHubClientState = {
    pullRequestCommits: [],
    commentPullRequests: [],
    createdComments: [],
    updatedComments: [],
  };

  return {
    state,
    githubClient: {
      async listPullRequestsForCommit(options): Promise<Result<readonly PullRequestRecord[], Error>> {
        state.pullRequestCommits.push(options.commitSha);
        return createSuccess(
          Maybe.of(fakeGitHubClientOptions.pullRequestsByCommit?.get(options.commitSha)).unwrapOr([]),
        );
      },
      async listIssueComments(options): Promise<Result<readonly IssueCommentRecord[], Error>> {
        state.commentPullRequests.push(options.pullRequestNumber);
        return createSuccess(
          Maybe.of(fakeGitHubClientOptions.commentsByPullRequest?.get(options.pullRequestNumber)).unwrapOr([]),
        );
      },
      async createIssueComment(options): Promise<Result<IssueCommentRecord, Error>> {
        if (fakeGitHubClientOptions.createFailurePullRequests?.has(options.pullRequestNumber) === true) {
          return createFailure(`Unable to create comment for #${options.pullRequestNumber}`);
        }
        state.createdComments.push(options);
        return createSuccess(
          issueCommentRecordFactory.build({id: options.pullRequestNumber, body: options.commentBody}),
        );
      },
      async updateIssueComment(options): Promise<Result<IssueCommentRecord, Error>> {
        state.updatedComments.push(options);
        return createSuccess(issueCommentRecordFactory.build({id: options.commentId, body: options.commentBody}));
      },
    },
  };
}

function createFakeGitCommand(bootstrap: boolean = false): ExecuteGitCommand {
  return async function executeFakeGitCommand(commandArguments: readonly string[]): Promise<string> {
    const command = commandArguments.join(' ');
    if (command === 'tag --list -- *-production') {
      return bootstrap ? '' : `${previousProductionTag}\n`;
    }
    if (command === 'tag --list -- *-beta.*') {
      return `${betaTag}\n`;
    }
    if (command.startsWith('cat-file -t refs/tags/')) {
      return 'tag\n';
    }
    if (command.startsWith('for-each-ref --format=%(taggerdate:unix)')) {
      return command.includes(betaTag) || command.includes(productionTag) ? '200\n' : '100\n';
    }
    if (command.includes(`refs/tags/${previousProductionTag}^{commit}`)) {
      return `${previousProductionCommit}\n`;
    }
    if (command.includes(`refs/tags/${betaTag}^{commit}`)) {
      return `${releaseCommit}\n`;
    }
    if (command.includes(`refs/tags/${productionTag}^{commit}`)) {
      return `${releaseCommit}\n`;
    }
    if (command.startsWith('merge-base ')) {
      return `${previousProductionCommit}\n`;
    }
    if (command.startsWith('rev-list --reverse ')) {
      return `${betaCommit}\n`;
    }

    throw new Error(`Unexpected fake Git command: ${command}`);
  };
}

function createDependencies(
  executeGitCommand: ExecuteGitCommand,
  githubClient: GitHubClient,
  outputMessages: string[],
  summaries: string[],
): ReleaseAppearanceCommandDependencies {
  return {
    executeGitCommand,
    githubClient,
    async writeSummary(summary): Promise<void> {
      summaries.push(summary);
    },
    async writeOutput(message): Promise<void> {
      outputMessages.push(message);
    },
  };
}

async function runCommand(runCommandOptions: RunCommandOptions): Promise<{
  readonly result: Awaited<ReturnType<typeof executeReleaseAppearanceCommand>>;
  readonly outputMessages: readonly string[];
  readonly summaries: readonly string[];
}> {
  const outputMessages: string[] = [];
  const summaries: string[] = [];
  const options: ExecuteReleaseAppearanceCommandOptions = {
    commandLineArguments: runCommandOptions.commandLineArguments,
    environment: commandEnvironment,
    dependencies: createDependencies(
      runCommandOptions.executeGitCommand,
      runCommandOptions.githubClient,
      outputMessages,
      summaries,
    ),
  };
  const result = await executeReleaseAppearanceCommand(options);
  return {result, outputMessages, summaries};
}

test('parses supported commands and requires full release commit SHAs', () => {
  const betaResult = parseCommandLineArguments(['beta', betaTag, releaseCommit]);
  const productionResult = parseCommandLineArguments(['production', productionTag, releaseCommit, betaTag]);
  const abbreviatedCommitResult = parseCommandLineArguments(['beta', betaTag, 'abcdef0']);
  const longCommitResult = parseCommandLineArguments(['beta', betaTag, 'a'.repeat(64)]);

  assert.equal(betaResult.isOk, true);
  assert.equal(productionResult.isOk, true);
  assert.equal(abbreviatedCommitResult.isErr, true);
  assert.equal(longCommitResult.isErr, true);
});

test('parses and validates required command environment', () => {
  const validEnvironmentResult = readCommandEnvironment(commandEnvironment);
  const invalidRepositoryResult = readCommandEnvironment({
    ...commandEnvironment,
    GITHUB_REPOSITORY: 'wire-webapp',
  });

  assert(validEnvironmentResult.isOk);
  assert.equal(validEnvironmentResult.value.githubApiUrl.toString(), 'https://api.github.com/');
  assert(invalidRepositoryResult.isErr);
  assert.match(invalidRepositoryResult.error.message, /OWNER\/REPOSITORY/);
});

test('prepares an update while preserving cross-release first appearances', () => {
  const existingComment = renderPersistentComment({
    beta: Maybe.just('2026-08-01.1-beta.1'),
    production: Maybe.just('2026-08-08.1-production'),
  });

  const actualResult = prepareCommentOperation([{id: 7, body: existingComment}], {
    beta: Maybe.just('2026-08-15.1-beta.1'),
    production: Maybe.just('2026-08-15.1-production'),
  });

  assert(actualResult.isOk);
  assert.deepStrictEqual(actualResult.value, {kind: 'unchanged'});
});

test('discovers pull requests and creates Beta appearance comments', async () => {
  const fakeGitHubClient = createFakeGitHubClient({
    pullRequestsByCommit: new Map([[betaCommit, [createPullRequest(8)]]]),
  });

  const commandRun = await runCommand({
    commandLineArguments: ['beta', betaTag, releaseCommit],
    executeGitCommand: createFakeGitCommand(),
    githubClient: fakeGitHubClient.githubClient,
  });

  assert.equal(commandRun.result.exitCode, 0);
  assert.deepStrictEqual(fakeGitHubClient.state.pullRequestCommits, [betaCommit]);
  assert.equal(fakeGitHubClient.state.createdComments.length, 1);
  const createdComment = Maybe.of(fakeGitHubClient.state.createdComments[0]);
  const summary = Maybe.of(commandRun.summaries[0]);
  assert(createdComment.isJust);
  assert(summary.isJust);
  assert.match(createdComment.value.commentBody, /2026-01-02\.1-beta\.1/);
  assert.match(summary.value, /Pull requests discovered: 1 \(#8\)/);
});

test('continues processing after one pull request comment failure', async () => {
  const fakeGitHubClient = createFakeGitHubClient({
    pullRequestsByCommit: new Map([[betaCommit, [createPullRequest(1), createPullRequest(2)]]]),
    createFailurePullRequests: new Set([1]),
  });

  const commandRun = await runCommand({
    commandLineArguments: ['beta', betaTag, releaseCommit],
    executeGitCommand: createFakeGitCommand(),
    githubClient: fakeGitHubClient.githubClient,
  });

  assert.equal(commandRun.result.exitCode, 1);
  assert.deepStrictEqual(
    fakeGitHubClient.state.createdComments.map(comment => {
      return comment.pullRequestNumber;
    }),
    [2],
  );
  assert.match(commandRun.outputMessages.join('\n'), /#1/);
});

test('bootstrap performs no GitHub requests', async () => {
  const fakeGitHubClient = createFakeGitHubClient();

  const commandRun = await runCommand({
    commandLineArguments: ['beta', betaTag, releaseCommit],
    executeGitCommand: createFakeGitCommand(true),
    githubClient: fakeGitHubClient.githubClient,
  });

  assert.equal(commandRun.result.exitCode, 0);
  assert.deepStrictEqual(fakeGitHubClient.state.pullRequestCommits, []);
  const summary = Maybe.of(commandRun.summaries[0]);
  assert(summary.isJust);
  assert.match(summary.value, /Bootstrap: yes/);
});

test('native command entrypoint loads dependencies and reports usage failure', async () => {
  const commandProcess = spawn(process.execPath, ['tools/release-appearance/releaseAppearanceCommand.ts'], {
    cwd: process.cwd(),
    env: process.env,
  });
  let standardError = '';
  commandProcess.stderr.on('data', (outputChunk: Buffer) => {
    standardError += outputChunk.toString();
  });
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    commandProcess.once('error', error => {
      reject(error);
    });
    commandProcess.once('exit', processExitCode => {
      resolve(processExitCode);
    });
  });

  assert.equal(exitCode, 1);
  assert.match(standardError, /Usage: beta/);
});
