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

import {Maybe} from 'true-myth';
import assert from 'node:assert';

import {
  createGitHubClient,
  discoverPullRequestsInRange,
  processPullRequestsSequentially,
  renderReleaseAppearanceSummary,
  resolveReleaseAppearanceRange,
  runReleaseAppearance,
} from './releaseAppearanceCli';
import type {
  AssociatedPullRequest,
  CommentProcessingResult,
  GitCommand,
  GitHubClient,
  GitHubPage,
  PullRequestDiscoveryResult,
} from './releaseAppearanceCli';
import {renderReleaseAppearanceComment} from './releaseAppearance';
import type {
  CommitDiscoveryRange,
  ReleaseAppearanceComment,
  ReleaseAppearanceCommentState,
  ReleaseAppearanceValue,
} from './releaseAppearance';

const currentCommitHash = '1111111111111111111111111111111111111111';
const previousCommitHash = '2222222222222222222222222222222222222222';
const mergeBaseCommitHash = '3333333333333333333333333333333333333333';
const firstDiscoveredCommitHash = '4444444444444444444444444444444444444444';
const secondDiscoveredCommitHash = '5555555555555555555555555555555555555555';
const thirdDiscoveredCommitHash = '6666666666666666666666666666666666666666';

type FakeGitHubClient = {
  readonly associatedCommitCalls: readonly string[];
  readonly client: GitHubClient;
  readonly commentPageCalls: readonly string[];
  readonly createdComments: readonly CreatedComment[];
  readonly updatedComments: readonly UpdatedComment[];
};

type CommentStateOverrides = {
  readonly beta?: ReleaseAppearanceValue;
  readonly production?: ReleaseAppearanceValue;
};

type CreatedComment = {
  readonly body: string;
  readonly pullRequestNumber: number;
};

type UpdatedComment = {
  readonly body: string;
  readonly commentId: number;
};

type CreateFakeGitHubClientParameters = {
  readonly associatedPages?: ReadonlyMap<string, readonly GitHubPage<AssociatedPullRequest>[]>;
  readonly commentPages?: ReadonlyMap<number, readonly GitHubPage<ReleaseAppearanceComment>[]>;
  readonly createIssueComment?: (pullRequestNumber: number, body: string) => Promise<void>;
  readonly updateIssueComment?: (commentId: number, body: string) => Promise<void>;
};

function createCommentState(overrides: CommentStateOverrides = {}): ReleaseAppearanceCommentState {
  return {
    beta: Maybe.of(overrides.beta),
    production: Maybe.of(overrides.production),
  };
}

function createFakeGitHubClient(parameters: CreateFakeGitHubClientParameters = {}): FakeGitHubClient {
  const associatedCommitCalls: string[] = [];
  const commentPageCalls: string[] = [];
  const createdComments: CreatedComment[] = [];
  const updatedComments: UpdatedComment[] = [];

  const createIssueCommentCallback =
    parameters.createIssueComment ??
    (async (): Promise<void> => {
      return;
    });
  const updateIssueCommentCallback =
    parameters.updateIssueComment ??
    (async (): Promise<void> => {
      return;
    });

  const client: GitHubClient = {
    createIssueComment: async (pullRequestNumber: number, body: string): Promise<void> => {
      createdComments.push({body, pullRequestNumber});
      await createIssueCommentCallback(pullRequestNumber, body);
    },
    listIssueComments: async (
      pullRequestNumber: number,
      pageNumber: number,
    ): Promise<GitHubPage<ReleaseAppearanceComment>> => {
      commentPageCalls.push(`${pullRequestNumber}:${pageNumber}`);
      return (
        parameters.commentPages?.get(pullRequestNumber)?.[pageNumber - 1] ?? {
          hasNextPage: false,
          items: [],
        }
      );
    },
    listPullRequestsAssociatedWithCommit: async (
      commitHash: string,
      pageNumber: number,
    ): Promise<GitHubPage<AssociatedPullRequest>> => {
      associatedCommitCalls.push(`${commitHash}:${pageNumber}`);
      return (
        parameters.associatedPages?.get(commitHash)?.[pageNumber - 1] ?? {
          hasNextPage: false,
          items: [],
        }
      );
    },
    updateIssueComment: async (commentId: number, body: string): Promise<void> => {
      updatedComments.push({body, commentId});
      await updateIssueCommentCallback(commentId, body);
    },
  };

  return {
    associatedCommitCalls,
    client,
    commentPageCalls,
    createdComments,
    updatedComments,
  };
}

function createCommitRange(): CommitDiscoveryRange {
  return {
    baselineCommitHash: previousCommitHash,
    baselineTagName: '2026-07-20.4-production',
    mergeBaseCommitHash,
    revisionRange: `${mergeBaseCommitHash}..${currentCommitHash}`,
  };
}

function createGitCommand(outputs: ReadonlyMap<string, string>): GitCommand {
  return async (commandArguments: readonly string[]): Promise<string> => {
    const commandKey = commandArguments.join(' ');
    const commandOutput = outputs.get(commandKey);

    if (commandOutput === undefined) {
      throw new Error(`Unexpected Git command: ${commandKey}`);
    }

    return commandOutput;
  };
}

describe('release appearance CLI orchestration', () => {
  it('processes only newly introduced commits and reports commits without pull requests', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      associatedPages: new Map([
        [firstDiscoveredCommitHash, [{hasNextPage: false, items: [{pullRequestNumber: 101}]}]],
        [secondDiscoveredCommitHash, [{hasNextPage: false, items: []}]],
      ]),
    });
    const actualDiscovery = await discoverPullRequestsInRange({
      executeGitCommand: createGitCommand(
        new Map([
          [
            `rev-list --reverse ${mergeBaseCommitHash}..${currentCommitHash}`,
            `${firstDiscoveredCommitHash}\n${secondDiscoveredCommitHash}\n`,
          ],
        ]),
      ),
      githubClient: fakeGitHubClient.client,
      range: createCommitRange(),
    });

    const expectedDiscovery: PullRequestDiscoveryResult = {
      commitFailures: [],
      commitsInspected: [firstDiscoveredCommitHash, secondDiscoveredCommitHash],
      commitsWithoutPullRequests: [secondDiscoveredCommitHash],
      pullRequestNumbers: [101],
    };

    expect(actualDiscovery).toEqual(expectedDiscovery);
    expect(fakeGitHubClient.associatedCommitCalls).toEqual([
      `${firstDiscoveredCommitHash}:1`,
      `${secondDiscoveredCommitHash}:1`,
    ]);
  });

  it('handles paginated commit-associated pull requests, keeps release-branch pull requests, and deduplicates them', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      associatedPages: new Map([
        [
          firstDiscoveredCommitHash,
          [
            {hasNextPage: true, items: [{pullRequestNumber: 201}]},
            {hasNextPage: false, items: [{pullRequestNumber: 202}]},
          ],
        ],
        [
          secondDiscoveredCommitHash,
          [{hasNextPage: false, items: [{pullRequestNumber: 201}, {pullRequestNumber: 203}]}],
        ],
      ]),
    });
    const actualDiscovery = await discoverPullRequestsInRange({
      executeGitCommand: createGitCommand(
        new Map([
          [
            `rev-list --reverse ${mergeBaseCommitHash}..${currentCommitHash}`,
            `${firstDiscoveredCommitHash}\n${secondDiscoveredCommitHash}`,
          ],
        ]),
      ),
      githubClient: fakeGitHubClient.client,
      range: createCommitRange(),
    });

    expect(actualDiscovery.pullRequestNumbers).toEqual([201, 202, 203]);
    expect(fakeGitHubClient.associatedCommitCalls).toEqual([
      `${firstDiscoveredCommitHash}:1`,
      `${firstDiscoveredCommitHash}:2`,
      `${secondDiscoveredCommitHash}:1`,
    ]);
  });

  it('filters unmerged associated pull requests and follows GitHub pagination links', async () => {
    const responses = [
      new Response(
        JSON.stringify([
          {merged_at: '2026-07-23T10:00:00Z', number: 204},
          {merged_at: null, number: 205},
        ]),
        {
          headers: {
            link: '<https://api.github.com/repos/wireapp/wire-webapp/commits/commit/pulls?page=2>; rel="next"',
          },
          status: 200,
        },
      ),
      new Response(JSON.stringify([{merged_at: '2026-07-23T11:00:00Z', number: 206}]), {status: 200}),
      new Response(JSON.stringify([{body: 'First comment', id: 61}]), {
        headers: {
          link: '<https://api.github.com/repos/wireapp/wire-webapp/issues/204/comments?page=2>; rel="next"',
        },
        status: 200,
      }),
      new Response(JSON.stringify([{body: 'Second comment', id: 62}]), {status: 200}),
    ];
    const requests: string[] = [];
    const githubClientResult = createGitHubClient({
      apiUrl: 'https://api.github.com',
      fetchFunction: async (input: Input): Promise<Response> => {
        if (typeof input === 'string') {
          requests.push(input);
        } else if (input instanceof URL) {
          requests.push(input.toString());
        } else {
          requests.push(input.url);
        }

        const response = Maybe.of(responses.shift());

        assert(response.isJust);
        return response.value;
      },
      repositoryName: 'wireapp/wire-webapp',
      token: 'test-token',
    });

    assert(githubClientResult.isOk);
    const githubClient = githubClientResult.value;
    const firstPullRequestPage = await githubClient.listPullRequestsAssociatedWithCommit(firstDiscoveredCommitHash, 1);
    const secondPullRequestPage = await githubClient.listPullRequestsAssociatedWithCommit(firstDiscoveredCommitHash, 2);
    const firstCommentPage = await githubClient.listIssueComments(204, 1);
    const secondCommentPage = await githubClient.listIssueComments(204, 2);

    expect(firstPullRequestPage).toEqual({hasNextPage: true, items: [{pullRequestNumber: 204}]});
    expect(secondPullRequestPage).toEqual({hasNextPage: false, items: [{pullRequestNumber: 206}]});
    expect(firstCommentPage).toEqual({hasNextPage: true, items: [{body: 'First comment', commentId: 61}]});
    expect(secondCommentPage).toEqual({hasNextPage: false, items: [{body: 'Second comment', commentId: 62}]});
    expect(requests).toEqual([
      `https://api.github.com/repos/wireapp/wire-webapp/commits/${firstDiscoveredCommitHash}/pulls?per_page=100&page=1`,
      `https://api.github.com/repos/wireapp/wire-webapp/commits/${firstDiscoveredCommitHash}/pulls?per_page=100&page=2`,
      'https://api.github.com/repos/wireapp/wire-webapp/issues/204/comments?per_page=100&page=1',
      'https://api.github.com/repos/wireapp/wire-webapp/issues/204/comments?per_page=100&page=2',
    ]);
  });

  it('uses the immediately preceding Beta tag for the same release identifier', async () => {
    const actualRangeResult = await resolveReleaseAppearanceRange({
      currentCommitHash,
      environment: 'beta',
      executeGitCommand: createGitCommand(
        new Map([
          ['rev-parse --verify refs/tags/2026-07-21.3-beta.2^\u007bcommit\u007d', currentCommitHash],
          ['tag --list', '2026-07-21.3-beta.1\n2026-07-21.3-beta.2\n2026-07-20.4-beta.99\n'],
          ['rev-parse --verify refs/tags/2026-07-21.3-beta.1^\u007bcommit\u007d', previousCommitHash],
          [`merge-base ${previousCommitHash} ${currentCommitHash}`, mergeBaseCommitHash],
          [`rev-list --count ${mergeBaseCommitHash}..${currentCommitHash}`, '2'],
          [`show -s --format=%ct ${previousCommitHash}`, '200'],
        ]),
      ),
      releaseTagName: '2026-07-21.3-beta.2',
    });

    assert(actualRangeResult.isOk);
    expect(actualRangeResult.value.range.baselineTagName).toBe('2026-07-21.3-beta.1');
    expect(actualRangeResult.value.range.revisionRange).toBe(`${mergeBaseCommitHash}..${currentCommitHash}`);
  });

  it('handles paginated issue comments and leaves an existing Beta value unchanged', async () => {
    const existingCommentBody = renderReleaseAppearanceComment(
      createCommentState({
        beta: {
          tagName: '2026-07-21.3-beta.1',
          workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/1',
        },
      }),
    );
    const fakeGitHubClient = createFakeGitHubClient({
      commentPages: new Map([
        [
          301,
          [
            {hasNextPage: true, items: [{body: 'Unrelated comment', commentId: 1}]},
            {hasNextPage: false, items: [{body: existingCommentBody, commentId: 2}]},
          ],
        ],
      ]),
    });
    const outputMessages: string[] = [];
    const actualProcessing = await processPullRequestsSequentially({
      currentReleaseTagName: '2026-07-21.3-beta.2',
      environment: 'beta',
      githubClient: fakeGitHubClient.client,
      pullRequestNumbers: [301],
      workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/2',
      writeError: (): void => {
        return;
      },
      writeOutput: (message: string): void => {
        outputMessages.push(message);
      },
    });

    expect(actualProcessing).toEqual({
      createdPullRequestNumbers: [],
      failedPullRequests: [],
      unchangedPullRequestNumbers: [301],
      updatedPullRequestNumbers: [],
    });
    expect(fakeGitHubClient.commentPageCalls).toEqual(['301:1', '301:2']);
    expect(outputMessages).toEqual(['Pull request #301: unchanged.']);
    expect(fakeGitHubClient.createdComments).toEqual([]);
    expect(fakeGitHubClient.updatedComments).toEqual([]);
  });

  it('adds Production to an existing Beta comment', async () => {
    const existingCommentBody = renderReleaseAppearanceComment(
      createCommentState({
        beta: {
          tagName: '2026-07-21.3-beta.1',
          workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/1',
        },
      }),
    );
    const fakeGitHubClient = createFakeGitHubClient({
      commentPages: new Map([[302, [{hasNextPage: false, items: [{body: existingCommentBody, commentId: 22}]}]]]),
    });
    const actualProcessing = await processPullRequestsSequentially({
      currentReleaseTagName: '2026-07-21.3-production',
      environment: 'production',
      githubClient: fakeGitHubClient.client,
      pullRequestNumbers: [302],
      workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/3',
      writeError: (): void => {
        return;
      },
      writeOutput: (): void => {
        return;
      },
    });

    expect(actualProcessing.updatedPullRequestNumbers).toEqual([302]);
    expect(fakeGitHubClient.updatedComments).toEqual([
      {
        body: renderReleaseAppearanceComment(
          createCommentState({
            beta: {
              tagName: '2026-07-21.3-beta.1',
              workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/1',
            },
            production: {
              tagName: '2026-07-21.3-production',
              workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/3',
            },
          }),
        ),
        commentId: 22,
      },
    ]);
  });

  it('continues after a multiple-marker failure and a failed update', async () => {
    const markerCommentBody = renderReleaseAppearanceComment(createCommentState());
    const productionCommentBody = renderReleaseAppearanceComment(
      createCommentState({
        production: {
          tagName: '2026-07-20.4-production',
          workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/4',
        },
      }),
    );
    const fakeGitHubClient = createFakeGitHubClient({
      commentPages: new Map([
        [
          401,
          [
            {
              hasNextPage: false,
              items: [
                {body: markerCommentBody, commentId: 41},
                {body: markerCommentBody, commentId: 42},
              ],
            },
          ],
        ],
        [402, [{hasNextPage: false, items: [{body: productionCommentBody, commentId: 43}]}]],
        [403, [{hasNextPage: false, items: []}]],
      ]),
      updateIssueComment: async (): Promise<void> => {
        throw new Error('permission denied');
      },
    });
    const errors: string[] = [];
    const actualProcessing = await processPullRequestsSequentially({
      currentReleaseTagName: '2026-07-21.3-beta.1',
      environment: 'beta',
      githubClient: fakeGitHubClient.client,
      pullRequestNumbers: [401, 402, 403],
      workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/4',
      writeError: (message: string): void => {
        errors.push(message);
      },
      writeOutput: (): void => {
        return;
      },
    });

    expect(actualProcessing.failedPullRequests).toEqual([
      'Pull request #401: More than one release appearance marker comment exists.',
      'Pull request #402: permission denied',
    ]);
    expect(actualProcessing.createdPullRequestNumbers).toEqual([403]);
    expect(actualProcessing.unchangedPullRequestNumbers).toEqual([]);
    expect(actualProcessing.updatedPullRequestNumbers).toEqual([]);
    expect(errors).toEqual([
      'Pull request #401: More than one release appearance marker comment exists.',
      'Pull request #402: permission denied',
    ]);
  });

  it('retries temporary GitHub failures and does not retry permanent failures', async () => {
    let temporaryAttemptCount = 0;
    const temporaryGitHubClientResult = createGitHubClient({
      apiUrl: 'https://api.github.com',
      fetchFunction: async (): Promise<Response> => {
        temporaryAttemptCount += 1;

        if (temporaryAttemptCount < 3) {
          return new Response('rate limited', {status: 429});
        }

        return new Response(JSON.stringify([{body: 'Recovered comment', id: 601}]), {status: 200});
      },
      repositoryName: 'wireapp/wire-webapp',
      retryDelay: (): number => {
        return 0;
      },
      token: 'test-token',
    });

    assert(temporaryGitHubClientResult.isOk);
    const temporaryComments = await temporaryGitHubClientResult.value.listIssueComments(601, 1);
    let permanentAttemptCount = 0;
    const permanentGitHubClientResult = createGitHubClient({
      apiUrl: 'https://api.github.com',
      fetchFunction: async (): Promise<Response> => {
        permanentAttemptCount += 1;
        return new Response('permission denied', {status: 403});
      },
      repositoryName: 'wireapp/wire-webapp',
      retryDelay: (): number => {
        return 0;
      },
      token: 'test-token',
    });

    assert(permanentGitHubClientResult.isOk);
    await expect(permanentGitHubClientResult.value.listIssueComments(602, 1)).rejects.toThrow(
      'GitHub request returned HTTP 403.',
    );

    expect(temporaryComments.items).toEqual([{body: 'Recovered comment', commentId: 601}]);
    expect(temporaryAttemptCount).toBe(3);
    expect(permanentAttemptCount).toBe(1);
  });

  it('does not retry comment creation after a transient GitHub failure', async () => {
    let createAttemptCount = 0;
    const githubClientResult = createGitHubClient({
      apiUrl: 'https://api.github.com',
      fetchFunction: async (): Promise<Response> => {
        createAttemptCount += 1;
        return new Response('temporary failure', {status: 503});
      },
      repositoryName: 'wireapp/wire-webapp',
      retryDelay: (): number => {
        return 0;
      },
      token: 'test-token',
    });

    assert(githubClientResult.isOk);
    await expect(githubClientResult.value.createIssueComment(603, 'comment body')).rejects.toThrow(
      'GitHub request returned HTTP 503.',
    );

    expect(createAttemptCount).toBe(1);
  });

  it('returns a non-zero result and writes a failure summary when a comment update fails', async () => {
    const productionCommentBody = renderReleaseAppearanceComment(
      createCommentState({
        production: {
          tagName: '2026-07-20.4-production',
          workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/5',
        },
      }),
    );
    const fakeGitHubClient = createFakeGitHubClient({
      associatedPages: new Map([
        [firstDiscoveredCommitHash, [{hasNextPage: false, items: [{pullRequestNumber: 404}]}]],
      ]),
      commentPages: new Map([[404, [{hasNextPage: false, items: [{body: productionCommentBody, commentId: 44}]}]]]),
      updateIssueComment: async (): Promise<void> => {
        throw new Error('permission denied');
      },
    });
    const summaryMessages: string[] = [];
    const errorMessages: string[] = [];
    const actualExitCode = await runReleaseAppearance(
      {
        currentCommitHash,
        environment: 'beta',
        releaseTagName: '2026-07-21.3-beta.2',
        workflowRunUrl: 'https://github.com/wireapp/wire-webapp/actions/runs/6',
      },
      {
        executeGitCommand: createGitCommand(
          new Map([
            ['rev-parse --verify refs/tags/2026-07-21.3-beta.2^\u007bcommit\u007d', currentCommitHash],
            ['tag --list', '2026-07-21.3-beta.1\n2026-07-21.3-beta.2\n'],
            ['rev-parse --verify refs/tags/2026-07-21.3-beta.1^\u007bcommit\u007d', previousCommitHash],
            [`merge-base ${previousCommitHash} ${currentCommitHash}`, mergeBaseCommitHash],
            [`rev-list --count ${mergeBaseCommitHash}..${currentCommitHash}`, '2'],
            [`show -s --format=%ct ${previousCommitHash}`, '200'],
            [`rev-list --reverse ${mergeBaseCommitHash}..${currentCommitHash}`, firstDiscoveredCommitHash],
          ]),
        ),
        githubClient: fakeGitHubClient.client,
        writeError: (message: string): void => {
          errorMessages.push(message);
        },
        writeOutput: (): void => {
          return;
        },
        writeSummary: async (message: string): Promise<void> => {
          summaryMessages.push(message);
        },
      },
    );

    expect(actualExitCode).toBe(1);
    expect(errorMessages).toEqual(['Pull request #404: permission denied']);
    expect(summaryMessages[0]).toContain('Comment processing failures:');
  });

  it('renders the selected baseline, merge base, and commits without pull requests in the summary', () => {
    const discovery: PullRequestDiscoveryResult = {
      commitFailures: [],
      commitsInspected: [firstDiscoveredCommitHash],
      commitsWithoutPullRequests: [firstDiscoveredCommitHash],
      pullRequestNumbers: [],
    };
    const commentProcessing: CommentProcessingResult = {
      createdPullRequestNumbers: [],
      failedPullRequests: [],
      unchangedPullRequestNumbers: [],
      updatedPullRequestNumbers: [],
    };
    const actualSummary = renderReleaseAppearanceSummary({
      commentProcessing,
      discovery,
      environment: 'production',
      range: {
        baselineRelationshipFailures: [],
        range: createCommitRange(),
      },
      releaseTagName: '2026-07-21.3-production',
    });

    expect(actualSummary).toContain('Baseline tag: `2026-07-20.4-production`');
    expect(actualSummary).toContain(`Merge base: \`${mergeBaseCommitHash}\``);
    expect(actualSummary).toContain(`- \`${firstDiscoveredCommitHash}\``);
  });
});
