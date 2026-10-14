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

import {Maybe, Task} from 'true-myth';

import {pullRequestReleaseImpactLabels} from './pullRequestReleaseImpact.ts';
import type {PullRequestReleaseImpact} from './pullRequestReleaseImpact.ts';
import type {WebAppReleaseHistory} from './webappReleaseHistoryGit.ts';
import type {WebAppReleasePlanningPullRequest} from './webappReleasePlanningGitHubClient.ts';
import {discoverWebAppReleasePullRequests, planWebAppRelease} from './webappReleasePlan.ts';
import type {WebAppReleasePlanDependencies} from './webappReleasePlan.ts';

type PullRequestFactoryOptions = {
  readonly number: number;
  readonly title?: string;
  readonly baseBranch?: string;
  readonly mergedAt?: string | null;
  readonly labels: readonly string[];
};

type PlanningTestOptions = {
  readonly pullRequestsByCommit: ReadonlyMap<string, readonly WebAppReleasePlanningPullRequest[]>;
  readonly commitOrder: readonly string[];
};

const baseCommit = 'a'.repeat(40);
const targetCommit = 'b'.repeat(40);
const firstCommit = 'c'.repeat(40);
const secondCommit = 'd'.repeat(40);
const thirdCommit = 'e'.repeat(40);

function createPullRequest(options: PullRequestFactoryOptions): WebAppReleasePlanningPullRequest {
  return {
    number: options.number,
    title: options.title ?? `Pull request ${options.number}`,
    baseBranch: options.baseBranch ?? 'main',
    mergedAt: Maybe.of(options.mergedAt === undefined ? '2026-10-12T08:00:00Z' : options.mergedAt),
    labels: options.labels,
  };
}

function createPlanningTestDependencies(options: PlanningTestOptions): WebAppReleasePlanDependencies {
  const history: WebAppReleaseHistory = {
    baseCommit,
    targetCommit,
    commits: options.commitOrder,
  };

  return {
    readFirstParentHistory() {
      return Task.resolve(history);
    },
    listPullRequestsForCommit(listOptions) {
      return Task.resolve(options.pullRequestsByCommit.get(listOptions.commitSha) ?? []);
    },
  };
}

function createImpactPullRequest(
  number: number,
  releaseImpact: PullRequestReleaseImpact,
): WebAppReleasePlanningPullRequest {
  return createPullRequest({number, labels: [pullRequestReleaseImpactLabels[releaseImpact]]});
}

describe('WebApp release pull request discovery', () => {
  it('maps one first-parent commit to one merged main pull request', async () => {
    const pullRequest = createImpactPullRequest(101, 'minor');
    const actualPullRequestsResult = await discoverWebAppReleasePullRequests(
      {commits: [firstCommit]},
      {
        listPullRequestsForCommit() {
          return Task.resolve([pullRequest]);
        },
      },
    ).toPromise();

    assert(actualPullRequestsResult.isOk);
    expect(actualPullRequestsResult.value).toEqual([pullRequest]);
  });

  it('deduplicates a pull request associated with several first-parent commits', async () => {
    const pullRequest = createImpactPullRequest(102, 'patch');
    const actualPullRequestsResult = await discoverWebAppReleasePullRequests(
      {commits: [firstCommit, secondCommit]},
      {
        listPullRequestsForCommit() {
          return Task.resolve([pullRequest]);
        },
      },
    ).toPromise();

    assert(actualPullRequestsResult.isOk);
    expect(actualPullRequestsResult.value).toEqual([pullRequest]);
  });

  it('preserves deterministic history order for several pull requests', async () => {
    const firstPullRequest = createImpactPullRequest(103, 'patch');
    const secondPullRequest = createImpactPullRequest(104, 'minor');
    const thirdPullRequest = createImpactPullRequest(105, 'patch');
    const pullRequestsByCommit = new Map([
      [firstCommit, [firstPullRequest]],
      [secondCommit, [secondPullRequest]],
      [thirdCommit, [thirdPullRequest]],
    ]);

    const actualPullRequestsResult = await discoverWebAppReleasePullRequests(
      {commits: [firstCommit, secondCommit, thirdCommit]},
      {
        listPullRequestsForCommit(listOptions) {
          return Task.resolve(pullRequestsByCommit.get(listOptions.commitSha) ?? []);
        },
      },
    ).toPromise();

    assert(actualPullRequestsResult.isOk);
    expect(actualPullRequestsResult.value).toEqual([firstPullRequest, secondPullRequest, thirdPullRequest]);
  });

  it('excludes unmerged pull requests and pull requests targeting another branch', async () => {
    const unrelatedPullRequest = createPullRequest({
      number: 106,
      baseBranch: 'release/1.0.0',
      labels: [pullRequestReleaseImpactLabels.patch],
    });
    const unmergedPullRequest = createPullRequest({
      number: 107,
      mergedAt: null,
      labels: [pullRequestReleaseImpactLabels.patch],
    });
    const mainPullRequest = createImpactPullRequest(108, 'minor');
    const actualPullRequestsResult = await discoverWebAppReleasePullRequests(
      {commits: [firstCommit]},
      {
        listPullRequestsForCommit() {
          return Task.resolve([unrelatedPullRequest, unmergedPullRequest, mainPullRequest]);
        },
      },
    ).toPromise();

    assert(actualPullRequestsResult.isOk);
    expect(actualPullRequestsResult.value).toEqual([mainPullRequest]);
  });

  it('fails with the commit SHA when a commit has no merged main pull request', async () => {
    const actualPullRequestsResult = await discoverWebAppReleasePullRequests(
      {commits: [firstCommit]},
      {
        listPullRequestsForCommit() {
          return Task.resolve([]);
        },
      },
    ).toPromise();

    assert(actualPullRequestsResult.isErr);
    expect(actualPullRequestsResult.error.message).toContain(firstCommit);
  });

  it('fails when more than one merged main pull request is associated with a commit', async () => {
    const firstPullRequest = createImpactPullRequest(109, 'minor');
    const secondPullRequest = createImpactPullRequest(110, 'patch');
    const actualPullRequestsResult = await discoverWebAppReleasePullRequests(
      {commits: [firstCommit]},
      {
        listPullRequestsForCommit() {
          return Task.resolve([firstPullRequest, secondPullRequest]);
        },
      },
    ).toPromise();

    assert(actualPullRequestsResult.isErr);
    expect(actualPullRequestsResult.error.message).toContain(firstCommit);
    expect(actualPullRequestsResult.error.message).toContain('#109');
    expect(actualPullRequestsResult.error.message).toContain('#110');
  });
});

describe('WebApp release plan', () => {
  it.each([
    {releaseImpacts: ['patch'], expectedVersionBump: 'patch', expectedNextVersion: '1.0.1'},
    {releaseImpacts: ['patch', 'minor'], expectedVersionBump: 'minor', expectedNextVersion: '1.1.0'},
    {releaseImpacts: ['minor', 'major'], expectedVersionBump: 'major', expectedNextVersion: '2.0.0'},
    {releaseImpacts: ['none', 'patch'], expectedVersionBump: 'patch', expectedNextVersion: '1.0.1'},
  ] as const)('resolves $releaseImpacts to $expectedNextVersion', async options => {
    const pullRequestsByCommit = new Map(
      options.releaseImpacts.map((releaseImpact, impactIndex) => {
        const commitSha = [firstCommit, secondCommit, thirdCommit].at(impactIndex);
        assert(commitSha !== undefined);

        return [commitSha, [createImpactPullRequest(120 + impactIndex, releaseImpact)]] as const;
      }),
    );
    const dependencies = createPlanningTestDependencies({
      pullRequestsByCommit,
      commitOrder: [...pullRequestsByCommit.keys()],
    });

    const actualPlanResult = await planWebAppRelease(
      {baseCommit, targetCommit, currentVersion: '1.0.0'},
      dependencies,
    ).toPromise();

    assert(actualPlanResult.isOk);
    expect(actualPlanResult.value.versionBump).toBe(options.expectedVersionBump);
    expect(actualPlanResult.value.nextVersion).toBe(options.expectedNextVersion);
  });

  it('fails with the existing no-impact diagnostic when every pull request is semver:none', async () => {
    const dependencies = createPlanningTestDependencies({
      pullRequestsByCommit: new Map([[firstCommit, [createImpactPullRequest(130, 'none')]]]),
      commitOrder: [firstCommit],
    });

    const actualPlanResult = await planWebAppRelease(
      {baseCommit, targetCommit, currentVersion: '1.0.0'},
      dependencies,
    ).toPromise();

    assert(actualPlanResult.isErr);
    expect(actualPlanResult.error.message).toBe('No release-impacting WebApp changes are present');
  });

  it('fails and identifies a pull request without a SemVer label', async () => {
    const dependencies = createPlanningTestDependencies({
      pullRequestsByCommit: new Map([[firstCommit, [createPullRequest({number: 131, labels: ['renovate']})]]]),
      commitOrder: [firstCommit],
    });

    const actualPlanResult = await planWebAppRelease(
      {baseCommit, targetCommit, currentVersion: '1.0.0'},
      dependencies,
    ).toPromise();

    assert(actualPlanResult.isErr);
    expect(actualPlanResult.error.message).toContain('Pull request #131');
    expect(actualPlanResult.error.message).toContain('no release-impact label');
  });

  it('fails and identifies a pull request with conflicting SemVer labels', async () => {
    const dependencies = createPlanningTestDependencies({
      pullRequestsByCommit: new Map([
        [
          firstCommit,
          [
            createPullRequest({
              number: 132,
              labels: [pullRequestReleaseImpactLabels.patch, pullRequestReleaseImpactLabels.minor],
            }),
          ],
        ],
      ]),
      commitOrder: [firstCommit],
    });

    const actualPlanResult = await planWebAppRelease(
      {baseCommit, targetCommit, currentVersion: '1.0.0'},
      dependencies,
    ).toPromise();

    assert(actualPlanResult.isErr);
    expect(actualPlanResult.error.message).toContain('Pull request #132');
    expect(actualPlanResult.error.message).toContain('conflicting release-impact labels');
  });
});
