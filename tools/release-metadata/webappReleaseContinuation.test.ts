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

import {Result} from 'true-myth';

import {continueActiveWebAppRelease} from './webappReleaseReservation.ts';
import type {
  ContinueActiveWebAppReleaseDependencies,
  VerifyWebAppReleaseCommitAncestorOptions,
  WebAppReleaseBranchRef,
} from './webappReleaseReservation.ts';
import type {StableWebAppRelease} from './webappStableReleaseGit.ts';
import {validateWebAppVersion} from './webappVersion.ts';

type ContinuationTestOptions = {
  readonly stableReleases?: readonly StableWebAppRelease[];
  readonly releaseBranches?: readonly WebAppReleaseBranchRef[];
  readonly ancestorResult?: Result<boolean, Error>;
};

type ContinuationTestDependencies = {
  readonly dependencies: ContinueActiveWebAppReleaseDependencies;
  readonly ancestorCalls: Array<VerifyWebAppReleaseCommitAncestorOptions>;
};

type CreateStableReleaseOptions = {
  readonly version: string;
  readonly tagName: string;
  readonly commitSha: string;
};

const stableCommit = 'a'.repeat(40);
const activeReleaseCommit = 'b'.repeat(40);
const otherReleaseCommit = 'c'.repeat(40);

function createStableRelease(options: CreateStableReleaseOptions): StableWebAppRelease {
  const versionResult = validateWebAppVersion(options.version);
  assert(versionResult.isOk);

  return Object.freeze({version: versionResult.value, tagName: options.tagName, commitSha: options.commitSha});
}

function createContinuationTestDependencies(options: ContinuationTestOptions = {}): ContinuationTestDependencies {
  const ancestorCalls: Array<VerifyWebAppReleaseCommitAncestorOptions> = [];
  const stableReleases = options.stableReleases ?? [
    createStableRelease({version: '1.0.0', tagName: 'v1.0.0', commitSha: stableCommit}),
  ];

  async function readStableWebAppReleases(): Promise<Result<readonly StableWebAppRelease[], Error>> {
    return Result.ok(stableReleases);
  }

  async function readRemoteReleaseBranches(): Promise<Result<readonly WebAppReleaseBranchRef[], Error>> {
    return Result.ok(options.releaseBranches ?? []);
  }

  async function isCommitAncestor(
    ancestorOptions: VerifyWebAppReleaseCommitAncestorOptions,
  ): Promise<Result<boolean, Error>> {
    ancestorCalls.push(ancestorOptions);

    return options.ancestorResult ?? Result.ok(true);
  }

  return {
    ancestorCalls,
    dependencies: {
      readStableWebAppReleases,
      readRemoteReleaseBranches,
      isCommitAncestor,
    },
  };
}

describe('WebApp release continuation', () => {
  it('continues the single active reservation at its current commit without planning', async () => {
    const testDependencies = createContinuationTestDependencies({
      releaseBranches: [{releaseBranch: 'release/1.1.0', releaseCommitSha: activeReleaseCommit}],
    });

    const actualContinuationResult = await continueActiveWebAppRelease({dependencies: testDependencies.dependencies});

    assert(actualContinuationResult.isOk);
    expect(actualContinuationResult.value).toEqual({
      version: '1.1.0',
      releaseBranch: 'release/1.1.0',
      releaseCommitSha: activeReleaseCommit,
      stableBaseVersion: '1.0.0',
      stableBaseTag: 'v1.0.0',
      stableBaseCommitSha: stableCommit,
      action: 'reused',
    });
    expect(testDependencies.ancestorCalls).toEqual([{baseCommit: stableCommit, targetCommit: activeReleaseCommit}]);
  });

  it('uses the latest stable SemVer release as the ancestry base', async () => {
    const latestStableCommit = 'd'.repeat(40);
    const testDependencies = createContinuationTestDependencies({
      stableReleases: [
        createStableRelease({version: '1.0.0', tagName: 'v1.0.0', commitSha: stableCommit}),
        createStableRelease({version: '1.1.0', tagName: 'v1.1.0', commitSha: latestStableCommit}),
      ],
      releaseBranches: [{releaseBranch: 'release/1.2.0', releaseCommitSha: activeReleaseCommit}],
    });

    const actualContinuationResult = await continueActiveWebAppRelease({dependencies: testDependencies.dependencies});

    assert(actualContinuationResult.isOk);
    expect(actualContinuationResult.value.stableBaseVersion).toBe('1.1.0');
    expect(actualContinuationResult.value.stableBaseTag).toBe('v1.1.0');
    expect(actualContinuationResult.value.stableBaseCommitSha).toBe(latestStableCommit);
    expect(testDependencies.ancestorCalls).toEqual([
      {baseCommit: latestStableCommit, targetCommit: activeReleaseCommit},
    ]);
  });

  it('fails with a precise diagnostic when there is no active SemVer release', async () => {
    const testDependencies = createContinuationTestDependencies({
      releaseBranches: [{releaseBranch: 'release/1.0.0', releaseCommitSha: stableCommit}],
    });

    const actualContinuationResult = await continueActiveWebAppRelease({dependencies: testDependencies.dependencies});

    assert(actualContinuationResult.isErr);
    expect(actualContinuationResult.error.message).toBe('No active WebApp SemVer release exists');
    expect(testDependencies.ancestorCalls).toEqual([]);
  });

  it('fails closed when multiple SemVer releases are unresolved', async () => {
    const testDependencies = createContinuationTestDependencies({
      releaseBranches: [
        {releaseBranch: 'release/1.1.0', releaseCommitSha: activeReleaseCommit},
        {releaseBranch: 'release/1.2.0', releaseCommitSha: otherReleaseCommit},
      ],
    });

    const actualContinuationResult = await continueActiveWebAppRelease({dependencies: testDependencies.dependencies});

    assert(actualContinuationResult.isErr);
    expect(actualContinuationResult.error.message).toBe(
      'Multiple unresolved WebApp release reservations exist: release/1.1.0, release/1.2.0',
    );
    expect(testDependencies.ancestorCalls).toEqual([]);
  });

  it('fails closed when a stable tag and same-version release branch disagree', async () => {
    const stableTagCommit = 'd'.repeat(40);
    const testDependencies = createContinuationTestDependencies({
      stableReleases: [
        createStableRelease({version: '1.0.0', tagName: 'v1.0.0', commitSha: stableCommit}),
        createStableRelease({version: '1.1.0', tagName: 'v1.1.0', commitSha: stableTagCommit}),
      ],
      releaseBranches: [{releaseBranch: 'release/1.1.0', releaseCommitSha: activeReleaseCommit}],
    });

    const actualContinuationResult = await continueActiveWebAppRelease({dependencies: testDependencies.dependencies});

    assert(actualContinuationResult.isErr);
    expect(actualContinuationResult.error.message).toContain('WebApp release reservation commit mismatch');
    expect(testDependencies.ancestorCalls).toEqual([]);
  });

  it('fails when the latest stable Production commit is not an ancestor of the active head', async () => {
    const testDependencies = createContinuationTestDependencies({
      releaseBranches: [{releaseBranch: 'release/1.1.0', releaseCommitSha: activeReleaseCommit}],
      ancestorResult: Result.ok(false),
    });

    const actualContinuationResult = await continueActiveWebAppRelease({dependencies: testDependencies.dependencies});

    assert(actualContinuationResult.isErr);
    expect(actualContinuationResult.error.message).toBe(
      `Stable WebApp release v1.0.0 commit is not an ancestor of active release commit ${activeReleaseCommit}`,
    );
    expect(testDependencies.ancestorCalls).toEqual([{baseCommit: stableCommit, targetCommit: activeReleaseCommit}]);
  });

  it('ignores legacy date branches while continuing the one active SemVer release', async () => {
    const testDependencies = createContinuationTestDependencies({
      releaseBranches: [
        {releaseBranch: 'release/2026-10-06.1', releaseCommitSha: otherReleaseCommit},
        {releaseBranch: 'release/1.1.0', releaseCommitSha: activeReleaseCommit},
      ],
    });

    const actualContinuationResult = await continueActiveWebAppRelease({dependencies: testDependencies.dependencies});

    assert(actualContinuationResult.isOk);
    expect(actualContinuationResult.value.releaseBranch).toBe('release/1.1.0');
    expect(actualContinuationResult.value.releaseCommitSha).toBe(activeReleaseCommit);
  });

  it('fails closed for a malformed likely-SemVer release branch', async () => {
    const testDependencies = createContinuationTestDependencies({
      releaseBranches: [{releaseBranch: 'release/1.1', releaseCommitSha: activeReleaseCommit}],
    });

    const actualContinuationResult = await continueActiveWebAppRelease({dependencies: testDependencies.dependencies});

    assert(actualContinuationResult.isErr);
    expect(actualContinuationResult.error.message).toContain('Malformed SemVer WebApp release branch');
    expect(testDependencies.ancestorCalls).toEqual([]);
  });
});
