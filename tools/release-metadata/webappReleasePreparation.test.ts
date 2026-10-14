/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import assert from 'node:assert';

import {Task, Unit} from 'true-myth';

import {prepareWebAppRelease} from './webappReleaseReservation.ts';
import type {
  CreateWebAppReleaseReservationBranchOptions,
  PrepareRemoteReleaseBranchCommitOptions,
  PrepareWebAppReleaseDependencies,
  PrepareWebAppReleaseOptions,
  VerifyWebAppReleaseCommitAncestorOptions,
  WebAppReleaseBranchRef,
} from './webappReleaseReservation.ts';
import type {StableWebAppRelease} from './webappStableReleaseGit.ts';
import {validateWebAppVersion} from './webappVersion.ts';

const stableCommitSha = 'a'.repeat(40);
const dispatchCommitSha = 'b'.repeat(40);
const activeReleaseCommitSha = 'c'.repeat(40);
const advancedReleaseCommitSha = 'd'.repeat(40);

type PreparationTestOptions = {
  readonly releaseBranches?: readonly WebAppReleaseBranchRef[];
  readonly branchCommitPreparation?: (options: PrepareRemoteReleaseBranchCommitOptions) => Task<Unit, Error>;
};

type PreparationTestDependencies = {
  readonly dependencies: PrepareWebAppReleaseDependencies;
  readonly plannedVersions: string[];
  readonly createdBranches: CreateWebAppReleaseReservationBranchOptions[];
  readonly preparedBranchCommits: PrepareRemoteReleaseBranchCommitOptions[];
  readonly ancestorChecks: VerifyWebAppReleaseCommitAncestorOptions[];
};

function createStableRelease(version: string, tagName: string, commitSha: string): StableWebAppRelease {
  const versionResult = validateWebAppVersion(version);
  assert(versionResult.isOk);

  return {version: versionResult.value, tagName, commitSha};
}

function createPreparationTestDependencies(options: PreparationTestOptions = {}): PreparationTestDependencies {
  const plannedVersions: string[] = [];
  const createdBranches: CreateWebAppReleaseReservationBranchOptions[] = [];
  const preparedBranchCommits: PrepareRemoteReleaseBranchCommitOptions[] = [];
  const ancestorChecks: VerifyWebAppReleaseCommitAncestorOptions[] = [];
  const stableReleases = [createStableRelease('1.0.0', 'v1.0.0', stableCommitSha)];

  const dependencies: PrepareWebAppReleaseDependencies = {
    readStableWebAppReleases() {
      return Task.resolve(stableReleases);
    },
    readRemoteReleaseBranches() {
      return Task.resolve(options.releaseBranches ?? []);
    },
    isCommitAncestor(ancestorOptions) {
      ancestorChecks.push(ancestorOptions);

      return Task.resolve(true);
    },
    planNextWebAppRelease(planOptions) {
      plannedVersions.push(planOptions.currentVersion);
      const nextVersionResult = validateWebAppVersion('1.1.0');
      assert(nextVersionResult.isOk);

      return Task.resolve({
        baseCommit: stableCommitSha,
        targetCommit: planOptions.targetCommit,
        currentVersion: planOptions.currentVersion,
        versionBump: 'minor',
        nextVersion: nextVersionResult.value,
        pullRequests: [],
      });
    },
    createReleaseBranch(branchOptions) {
      createdBranches.push(branchOptions);

      return Task.resolve('created');
    },
    prepareRemoteReleaseBranchCommit(branchOptions) {
      preparedBranchCommits.push(branchOptions);

      return options.branchCommitPreparation === undefined
        ? Task.resolve(Unit)
        : options.branchCommitPreparation(branchOptions);
    },
  };

  return {dependencies, plannedVersions, createdBranches, preparedBranchCommits, ancestorChecks};
}

function prepareRelease(
  options: PrepareWebAppReleaseOptions,
  dependencies: PrepareWebAppReleaseDependencies,
): ReturnType<typeof prepareWebAppRelease> {
  return prepareWebAppRelease(options, dependencies);
}

describe('prepareWebAppRelease', () => {
  it('start plans from v1.0.0 and creates release/1.1.0 at the exact dispatch SHA', async () => {
    const testDependencies = createPreparationTestDependencies();
    const actualResult = await prepareRelease(
      {operation: 'start', targetCommit: dispatchCommitSha},
      testDependencies.dependencies,
    ).toPromise();

    assert(actualResult.isOk);
    expect(actualResult.value).toMatchObject({
      operation: 'start',
      version: '1.1.0',
      releaseBranch: 'release/1.1.0',
      releaseCommitSha: dispatchCommitSha,
      stableBaseVersion: '1.0.0',
      stableBaseTag: 'v1.0.0',
      stableBaseCommitSha: stableCommitSha,
      action: 'created',
    });
    expect(testDependencies.plannedVersions).toEqual(['1.0.0']);
    expect(testDependencies.createdBranches).toEqual([
      {releaseBranch: 'release/1.1.0', targetCommit: dispatchCommitSha},
    ]);
  });

  it('continue reuses the active branch HEAD without planning or changing its ref', async () => {
    const testDependencies = createPreparationTestDependencies({
      releaseBranches: [{releaseBranch: 'release/1.1.0', releaseCommitSha: activeReleaseCommitSha}],
    });
    const actualResult = await prepareRelease({operation: 'continue'}, testDependencies.dependencies).toPromise();

    assert(actualResult.isOk);
    expect(actualResult.value).toMatchObject({
      operation: 'continue',
      version: '1.1.0',
      releaseBranch: 'release/1.1.0',
      releaseCommitSha: activeReleaseCommitSha,
      action: 'reused',
    });
    expect(testDependencies.plannedVersions).toEqual([]);
    expect(testDependencies.createdBranches).toEqual([]);
    expect(testDependencies.preparedBranchCommits).toEqual([
      {releaseBranch: 'release/1.1.0', expectedCommitSha: activeReleaseCommitSha},
    ]);
  });

  it('start fails when another release is active', async () => {
    const testDependencies = createPreparationTestDependencies({
      releaseBranches: [{releaseBranch: 'release/1.1.0', releaseCommitSha: activeReleaseCommitSha}],
    });
    const actualResult = await prepareRelease(
      {operation: 'start', targetCommit: dispatchCommitSha},
      testDependencies.dependencies,
    ).toPromise();

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('release reservation conflict');
    expect(testDependencies.plannedVersions).toEqual([]);
  });

  it('continue fails when no release is active', async () => {
    const testDependencies = createPreparationTestDependencies();
    const actualResult = await prepareRelease({operation: 'continue'}, testDependencies.dependencies).toPromise();

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('No active WebApp SemVer release exists');
  });

  it('preparation fails when multiple releases are active', async () => {
    const testDependencies = createPreparationTestDependencies({
      releaseBranches: [
        {releaseBranch: 'release/1.1.0', releaseCommitSha: activeReleaseCommitSha},
        {releaseBranch: 'release/1.2.0', releaseCommitSha: advancedReleaseCommitSha},
      ],
    });
    const actualResult = await prepareRelease({operation: 'continue'}, testDependencies.dependencies).toPromise();

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('Multiple unresolved WebApp release reservations exist');
  });

  it('continue fails with a retry error when the remote branch moves during verification', async () => {
    const testDependencies = createPreparationTestDependencies({
      releaseBranches: [{releaseBranch: 'release/1.1.0', releaseCommitSha: activeReleaseCommitSha}],
      branchCommitPreparation() {
        return Task.reject(new Error('Remote release branch moved; retry continuation'));
      },
    });
    const actualResult = await prepareRelease({operation: 'continue'}, testDependencies.dependencies).toPromise();

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('Remote release branch moved; retry continuation');
    expect(testDependencies.plannedVersions).toEqual([]);
  });
});
