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
import {createGitHubClient} from './githubClient.ts';
import type {
  CreateIssueCommentOptions,
  GitHubClient,
  IssueCommentRecord,
  ListIssueCommentsOptions,
  ListPullRequestsForCommitOptions,
  PullRequestRecord,
  UpdateIssueCommentOptions,
} from './githubClient.ts';
import type {HttpRequest} from './httpClient.ts';
import {createNoOpReleaseAppearanceProgressReporter} from './releaseAppearanceProgress.ts';
import type {ExecuteGitCommand} from './releaseHistory.ts';

const releaseCommit = 'a'.repeat(40);
const previousProductionCommit = 'b'.repeat(40);
const betaCommit = 'c'.repeat(40);
const previousProductionTag = '2026-01-01.1-production';
const betaTag = '2026-01-02.1-beta.1';
const betaTwoTag = '2026-01-02.1-beta.2';
const betaTwoCommit = 'f'.repeat(40);
const productionTag = '2026-01-02.1-production';

const commandEnvironment: NodeJS.ProcessEnv = {
  GITHUB_API_URL: 'https://api.github.com',
  GITHUB_REPOSITORY: 'wireapp/wire-webapp',
  GITHUB_STEP_SUMMARY: '/tmp/release-appearance-summary.md',
  GITHUB_TOKEN: 'github-token',
  WORKFLOW_TOOLING_COMMIT_SHA: 'e'.repeat(40),
};

type FakeGitHubClientOptions = {
  readonly pullRequestsByCommit?: ReadonlyMap<string, readonly PullRequestRecord[]>;
  readonly pullRequestFailuresByCommit?: ReadonlyMap<string, string>;
  readonly listPullRequestsForCommit?: (
    options: ListPullRequestsForCommitOptions,
  ) => Promise<Result<readonly PullRequestRecord[], Error>>;
  readonly commentsByPullRequest?: ReadonlyMap<number, readonly IssueCommentRecord[]>;
  readonly commentListFailuresByPullRequest?: ReadonlyMap<number, string>;
  readonly listIssueComments?: (
    options: ListIssueCommentsOptions,
  ) => Promise<Result<readonly IssueCommentRecord[], Error>>;
  readonly createFailuresByPullRequest?: ReadonlyMap<number, string>;
  readonly updateFailuresByCommentId?: ReadonlyMap<number, string>;
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
  readonly informationWriteFailure?: string;
  readonly summaryWriteFailure?: string;
};

type FakeGitCommandOptions = {
  readonly bootstrap?: boolean;
  readonly commits?: readonly string[];
  readonly betaTags?: readonly FakeBetaTag[];
  readonly mergeBasesByRange?: ReadonlyMap<string, string>;
  readonly commitsByRange?: ReadonlyMap<string, readonly string[]>;
};

type FakeBetaTag = {
  readonly tagName: string;
  readonly commit: string;
};

type DeferredValue<valueType> = {
  readonly promise: Promise<valueType>;
  readonly resolve: (value: valueType | PromiseLike<valueType>) => void;
};

type CreateDependenciesOptions = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly failureMessages: string[];
  readonly githubClient: GitHubClient;
  readonly informationMessages: string[];
  readonly informationWriteAttempts: string[];
  readonly informationWriteFailure?: string;
  readonly summaries: string[];
  readonly summaryWriteFailure?: string;
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

function createDeferredValue<valueType>(): DeferredValue<valueType> {
  const {promise, resolve} = Promise.withResolvers<valueType>();
  return {
    promise,
    resolve,
  };
}

function createPullRequest(number: number): PullRequestRecord {
  return {
    number,
    title: 'Add release appearance test coverage',
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
        const pullRequestHandler = fakeGitHubClientOptions.listPullRequestsForCommit;
        if (pullRequestHandler !== undefined) {
          return pullRequestHandler(options);
        }
        const failureMessage = Maybe.of(fakeGitHubClientOptions.pullRequestFailuresByCommit?.get(options.commitSha));
        if (failureMessage.isJust) {
          return createFailure(failureMessage.value);
        }
        return createSuccess(
          Maybe.of(fakeGitHubClientOptions.pullRequestsByCommit?.get(options.commitSha)).unwrapOr([]),
        );
      },
      async listIssueComments(options): Promise<Result<readonly IssueCommentRecord[], Error>> {
        state.commentPullRequests.push(options.pullRequestNumber);
        const commentHandler = fakeGitHubClientOptions.listIssueComments;
        if (commentHandler !== undefined) {
          return commentHandler(options);
        }
        const failureMessage = Maybe.of(
          fakeGitHubClientOptions.commentListFailuresByPullRequest?.get(options.pullRequestNumber),
        );
        if (failureMessage.isJust) {
          return createFailure(failureMessage.value);
        }
        return createSuccess(
          Maybe.of(fakeGitHubClientOptions.commentsByPullRequest?.get(options.pullRequestNumber)).unwrapOr([]),
        );
      },
      async createIssueComment(options): Promise<Result<IssueCommentRecord, Error>> {
        const failureMessage = Maybe.of(
          fakeGitHubClientOptions.createFailuresByPullRequest?.get(options.pullRequestNumber),
        );
        if (failureMessage.isJust) {
          return createFailure(failureMessage.value);
        }
        state.createdComments.push(options);
        return createSuccess(
          issueCommentRecordFactory.build({id: options.pullRequestNumber, body: options.commentBody}),
        );
      },
      async updateIssueComment(options): Promise<Result<IssueCommentRecord, Error>> {
        const failureMessage = Maybe.of(fakeGitHubClientOptions.updateFailuresByCommentId?.get(options.commentId));
        if (failureMessage.isJust) {
          return createFailure(failureMessage.value);
        }
        state.updatedComments.push(options);
        return createSuccess(issueCommentRecordFactory.build({id: options.commentId, body: options.commentBody}));
      },
    },
  };
}

function createFakeGitCommand(fakeGitCommandOptions: FakeGitCommandOptions = {}): ExecuteGitCommand {
  const bootstrap = fakeGitCommandOptions.bootstrap === true;
  const commits = Maybe.of(fakeGitCommandOptions.commits).unwrapOr([betaCommit]);
  const betaTags = Maybe.of(fakeGitCommandOptions.betaTags).unwrapOr([{tagName: betaTag, commit: releaseCommit}]);

  return async function executeFakeGitCommand(commandArguments: readonly string[]): Promise<string> {
    const command = commandArguments.join(' ');
    if (command === 'tag --list -- *-production') {
      return bootstrap ? '' : `${previousProductionTag}\n`;
    }
    if (command === 'tag --list -- *-beta.*') {
      return `${betaTags.map(betaTagDefinition => betaTagDefinition.tagName).join('\n')}\n`;
    }
    if (command.startsWith('cat-file -t refs/tags/')) {
      return 'tag\n';
    }
    if (command.startsWith('for-each-ref --format=%(taggerdate:unix)')) {
      const isBetaTagCommand = betaTags.some(betaTagDefinition => {
        return command.includes(betaTagDefinition.tagName);
      });
      return isBetaTagCommand || command.includes(productionTag) ? '200\n' : '100\n';
    }
    if (command.includes(`refs/tags/${previousProductionTag}^{commit}`)) {
      return `${previousProductionCommit}\n`;
    }
    const betaTagDefinition = betaTags.find(betaTagDefinition => {
      return command.includes(`refs/tags/${betaTagDefinition.tagName}^{commit}`);
    });
    if (betaTagDefinition !== undefined) {
      return `${betaTagDefinition.commit}\n`;
    }
    if (command.includes(`refs/tags/${productionTag}^{commit}`)) {
      return `${releaseCommit}\n`;
    }
    if (command.startsWith('merge-base ')) {
      const range = command.slice('merge-base '.length).replaceAll('refs/tags/', '').replaceAll('^{}', '');
      const mergeBase = fakeGitCommandOptions.mergeBasesByRange?.get(range);
      return `${mergeBase ?? previousProductionCommit}\n`;
    }
    if (command.startsWith('rev-list --reverse ')) {
      const range = command.slice('rev-list --reverse '.length);
      const rangeCommits = fakeGitCommandOptions.commitsByRange?.get(range) ?? commits;
      return `${rangeCommits.join('\n')}\n`;
    }

    throw new Error(`Unexpected fake Git command: ${command}`);
  };
}

function createDependencies(
  createDependenciesOptions: CreateDependenciesOptions,
): ReleaseAppearanceCommandDependencies {
  const {
    executeGitCommand,
    failureMessages,
    githubClient,
    informationMessages,
    informationWriteAttempts,
    informationWriteFailure,
    summaries,
    summaryWriteFailure,
  } = createDependenciesOptions;

  return {
    executeGitCommand,
    githubClient,
    now(): number {
      return 0;
    },
    progressReporter: createNoOpReleaseAppearanceProgressReporter(),
    async writeFailure(message): Promise<void> {
      failureMessages.push(message);
    },
    async writeInformation(message): Promise<void> {
      informationWriteAttempts.push(message);
      const failureMessage = Maybe.of(informationWriteFailure);
      if (failureMessage.isJust) {
        throw new Error(failureMessage.value);
      }
      informationMessages.push(message);
    },
    async writeSummary(summary): Promise<void> {
      const failureMessage = Maybe.of(summaryWriteFailure);
      if (failureMessage.isJust) {
        throw new Error(failureMessage.value);
      }
      summaries.push(summary);
    },
  };
}

async function runCommand(runCommandOptions: RunCommandOptions): Promise<{
  readonly result: Awaited<ReturnType<typeof executeReleaseAppearanceCommand>>;
  readonly failureMessages: readonly string[];
  readonly informationMessages: readonly string[];
  readonly informationWriteAttempts: readonly string[];
  readonly summaries: readonly string[];
}> {
  const failureMessages: string[] = [];
  const informationMessages: string[] = [];
  const informationWriteAttempts: string[] = [];
  const summaries: string[] = [];
  const options: ExecuteReleaseAppearanceCommandOptions = {
    commandLineArguments: runCommandOptions.commandLineArguments,
    environment: commandEnvironment,
    dependencies: createDependencies({
      executeGitCommand: runCommandOptions.executeGitCommand,
      failureMessages,
      githubClient: runCommandOptions.githubClient,
      informationMessages,
      informationWriteAttempts,
      informationWriteFailure: runCommandOptions.informationWriteFailure,
      summaries,
      summaryWriteFailure: runCommandOptions.summaryWriteFailure,
    }),
  };
  const result = await executeReleaseAppearanceCommand(options);
  return {result, failureMessages, informationMessages, informationWriteAttempts, summaries};
}

describe('parseCommandLineArguments', () => {
  it('normal Beta parsing defaults to write mode', () => {
    const actualResult = parseCommandLineArguments(['beta', betaTag, releaseCommit]);

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual({
      stage: 'beta',
      releaseTag: betaTag,
      releaseCommit,
      executionMode: 'write',
    });
  });

  it('normal Production parsing defaults to write mode', () => {
    const actualResult = parseCommandLineArguments(['production', productionTag, releaseCommit, betaTag]);

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual({
      stage: 'production',
      releaseTag: productionTag,
      releaseCommit,
      promotedBetaTag: betaTag,
      executionMode: 'write',
    });
  });

  it('accepts final --dry-run for Beta', () => {
    const actualResult = parseCommandLineArguments(['beta', betaTag, releaseCommit, '--dry-run']);

    assert(actualResult.isOk);
    expect(actualResult.value.executionMode).toBe('dry-run');
  });

  it('accepts final --dry-run for Production', () => {
    const actualResult = parseCommandLineArguments(['production', productionTag, releaseCommit, betaTag, '--dry-run']);

    assert(actualResult.isOk);
    expect(actualResult.value.executionMode).toBe('dry-run');
  });

  it('rejects repeated --dry-run', () => {
    const actualResult = parseCommandLineArguments(['beta', betaTag, releaseCommit, '--dry-run', '--dry-run']);

    expect(actualResult.isErr).toBe(true);
  });

  it('rejects unknown options and additional arguments', () => {
    const unknownOptionResult = parseCommandLineArguments(['beta', betaTag, releaseCommit, '--write']);
    const additionalArgumentResult = parseCommandLineArguments(['beta', betaTag, releaseCommit, '--dry-run', 'extra']);

    expect(unknownOptionResult.isErr).toBe(true);
    expect(additionalArgumentResult.isErr).toBe(true);
  });

  it('rejects misplaced --dry-run', () => {
    const actualResult = parseCommandLineArguments(['production', productionTag, '--dry-run', releaseCommit, betaTag]);

    expect(actualResult.isErr).toBe(true);
  });

  it('requires full release commit SHAs', () => {
    const abbreviatedCommitResult = parseCommandLineArguments(['beta', betaTag, 'abcdef0']);
    const longCommitResult = parseCommandLineArguments(['beta', betaTag, 'a'.repeat(64)]);

    expect(abbreviatedCommitResult.isErr).toBe(true);
    expect(longCommitResult.isErr).toBe(true);
  });
});

describe('readCommandEnvironment', () => {
  it('parses and validates required command environment', () => {
    const validEnvironmentResult = readCommandEnvironment(commandEnvironment);
    const invalidRepositoryResult = readCommandEnvironment({
      ...commandEnvironment,
      GITHUB_REPOSITORY: 'wire-webapp',
    });

    assert(validEnvironmentResult.isOk);
    expect(validEnvironmentResult.value.githubApiUrl.toString()).toBe('https://api.github.com/');
    assert(invalidRepositoryResult.isErr);
    expect(invalidRepositoryResult.error.message).toMatch(/OWNER\/REPOSITORY/);
  });
});

describe('prepareCommentOperation', () => {
  it('prepares an update while preserving cross-release first appearances', () => {
    const existingComment = renderPersistentComment({
      beta: Maybe.just('2026-08-01.1-beta.1'),
      production: Maybe.just('2026-08-08.1-production'),
    });

    const actualResult = prepareCommentOperation([{id: 7, body: existingComment}], {
      beta: Maybe.just('2026-08-15.1-beta.1'),
      production: Maybe.just('2026-08-15.1-production'),
    });

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual({kind: 'unchanged'});
  });
});

describe('executeReleaseAppearanceCommand', () => {
  it('discovers 253 commits with bounded concurrent lookups', async () => {
    const commitShas = Array.from({length: 253}, (_, commitIndex) => {
      return `commit-${commitIndex}`;
    });
    const deferredLookups = new Map<string, DeferredValue<Result<readonly PullRequestRecord[], Error>>>();
    const resolvedCommitShas = new Set<string>();
    let activeLookups = 0;
    let maximumActiveLookups = 0;
    const fakeGitHubClient = createFakeGitHubClient({
      listPullRequestsForCommit: async options => {
        activeLookups += 1;
        maximumActiveLookups = Math.max(maximumActiveLookups, activeLookups);
        const deferredLookup = createDeferredValue<Result<readonly PullRequestRecord[], Error>>();
        deferredLookups.set(options.commitSha, deferredLookup);
        try {
          return await deferredLookup.promise;
        } finally {
          activeLookups -= 1;
        }
      },
    });
    const commandPromise = runCommand({
      commandLineArguments: ['beta', betaTag, releaseCommit],
      executeGitCommand: createFakeGitCommand({commits: commitShas}),
      githubClient: fakeGitHubClient.githubClient,
    });

    const resolveAvailableLookups = (): void => {
      for (const [commitSha, deferredLookup] of deferredLookups) {
        if (resolvedCommitShas.has(commitSha)) {
          continue;
        }
        resolvedCommitShas.add(commitSha);
        deferredLookup.resolve(createSuccess([]));
      }
    };
    resolveAvailableLookups();
    while (resolvedCommitShas.size < commitShas.length) {
      await Promise.resolve();
      resolveAvailableLookups();
    }

    const commandRun = await commandPromise;
    expect(commandRun.result.exitCode).toBe(0);
    expect(maximumActiveLookups).toBeGreaterThan(1);
    expect(maximumActiveLookups).toBeLessThanOrEqual(8);
    expect(fakeGitHubClient.state.pullRequestCommits).toHaveLength(commitShas.length);
    expect(commandRun.result.summary).toContain(`- Unique commit count: ${commitShas.length}`);
  });

  it('preserves deterministic discovery results when lookups complete out of order', async () => {
    const commitShas = Array.from({length: 12}, (_, commitIndex) => {
      return `ordered-commit-${commitIndex}`;
    });
    const pullRequestByCommit = new Map(
      commitShas.map((commitSha, commitIndex) => {
        return [commitSha, createPullRequest(commitIndex + 1)] as const;
      }),
    );
    const deferredLookups = new Map<string, DeferredValue<Result<readonly PullRequestRecord[], Error>>>();
    const resolvedCommitShas = new Set<string>();
    const fakeGitHubClient = createFakeGitHubClient({
      listPullRequestsForCommit: async options => {
        const deferredLookup = createDeferredValue<Result<readonly PullRequestRecord[], Error>>();
        deferredLookups.set(options.commitSha, deferredLookup);
        const result = await deferredLookup.promise;
        return result;
      },
      listIssueComments: async () => {
        return createSuccess([]);
      },
    });
    const commandPromise = runCommand({
      commandLineArguments: ['beta', betaTag, releaseCommit, '--dry-run'],
      executeGitCommand: createFakeGitCommand({commits: commitShas}),
      githubClient: fakeGitHubClient.githubClient,
    });

    const resolveAvailableLookupsInReverse = (): void => {
      const pendingLookups = [...deferredLookups.entries()].toReversed();
      for (const [commitSha, deferredLookup] of pendingLookups) {
        if (resolvedCommitShas.has(commitSha)) {
          continue;
        }
        resolvedCommitShas.add(commitSha);
        const pullRequest = Maybe.of(pullRequestByCommit.get(commitSha));
        assert(pullRequest.isJust);
        deferredLookup.resolve(createSuccess([pullRequest.value]));
      }
    };
    while (resolvedCommitShas.size < commitShas.length) {
      await Promise.resolve();
      resolveAvailableLookupsInReverse();
    }

    const commandRun = await commandPromise;
    expect(commandRun.result.exitCode).toBe(0);
    expect(commandRun.result.summary).toContain(`- Commits inspected: 12 (${commitShas.join(', ')})`);
    expect(commandRun.result.summary).toContain(
      '- Pull requests discovered: 12 (#1, #2, #3, #4, #5, #6, #7, #8, #9, #10, #11, #12)',
    );
  });

  it('processes pull-request comments with bounded concurrent operations', async () => {
    const pullRequests = Array.from({length: 80}, (_, pullRequestIndex) => {
      return createPullRequest(pullRequestIndex + 1);
    });
    const deferredReads = new Map<number, DeferredValue<Result<readonly IssueCommentRecord[], Error>>>();
    const resolvedPullRequestNumbers = new Set<number>();
    let activeReads = 0;
    let maximumActiveReads = 0;
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByCommit: new Map([[betaCommit, pullRequests]]),
      listIssueComments: async options => {
        activeReads += 1;
        maximumActiveReads = Math.max(maximumActiveReads, activeReads);
        const deferredRead = createDeferredValue<Result<readonly IssueCommentRecord[], Error>>();
        deferredReads.set(options.pullRequestNumber, deferredRead);
        try {
          return await deferredRead.promise;
        } finally {
          activeReads -= 1;
        }
      },
    });
    const commandPromise = runCommand({
      commandLineArguments: ['beta', betaTag, releaseCommit, '--dry-run'],
      executeGitCommand: createFakeGitCommand(),
      githubClient: fakeGitHubClient.githubClient,
    });

    const resolveAvailableReads = (): void => {
      for (const [pullRequestNumber, deferredRead] of deferredReads) {
        if (resolvedPullRequestNumbers.has(pullRequestNumber)) {
          continue;
        }
        resolvedPullRequestNumbers.add(pullRequestNumber);
        deferredRead.resolve(createSuccess([]));
      }
    };
    while (resolvedPullRequestNumbers.size < pullRequests.length) {
      await Promise.resolve();
      resolveAvailableReads();
    }

    const commandRun = await commandPromise;
    expect(commandRun.result.exitCode).toBe(0);
    expect(maximumActiveReads).toBeGreaterThan(1);
    expect(maximumActiveReads).toBeLessThanOrEqual(4);
    expect(commandRun.result.summary.indexOf('- #1: would create')).toBeLessThan(
      commandRun.result.summary.indexOf('- #80: would create'),
    );
  });

  it('discovers pull requests and creates Beta appearance comments', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByCommit: new Map([[betaCommit, [createPullRequest(8)]]]),
    });

    const commandRun = await runCommand({
      commandLineArguments: ['beta', betaTag, releaseCommit],
      executeGitCommand: createFakeGitCommand(),
      githubClient: fakeGitHubClient.githubClient,
    });

    expect(commandRun.result.exitCode).toBe(0);
    expect(fakeGitHubClient.state.pullRequestCommits).toEqual([betaCommit]);
    expect(fakeGitHubClient.state.createdComments).toHaveLength(1);
    const createdComment = Maybe.of(fakeGitHubClient.state.createdComments[0]);
    const summary = Maybe.of(commandRun.summaries[0]);
    assert(createdComment.isJust);
    assert(summary.isJust);
    expect(createdComment.value.commentBody).toMatch(/2026-01-02\.1-beta\.1/);
    expect(summary.value).toMatch(/Pull requests discovered: 1 \(#8\)/);
    expect(commandRun.informationMessages).toEqual([]);
    expect(commandRun.result.summary).toBe(
      [
        '### Release appearance',
        '',
        '- Stage: beta',
        `- Workflow/tooling commit: \`${commandEnvironment.WORKFLOW_TOOLING_COMMIT_SHA}\``,
        `- Release tag: \`${betaTag}\``,
        `- Release commit: \`${releaseCommit}\``,
        '- Bootstrap: no',
        `- Preceding Production tag: ${previousProductionTag}`,
        '- Release-history planning duration: 0 ms',
        '- Pull-request discovery duration: 0 ms',
        '- Comment-processing duration: 0 ms',
        '- Total command duration: 0 ms',
        '- Candidate range count: 1',
        '- Unique commit count: 1',
        '- Discovered PR count: 1',
        '- Failure count: 0',
        `- Candidate ranges: ${betaTag}: ${previousProductionTag} -> ${betaTag}`,
        `- Commits inspected: 1 (${betaCommit})`,
        '- Pull requests discovered: 1 (#8)',
        '- Comments created: 1',
        '- Comments updated: 0',
        '- Comments unchanged: 0',
        '- Failed pull requests: none',
        '- Commits without associated pull requests: none',
        '',
        '### Failures',
        '',
        'None',
      ].join('\n'),
    );
  });

  it('backfills a missing Beta 1 comment during Beta 2 with the earliest Beta tag', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByCommit: new Map([[betaCommit, [createPullRequest(10)]]]),
    });
    const fakeGitCommand = createFakeGitCommand({
      betaTags: [
        {tagName: betaTag, commit: betaCommit},
        {tagName: betaTwoTag, commit: betaCommit},
      ],
      mergeBasesByRange: new Map([
        [`${previousProductionTag} ${betaTag}`, previousProductionCommit],
        [`${betaTag} ${betaTwoTag}`, betaCommit],
      ]),
      commitsByRange: new Map([[`${previousProductionCommit}..${betaCommit}`, [betaCommit]]]),
    });

    const commandRun = await runCommand({
      commandLineArguments: ['beta', betaTwoTag, betaCommit],
      executeGitCommand: fakeGitCommand,
      githubClient: fakeGitHubClient.githubClient,
    });

    expect(commandRun.result.exitCode).toBe(0);
    expect(fakeGitHubClient.state.pullRequestCommits).toEqual([betaCommit]);
    expect(fakeGitHubClient.state.createdComments).toHaveLength(1);
    const createdComment = Maybe.of(fakeGitHubClient.state.createdComments[0]);
    assert(createdComment.isJust);
    expect(createdComment.value.commentBody).toContain(betaTag);
    expect(createdComment.value.commentBody).not.toContain(betaTwoTag);
    expect(commandRun.result.summary).toContain(
      `- Candidate ranges: ${betaTag}: ${previousProductionTag} -> ${betaTag}; ${betaTwoTag}: ${betaTag} -> ${betaTwoTag}`,
    );
  });

  it('records Beta 2 for a pull request introduced only in Beta 2', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByCommit: new Map([[betaTwoCommit, [createPullRequest(12)]]]),
    });
    const fakeGitCommand = createFakeGitCommand({
      betaTags: [
        {tagName: betaTag, commit: betaCommit},
        {tagName: betaTwoTag, commit: betaTwoCommit},
      ],
      mergeBasesByRange: new Map([
        [`${previousProductionTag} ${betaTag}`, previousProductionCommit],
        [`${betaTag} ${betaTwoTag}`, betaCommit],
      ]),
      commitsByRange: new Map([
        [`${previousProductionCommit}..${betaCommit}`, [betaCommit]],
        [`${betaCommit}..${betaTwoCommit}`, [betaTwoCommit]],
      ]),
    });

    const commandRun = await runCommand({
      commandLineArguments: ['beta', betaTwoTag, betaTwoCommit],
      executeGitCommand: fakeGitCommand,
      githubClient: fakeGitHubClient.githubClient,
    });

    expect(commandRun.result.exitCode).toBe(0);
    expect(fakeGitHubClient.state.createdComments).toHaveLength(1);
    const createdComment = Maybe.of(fakeGitHubClient.state.createdComments[0]);
    assert(createdComment.isJust);
    expect(createdComment.value.commentBody).toContain(betaTwoTag);
  });

  it('deduplicates a pull request discovered in multiple cumulative Beta ranges', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByCommit: new Map([
        [betaCommit, [createPullRequest(13)]],
        [betaTwoCommit, [createPullRequest(13)]],
      ]),
    });
    const fakeGitCommand = createFakeGitCommand({
      betaTags: [
        {tagName: betaTag, commit: betaCommit},
        {tagName: betaTwoTag, commit: betaTwoCommit},
      ],
      mergeBasesByRange: new Map([
        [`${previousProductionTag} ${betaTag}`, previousProductionCommit],
        [`${betaTag} ${betaTwoTag}`, betaCommit],
      ]),
      commitsByRange: new Map([
        [`${previousProductionCommit}..${betaCommit}`, [betaCommit]],
        [`${betaCommit}..${betaTwoCommit}`, [betaCommit, betaTwoCommit]],
      ]),
    });

    const commandRun = await runCommand({
      commandLineArguments: ['beta', betaTwoTag, betaTwoCommit],
      executeGitCommand: fakeGitCommand,
      githubClient: fakeGitHubClient.githubClient,
    });

    expect(commandRun.result.exitCode).toBe(0);
    expect(fakeGitHubClient.state.pullRequestCommits).toEqual([betaCommit, betaTwoCommit]);
    expect(fakeGitHubClient.state.commentPullRequests).toEqual([13]);
    expect(fakeGitHubClient.state.createdComments).toHaveLength(1);
    const createdComment = Maybe.of(fakeGitHubClient.state.createdComments[0]);
    assert(createdComment.isJust);
    expect(createdComment.value.commentBody).toContain(betaTag);
  });

  it('updates release appearance comments in write mode', async () => {
    const existingBetaComment = renderPersistentComment({
      beta: Maybe.just(betaTag),
      production: Maybe.nothing<string>(),
    });
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByCommit: new Map([[betaCommit, [createPullRequest(9)]]]),
      commentsByPullRequest: new Map([[9, [issueCommentRecordFactory.build({id: 19, body: existingBetaComment})]]]),
    });

    const commandRun = await runCommand({
      commandLineArguments: ['production', productionTag, releaseCommit, betaTag],
      executeGitCommand: createFakeGitCommand(),
      githubClient: fakeGitHubClient.githubClient,
    });

    expect(commandRun.result.exitCode).toBe(0);
    expect(fakeGitHubClient.state.createdComments).toEqual([]);
    expect(fakeGitHubClient.state.updatedComments).toHaveLength(1);
  });

  it('plans create, update, and unchanged comments without mutations in dry-run mode', async () => {
    const existingBetaComment = renderPersistentComment({
      beta: Maybe.just(betaTag),
      production: Maybe.nothing<string>(),
    });
    const existingProductionComment = renderPersistentComment({
      beta: Maybe.just(betaTag),
      production: Maybe.just(productionTag),
    });
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByCommit: new Map([[betaCommit, [createPullRequest(1), createPullRequest(2), createPullRequest(3)]]]),
      commentsByPullRequest: new Map([
        [2, [issueCommentRecordFactory.build({id: 12, body: existingBetaComment})]],
        [3, [issueCommentRecordFactory.build({id: 13, body: existingProductionComment})]],
      ]),
    });

    const commandRun = await runCommand({
      commandLineArguments: ['production', productionTag, releaseCommit, betaTag, '--dry-run'],
      executeGitCommand: createFakeGitCommand(),
      githubClient: fakeGitHubClient.githubClient,
    });

    expect(commandRun.result.exitCode).toBe(0);
    expect(fakeGitHubClient.state.commentPullRequests).toEqual([1, 2, 3]);
    expect(fakeGitHubClient.state.createdComments).toEqual([]);
    expect(fakeGitHubClient.state.updatedComments).toEqual([]);
    expect(commandRun.result.summary).toContain('- Mode: dry run');
    expect(commandRun.result.summary).toContain('- Comments that would be created: 1');
    expect(commandRun.result.summary).toContain('- Comments that would be updated: 1');
    expect(commandRun.result.summary).toContain('- Unchanged comments: 1');
    expect(commandRun.result.summary).toContain('- #1: would create');
    expect(commandRun.result.summary).toContain('- #2: would update');
    expect(commandRun.result.summary).toContain('- #3: unchanged');
    expect(commandRun.result.summary).toContain('No GitHub comments were created or updated.');
    expect(commandRun.informationMessages).toEqual([
      [
        'Release appearance dry run',
        'Stage: production',
        `Release tag: ${productionTag}`,
        `Release commit: ${releaseCommit}`,
        `Preceding Production tag: ${previousProductionTag}`,
        'Commits inspected: 1',
        'Pull requests discovered: 3',
        'Would create: 1',
        'Would update: 1',
        'Unchanged: 1',
        'Failed pull requests: 0',
        'No GitHub comments were created or updated.',
      ].join('\n'),
    ]);
    expect(commandRun.informationMessages.join('\n')).not.toContain(existingBetaComment);
    expect(commandRun.informationMessages.join('\n')).not.toContain(existingProductionComment);
    expect(commandRun.result.summary).toBe(
      [
        '### Release appearance',
        '',
        '- Mode: dry run',
        '- Stage: production',
        `- Workflow/tooling commit: \`${commandEnvironment.WORKFLOW_TOOLING_COMMIT_SHA}\``,
        `- Release tag: \`${productionTag}\``,
        `- Release commit: \`${releaseCommit}\``,
        '- Bootstrap: no',
        `- Preceding Production tag: ${previousProductionTag}`,
        '- Release-history planning duration: 0 ms',
        '- Pull-request discovery duration: 0 ms',
        '- Comment-processing duration: 0 ms',
        '- Total command duration: 0 ms',
        '- Candidate range count: 1',
        '- Unique commit count: 1',
        '- Discovered PR count: 3',
        '- Failure count: 0',
        `- Candidate ranges: ${betaTag}: ${previousProductionTag} -> ${betaTag}`,
        `- Commits inspected: 1 (${betaCommit})`,
        '- Pull requests discovered: 3 (#1, #2, #3)',
        '- Comments that would be created: 1',
        '- Comments that would be updated: 1',
        '- Unchanged comments: 1',
        '- Failed pull requests: none',
        '- Commits without associated pull requests: none',
        '',
        '### Planned comment operations',
        '',
        '- #1: would create',
        '- #2: would update',
        '- #3: unchanged',
        '',
        'No GitHub comments were created or updated.',
        '',
        '### Failures',
        '',
        'None',
      ].join('\n'),
    );
  });

  it('uses paginated GitHub comment reads without mutations in dry-run mode', async () => {
    const githubRequests: HttpRequest[] = [];
    const firstCommentPage = Array.from({length: 100}, (_, commentIndex) => {
      return {id: commentIndex + 1, body: `Unrelated comment ${commentIndex + 1}`};
    });
    const githubClient = createGitHubClient({
      githubApiUrl: new URL('https://api.github.example/'),
      githubRepository: 'wireapp/wire-webapp',
      githubToken: 'github-token',
      httpClient: {
        requestJson: async function requestJson(request): Promise<unknown> {
          githubRequests.push(request);
          if (request.url.pathname.endsWith('/pulls')) {
            return [
              {
                number: 7,
                title: 'Add release appearance test coverage',
                merged_at: '2026-01-02T00:00:00Z',
                base: {ref: 'main'},
              },
            ];
          }
          if (request.method !== 'get') {
            throw new Error('Dry run attempted a mutation request');
          }
          return request.url.searchParams.get('page') === '1' ? firstCommentPage : [];
        },
      },
    });

    const commandRun = await runCommand({
      commandLineArguments: ['beta', betaTag, releaseCommit, '--dry-run'],
      executeGitCommand: createFakeGitCommand(),
      githubClient,
    });

    expect(commandRun.result.exitCode).toBe(0);
    expect(
      githubRequests
        .filter(request => {
          return request.url.pathname.endsWith('/issues/7/comments');
        })
        .map(request => {
          return request.url.searchParams.get('page');
        }),
    ).toEqual(['1', '2']);
    expect(
      githubRequests.every(request => {
        return request.method === 'get';
      }),
    ).toBe(true);
  });

  it('continues dry-run planning after malformed markers, duplicate markers, and read failures', async () => {
    const malformedMarker = '<!-- wire-webapp-release-appearance:v1\n{"beta":}\n-->';
    const markerComment = renderPersistentComment({
      beta: Maybe.just(betaTag),
      production: Maybe.nothing<string>(),
    });
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByCommit: new Map([
        [betaCommit, [createPullRequest(1), createPullRequest(2), createPullRequest(3), createPullRequest(4)]],
      ]),
      commentsByPullRequest: new Map([
        [1, [issueCommentRecordFactory.build({body: malformedMarker})]],
        [
          2,
          [
            issueCommentRecordFactory.build({id: 21, body: markerComment}),
            issueCommentRecordFactory.build({id: 22, body: markerComment}),
          ],
        ],
      ]),
      commentListFailuresByPullRequest: new Map([[3, `Unable to read ${commandEnvironment.GITHUB_TOKEN}`]]),
    });

    const commandRun = await runCommand({
      commandLineArguments: ['beta', betaTag, releaseCommit, '--dry-run'],
      executeGitCommand: createFakeGitCommand(),
      githubClient: fakeGitHubClient.githubClient,
    });

    expect(commandRun.result.exitCode).toBe(1);
    expect(fakeGitHubClient.state.commentPullRequests).toEqual([1, 2, 3, 4]);
    expect(fakeGitHubClient.state.createdComments).toEqual([]);
    expect(fakeGitHubClient.state.updatedComments).toEqual([]);
    expect(commandRun.result.summary).toContain('Malformed release-appearance marker state');
    expect(commandRun.result.summary).toContain('More than one release-appearance marker comment exists');
    expect(commandRun.result.summary).toContain('[REDACTED]');
    expect(commandRun.result.summary).not.toContain(commandEnvironment.GITHUB_TOKEN);
    expect(commandRun.result.summary).toContain('- #4: would create');
    const informationOutput = commandRun.informationMessages.join('\n');
    expect(informationOutput).toContain('Failed pull requests: 3');
    expect(informationOutput).toContain('Failures:');
    expect(informationOutput).toContain('- Pull request #1: Malformed release-appearance marker state');
    expect(informationOutput).toContain('- Pull request #2: More than one release-appearance marker comment exists');
    expect(informationOutput).toContain('- Pull request #3: Unable to read [REDACTED]');
    expect(informationOutput).not.toContain(commandEnvironment.GITHUB_TOKEN);
    expect(informationOutput).not.toContain('Pull request #4');
    expect(informationOutput).not.toContain(markerComment);
  });

  it('includes release-history planning failures in the summary', async () => {
    const fakeGitHubClient = createFakeGitHubClient();

    const commandRun = await runCommand({
      commandLineArguments: ['beta', 'invalid-beta-tag', releaseCommit, '--dry-run'],
      executeGitCommand: createFakeGitCommand(),
      githubClient: fakeGitHubClient.githubClient,
    });

    expect(commandRun.result.exitCode).toBe(1);
    expect(commandRun.result.summary).toContain('- Release history: Invalid Beta candidate tag: invalid-beta-tag');
    expect(commandRun.result.summary).not.toContain('### Failures\n\nNone');
    expect(commandRun.result.summary).toContain('- Pull requests discovered: 0 (none)');
    expect(commandRun.informationMessages.join('\n')).toContain(
      '- Release history: Invalid Beta candidate tag: invalid-beta-tag',
    );
  });

  it('continues discovery after one commit failure and includes the reason in the summary', async () => {
    const failedDiscoveryCommit = 'd'.repeat(40);
    const discoveryFailureMessage = `Unable to list pull requests for commit ${failedDiscoveryCommit}`;
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByCommit: new Map([[betaCommit, [createPullRequest(2)]]]),
      pullRequestFailuresByCommit: new Map([[failedDiscoveryCommit, discoveryFailureMessage]]),
    });

    const commandRun = await runCommand({
      commandLineArguments: ['beta', betaTag, releaseCommit, '--dry-run'],
      executeGitCommand: createFakeGitCommand({commits: [failedDiscoveryCommit, betaCommit]}),
      githubClient: fakeGitHubClient.githubClient,
    });

    expect(commandRun.result.exitCode).toBe(1);
    expect(fakeGitHubClient.state.pullRequestCommits).toEqual([failedDiscoveryCommit, betaCommit]);
    expect(fakeGitHubClient.state.createdComments).toEqual([]);
    expect(commandRun.result.summary).toContain('- #2: would create');
    expect(commandRun.result.summary).toContain(`- Discovery: ${discoveryFailureMessage}`);
  });

  it('continues after a comment-listing failure and includes the pull request reason', async () => {
    const commentListFailureMessage = 'Unable to list issue comments';
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByCommit: new Map([[betaCommit, [createPullRequest(1), createPullRequest(2)]]]),
      commentListFailuresByPullRequest: new Map([[1, commentListFailureMessage]]),
    });

    const commandRun = await runCommand({
      commandLineArguments: ['beta', betaTag, releaseCommit],
      executeGitCommand: createFakeGitCommand(),
      githubClient: fakeGitHubClient.githubClient,
    });

    expect(commandRun.result.exitCode).toBe(1);
    expect(fakeGitHubClient.state.commentPullRequests).toEqual([1, 2]);
    expect(
      fakeGitHubClient.state.createdComments.map(comment => {
        return comment.pullRequestNumber;
      }),
    ).toEqual([2]);
    expect(commandRun.result.summary).toContain(`- Pull request #1: ${commentListFailureMessage}`);
  });

  it('continues after a duplicate marker and includes the pull request reason', async () => {
    const markerComment = renderPersistentComment({
      beta: Maybe.just(betaTag),
      production: Maybe.nothing<string>(),
    });
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByCommit: new Map([[betaCommit, [createPullRequest(1), createPullRequest(2)]]]),
      commentsByPullRequest: new Map([
        [
          1,
          [
            issueCommentRecordFactory.build({id: 11, body: markerComment}),
            issueCommentRecordFactory.build({id: 12, body: markerComment}),
          ],
        ],
      ]),
    });

    const commandRun = await runCommand({
      commandLineArguments: ['beta', betaTag, releaseCommit],
      executeGitCommand: createFakeGitCommand(),
      githubClient: fakeGitHubClient.githubClient,
    });

    expect(commandRun.result.exitCode).toBe(1);
    expect(
      fakeGitHubClient.state.createdComments.map(comment => {
        return comment.pullRequestNumber;
      }),
    ).toEqual([2]);
    expect(commandRun.result.summary).toContain(
      '- Pull request #1: More than one release-appearance marker comment exists',
    );
  });

  it('continues after one comment mutation failure and includes the reason in the summary', async () => {
    const createFailureMessage = 'Unable to create release-appearance comment';
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByCommit: new Map([[betaCommit, [createPullRequest(1), createPullRequest(2)]]]),
      createFailuresByPullRequest: new Map([[1, createFailureMessage]]),
    });

    const commandRun = await runCommand({
      commandLineArguments: ['beta', betaTag, releaseCommit],
      executeGitCommand: createFakeGitCommand(),
      githubClient: fakeGitHubClient.githubClient,
    });

    expect(commandRun.result.exitCode).toBe(1);
    expect(
      fakeGitHubClient.state.createdComments.map(comment => {
        return comment.pullRequestNumber;
      }),
    ).toEqual([2]);
    expect(commandRun.result.summary).toContain(`- Pull request #1: ${createFailureMessage}`);
  });

  it('redacts the GitHub token from output and summary failures', async () => {
    const githubToken = Maybe.of(commandEnvironment.GITHUB_TOKEN);
    assert(githubToken.isJust);
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByCommit: new Map([[betaCommit, [createPullRequest(1)]]]),
      createFailuresByPullRequest: new Map([[1, `Request rejected for ${githubToken.value}`]]),
    });

    const commandRun = await runCommand({
      commandLineArguments: ['beta', betaTag, releaseCommit],
      executeGitCommand: createFakeGitCommand(),
      githubClient: fakeGitHubClient.githubClient,
    });
    const failureOutput = commandRun.failureMessages.join('\n');

    expect(commandRun.result.exitCode).toBe(1);
    expect(failureOutput).not.toContain(githubToken.value);
    expect(commandRun.result.summary).not.toContain(githubToken.value);
    expect(failureOutput).toContain('[REDACTED]');
    expect(commandRun.result.summary).toContain('[REDACTED]');
  });

  it('returns a sanitized summary-writing failure', async () => {
    const githubToken = Maybe.of(commandEnvironment.GITHUB_TOKEN);
    assert(githubToken.isJust);
    const fakeGitHubClient = createFakeGitHubClient();

    const commandRun = await runCommand({
      commandLineArguments: ['beta', betaTag, releaseCommit],
      executeGitCommand: createFakeGitCommand({bootstrap: true}),
      githubClient: fakeGitHubClient.githubClient,
      summaryWriteFailure: `Permission denied for ${githubToken.value}`,
    });

    expect(commandRun.result.exitCode).toBe(1);
    expect(commandRun.result.summary).toContain(
      '- Summary: Unable to write GitHub Actions summary: Permission denied for [REDACTED]',
    );
    expect(commandRun.result.summary).not.toContain(githubToken.value);
    expect(commandRun.failureMessages.join('\n')).not.toContain(githubToken.value);
  });

  it('performs no GitHub requests during bootstrap', async () => {
    const fakeGitHubClient = createFakeGitHubClient();

    const commandRun = await runCommand({
      commandLineArguments: ['beta', betaTag, releaseCommit, '--dry-run'],
      executeGitCommand: createFakeGitCommand({bootstrap: true}),
      githubClient: fakeGitHubClient.githubClient,
    });

    expect(commandRun.result.exitCode).toBe(0);
    expect(fakeGitHubClient.state.pullRequestCommits).toEqual([]);
    const summary = Maybe.of(commandRun.summaries[0]);
    assert(summary.isJust);
    expect(summary.value).toMatch(/Bootstrap: yes/);
    expect(summary.value).toContain('No pull request comment operations were planned.');
    expect(summary.value).toContain('No GitHub comments were created or updated.');
    expect(commandRun.result.summary).toContain('### Failures\n\nNone');
    expect(commandRun.informationMessages).toEqual([
      [
        'Release appearance dry run',
        'Stage: beta',
        `Release tag: ${betaTag}`,
        `Release commit: ${releaseCommit}`,
        'Bootstrap: yes',
        'No preceding new-format Production release exists.',
        'No commit range was inspected.',
        'No pull request comment operations were planned.',
        'No GitHub comments were created or updated.',
      ].join('\n'),
    ]);
  });

  it('does not repeat processing or summary generation when informational output fails', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByCommit: new Map([[betaCommit, [createPullRequest(8)]]]),
    });

    const commandRun = await runCommand({
      commandLineArguments: ['beta', betaTag, releaseCommit, '--dry-run'],
      executeGitCommand: createFakeGitCommand(),
      githubClient: fakeGitHubClient.githubClient,
      informationWriteFailure: `Unable to write ${commandEnvironment.GITHUB_TOKEN}`,
    });

    expect(commandRun.result.exitCode).toBe(1);
    expect(fakeGitHubClient.state.pullRequestCommits).toEqual([betaCommit]);
    expect(fakeGitHubClient.state.commentPullRequests).toEqual([8]);
    expect(commandRun.summaries).toHaveLength(1);
    expect(commandRun.informationWriteAttempts).toHaveLength(1);
    expect(commandRun.informationMessages).toEqual([]);
    expect(commandRun.failureMessages).toEqual(['Unable to write dry-run log output: Unable to write [REDACTED]']);
  });
});

describe('native release appearance command entrypoint', () => {
  it('loads dependencies and reports usage failure', async () => {
    const commandProcess = spawn(process.execPath, ['tools/release-appearance/releaseAppearanceCommand.ts'], {
      cwd: process.cwd(),
      env: process.env,
    });
    let standardError = '';
    commandProcess.stderr.on('data', (outputChunk: Buffer) => {
      standardError += outputChunk.toString();
    });
    const {
      promise: exitCodePromise,
      resolve: resolveExitCode,
      reject: rejectExitCode,
    } = Promise.withResolvers<number | null>();
    commandProcess.once('error', error => {
      rejectExitCode(error);
    });
    commandProcess.once('exit', processExitCode => {
      resolveExitCode(processExitCode);
    });
    const exitCode = await exitCodePromise;

    expect(exitCode).toBe(1);
    expect(standardError).toMatch(/Usage: beta/);
  });
});
