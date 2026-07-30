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

import {createFactory} from '@enormora/objectory';
import type {ShapeToGeneratorReturnValue} from '@enormora/objectory';

import {
  listIssueComments,
  listMergedSupportedPullRequests,
  parseIssueCommentMutationResponse,
  parseIssueCommentPage,
  parsePullRequestPage,
} from './releaseAppearanceCommandGitHub.ts';
import type {GitHubRequestBehavior} from './releaseAppearanceCommandGitHub.ts';

type PullRequestResponseFixture = {
  readonly number: number;
  readonly merged_at: string | null;
  readonly base: PullRequestBaseFixture;
};

type IssueCommentResponseFixture = {
  readonly id: number;
  readonly body: string;
};

type PullRequestResponseFactoryShape = ShapeToGeneratorReturnValue<PullRequestResponseFixture>;

type PullRequestBaseFixture = {
  readonly ref: string;
};

const pullRequestBaseFactory = createFactory<PullRequestBaseFixture>(
  function createPullRequestBase(): PullRequestBaseFixture {
    return {ref: 'main'};
  },
);

const pullRequestResponseFactory = createFactory<PullRequestResponseFixture>(
  function createPullRequestResponse(): PullRequestResponseFactoryShape {
    return {
      number: 1,
      merged_at: '2026-07-21T00:00:00Z',
      base: pullRequestBaseFactory,
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

function createEmptyGitHubRequests(): GitHubRequestBehavior {
  return {
    async listPullRequestsForCommit(): Promise<unknown> {
      return [];
    },
    async listIssueComments(): Promise<unknown> {
      return [];
    },
    async createIssueComment(): Promise<unknown> {
      return issueCommentResponseFactory.build({body: ''});
    },
    async updateIssueComment(): Promise<unknown> {
      return issueCommentResponseFactory.build({body: ''});
    },
  };
}

describe('release appearance GitHub boundary', (): void => {
  it('keeps only merged pull requests targeting supported branches', (): void => {
    const result = parsePullRequestPage([
      pullRequestResponseFactory.build({number: 1, base: {ref: 'main'}}),
      pullRequestResponseFactory.build({number: 2, base: {ref: 'release/2026.07'}}),
      pullRequestResponseFactory.build({number: 3, merged_at: null}),
      pullRequestResponseFactory.build({number: 4, base: {ref: 'feature'}}),
    ]);

    assert(result.isOk);
    expect(result.value).toEqual([{number: 1}, {number: 2}]);
  });

  it.each([
    ['not-an-array', 'Malformed GitHub pull request response'],
    [[pullRequestResponseFactory.buildInvalidWithout('base.ref')], 'Malformed GitHub pull request response'],
    [[pullRequestResponseFactory.buildInvalidWithChanged('merged_at', 42)], 'Malformed GitHub pull request response'],
  ])('rejects malformed pull request responses', (response: unknown, expectedMessage: string): void => {
    const result = parsePullRequestPage(response);

    assert(result.isErr);
    expect(result.error.message).toContain(expectedMessage);
  });

  it('parses issue comment responses', (): void => {
    const result = parseIssueCommentPage([issueCommentResponseFactory.build()]);

    assert(result.isOk);
    expect(result.value).toEqual([{id: 1, body: 'comment'}]);
  });

  it.each([
    ['not-an-array', 'Malformed GitHub issue comment response'],
    [[issueCommentResponseFactory.buildInvalidWithout('body')], 'Malformed GitHub issue comment response'],
  ])('rejects malformed issue comment responses', (response: unknown, expectedMessage: string): void => {
    const result = parseIssueCommentPage(response);

    assert(result.isErr);
    expect(result.error.message).toContain(expectedMessage);
  });

  it('parses issue comment mutation responses', (): void => {
    const result = parseIssueCommentMutationResponse(issueCommentResponseFactory.build());

    assert(result.isOk);
    expect(result.value).toEqual({id: 1, body: 'comment'});
  });

  it.each([
    issueCommentResponseFactory.buildInvalidWithChanged('id', 0),
    issueCommentResponseFactory.buildInvalidWithout('body'),
  ])('rejects malformed issue comment mutation responses', (response: unknown): void => {
    const result = parseIssueCommentMutationResponse(response);

    assert(result.isErr);
    expect(result.error.message).toBe('Malformed GitHub comment mutation response');
  });

  it('reads all pull request pages', async (): Promise<void> => {
    const firstPage = pullRequestResponseFactory.buildList({length: 100});
    const calls: Array<{readonly commitSha: string; readonly page: number}> = [];
    const githubRequests: GitHubRequestBehavior = {
      ...createEmptyGitHubRequests(),
      async listPullRequestsForCommit(options): Promise<unknown> {
        calls.push(options);
        return options.page === 1 ? firstPage : [pullRequestResponseFactory.build({number: 2, merged_at: null})];
      },
    };

    const result = await listMergedSupportedPullRequests({
      commitSha: 'commit-sha',
      githubRequests,
      githubToken: 'token',
    });

    assert(result.isOk);
    expect(result.value).toHaveLength(100);
    expect(calls).toEqual([
      {commitSha: 'commit-sha', page: 1},
      {commitSha: 'commit-sha', page: 2},
    ]);
  });

  it('reads all issue comment pages', async (): Promise<void> => {
    const firstPage = issueCommentResponseFactory.buildList({length: 100});
    const calls: Array<{readonly pullRequestNumber: number; readonly page: number}> = [];
    const githubRequests: GitHubRequestBehavior = {
      ...createEmptyGitHubRequests(),
      async listIssueComments(options): Promise<unknown> {
        calls.push(options);
        return options.page === 1 ? firstPage : [issueCommentResponseFactory.build({id: 2, body: 'next comment'})];
      },
    };

    const result = await listIssueComments({
      pullRequestNumber: 7,
      githubRequests,
      githubToken: 'token',
    });

    assert(result.isOk);
    expect(result.value).toHaveLength(101);
    expect(calls).toEqual([
      {pullRequestNumber: 7, page: 1},
      {pullRequestNumber: 7, page: 2},
    ]);
  });
});
