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
  readonly mergeCommitSha?: string | null;
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
    mergeCommitSha: Maybe.of(options.mergeCommitSha),
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

  it('accepts one merged stacked pull request when its merge commit matches first-parent history', async () => {
    const pullRequest = createPullRequest({
      number: 111,
      baseBranch: 'WPB-29385-picker-foundation',
      mergeCommitSha: firstCommit,
      labels: [pullRequestReleaseImpactLabels.patch],
    });
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

  it('prefers a merged main pull request over an exact intermediate-branch association', async () => {
    const mainPullRequest = createImpactPullRequest(116, 'patch');
    const intermediatePullRequest = createPullRequest({
      number: 117,
      baseBranch: 'WPB-29385-picker-foundation',
      mergeCommitSha: firstCommit,
      labels: [pullRequestReleaseImpactLabels.minor],
    });
    const actualPullRequestsResult = await discoverWebAppReleasePullRequests(
      {commits: [firstCommit]},
      {
        listPullRequestsForCommit() {
          return Task.resolve([intermediatePullRequest, mainPullRequest]);
        },
      },
    ).toPromise();

    assert(actualPullRequestsResult.isOk);
    expect(actualPullRequestsResult.value).toEqual([mainPullRequest]);
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

  it('does not accept an unmerged stacked pull request', async () => {
    const unmergedPullRequest = createPullRequest({
      number: 112,
      baseBranch: 'WPB-29385-picker-foundation',
      mergedAt: null,
      mergeCommitSha: firstCommit,
      labels: [pullRequestReleaseImpactLabels.patch],
    });
    const actualPullRequestsResult = await discoverWebAppReleasePullRequests(
      {commits: [firstCommit]},
      {
        listPullRequestsForCommit() {
          return Task.resolve([unmergedPullRequest]);
        },
      },
    ).toPromise();

    assert(actualPullRequestsResult.isErr);
    expect(actualPullRequestsResult.error.message).toContain(firstCommit);
    expect(actualPullRequestsResult.error.message).toContain('No merged pull request');
  });

  it('rejects merged intermediate PR associations whose merge commit does not match history', async () => {
    const unrelatedPullRequest = createPullRequest({
      number: 113,
      baseBranch: 'WPB-29385-picker-foundation',
      mergeCommitSha: secondCommit,
      labels: [pullRequestReleaseImpactLabels.patch],
    });
    const actualPullRequestsResult = await discoverWebAppReleasePullRequests(
      {commits: [firstCommit]},
      {
        listPullRequestsForCommit() {
          return Task.resolve([unrelatedPullRequest]);
        },
      },
    ).toPromise();

    assert(actualPullRequestsResult.isErr);
    expect(actualPullRequestsResult.error.message).toContain(firstCommit);
    expect(actualPullRequestsResult.error.message).toContain('#113');
    expect(actualPullRequestsResult.error.message).toContain(secondCommit);
  });

  it('rejects intermediate PR associations without a merge commit SHA', async () => {
    const intermediatePullRequest = createPullRequest({
      number: 118,
      baseBranch: 'WPB-29385-picker-foundation',
      mergeCommitSha: null,
      labels: [pullRequestReleaseImpactLabels.patch],
    });
    const actualPullRequestsResult = await discoverWebAppReleasePullRequests(
      {commits: [firstCommit]},
      {
        listPullRequestsForCommit() {
          return Task.resolve([intermediatePullRequest]);
        },
      },
    ).toPromise();

    assert(actualPullRequestsResult.isErr);
    expect(actualPullRequestsResult.error.message).toContain('#118');
    expect(actualPullRequestsResult.error.message).toContain('missing merge commit SHA');
  });

  it.each(['release/1.1.0', 'maintenance/2026-10-12.1-airgap-a'])(
    'does not treat %s pull requests as intermediate stacked associations',
    async targetBranch => {
      const pullRequest = createPullRequest({
        number: 119,
        baseBranch: targetBranch,
        mergeCommitSha: firstCommit,
        labels: [pullRequestReleaseImpactLabels.patch],
      });
      const actualPullRequestsResult = await discoverWebAppReleasePullRequests(
        {commits: [firstCommit]},
        {
          listPullRequestsForCommit() {
            return Task.resolve([pullRequest]);
          },
        },
      ).toPromise();

      assert(actualPullRequestsResult.isErr);
      expect(actualPullRequestsResult.error.message).toContain(firstCommit);
    },
  );

  it('rejects multiple merged stacked PRs with the same matching merge commit', async () => {
    const firstPullRequest = createPullRequest({
      number: 114,
      baseBranch: 'WPB-29385-picker-foundation',
      mergeCommitSha: firstCommit,
      labels: [pullRequestReleaseImpactLabels.patch],
    });
    const secondPullRequest = createPullRequest({
      number: 115,
      baseBranch: 'WPB-29385-picker-foundation',
      mergeCommitSha: firstCommit,
      labels: [pullRequestReleaseImpactLabels.minor],
    });
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
    expect(actualPullRequestsResult.error.message).toContain('#114');
    expect(actualPullRequestsResult.error.message).toContain('#115');
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

  it('plans the #22780 and #22767 merge commits together in first-parent order', async () => {
    const mainMergeCommit = '70964704df2205e875f7f9e6fc4ff6150444699c';
    const stackedMergeCommit = 'a17fb94afb6cdfab47f274fbbd8ed0c91458be76';
    const mainPullRequest = createPullRequest({
      number: 22780,
      title: 'Build the picker foundation',
      baseBranch: 'main',
      mergeCommitSha: mainMergeCommit,
      labels: [pullRequestReleaseImpactLabels.patch],
    });
    const stackedPullRequest = createPullRequest({
      number: 22767,
      title: 'Reuse the folder picker',
      baseBranch: 'WPB-29385-picker-foundation',
      mergeCommitSha: stackedMergeCommit,
      labels: [pullRequestReleaseImpactLabels.patch],
    });
    const dependencies = createPlanningTestDependencies({
      pullRequestsByCommit: new Map([
        [mainMergeCommit, [mainPullRequest]],
        [stackedMergeCommit, [stackedPullRequest]],
      ]),
      commitOrder: [mainMergeCommit, stackedMergeCommit],
    });

    const actualPlanResult = await planWebAppRelease(
      {baseCommit, targetCommit, currentVersion: '1.0.0'},
      dependencies,
    ).toPromise();

    assert(actualPlanResult.isOk);
    expect(actualPlanResult.value.nextVersion).toBe('1.0.1');
    expect(
      actualPlanResult.value.pullRequests.map(pullRequest => {
        return pullRequest.number;
      }),
    ).toEqual([22780, 22767]);
  });

  it.each([
    {releaseImpact: 'minor', currentVersion: '1.0.0', expectedVersionBump: 'minor', expectedNextVersion: '1.1.0'},
    {releaseImpact: 'major', currentVersion: '1.0.0', expectedVersionBump: 'major', expectedNextVersion: '2.0.0'},
  ] as const)('includes a stacked semver:$releaseImpact impact in version planning', async options => {
    const pullRequest = createPullRequest({
      number: 140,
      baseBranch: 'WPB-29385-picker-foundation',
      mergeCommitSha: firstCommit,
      labels: [pullRequestReleaseImpactLabels[options.releaseImpact]],
    });
    const dependencies = createPlanningTestDependencies({
      pullRequestsByCommit: new Map([[firstCommit, [pullRequest]]]),
      commitOrder: [firstCommit],
    });

    const actualPlanResult = await planWebAppRelease(
      {baseCommit, targetCommit, currentVersion: options.currentVersion},
      dependencies,
    ).toPromise();

    assert(actualPlanResult.isOk);
    expect(actualPlanResult.value.versionBump).toBe(options.expectedVersionBump);
    expect(actualPlanResult.value.nextVersion).toBe(options.expectedNextVersion);
  });

  it('uses the highest impact across several stacked pull requests', async () => {
    const stackedPatchPullRequest = createPullRequest({
      number: 146,
      baseBranch: 'WPB-29385-picker-foundation',
      mergeCommitSha: firstCommit,
      labels: [pullRequestReleaseImpactLabels.patch],
    });
    const stackedMinorPullRequest = createPullRequest({
      number: 147,
      baseBranch: 'WPB-29385-picker-foundation',
      mergeCommitSha: secondCommit,
      labels: [pullRequestReleaseImpactLabels.minor],
    });
    const stackedMajorPullRequest = createPullRequest({
      number: 148,
      baseBranch: 'WPB-29385-picker-foundation',
      mergeCommitSha: thirdCommit,
      labels: [pullRequestReleaseImpactLabels.major],
    });
    const dependencies = createPlanningTestDependencies({
      pullRequestsByCommit: new Map([
        [firstCommit, [stackedPatchPullRequest]],
        [secondCommit, [stackedMinorPullRequest]],
        [thirdCommit, [stackedMajorPullRequest]],
      ]),
      commitOrder: [firstCommit, secondCommit, thirdCommit],
    });

    const actualPlanResult = await planWebAppRelease(
      {baseCommit, targetCommit, currentVersion: '1.0.0'},
      dependencies,
    ).toPromise();

    assert(actualPlanResult.isOk);
    expect(actualPlanResult.value.versionBump).toBe('major');
    expect(actualPlanResult.value.nextVersion).toBe('2.0.0');
    expect(
      actualPlanResult.value.pullRequests.map(pullRequest => {
        return pullRequest.releaseImpact;
      }),
    ).toEqual(['patch', 'minor', 'major']);
  });

  it('includes semver:none stacked PRs without letting them raise the version bump', async () => {
    const stackedNonePullRequest = createPullRequest({
      number: 141,
      baseBranch: 'WPB-29385-picker-foundation',
      mergeCommitSha: firstCommit,
      labels: [pullRequestReleaseImpactLabels.none],
    });
    const stackedPatchPullRequest = createPullRequest({
      number: 142,
      baseBranch: 'WPB-29385-picker-foundation',
      mergeCommitSha: secondCommit,
      labels: [pullRequestReleaseImpactLabels.patch],
    });
    const dependencies = createPlanningTestDependencies({
      pullRequestsByCommit: new Map([
        [firstCommit, [stackedNonePullRequest]],
        [secondCommit, [stackedPatchPullRequest]],
      ]),
      commitOrder: [firstCommit, secondCommit],
    });

    const actualPlanResult = await planWebAppRelease(
      {baseCommit, targetCommit, currentVersion: '1.0.0'},
      dependencies,
    ).toPromise();

    assert(actualPlanResult.isOk);
    expect(actualPlanResult.value.versionBump).toBe('patch');
    expect(actualPlanResult.value.nextVersion).toBe('1.0.1');
    expect(
      actualPlanResult.value.pullRequests.map(pullRequest => {
        return pullRequest.releaseImpact;
      }),
    ).toEqual(['none', 'patch']);
  });

  it('counts a pull request associated with multiple first-parent commits once in the plan', async () => {
    const pullRequest = createImpactPullRequest(143, 'minor');
    const dependencies = createPlanningTestDependencies({
      pullRequestsByCommit: new Map([
        [firstCommit, [pullRequest]],
        [secondCommit, [pullRequest]],
      ]),
      commitOrder: [firstCommit, secondCommit],
    });

    const actualPlanResult = await planWebAppRelease(
      {baseCommit, targetCommit, currentVersion: '1.0.0'},
      dependencies,
    ).toPromise();

    assert(actualPlanResult.isOk);
    expect(actualPlanResult.value.versionBump).toBe('minor');
    expect(actualPlanResult.value.pullRequests).toHaveLength(1);
    expect(actualPlanResult.value.pullRequests.at(0)?.number).toBe(143);
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

  it.each([
    {number: 144, labels: [], diagnostic: 'no release-impact label'},
    {
      number: 145,
      labels: [pullRequestReleaseImpactLabels.patch, pullRequestReleaseImpactLabels.minor],
      diagnostic: 'conflicting release-impact labels',
    },
  ])('rejects stacked PR #$number with invalid release-impact labels', async options => {
    const pullRequest = createPullRequest({
      number: options.number,
      baseBranch: 'WPB-29385-picker-foundation',
      mergeCommitSha: firstCommit,
      labels: options.labels,
    });
    const dependencies = createPlanningTestDependencies({
      pullRequestsByCommit: new Map([[firstCommit, [pullRequest]]]),
      commitOrder: [firstCommit],
    });

    const actualPlanResult = await planWebAppRelease(
      {baseCommit, targetCommit, currentVersion: '1.0.0'},
      dependencies,
    ).toPromise();

    assert(actualPlanResult.isErr);
    expect(actualPlanResult.error.message).toContain(`Pull request #${options.number}`);
    expect(actualPlanResult.error.message).toContain(options.diagnostic);
  });
});
