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

import {createWebAppVersionSynchronizationMarker} from './webappVersionSynchronization.ts';
import {webAppVersionSynchronizationPackageFilePaths} from './webappVersionSynchronizationGit.ts';
import type {
  WebAppVersionSynchronizationGitClient,
  WebAppVersionSynchronizationMainSnapshot,
} from './webappVersionSynchronizationGit.ts';
import type {WebAppVersionSynchronizationPullRequest} from './webappVersionSynchronization.ts';
import type {WebAppVersionSynchronizationGitHubClient} from './webappVersionSynchronizationGitHubClient.ts';
import {synchronizeWebAppVersion} from './webappVersionSynchronizationOrchestration.ts';
import type {
  WebAppVersionSynchronizationDependencies,
  WebAppVersionSynchronizationOptions,
  WebAppVersionSynchronizationResult,
} from './webappVersionSynchronizationOrchestration.ts';

type SynchronizationHarness = {
  readonly dependencies: WebAppVersionSynchronizationDependencies;
  readonly calls: {
    readonly branchCreations: string[];
    readonly commits: string[];
    readonly pullRequestLabels: number[];
    readonly pullRequests: WebAppVersionSynchronizationPullRequest[];
    readonly writtenVersions: string[];
  };
};

function createPackageDocument(version: string): Readonly<Record<string, unknown>> {
  return {name: '@wireapp/example', private: true, version, scripts: {test: 'jest'}};
}

function createPullRequest(options: {
  readonly number: number;
  readonly productionTagName?: string;
  readonly webAppVersion?: string;
  readonly state?: 'open' | 'closed';
  readonly mergedAt?: string | null;
}): WebAppVersionSynchronizationPullRequest {
  const productionTagName = options.productionTagName ?? 'v1.1.0';
  const webAppVersion = options.webAppVersion ?? '1.1.0';
  const markerResult = createWebAppVersionSynchronizationMarker(productionTagName);
  assert(markerResult.isOk);

  return {
    number: options.number,
    url: `https://github.com/wireapp/wire-webapp/pull/${options.number}`,
    title: `Update WebApp version to ${webAppVersion}`,
    body: markerResult.value,
    state: options.state ?? 'open',
    mergedAt: options.mergedAt ?? null,
    baseBranch: 'main',
    headBranch: `webapp-version-${webAppVersion}`,
  };
}

function createSynchronizationHarness(options: {
  readonly packageVersion: string;
  readonly pullRequests?: readonly WebAppVersionSynchronizationPullRequest[];
}): SynchronizationHarness {
  const mainSnapshot: WebAppVersionSynchronizationMainSnapshot = {
    commitSha: 'a'.repeat(40),
    rootPackageDocument: createPackageDocument(options.packageVersion),
    webAppPackageDocument: createPackageDocument(options.packageVersion),
  };
  const calls = {
    branchCreations: [] as string[],
    commits: [] as string[],
    pullRequestLabels: [] as number[],
    pullRequests: [...(options.pullRequests ?? [])],
    writtenVersions: [] as string[],
  };
  let workingTreePackageDocuments = {
    rootPackageDocument: mainSnapshot.rootPackageDocument,
    webAppPackageDocument: mainSnapshot.webAppPackageDocument,
  };

  const githubClient: WebAppVersionSynchronizationGitHubClient = {
    listPullRequests() {
      return Task.resolve(calls.pullRequests);
    },
    createPullRequest(createPullRequestOptions) {
      const synchronizationPullRequest: WebAppVersionSynchronizationPullRequest = {
        number: 50,
        url: 'https://github.com/wireapp/wire-webapp/pull/50',
        title: createPullRequestOptions.title,
        body: createPullRequestOptions.body,
        state: 'open',
        mergedAt: null,
        baseBranch: 'main',
        headBranch: createPullRequestOptions.headBranch,
      };
      calls.pullRequests.push(synchronizationPullRequest);

      return Task.resolve(synchronizationPullRequest);
    },
    ensurePullRequestSemVerNoneLabel(pullRequestNumber) {
      calls.pullRequestLabels.push(pullRequestNumber);

      return Task.resolve(Unit);
    },
  };

  const gitClient: WebAppVersionSynchronizationGitClient = {
    prepareLatestMain() {
      return Task.resolve(mainSnapshot);
    },
    inspectBranch() {
      return Task.resolve(undefined);
    },
    createBranchFromMain(branchOptions) {
      calls.branchCreations.push(branchOptions.branchName);

      return Task.resolve(Unit);
    },
    readWorkingTreePackageDocuments() {
      return Task.resolve(workingTreePackageDocuments);
    },
    writePackageDocuments(packageDocuments) {
      const packageVersion = packageDocuments.rootPackageDocument.version;
      assert(typeof packageVersion === 'string');
      calls.writtenVersions.push(packageVersion);
      workingTreePackageDocuments = packageDocuments;

      return Task.resolve(Unit);
    },
    getWorkingTreeChangedFilePaths() {
      return Task.resolve(webAppVersionSynchronizationPackageFilePaths);
    },
    commit(commitOptions) {
      calls.commits.push(commitOptions.message);

      return Task.resolve('b'.repeat(40));
    },
    pushBranch() {
      return Task.resolve(Unit);
    },
    verifyMainCommit() {
      return Task.resolve(Unit);
    },
  };

  return {dependencies: {githubClient, gitClient}, calls};
}

function createSynchronizationOptions(productionTagName: string): WebAppVersionSynchronizationOptions {
  return {
    productionTagName,
    commitAuthorName: 'Otto the Bot',
    commitAuthorEmail: 'otto@example.com',
  };
}

function synchronize(
  options: WebAppVersionSynchronizationOptions,
  dependencies: WebAppVersionSynchronizationDependencies,
): Task<WebAppVersionSynchronizationResult, Error> {
  return synchronizeWebAppVersion(options, dependencies);
}

describe('WebApp version synchronization orchestration', () => {
  it('synchronizes a SemVer Production version and creates its exact branch', async () => {
    const harness = createSynchronizationHarness({packageVersion: '1.0.0'});

    const actualResult = await synchronize(createSynchronizationOptions('v1.1.0'), harness.dependencies).toPromise();

    assert(actualResult.isOk);
    expect(actualResult.value).toMatchObject({
      action: 'created',
      productionTagName: 'v1.1.0',
      webAppVersion: '1.1.0',
      branchName: 'webapp-version-1.1.0',
      pullRequestNumber: 50,
    });
    expect(harness.calls.writtenVersions).toEqual(['1.1.0']);
    expect(harness.calls.branchCreations).toEqual(['webapp-version-1.1.0']);
    expect(harness.calls.commits).toEqual(['Update WebApp version to 1.1.0']);
    expect(harness.calls.pullRequestLabels).toEqual([50]);
  });

  it('allows package versions to catch up to the exact stable release version', async () => {
    const harness = createSynchronizationHarness({packageVersion: '1.0.0'});

    const actualResult = await synchronize(createSynchronizationOptions('v1.2.0'), harness.dependencies).toPromise();

    assert(actualResult.isOk);
    expect(actualResult.value.webAppVersion).toBe('1.2.0');
    expect(harness.calls.writtenVersions).toEqual(['1.2.0']);
  });

  it('rejects a package version downgrade', async () => {
    const harness = createSynchronizationHarness({packageVersion: '1.2.0'});

    const actualResult = await synchronize(createSynchronizationOptions('v1.1.0'), harness.dependencies).toPromise();

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('Refusing to downgrade');
    expect(harness.calls.branchCreations).toEqual([]);
  });

  it('rejects package metadata that already equals the tag without a durable synchronization record', async () => {
    const harness = createSynchronizationHarness({packageVersion: '1.1.0'});

    const actualResult = await synchronize(createSynchronizationOptions('v1.1.0'), harness.dependencies).toPromise();

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('no matching synchronization record exists');
    expect(harness.calls.branchCreations).toEqual([]);
  });

  it('reuses a matching open pull request and retries semver:none reconciliation', async () => {
    const harness = createSynchronizationHarness({
      packageVersion: '1.0.0',
      pullRequests: [createPullRequest({number: 21})],
    });

    const actualResult = await synchronize(createSynchronizationOptions('v1.1.0'), harness.dependencies).toPromise();

    assert(actualResult.isOk);
    expect(actualResult.value.action).toBe('already-open');
    expect(harness.calls.pullRequestLabels).toEqual([21]);
    expect(harness.calls.branchCreations).toEqual([]);
  });

  it('reports a matching merged synchronization as already complete', async () => {
    const harness = createSynchronizationHarness({
      packageVersion: '1.1.0',
      pullRequests: [createPullRequest({number: 22, state: 'closed', mergedAt: '2026-10-14T10:00:00Z'})],
    });

    const actualResult = await synchronize(createSynchronizationOptions('v1.1.0'), harness.dependencies).toPromise();

    assert(actualResult.isOk);
    expect(actualResult.value.action).toBe('already-merged');
    expect(harness.calls.pullRequestLabels).toEqual([]);
  });

  it('fails closed when a matching synchronization pull request was closed without merging', async () => {
    const harness = createSynchronizationHarness({
      packageVersion: '1.0.0',
      pullRequests: [createPullRequest({number: 23, state: 'closed', mergedAt: null})],
    });

    const actualResult = await synchronize(createSynchronizationOptions('v1.1.0'), harness.dependencies).toPromise();

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('closed without merging');
  });

  it('fails when another synchronization pull request is still open', async () => {
    const harness = createSynchronizationHarness({
      packageVersion: '1.0.0',
      pullRequests: [createPullRequest({number: 24, productionTagName: 'v1.1.0', webAppVersion: '1.1.0'})],
    });

    const actualResult = await synchronize(createSynchronizationOptions('v1.2.0'), harness.dependencies).toPromise();

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('blocked by open');
  });
});
