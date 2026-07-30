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

import {discoverPullRequests} from './releaseAppearanceCommandDiscovery.ts';
import type {GitHubRequestBehavior} from './releaseAppearanceCommandGitHub.ts';

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
      merged_at: '2026-07-21T00:00:00Z',
      base: pullRequestBaseResponseFactory,
    };
  },
);

const issueCommentResponseFactory = createFactory<IssueCommentResponseFixture>(
  function createIssueCommentResponse(): IssueCommentResponseFixture {
    return {
      id: 1,
      body: '',
    };
  },
);

function createGitHubRequests(pullRequestsByCommit: ReadonlyMap<string, unknown>): GitHubRequestBehavior {
  return {
    async listPullRequestsForCommit(options): Promise<unknown> {
      return pullRequestsByCommit.get(options.commitSha) ?? [];
    },
    async listIssueComments(): Promise<unknown> {
      return [];
    },
    async createIssueComment(): Promise<unknown> {
      return issueCommentResponseFactory.build();
    },
    async updateIssueComment(): Promise<unknown> {
      return issueCommentResponseFactory.build();
    },
  };
}

describe('release appearance pull request discovery', (): void => {
  it('deduplicates, orders, and retains the earliest candidate', async (): Promise<void> => {
    const result = await discoverPullRequests({
      ranges: [
        {
          candidateTag: '2026-07-21.3-beta.1',
          commitRange: {
            startTag: '2026-07-01.2-production',
            endTag: '2026-07-21.3-beta.1',
            baseCommit: 'base-commit',
            endCommit: 'end-commit',
            commits: ['commit-one', 'commit-two'],
          },
        },
        {
          candidateTag: '2026-07-21.3-beta.2',
          commitRange: {
            startTag: '2026-07-21.3-beta.1',
            endTag: '2026-07-21.3-beta.2',
            baseCommit: 'base-commit',
            endCommit: 'end-commit',
            commits: ['commit-two', 'commit-three'],
          },
        },
      ],
      githubRequests: createGitHubRequests(
        new Map([
          ['commit-one', [pullRequestResponseFactory.build({number: 20})]],
          [
            'commit-two',
            [pullRequestResponseFactory.build({number: 10}), pullRequestResponseFactory.build({number: 20})],
          ],
          ['commit-three', []],
        ]),
      ),
      githubToken: 'token',
    });

    expect(result.pullRequests).toEqual([
      {number: 10, earliestBetaTag: '2026-07-21.3-beta.1'},
      {number: 20, earliestBetaTag: '2026-07-21.3-beta.1'},
    ]);
    expect(result.commitsInspected).toEqual(['commit-one', 'commit-two', 'commit-three']);
    expect(result.commitsWithoutPullRequests).toEqual(['commit-three']);
    expect(result.errors).toEqual([]);
  });

  it('continues when one commit request fails', async (): Promise<void> => {
    const githubRequests: GitHubRequestBehavior = {
      ...createGitHubRequests(new Map()),
      async listPullRequestsForCommit(options): Promise<unknown> {
        if (options.commitSha === 'failed-commit') {
          throw new Error('request failed');
        }

        return [pullRequestResponseFactory.build({number: 3})];
      },
    };

    const result = await discoverPullRequests({
      ranges: [
        {
          candidateTag: '2026-07-21.3-beta.1',
          commitRange: {
            startTag: '2026-07-01.2-production',
            endTag: '2026-07-21.3-beta.1',
            baseCommit: 'base-commit',
            endCommit: 'end-commit',
            commits: ['failed-commit', 'successful-commit'],
          },
        },
      ],
      githubRequests,
      githubToken: 'token',
    });

    assert(result.errors.length === 1);
    expect(result.pullRequests).toEqual([{number: 3, earliestBetaTag: '2026-07-21.3-beta.1'}]);
  });
});
