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
  githubIssueCommentPageResponseSchema,
  githubIssueCommentResponseSchema,
  githubPullRequestPageResponseSchema,
} from './releaseAppearanceCommandGitHubSchema.ts';

type PullRequestResponseFixture = {
  readonly number: number;
  readonly merged_at: string | null;
  readonly base: PullRequestBaseFixture;
  readonly title: string;
};

type IssueCommentResponseFixture = {
  readonly id: number;
  readonly body: string;
  readonly user: IssueCommentUserFixture;
};

type PullRequestBaseFixture = {
  readonly ref: string;
  readonly label: string;
};

type IssueCommentUserFixture = {
  readonly login: string;
};

type PullRequestResponseFactoryShape = ShapeToGeneratorReturnValue<PullRequestResponseFixture>;
type IssueCommentResponseFactoryShape = ShapeToGeneratorReturnValue<IssueCommentResponseFixture>;

const pullRequestBaseFactory = createFactory<PullRequestBaseFixture>(
  function createPullRequestBase(): PullRequestBaseFixture {
    return {
      ref: 'main',
      label: 'wireapp:main',
    };
  },
);

const issueCommentUserFactory = createFactory<IssueCommentUserFixture>(
  function createIssueCommentUser(): IssueCommentUserFixture {
    return {login: 'release-bot'};
  },
);

const pullRequestResponseFactory = createFactory<PullRequestResponseFixture>(
  function createPullRequestResponse(): PullRequestResponseFactoryShape {
    return {
      number: 1,
      merged_at: '2026-07-21T00:00:00Z',
      base: pullRequestBaseFactory,
      title: 'Release appearance',
    };
  },
);

const issueCommentResponseFactory = createFactory<IssueCommentResponseFixture>(
  function createIssueCommentResponse(): IssueCommentResponseFactoryShape {
    return {
      id: 1,
      body: 'comment',
      user: issueCommentUserFactory,
    };
  },
);

describe('release appearance GitHub response schemas', (): void => {
  it('accepts pull request responses with additional GitHub fields', (): void => {
    const result = githubPullRequestPageResponseSchema.safeParse([pullRequestResponseFactory.build()]);

    assert(result.success);
    expect(result.data[0]).toMatchObject({number: 1, base: {ref: 'main'}});
  });

  it.each([
    ['a non-array response', 'not-an-array'],
    ['a non-positive pull request number', [pullRequestResponseFactory.buildInvalidWithChanged('number', 0)]],
    ['an invalid merged timestamp', [pullRequestResponseFactory.buildInvalidWithChanged('merged_at', 42)]],
    ['a missing base reference', [pullRequestResponseFactory.buildInvalidWithout('base.ref')]],
  ])('rejects %s', function rejectsMalformedPullRequestResponse(_description: string, response: unknown): void {
    const result = githubPullRequestPageResponseSchema.safeParse(response);

    expect(result.success).toBe(false);
  });

  it('accepts issue comment responses with additional GitHub fields', (): void => {
    const result = githubIssueCommentPageResponseSchema.safeParse([issueCommentResponseFactory.build()]);

    assert(result.success);
    expect(result.data[0]).toMatchObject({id: 1, body: 'comment'});
  });

  it.each([
    ['a non-array response', 'not-an-array'],
    ['a non-positive comment id', [issueCommentResponseFactory.buildInvalidWithChanged('id', 0)]],
    ['a missing comment body', [issueCommentResponseFactory.buildInvalidWithout('body')]],
  ])('rejects %s', function rejectsMalformedIssueCommentResponse(_description: string, response: unknown): void {
    const result = githubIssueCommentPageResponseSchema.safeParse(response);

    expect(result.success).toBe(false);
  });

  it('accepts a mutation response', (): void => {
    const result = githubIssueCommentResponseSchema.safeParse(issueCommentResponseFactory.build());

    assert(result.success);
    expect(result.data).toMatchObject({id: 1, body: 'comment'});
  });
});
