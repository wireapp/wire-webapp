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

import {renderPersistentComment} from './releaseAppearance.ts';
import {prepareCommentOperation, processPullRequests} from './releaseAppearanceCommandProcessing.ts';
import type {GitHubRequestBehavior} from './releaseAppearanceCommandGitHub.ts';

const betaTag = '2026-07-21.3-beta.1';
const productionTag = '2026-07-21.3-production';

type IssueCommentResponseFixture = {
  readonly id: number;
  readonly body: string;
};

const issueCommentResponseFactory = createFactory<IssueCommentResponseFixture>(
  function createIssueCommentResponse(): IssueCommentResponseFixture {
    return {
      id: 1,
      body: '',
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
      return issueCommentResponseFactory.build();
    },
    async updateIssueComment(): Promise<unknown> {
      return issueCommentResponseFactory.build();
    },
  };
}

describe('release appearance comment processing', (): void => {
  it('creates a marker operation when no marker exists', (): void => {
    const result = prepareCommentOperation({
      existingComments: [issueCommentResponseFactory.build({body: 'unrelated comment'})],
      desiredReleaseState: {beta: betaTag},
    });

    assert(result.isOk);
    expect(result.value).toEqual({kind: 'create', commentBody: renderPersistentComment({beta: betaTag})});
  });

  it('leaves an existing Beta appearance unchanged', (): void => {
    const existingCommentBody = renderPersistentComment({beta: betaTag});
    const result = prepareCommentOperation({
      existingComments: [issueCommentResponseFactory.build({body: existingCommentBody})],
      desiredReleaseState: {beta: '2026-07-21.3-beta.2'},
    });

    assert(result.isOk);
    expect(result.value).toEqual({kind: 'unchanged'});
  });

  it('adds Production while preserving the existing Beta appearance', (): void => {
    const existingCommentBody = renderPersistentComment({beta: betaTag});
    const result = prepareCommentOperation({
      existingComments: [issueCommentResponseFactory.build({body: existingCommentBody})],
      desiredReleaseState: {beta: betaTag, production: productionTag},
    });

    assert(result.isOk);
    expect(result.value).toEqual({
      kind: 'update',
      commentId: 1,
      commentBody: renderPersistentComment({beta: betaTag, production: productionTag}),
    });
  });

  it('continues processing after one pull request comment fails', async (): Promise<void> => {
    const failedPullRequestNumber = 1;
    const outputMessages: string[] = [];
    const githubRequests: GitHubRequestBehavior = {
      ...createEmptyGitHubRequests(),
      async createIssueComment(options): Promise<unknown> {
        if (options.pullRequestNumber === failedPullRequestNumber) {
          throw new Error('comment failed');
        }

        return issueCommentResponseFactory.build({id: options.pullRequestNumber, body: options.commentBody});
      },
    };

    const result = await processPullRequests({
      pullRequests: [
        {number: failedPullRequestNumber, earliestBetaTag: betaTag},
        {number: 2, earliestBetaTag: betaTag},
      ],
      stage: 'beta',
      releaseTag: betaTag,
      githubRequests,
      githubToken: 'token',
      async writeOutput(message: string): Promise<void> {
        outputMessages.push(message);
      },
    });

    expect(result).toEqual({
      commentsCreated: 1,
      commentsUpdated: 0,
      commentsUnchanged: 0,
      failedPullRequests: [failedPullRequestNumber],
    });
    expect(outputMessages).toEqual([
      `Unable to create release-appearance comment for pull request #${failedPullRequestNumber}: comment failed`,
    ]);
  });
});
