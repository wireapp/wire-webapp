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

import {createFactory} from '@enormora/objectory';
import type {ShapeToGeneratorReturnValue} from '@enormora/objectory';

import {renderPersistentComment} from './releaseAppearance.ts';
import {executeReleaseAppearanceCommand, main} from './releaseAppearanceCommand.ts';
import type {
  ExecuteReleaseAppearanceCommandOptions,
  GitHubRequestBehavior,
  ReleaseAppearanceCommandDependencies,
} from './releaseAppearanceCommand.ts';
import type {ExecuteGitCommand} from './releaseHistory.ts';

const releaseCommit = 'a'.repeat(40);
const previousProductionCommit = 'b'.repeat(40);
const betaOneCommit = 'c'.repeat(40);
const betaTwoCommit = 'd'.repeat(40);
const previousProductionTag = '2026-01-01.1-production';
const betaOneTag = '2026-01-02.1-beta.1';
const betaTwoTag = '2026-01-02.1-beta.2';
const productionTag = '2026-01-02.1-production';
const githubToken = 'test-token-must-not-leak';

const commandEnvironment: NodeJS.ProcessEnv = {
  GITHUB_API_URL: 'https://api.github.com',
  GITHUB_REPOSITORY: 'wireapp/wire-webapp',
  GITHUB_STEP_SUMMARY: '/tmp/release-appearance-summary.md',
  GITHUB_TOKEN: githubToken,
};

type FakeGitCommandOptions = {
  readonly stage: 'beta' | 'production';
  readonly bootstrap?: boolean;
  readonly promotedBetaTag?: string;
};

type FakeGitHubRequestOptions = {
  readonly pullRequestPages?: ReadonlyMap<string, ReadonlyMap<number, unknown>>;
  readonly issueCommentPages?: ReadonlyMap<number, ReadonlyMap<number, unknown>>;
  readonly createFailureNumbers?: ReadonlySet<number>;
  readonly updateFailureNumbers?: ReadonlySet<number>;
  readonly pullRequestFailureMessage?: string;
};

type FakeGitHubRequestState = {
  readonly pullRequestCalls: Array<{readonly commitSha: string; readonly page: number}>;
  readonly issueCommentCalls: Array<{readonly pullRequestNumber: number; readonly page: number}>;
  readonly createdComments: Array<{readonly pullRequestNumber: number; readonly commentBody: string}>;
  readonly updatedComments: Array<{readonly commentId: number; readonly commentBody: string}>;
};

type FakeGitHubRequestFixture = {
  readonly requests: GitHubRequestBehavior;
  readonly state: FakeGitHubRequestState;
};

type RunCommandOptions = {
  readonly commandLineArguments: readonly string[];
  readonly executeGitCommand?: ExecuteGitCommand;
  readonly githubRequests: GitHubRequestBehavior;
  readonly outputMessages?: string[];
  readonly summaries?: string[];
};

type CreateTestDependenciesOptions = {
  readonly githubRequests: GitHubRequestBehavior;
  readonly executeGitCommand: ExecuteGitCommand;
  readonly outputMessages?: string[];
  readonly summaries?: string[];
};

type CreatePullRequestResponseOptions = {
  readonly pullRequestNumber: number;
  readonly merged?: boolean;
  readonly targetBranch?: string;
};

type PullRequestBaseResponseFixture = {
  readonly ref: string;
};

type PullRequestResponseFixture = {
  readonly number: number;
  readonly merged_at: string | null;
  readonly base: PullRequestBaseResponseFixture;
};

type IssueCommentResponseFixture = {
  readonly id: number;
  readonly body: string;
};

type PullRequestResponseFactoryShape = ShapeToGeneratorReturnValue<PullRequestResponseFixture>;

const pullRequestBaseResponseFactory = createFactory<PullRequestBaseResponseFixture>(
  function createPullRequestBaseResponse(): PullRequestBaseResponseFixture {
    return {ref: 'main'};
  },
);

const pullRequestResponseFactory = createFactory<PullRequestResponseFixture>(
  function createPullRequestResponse(): PullRequestResponseFactoryShape {
    return {
      number: 1,
      merged_at: '2026-01-03T00:00:00Z',
      base: pullRequestBaseResponseFactory,
    };
  },
);

const issueCommentResponseFactory = createFactory<IssueCommentResponseFixture>(
  function createIssueCommentResponse(): IssueCommentResponseFixture {
    return {
      id: 1,
      body: 'comment',
    };
  },
);

type CommandRunResult = {
  readonly result: Awaited<ReturnType<typeof executeReleaseAppearanceCommand>>;
  readonly outputMessages: readonly string[];
  readonly summaries: readonly string[];
};

function createPullRequestResponse(options: CreatePullRequestResponseOptions): PullRequestResponseFixture {
  const {pullRequestNumber, merged = true, targetBranch = 'main'} = options;

  return pullRequestResponseFactory.build({
    number: pullRequestNumber,
    merged_at: merged ? '2026-01-03T00:00:00Z' : null,
    base: {ref: targetBranch},
  });
}

function createIssueCommentResponse(commentId: number, commentBody: string): IssueCommentResponseFixture {
  return issueCommentResponseFactory.build({id: commentId, body: commentBody});
}

function createPageMap(pageResponses: readonly [number, unknown][]): ReadonlyMap<number, unknown> {
  return new Map(pageResponses);
}

function createSinglePageMap(response: unknown): ReadonlyMap<number, unknown> {
  return createPageMap([[1, response]]);
}

type GetPageResponseOptions<pageKeyType> = {
  readonly pageResponses: ReadonlyMap<pageKeyType, ReadonlyMap<number, unknown>> | undefined;
  readonly key: pageKeyType;
  readonly page: number;
};

function getPageResponse<pageKeyType>(getPageResponseOptions: GetPageResponseOptions<pageKeyType>): unknown {
  const {pageResponses, key, page} = getPageResponseOptions;
  const responsesForKey = pageResponses?.get(key);
  if (responsesForKey === undefined) {
    return [];
  }

  const response = responsesForKey.get(page);
  if (response === undefined) {
    return [];
  }

  return response;
}

function createFakeGitHubRequests(fakeGitHubRequestOptions: FakeGitHubRequestOptions = {}): FakeGitHubRequestFixture {
  const state: FakeGitHubRequestState = {
    pullRequestCalls: [],
    issueCommentCalls: [],
    createdComments: [],
    updatedComments: [],
  };

  const requests: GitHubRequestBehavior = {
    async listPullRequestsForCommit(options): Promise<unknown> {
      state.pullRequestCalls.push(options);
      if (fakeGitHubRequestOptions.pullRequestFailureMessage !== undefined) {
        throw new Error(fakeGitHubRequestOptions.pullRequestFailureMessage);
      }

      return getPageResponse({
        pageResponses: fakeGitHubRequestOptions.pullRequestPages,
        key: options.commitSha,
        page: options.page,
      });
    },
    async listIssueComments(options): Promise<unknown> {
      state.issueCommentCalls.push(options);
      return getPageResponse({
        pageResponses: fakeGitHubRequestOptions.issueCommentPages,
        key: options.pullRequestNumber,
        page: options.page,
      });
    },
    async createIssueComment(options): Promise<unknown> {
      if (fakeGitHubRequestOptions.createFailureNumbers?.has(options.pullRequestNumber)) {
        throw new Error(`Create failed with token ${githubToken}`);
      }

      state.createdComments.push(options);
      return createIssueCommentResponse(state.createdComments.length, options.commentBody);
    },
    async updateIssueComment(options): Promise<unknown> {
      if (fakeGitHubRequestOptions.updateFailureNumbers?.has(options.commentId)) {
        throw new Error(`Update failed with token ${githubToken}`);
      }

      state.updatedComments.push(options);
      return createIssueCommentResponse(options.commentId, options.commentBody);
    },
  };

  return {requests, state};
}

function createFakeGitCommand(fakeGitCommandOptions: FakeGitCommandOptions): ExecuteGitCommand {
  const {stage, bootstrap = false, promotedBetaTag = betaTwoTag} = fakeGitCommandOptions;
  const currentTag = stage === 'beta' ? (promotedBetaTag === betaOneTag ? betaOneTag : betaTwoTag) : productionTag;

  return async function executeFakeGitCommand(commandArguments: readonly string[]): Promise<string> {
    const [gitOperation, firstArgument, secondArgument] = commandArguments;

    if (gitOperation === 'tag' && firstArgument === '--list') {
      if (secondArgument === '--' && commandArguments[3] === '*-production') {
        if (bootstrap) {
          return '';
        }

        return stage === 'production' ? `${previousProductionTag}\n${productionTag}\n` : `${previousProductionTag}\n`;
      }

      if (secondArgument === '--' && commandArguments[3] === '*-beta.*') {
        return promotedBetaTag === betaOneTag ? `${betaOneTag}\n` : `${betaOneTag}\n${betaTwoTag}\n`;
      }
    }

    if (gitOperation === 'cat-file') {
      return 'tag\n';
    }

    if (gitOperation === 'for-each-ref') {
      return commandArguments[2]?.includes(currentTag) ? '200\n' : '100\n';
    }

    if (gitOperation === 'rev-parse') {
      const tagReference = commandArguments[2] ?? '';
      if (tagReference.includes(previousProductionTag)) {
        return `${previousProductionCommit}\n`;
      }

      if (tagReference.includes(betaOneTag)) {
        return stage === 'production' && promotedBetaTag === betaOneTag ? `${releaseCommit}\n` : `${betaOneCommit}\n`;
      }

      if (tagReference.includes(betaTwoTag)) {
        return stage === 'production' && promotedBetaTag === betaTwoTag ? `${releaseCommit}\n` : `${betaTwoCommit}\n`;
      }

      return `${releaseCommit}\n`;
    }

    if (gitOperation === 'merge-base') {
      const startTagReference = commandArguments[1] ?? '';

      return startTagReference.includes(betaOneTag) ? `${betaOneCommit}\n` : `${previousProductionCommit}\n`;
    }

    if (gitOperation === 'rev-list') {
      const commitRange = commandArguments[2] ?? '';
      if (commitRange.includes(`${betaOneCommit}..${betaTwoCommit}`)) {
        return `${betaTwoCommit}\n`;
      }

      if (commitRange.includes(`${previousProductionCommit}..${betaOneCommit}`)) {
        return `${betaOneCommit}\n`;
      }

      if (commitRange.includes(`${previousProductionCommit}..${releaseCommit}`)) {
        return `${betaOneCommit}\n`;
      }

      if (commitRange.includes(`${betaOneCommit}..${releaseCommit}`)) {
        return `${betaTwoCommit}\n`;
      }

      return `${betaOneCommit}\n`;
    }

    throw new Error(`Unexpected fake Git command: ${commandArguments.join(' ')}`);
  };
}

function createTestDependencies(
  createTestDependenciesOptions: CreateTestDependenciesOptions,
): ReleaseAppearanceCommandDependencies {
  const {githubRequests, executeGitCommand, outputMessages = [], summaries = []} = createTestDependenciesOptions;

  return {
    executeGitCommand,
    githubRequests,
    async writeSummary(summary): Promise<void> {
      summaries.push(summary);
    },
    async writeOutput(message): Promise<void> {
      outputMessages.push(message);
    },
  };
}

async function runCommand(runCommandOptions: RunCommandOptions): Promise<CommandRunResult> {
  const outputMessages = runCommandOptions.outputMessages ?? [];
  const summaries = runCommandOptions.summaries ?? [];
  const dependencies = createTestDependencies({
    githubRequests: runCommandOptions.githubRequests,
    executeGitCommand: runCommandOptions.executeGitCommand ?? createFakeGitCommand({stage: 'beta'}),
    outputMessages,
    summaries,
  });
  const options: ExecuteReleaseAppearanceCommandOptions = {
    commandLineArguments: runCommandOptions.commandLineArguments,
    environment: commandEnvironment,
    dependencies,
  };
  const result = await executeReleaseAppearanceCommand(options);

  return {result, outputMessages, summaries};
}

function createBetaCommandArguments(): readonly string[] {
  return ['beta', betaOneTag, releaseCommit];
}

function createProductionCommandArguments(promotedBetaTag: string = betaTwoTag): readonly string[] {
  return ['production', productionTag, releaseCommit, promotedBetaTag];
}

describe('release appearance command', (): void => {
  it('supports paginated pull requests associated with a commit', async (): Promise<void> => {
    const firstPagePullRequests = pullRequestResponseFactory.withOverrides({number: 5}).buildList({length: 100});
    const fakeGitHubRequests = createFakeGitHubRequests({
      pullRequestPages: new Map([
        [
          betaOneCommit,
          createPageMap([
            [1, firstPagePullRequests],
            [2, [createPullRequestResponse({pullRequestNumber: 5})]],
          ]),
        ],
      ]),
    });
    const commandResult = await runCommand({
      commandLineArguments: createBetaCommandArguments(),
      githubRequests: fakeGitHubRequests.requests,
    });

    expect(commandResult.result.exitCode).toBe(0);
    expect(fakeGitHubRequests.state.pullRequestCalls).toStrictEqual([
      {commitSha: betaOneCommit, page: 1},
      {commitSha: betaOneCommit, page: 2},
    ]);
    expect(
      fakeGitHubRequests.state.createdComments.map(comment => {
        return comment.pullRequestNumber;
      }),
    ).toStrictEqual([5]);
  });

  it('supports paginated issue comments', async (): Promise<void> => {
    const unrelatedComments = Array.from({length: 100}, (_, commentIndex) => {
      return createIssueCommentResponse(commentIndex + 1, `unrelated comment ${commentIndex}`);
    });
    const existingBetaComment = renderPersistentComment({beta: betaOneTag});
    const fakeGitHubRequests = createFakeGitHubRequests({
      pullRequestPages: new Map([
        [betaOneCommit, createSinglePageMap([createPullRequestResponse({pullRequestNumber: 7})])],
      ]),
      issueCommentPages: new Map([
        [
          7,
          createPageMap([
            [1, unrelatedComments],
            [2, [createIssueCommentResponse(101, existingBetaComment)]],
          ]),
        ],
      ]),
    });
    const commandResult = await runCommand({
      commandLineArguments: createBetaCommandArguments(),
      githubRequests: fakeGitHubRequests.requests,
    });

    expect(commandResult.result.exitCode).toBe(0);
    expect(fakeGitHubRequests.state.issueCommentCalls).toStrictEqual([
      {pullRequestNumber: 7, page: 1},
      {pullRequestNumber: 7, page: 2},
    ]);
    expect(fakeGitHubRequests.state.createdComments).toStrictEqual([]);
    expect(fakeGitHubRequests.state.updatedComments).toStrictEqual([]);
  });

  it('filters unmerged pull requests and unsupported target branches', async (): Promise<void> => {
    const fakeGitHubRequests = createFakeGitHubRequests({
      pullRequestPages: new Map([
        [
          betaOneCommit,
          createPageMap([
            [
              1,
              [
                createPullRequestResponse({pullRequestNumber: 1, merged: false}),
                createPullRequestResponse({pullRequestNumber: 2, targetBranch: 'feature/test'}),
                createPullRequestResponse({pullRequestNumber: 3}),
              ],
            ],
          ]),
        ],
      ]),
    });
    const commandResult = await runCommand({
      commandLineArguments: createBetaCommandArguments(),
      githubRequests: fakeGitHubRequests.requests,
    });

    expect(commandResult.result.exitCode).toBe(0);
    expect(
      fakeGitHubRequests.state.createdComments.map(comment => {
        return comment.pullRequestNumber;
      }),
    ).toStrictEqual([3]);
    expect(commandResult.summaries[0]).toMatch(/Pull requests discovered: 1 \(#3\)/);
  });

  it('deduplicates pull requests and processes them in numeric order', async (): Promise<void> => {
    const fakeGitHubRequests = createFakeGitHubRequests({
      pullRequestPages: new Map([
        [
          betaOneCommit,
          createPageMap([
            [
              1,
              [
                createPullRequestResponse({pullRequestNumber: 10}),
                createPullRequestResponse({pullRequestNumber: 2}),
                createPullRequestResponse({pullRequestNumber: 10}),
              ],
            ],
          ]),
        ],
      ]),
    });
    const commandResult = await runCommand({
      commandLineArguments: createBetaCommandArguments(),
      githubRequests: fakeGitHubRequests.requests,
    });

    expect(commandResult.result.exitCode).toBe(0);
    expect(
      fakeGitHubRequests.state.createdComments.map(comment => {
        return comment.pullRequestNumber;
      }),
    ).toStrictEqual([2, 10]);
  });

  it('creates the first Beta comment', async (): Promise<void> => {
    const fakeGitHubRequests = createFakeGitHubRequests({
      pullRequestPages: new Map([
        [betaOneCommit, createSinglePageMap([createPullRequestResponse({pullRequestNumber: 11})])],
      ]),
    });
    const commandResult = await runCommand({
      commandLineArguments: createBetaCommandArguments(),
      githubRequests: fakeGitHubRequests.requests,
    });

    expect(commandResult.result.exitCode).toBe(0);
    expect(fakeGitHubRequests.state.createdComments).toHaveLength(1);
    expect(fakeGitHubRequests.state.createdComments[0].commentBody).toMatch(/Beta \| `2026-01-02\.1-beta\.1`/);
  });

  it('leaves an existing Beta comment unchanged', async (): Promise<void> => {
    const fakeGitHubRequests = createFakeGitHubRequests({
      pullRequestPages: new Map([
        [betaOneCommit, createSinglePageMap([createPullRequestResponse({pullRequestNumber: 12})])],
      ]),
      issueCommentPages: new Map([
        [12, createSinglePageMap([createIssueCommentResponse(12, renderPersistentComment({beta: betaOneTag}))])],
      ]),
    });
    const commandResult = await runCommand({
      commandLineArguments: createBetaCommandArguments(),
      githubRequests: fakeGitHubRequests.requests,
    });

    expect(commandResult.result.exitCode).toBe(0);
    expect(fakeGitHubRequests.state.createdComments).toStrictEqual([]);
    expect(fakeGitHubRequests.state.updatedComments).toStrictEqual([]);
    expect(commandResult.summaries[0]).toMatch(/Comments unchanged: 1/);
  });

  it('adds Production to an existing Beta comment', async (): Promise<void> => {
    const fakeGitHubRequests = createFakeGitHubRequests({
      pullRequestPages: new Map([
        [betaOneCommit, createSinglePageMap([createPullRequestResponse({pullRequestNumber: 13})])],
      ]),
      issueCommentPages: new Map([
        [13, createSinglePageMap([createIssueCommentResponse(13, renderPersistentComment({beta: betaOneTag}))])],
      ]),
    });
    const commandResult = await runCommand({
      commandLineArguments: createProductionCommandArguments(betaOneTag),
      githubRequests: fakeGitHubRequests.requests,
      executeGitCommand: createFakeGitCommand({stage: 'production', promotedBetaTag: betaOneTag}),
    });

    expect(commandResult.result.exitCode).toBe(0);
    expect(fakeGitHubRequests.state.createdComments).toStrictEqual([]);
    expect(fakeGitHubRequests.state.updatedComments).toHaveLength(1);
    expect(fakeGitHubRequests.state.updatedComments[0].commentBody).toMatch(/Production \| `2026-01-02\.1-production`/);
  });

  it('Production creates both Beta and Production when Beta state is missing', async (): Promise<void> => {
    const fakeGitHubRequests = createFakeGitHubRequests({
      pullRequestPages: new Map([
        [betaOneCommit, createSinglePageMap([createPullRequestResponse({pullRequestNumber: 14})])],
      ]),
    });
    const commandResult = await runCommand({
      commandLineArguments: createProductionCommandArguments(betaOneTag),
      githubRequests: fakeGitHubRequests.requests,
      executeGitCommand: createFakeGitCommand({stage: 'production', promotedBetaTag: betaOneTag}),
    });

    expect(commandResult.result.exitCode).toBe(0);
    expect(fakeGitHubRequests.state.createdComments).toHaveLength(1);
    expect(fakeGitHubRequests.state.createdComments[0].commentBody).toMatch(/Beta \| `2026-01-02\.1-beta\.1`/);
    expect(fakeGitHubRequests.state.createdComments[0].commentBody).toMatch(/Production \| `2026-01-02\.1-production`/);
  });

  it('retains the earliest Beta candidate across Production ranges', async (): Promise<void> => {
    const fakeGitHubRequests = createFakeGitHubRequests({
      pullRequestPages: new Map([
        [betaOneCommit, createSinglePageMap([createPullRequestResponse({pullRequestNumber: 15})])],
        [betaTwoCommit, createSinglePageMap([createPullRequestResponse({pullRequestNumber: 15})])],
      ]),
    });
    const commandResult = await runCommand({
      commandLineArguments: createProductionCommandArguments(),
      githubRequests: fakeGitHubRequests.requests,
      executeGitCommand: createFakeGitCommand({stage: 'production'}),
    });

    expect(commandResult.result.exitCode).toBe(0);
    expect(fakeGitHubRequests.state.createdComments).toHaveLength(1);
    expect(fakeGitHubRequests.state.createdComments[0].commentBody).toMatch(/Beta \| `2026-01-02\.1-beta\.1`/);
    expect(fakeGitHubRequests.state.createdComments[0].commentBody).not.toMatch(/beta\.2/);
  });

  it('continues after a failed pull request comment operation', async (): Promise<void> => {
    const fakeGitHubRequests = createFakeGitHubRequests({
      pullRequestPages: new Map([
        [
          betaOneCommit,
          createPageMap([
            [1, [createPullRequestResponse({pullRequestNumber: 1}), createPullRequestResponse({pullRequestNumber: 2})]],
          ]),
        ],
      ]),
      createFailureNumbers: new Set([1]),
    });
    const commandResult = await runCommand({
      commandLineArguments: createBetaCommandArguments(),
      githubRequests: fakeGitHubRequests.requests,
    });

    expect(commandResult.result.exitCode).toBe(1);
    expect(
      fakeGitHubRequests.state.createdComments.map(comment => {
        return comment.pullRequestNumber;
      }),
    ).toStrictEqual([2]);
    expect(commandResult.outputMessages.join('\n')).toMatch(/pull request #1/i);
  });

  it('bootstrap performs no GitHub requests and succeeds', async (): Promise<void> => {
    const fakeGitHubRequests = createFakeGitHubRequests();
    const commandResult = await runCommand({
      commandLineArguments: createBetaCommandArguments(),
      githubRequests: fakeGitHubRequests.requests,
      executeGitCommand: createFakeGitCommand({stage: 'beta', bootstrap: true}),
    });

    expect(commandResult.result.exitCode).toBe(0);
    expect(fakeGitHubRequests.state.pullRequestCalls).toStrictEqual([]);
    expect(fakeGitHubRequests.state.issueCommentCalls).toStrictEqual([]);
    expect(fakeGitHubRequests.state.createdComments).toStrictEqual([]);
    expect(fakeGitHubRequests.state.updatedComments).toStrictEqual([]);
    expect(commandResult.summaries[0]).toMatch(/Bootstrap: yes/);
  });

  it('rejects malformed GitHub responses clearly', async (): Promise<void> => {
    const fakeGitHubRequests = createFakeGitHubRequests({
      pullRequestPages: new Map([[betaOneCommit, createSinglePageMap([{}])]]),
    });
    const commandResult = await runCommand({
      commandLineArguments: createBetaCommandArguments(),
      githubRequests: fakeGitHubRequests.requests,
    });

    expect(commandResult.result.exitCode).toBe(1);
    expect(commandResult.outputMessages.join('\n')).toMatch(/Malformed GitHub pull request response/);
  });

  it('does not include the token in reported errors', async (): Promise<void> => {
    const fakeGitHubRequests = createFakeGitHubRequests({
      pullRequestFailureMessage: `request failed with ${githubToken}`,
    });
    const commandResult = await runCommand({
      commandLineArguments: createBetaCommandArguments(),
      githubRequests: fakeGitHubRequests.requests,
    });
    const reportedOutput = [...commandResult.outputMessages, ...commandResult.summaries].join('\n');

    expect(commandResult.result.exitCode).toBe(1);
    expect(reportedOutput).not.toContain(githubToken);
    expect(reportedOutput).toContain('[REDACTED]');
  });

  it('uses process.exitCode in the entrypoint', async (): Promise<void> => {
    const previousExitCode = process.exitCode;
    const fakeGitHubRequests = createFakeGitHubRequests({
      pullRequestPages: new Map([
        [betaOneCommit, createSinglePageMap([createPullRequestResponse({pullRequestNumber: 16})])],
      ]),
      createFailureNumbers: new Set([16]),
    });
    const dependencies = createTestDependencies({
      githubRequests: fakeGitHubRequests.requests,
      executeGitCommand: createFakeGitCommand({stage: 'beta'}),
    });

    try {
      process.exitCode = 0;
      await main({
        commandLineArguments: createBetaCommandArguments(),
        environment: commandEnvironment,
        dependencies,
      });
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = previousExitCode;
    }
  });
});
