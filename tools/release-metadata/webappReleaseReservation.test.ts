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

import {Maybe, Result} from 'true-myth';

import {planWebAppRelease} from './webappReleasePlan.ts';
import type {WebAppReleasePlan} from './webappReleasePlan.ts';
import {inspectActiveWebAppReleaseReservations, reserveWebAppRelease} from './webappReleaseReservation.ts';
import type {WebAppReleaseBranchRef, WebAppReleaseReservationDependencies} from './webappReleaseReservation.ts';
import type {StableWebAppRelease} from './webappStableReleaseGit.ts';
import {validateWebAppVersion} from './webappVersion.ts';

type ReservationTestOptions = {
  readonly stableReleases?: readonly StableWebAppRelease[];
  readonly releaseBranches?: readonly WebAppReleaseBranchRef[];
  readonly ancestorResult?: Result<boolean, Error>;
  readonly planResult?: Result<WebAppReleasePlan, Error>;
  readonly branchAction?: 'created' | 'reused';
};

type ReservationTestDependencies = {
  readonly dependencies: WebAppReleaseReservationDependencies;
  readonly plannerCalls: Array<Parameters<WebAppReleaseReservationDependencies['planNextWebAppRelease']>[0]>;
  readonly branchCreationCalls: Array<Parameters<WebAppReleaseReservationDependencies['createReleaseBranch']>[0]>;
};

type CreateStableReleaseOptions = {
  readonly version: string;
  readonly tagName: string;
  readonly commitSha: string;
};

const stableCommit = 'a'.repeat(40);
const targetCommit = 'b'.repeat(40);
const otherCommit = 'c'.repeat(40);

function createStableRelease(options: CreateStableReleaseOptions): StableWebAppRelease {
  const versionResult = validateWebAppVersion(options.version);
  assert(versionResult.isOk);

  return Object.freeze({version: versionResult.value, tagName: options.tagName, commitSha: options.commitSha});
}

function createReleasePlan(nextVersion: string): WebAppReleasePlan {
  const currentVersionResult = validateWebAppVersion('1.0.0');
  const nextVersionResult = validateWebAppVersion(nextVersion);
  assert(currentVersionResult.isOk);
  assert(nextVersionResult.isOk);

  return Object.freeze({
    baseCommit: stableCommit,
    targetCommit,
    currentVersion: currentVersionResult.value,
    versionBump: 'minor',
    nextVersion: nextVersionResult.value,
    pullRequests: Object.freeze([]),
  });
}

function createReservationTestDependencies(options: ReservationTestOptions = {}): ReservationTestDependencies {
  const plannerCalls: Array<Parameters<WebAppReleaseReservationDependencies['planNextWebAppRelease']>[0]> = [];
  const branchCreationCalls: Array<Parameters<WebAppReleaseReservationDependencies['createReleaseBranch']>[0]> = [];
  const stableReleases = options.stableReleases ?? [
    createStableRelease({version: '1.0.0', tagName: 'v1.0.0', commitSha: stableCommit}),
  ];

  return {
    plannerCalls,
    branchCreationCalls,
    dependencies: {
      async readStableWebAppReleases() {
        return Result.ok(stableReleases);
      },
      async readRemoteReleaseBranches() {
        return Result.ok(options.releaseBranches ?? []);
      },
      async isCommitAncestor() {
        return options.ancestorResult ?? Result.ok(true);
      },
      async planNextWebAppRelease(planOptions) {
        plannerCalls.push(planOptions);

        return options.planResult ?? Result.ok(createReleasePlan('1.1.0'));
      },
      async createReleaseBranch(branchOptions) {
        branchCreationCalls.push(branchOptions);

        return Result.ok(options.branchAction ?? 'created');
      },
    },
  };
}

describe('WebApp release reservation inspection', () => {
  it('returns no active reservation when no SemVer release branch exists', () => {
    const actualReservationsResult = inspectActiveWebAppReleaseReservations({
      stableReleases: [createStableRelease({version: '1.0.0', tagName: 'v1.0.0', commitSha: stableCommit})],
      releaseBranches: [],
    });

    assert(actualReservationsResult.isOk);
    expect(actualReservationsResult.value).toEqual([]);
  });

  it('ignores a completed branch and a legacy date release branch', () => {
    const actualReservationsResult = inspectActiveWebAppReleaseReservations({
      stableReleases: [
        createStableRelease({version: '1.0.0', tagName: 'v1.0.0', commitSha: stableCommit}),
        createStableRelease({version: '1.1.0', tagName: 'v1.1.0', commitSha: targetCommit}),
      ],
      releaseBranches: [
        {releaseBranch: 'release/1.1.0', releaseCommitSha: targetCommit},
        {releaseBranch: 'release/2026-10-06.1', releaseCommitSha: otherCommit},
      ],
    });

    assert(actualReservationsResult.isOk);
    expect(actualReservationsResult.value).toEqual([]);
  });

  it('finds one unresolved SemVer release branch', () => {
    const actualReservationsResult = inspectActiveWebAppReleaseReservations({
      stableReleases: [createStableRelease({version: '1.0.0', tagName: 'v1.0.0', commitSha: stableCommit})],
      releaseBranches: [{releaseBranch: 'release/1.1.0', releaseCommitSha: targetCommit}],
    });

    assert(actualReservationsResult.isOk);
    expect(actualReservationsResult.value).toEqual([{releaseBranch: 'release/1.1.0', releaseCommitSha: targetCommit}]);
  });

  it('fails closed for a malformed SemVer-shaped release branch', () => {
    const actualReservationsResult = inspectActiveWebAppReleaseReservations({
      stableReleases: [createStableRelease({version: '1.0.0', tagName: 'v1.0.0', commitSha: stableCommit})],
      releaseBranches: [{releaseBranch: 'release/1.1', releaseCommitSha: targetCommit}],
    });

    assert(actualReservationsResult.isErr);
    expect(actualReservationsResult.error.message).toContain('Malformed SemVer WebApp release branch');
  });
});

describe('WebApp release reservation allocation', () => {
  it('uses the release planner and creates the planned branch at the exact target commit', async () => {
    const testDependencies = createReservationTestDependencies();

    const actualReservationResult = await reserveWebAppRelease({
      targetCommit,
      dependencies: testDependencies.dependencies,
    });

    assert(actualReservationResult.isOk);
    expect(actualReservationResult.value).toEqual({
      version: '1.1.0',
      releaseBranch: 'release/1.1.0',
      releaseCommitSha: targetCommit,
      stableBaseVersion: '1.0.0',
      stableBaseTag: 'v1.0.0',
      stableBaseCommitSha: stableCommit,
      action: 'created',
    });
    expect(testDependencies.plannerCalls).toEqual([{currentVersion: '1.0.0', baseCommit: stableCommit, targetCommit}]);
    expect(testDependencies.branchCreationCalls).toEqual([{releaseBranch: 'release/1.1.0', targetCommit}]);
  });

  it('does not create a reservation when the release planner fails', async () => {
    const testDependencies = createReservationTestDependencies({
      planResult: Result.err(new Error('Release planning failed')),
    });

    const actualReservationResult = await reserveWebAppRelease({
      targetCommit,
      dependencies: testDependencies.dependencies,
    });

    assert(actualReservationResult.isErr);
    expect(actualReservationResult.error.message).toBe('Release planning failed');
    expect(testDependencies.plannerCalls).toEqual([{currentVersion: '1.0.0', baseCommit: stableCommit, targetCommit}]);
    expect(testDependencies.branchCreationCalls).toEqual([]);
  });

  it('reuses a matching active reservation without invoking the planner', async () => {
    const testDependencies = createReservationTestDependencies({
      releaseBranches: [{releaseBranch: 'release/1.4.0', releaseCommitSha: targetCommit}],
      planResult: Result.err(new Error('PR labels must not be recalculated')),
    });

    const actualReservationResult = await reserveWebAppRelease({
      targetCommit,
      dependencies: testDependencies.dependencies,
    });

    assert(actualReservationResult.isOk);
    expect(actualReservationResult.value).toEqual({
      version: '1.4.0',
      releaseBranch: 'release/1.4.0',
      releaseCommitSha: targetCommit,
      stableBaseVersion: '1.0.0',
      stableBaseTag: 'v1.0.0',
      stableBaseCommitSha: stableCommit,
      action: 'reused',
    });
    expect(testDependencies.plannerCalls).toEqual([]);
    expect(testDependencies.branchCreationCalls).toEqual([]);
  });

  it('fails when an active reservation points to a different target commit', async () => {
    const testDependencies = createReservationTestDependencies({
      releaseBranches: [{releaseBranch: 'release/1.4.0', releaseCommitSha: otherCommit}],
    });

    const actualReservationResult = await reserveWebAppRelease({
      targetCommit,
      dependencies: testDependencies.dependencies,
    });

    assert(actualReservationResult.isErr);
    expect(actualReservationResult.error.message).toContain('WebApp release reservation conflict');
    expect(testDependencies.plannerCalls).toEqual([]);
    expect(testDependencies.branchCreationCalls).toEqual([]);
  });

  it('fails when more than one unresolved reservation exists', async () => {
    const testDependencies = createReservationTestDependencies({
      releaseBranches: [
        {releaseBranch: 'release/1.1.0', releaseCommitSha: targetCommit},
        {releaseBranch: 'release/2.0.0', releaseCommitSha: otherCommit},
      ],
    });

    const actualReservationResult = await reserveWebAppRelease({
      targetCommit,
      dependencies: testDependencies.dependencies,
    });

    assert(actualReservationResult.isErr);
    expect(actualReservationResult.error.message).toContain('Multiple unresolved WebApp release reservations');
    expect(testDependencies.plannerCalls).toEqual([]);
  });

  it('fails explicitly when no stable release exists', async () => {
    const testDependencies = createReservationTestDependencies({stableReleases: []});

    const actualReservationResult = await reserveWebAppRelease({
      targetCommit,
      dependencies: testDependencies.dependencies,
    });

    assert(actualReservationResult.isErr);
    expect(actualReservationResult.error.message).toContain('No stable WebApp SemVer tag exists');
    expect(testDependencies.plannerCalls).toEqual([]);
    expect(testDependencies.branchCreationCalls).toEqual([]);
  });

  it('treats a completed branch and tag pair as historical before planning the next version', async () => {
    const latestStableCommit = 'd'.repeat(40);
    const testDependencies = createReservationTestDependencies({
      stableReleases: [
        createStableRelease({version: '1.0.0', tagName: 'v1.0.0', commitSha: stableCommit}),
        createStableRelease({version: '1.1.0', tagName: 'v1.1.0', commitSha: latestStableCommit}),
      ],
      releaseBranches: [{releaseBranch: 'release/1.1.0', releaseCommitSha: targetCommit}],
      planResult: Result.ok(createReleasePlan('1.2.0')),
    });

    const actualReservationResult = await reserveWebAppRelease({
      targetCommit,
      dependencies: testDependencies.dependencies,
    });

    assert(actualReservationResult.isOk);
    expect(actualReservationResult.value.version).toBe('1.2.0');
    expect(testDependencies.plannerCalls).toEqual([
      {currentVersion: '1.1.0', baseCommit: latestStableCommit, targetCommit},
    ]);
  });

  it('rejects a stable base commit that is not an ancestor of the target', async () => {
    const testDependencies = createReservationTestDependencies({ancestorResult: Result.ok(false)});

    const actualReservationResult = await reserveWebAppRelease({
      targetCommit,
      dependencies: testDependencies.dependencies,
    });

    assert(actualReservationResult.isErr);
    expect(actualReservationResult.error.message).toContain('is not an ancestor of target commit');
    expect(testDependencies.plannerCalls).toEqual([]);
    expect(testDependencies.branchCreationCalls).toEqual([]);
  });

  it('does not create a branch when all merged pull requests are semver:none', async () => {
    const testDependencies = createReservationTestDependencies();
    const plannerCalls: Array<Parameters<WebAppReleaseReservationDependencies['planNextWebAppRelease']>[0]> = [];
    const dependencies: WebAppReleaseReservationDependencies = {
      ...testDependencies.dependencies,
      async planNextWebAppRelease(planOptions) {
        plannerCalls.push(planOptions);

        return planWebAppRelease({
          ...planOptions,
          dependencies: {
            async readFirstParentHistory() {
              return Result.ok({
                baseCommit: stableCommit,
                targetCommit,
                commits: [otherCommit],
              });
            },
            async listPullRequestsForCommit() {
              return Result.ok([
                {
                  number: 6789,
                  title: 'Update release documentation',
                  baseBranch: 'main',
                  mergedAt: Maybe.just('2026-10-10T12:00:00Z'),
                  labels: ['semver:none'],
                },
              ]);
            },
          },
        });
      },
    };

    const actualReservationResult = await reserveWebAppRelease({
      targetCommit,
      dependencies,
    });

    assert(actualReservationResult.isErr);
    expect(actualReservationResult.error.message).toBe('No release-impacting WebApp changes are present');
    expect(plannerCalls).toHaveLength(1);
    expect(testDependencies.branchCreationCalls).toEqual([]);
  });

  it('returns reused when a concurrent creator reports the same reservation', async () => {
    const testDependencies = createReservationTestDependencies({branchAction: 'reused'});

    const actualReservationResult = await reserveWebAppRelease({
      targetCommit,
      dependencies: testDependencies.dependencies,
    });

    assert(actualReservationResult.isOk);
    expect(actualReservationResult.value.action).toBe('reused');
  });

  it('rejects malformed target commits before reading Git state', async () => {
    const testDependencies = createReservationTestDependencies();

    const actualReservationResult = await reserveWebAppRelease({
      targetCommit: 'bad-sha',
      dependencies: testDependencies.dependencies,
    });

    assert(actualReservationResult.isErr);
    expect(actualReservationResult.error.message).toContain('Invalid target commit');
    expect(testDependencies.plannerCalls).toEqual([]);
  });
});
