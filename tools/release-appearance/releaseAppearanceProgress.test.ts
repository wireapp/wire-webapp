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

import {createGitHubActionsProgressReporter} from './githubActionsProgressReporter.ts';
import {
  createNoOpReleaseAppearanceProgressReporter,
  commentProcessingConcurrency,
  pullRequestDiscoveryConcurrency,
} from './releaseAppearanceProgress.ts';
import type {
  CommentProgress,
  DiscoveryProgress,
  ReleaseAppearanceProgressReporter,
} from './releaseAppearanceProgress.ts';

type FakeActionsCore = {
  readonly groups: string[];
  readonly informationMessages: string[];
  readonly endedGroups: number[];
  shouldFailInformation: boolean;
};

function createFakeActionsCore(): FakeActionsCore {
  return {
    groups: [],
    informationMessages: [],
    endedGroups: [],
    shouldFailInformation: false,
  };
}

function createTestReporter(fakeActionsCore: FakeActionsCore): ReleaseAppearanceProgressReporter {
  return createGitHubActionsProgressReporter({
    actionsCore: {
      info(message) {
        if (fakeActionsCore.shouldFailInformation) {
          throw new Error('progress output failed');
        }
        fakeActionsCore.informationMessages.push(message);
      },
      startGroup(groupName) {
        fakeActionsCore.groups.push(groupName);
      },
      endGroup() {
        fakeActionsCore.endedGroups.push(fakeActionsCore.groups.length);
      },
    },
  });
}

function createDiscoveryProgress(
  completedCommits: number,
  totalCommits: number,
  elapsedMilliseconds: number,
  overrides: Partial<DiscoveryProgress> = {},
): DiscoveryProgress {
  return {
    completedCommits,
    totalCommits,
    activeRequests: completedCommits === totalCommits ? 0 : pullRequestDiscoveryConcurrency,
    pullRequestsDiscovered: completedCommits,
    failures: 0,
    elapsedMilliseconds,
    ...overrides,
  };
}

function createCommentProgress(
  completedPullRequests: number,
  totalPullRequests: number,
  elapsedMilliseconds: number,
  overrides: Partial<CommentProgress> = {},
): CommentProgress {
  return {
    completedPullRequests,
    totalPullRequests,
    activeRequests: completedPullRequests === totalPullRequests ? 0 : commentProcessingConcurrency,
    commentsCreated: 0,
    commentsUpdated: 0,
    commentsUnchanged: 0,
    failures: 0,
    elapsedMilliseconds,
    ...overrides,
  };
}

describe('release appearance Actions progress reporter', () => {
  it('reports discovery start, percentage boundaries, and completion', () => {
    const fakeActionsCore = createFakeActionsCore();
    const reporter = createTestReporter(fakeActionsCore);

    reporter.reportDiscoveryStarted(createDiscoveryProgress(0, 20, 0));
    reporter.reportDiscoveryProgress(createDiscoveryProgress(1, 20, 1_000));
    reporter.reportDiscoveryProgress(createDiscoveryProgress(2, 20, 1_000));
    reporter.reportDiscoveryCompleted(createDiscoveryProgress(20, 20, 2_000));

    expect(fakeActionsCore.groups).toEqual(['Discover pull requests']);
    expect(fakeActionsCore.endedGroups).toHaveLength(1);
    expect(fakeActionsCore.informationMessages[0]).toBe(
      `Release appearance: discovering pull requests for 20 commits with concurrency ${pullRequestDiscoveryConcurrency}`,
    );
    expect(fakeActionsCore.informationMessages).toContain(
      'Release appearance: discovery 2/20 (10%) · 2 PRs · 0 failures · 8 active · elapsed 1s',
    );
    expect(fakeActionsCore.informationMessages.at(-1)).toBe(
      'Release appearance: discovery 20/20 (100%) · 20 PRs · 0 failures · 0 active · elapsed 2s',
    );
    expect(fakeActionsCore.informationMessages.join('\n')).not.toMatch(/\x1B|::group::|::endgroup::/u);
  });

  it('reports comment operation counters and closes the group', () => {
    const fakeActionsCore = createFakeActionsCore();
    const reporter = createTestReporter(fakeActionsCore);

    reporter.reportCommentProcessingStarted(createCommentProgress(0, 10, 0));
    reporter.reportCommentProcessingProgress(
      createCommentProgress(1, 10, 3_000, {
        commentsCreated: 1,
        commentsUpdated: 2,
        commentsUnchanged: 3,
        failures: 4,
        activeRequests: 4,
      }),
    );
    reporter.reportCommentProcessingCompleted(
      createCommentProgress(10, 10, 21_000, {
        commentsCreated: 6,
        commentsUpdated: 2,
        commentsUnchanged: 1,
        failures: 1,
      }),
    );

    expect(fakeActionsCore.groups).toEqual(['Process release-appearance comments']);
    expect(fakeActionsCore.endedGroups).toHaveLength(1);
    expect(fakeActionsCore.informationMessages[0]).toBe(
      `Release appearance: processing comments for 10 PRs with concurrency ${commentProcessingConcurrency}`,
    );
    expect(fakeActionsCore.informationMessages).toContain(
      'Release appearance: comments 1/10 (10%) · created 1 · updated 2 · unchanged 3 · failed 4 · 4 active · elapsed 3s',
    );
    expect(fakeActionsCore.informationMessages.at(-1)).toBe(
      'Release appearance: comments 10/10 (100%) · created 6 · updated 2 · unchanged 1 · failed 1 · 0 active · elapsed 21s',
    );
  });

  it('renders zero-item phases without dividing by zero', () => {
    const fakeActionsCore = createFakeActionsCore();
    const reporter = createTestReporter(fakeActionsCore);

    reporter.reportDiscoveryStarted(createDiscoveryProgress(0, 0, 0, {activeRequests: 0}));
    reporter.reportDiscoveryCompleted(createDiscoveryProgress(0, 0, 0, {activeRequests: 0}));
    reporter.reportCommentProcessingStarted(createCommentProgress(0, 0, 0, {activeRequests: 0}));
    reporter.reportCommentProcessingCompleted(createCommentProgress(0, 0, 0, {activeRequests: 0}));

    expect(fakeActionsCore.informationMessages).toContain(
      'Release appearance: no commits require pull-request discovery',
    );
    expect(fakeActionsCore.informationMessages).toContain(
      'Release appearance: no pull-request comments require processing',
    );
    expect(fakeActionsCore.informationMessages).toContain(
      'Release appearance: discovery 0/0 (100%) · 0 PRs · 0 failures · 0 active · elapsed 0s',
    );
    expect(fakeActionsCore.informationMessages).toContain(
      'Release appearance: comments 0/0 (100%) · created 0 · updated 0 · unchanged 0 · failed 0 · 0 active · elapsed 0s',
    );
    expect(fakeActionsCore.endedGroups).toHaveLength(2);
  });

  it('does not emit a line for every completed item', () => {
    const fakeActionsCore = createFakeActionsCore();
    const reporter = createTestReporter(fakeActionsCore);

    reporter.reportDiscoveryStarted(createDiscoveryProgress(0, 100, 0));
    for (let completedCommits = 1; completedCommits <= 100; completedCommits += 1) {
      reporter.reportDiscoveryProgress(createDiscoveryProgress(completedCommits, 100, 0));
    }
    reporter.reportDiscoveryCompleted(createDiscoveryProgress(100, 100, 0));

    expect(fakeActionsCore.informationMessages).toHaveLength(12);
    expect(fakeActionsCore.informationMessages.at(-1)).toContain('(100%)');
  });

  it('closes an Actions group when completion output fails', () => {
    const fakeActionsCore = createFakeActionsCore();
    const reporter = createTestReporter(fakeActionsCore);
    reporter.reportDiscoveryStarted(createDiscoveryProgress(0, 1, 0));
    fakeActionsCore.shouldFailInformation = true;

    assert.throws(() => {
      reporter.reportDiscoveryCompleted(createDiscoveryProgress(1, 1, 0));
    }, /progress output failed/u);
    expect(fakeActionsCore.endedGroups).toHaveLength(1);
  });

  it('provides a no-operation reporter', () => {
    const reporter = createNoOpReleaseAppearanceProgressReporter();
    const discoveryProgress = createDiscoveryProgress(0, 0, 0, {activeRequests: 0});
    const commentProgress = createCommentProgress(0, 0, 0, {activeRequests: 0});

    reporter.reportDiscoveryStarted(discoveryProgress);
    reporter.reportDiscoveryProgress(discoveryProgress);
    reporter.reportDiscoveryCompleted(discoveryProgress);
    reporter.reportCommentProcessingStarted(commentProgress);
    reporter.reportCommentProcessingProgress(commentProgress);
    reporter.reportCommentProcessingCompleted(commentProgress);

    expect(reporter).toBeDefined();
  });
});
