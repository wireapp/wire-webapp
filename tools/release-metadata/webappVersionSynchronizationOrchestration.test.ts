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

import {isUndefined} from '@sindresorhus/is';
import assert from 'node:assert';
import {Result, Task, Unit} from 'true-myth';

import {createProductionTagName} from './releaseMetadata.ts';
import {
  inspectSemVerWebAppVersionSynchronization,
  inspectWebAppVersionSynchronization,
  synchronizeSemVerWebAppVersion,
  synchronizeWebAppVersion,
} from './webappVersionSynchronizationOrchestration.ts';
import type {
  SemVerWebAppVersionSynchronizationResult,
  SynchronizeSemVerWebAppVersionOptions,
  SynchronizeWebAppVersionOptions,
  WebAppVersionSynchronizationResult,
} from './webappVersionSynchronizationOrchestration.ts';
import {createWebAppVersionSynchronizationMarker, parseWebAppVersionSynchronizationMarker} from './webappVersion.ts';
import type {WebAppPackageDocuments} from './webappVersion.ts';
import {
  createSemVerWebAppVersionSynchronizationBranchName,
  createSemVerWebAppVersionSynchronizationMarker,
  createSemVerWebAppVersionSynchronizationRequest,
  createWebAppVersionSynchronizationBranchName,
  parseSemVerWebAppVersionSynchronizationMarker,
} from './webappVersionSynchronization.ts';
import type {WebAppVersionSynchronizationPullRequest} from './webappVersionSynchronization.ts';
import type {
  CommitWebAppVersionSynchronizationOptions,
  CreateWebAppVersionSynchronizationBranchOptions,
  InspectWebAppVersionSynchronizationBranchOptions,
  PushWebAppVersionSynchronizationBranchOptions,
  WebAppVersionSynchronizationBranchInspection,
  WebAppVersionSynchronizationGitClient,
  WebAppVersionSynchronizationMainSnapshot,
  WriteWebAppVersionSynchronizationPackageDocumentsOptions,
} from './webappVersionSynchronizationGit.ts';
import type {
  CreateWebAppVersionSynchronizationPullRequestOptions,
  WebAppVersionSynchronizationGitHubClient,
} from './webappVersionSynchronizationGitHubClient.ts';

const releaseIdentifier = '2026-09-09.1';
const productionTagName = '2026-09-09.1-production';
const mainCommitSha = 'a'.repeat(40);
const branchTipCommitSha = 'b'.repeat(40);
const synchronizationBranchName = 'webapp-version-2026-09-09.1-1.0.0';

function createPackageDocument(version: string): Readonly<Record<string, unknown>> {
  return {
    name: '@wireapp/example',
    private: true,
    version,
    scripts: {test: 'jest'},
  };
}

function createMainSnapshot(version: string = '0.27.0'): WebAppVersionSynchronizationMainSnapshot {
  return {
    commitSha: mainCommitSha,
    rootPackageDocument: createPackageDocument(version),
    webAppPackageDocument: createPackageDocument(version),
  };
}

function createValidBranchInspection(): WebAppVersionSynchronizationBranchInspection {
  return {
    branchName: synchronizationBranchName,
    mainCommitSha,
    branchTipCommitSha,
    baseCommitSha: mainCommitSha,
    commitParentCount: 1,
    isNormalCommit: true,
    isBasedOnMainHistory: true,
    changedFilePaths: ['apps/webapp/package.json', 'package.json'],
    baseRootPackageDocument: createPackageDocument('0.27.0'),
    baseWebAppPackageDocument: createPackageDocument('0.27.0'),
    branchRootPackageDocument: createPackageDocument('1.0.0'),
    branchWebAppPackageDocument: createPackageDocument('1.0.0'),
  };
}

type CreateSynchronizationPullRequestOptions = {
  readonly releaseIdentifier?: string;
  readonly webAppVersion?: string;
  readonly number?: number;
  readonly state?: 'open' | 'closed';
  readonly mergedAt?: string | null;
  readonly body?: string;
  readonly headBranch?: string;
  readonly baseBranch?: string;
};

function createSynchronizationPullRequest(
  options: CreateSynchronizationPullRequestOptions = {},
): WebAppVersionSynchronizationPullRequest {
  const requestedReleaseIdentifier = options.releaseIdentifier ?? releaseIdentifier;
  const requestedWebAppVersion = options.webAppVersion ?? '1.0.0';
  const requestedProductionTagNameResult = createProductionTagName(requestedReleaseIdentifier);

  assert(requestedProductionTagNameResult.isOk);

  const requestedBranchNameResult = createWebAppVersionSynchronizationBranchName(
    requestedReleaseIdentifier,
    requestedWebAppVersion,
  );

  assert(requestedBranchNameResult.isOk);

  const markerResult = createWebAppVersionSynchronizationMarker({
    releaseIdentifier: requestedReleaseIdentifier,
    productionTagName: requestedProductionTagNameResult.value,
    webAppVersion: requestedWebAppVersion,
  });

  assert(markerResult.isOk);

  return {
    number: options.number ?? 1,
    url: `https://github.com/wireapp/wire-webapp/pull/${options.number ?? 1}`,
    title: `Update WebApp version to ${requestedWebAppVersion}`,
    body: options.body ?? markerResult.value,
    state: options.state ?? 'open',
    mergedAt: options.mergedAt ?? null,
    baseBranch: options.baseBranch ?? 'main',
    headBranch: options.headBranch ?? requestedBranchNameResult.value,
  };
}

function createSemVerSynchronizationPullRequest(
  options: {
    readonly productionTagName?: string;
    readonly number?: number;
    readonly state?: 'open' | 'closed';
    readonly mergedAt?: string | null;
    readonly body?: string;
    readonly headBranch?: string;
  } = {},
): WebAppVersionSynchronizationPullRequest {
  const requestedProductionTagName = options.productionTagName ?? 'v1.1.0';
  const requestResult = createSemVerWebAppVersionSynchronizationRequest(requestedProductionTagName);

  assert(requestResult.isOk);

  const branchNameResult = createSemVerWebAppVersionSynchronizationBranchName(requestResult.value.webAppVersion);
  const markerResult = createSemVerWebAppVersionSynchronizationMarker(requestedProductionTagName);

  assert(branchNameResult.isOk);
  assert(markerResult.isOk);

  return {
    number: options.number ?? 11,
    url: `https://github.com/wireapp/wire-webapp/pull/${options.number ?? 11}`,
    title: `Update WebApp version to ${requestResult.value.webAppVersion}`,
    body: options.body ?? markerResult.value,
    state: options.state ?? 'open',
    mergedAt: options.mergedAt ?? null,
    baseBranch: 'main',
    headBranch: options.headBranch ?? branchNameResult.value,
  };
}

type FakeGitHubClientState = {
  readonly pullRequestsByListCall: readonly (readonly WebAppVersionSynchronizationPullRequest[])[];
  readonly createdPullRequest: WebAppVersionSynchronizationPullRequest | undefined;
  readonly createPullRequestError: Error | undefined;
  listPullRequestsCallCount: number;
  createPullRequestOptions: CreateWebAppVersionSynchronizationPullRequestOptions[];
  ensurePullRequestSemVerNoneLabelCallNumbers: number[];
  ensurePullRequestSemVerNoneLabelCallCount: number;
  ensurePullRequestSemVerNoneLabelErrors: readonly (Error | undefined)[];
};

type FakeGitHubClient = {
  readonly client: WebAppVersionSynchronizationGitHubClient;
  readonly state: FakeGitHubClientState;
};

type CreateFakeGitHubClientOptions = {
  readonly pullRequestsByListCall?: readonly (readonly WebAppVersionSynchronizationPullRequest[])[];
  readonly createdPullRequest?: WebAppVersionSynchronizationPullRequest;
  readonly createPullRequestError?: Error;
  readonly ensurePullRequestSemVerNoneLabelErrors?: readonly (Error | undefined)[];
};

function createFakeGitHubClient(options: CreateFakeGitHubClientOptions = {}): FakeGitHubClient {
  const state: FakeGitHubClientState = {
    pullRequestsByListCall: options.pullRequestsByListCall ?? [[]],
    createdPullRequest: options.createdPullRequest,
    createPullRequestError: options.createPullRequestError,
    listPullRequestsCallCount: 0,
    createPullRequestOptions: [],
    ensurePullRequestSemVerNoneLabelCallNumbers: [],
    ensurePullRequestSemVerNoneLabelCallCount: 0,
    ensurePullRequestSemVerNoneLabelErrors: options.ensurePullRequestSemVerNoneLabelErrors ?? [],
  };

  const client: WebAppVersionSynchronizationGitHubClient = {
    listPullRequests() {
      const responseIndex = Math.min(state.listPullRequestsCallCount, state.pullRequestsByListCall.length - 1);
      const pullRequests = state.pullRequestsByListCall.at(responseIndex) ?? [];
      state.listPullRequestsCallCount += 1;

      return Task.resolve(pullRequests);
    },

    createPullRequest(createOptions) {
      state.createPullRequestOptions.push(createOptions);

      if (isUndefined(state.createPullRequestError) === false) {
        return Task.reject(state.createPullRequestError);
      }

      const semVerMarkerResult = parseSemVerWebAppVersionSynchronizationMarker(createOptions.body);
      const createdPullRequest =
        state.createdPullRequest ??
        (semVerMarkerResult.isOk
          ? createSemVerSynchronizationPullRequest({
              productionTagName: semVerMarkerResult.value.productionTagName,
              body: createOptions.body,
              headBranch: createOptions.headBranch,
            })
          : createSynchronizationPullRequest({
              webAppVersion: createOptions.title.replace('Update WebApp version to ', ''),
              body: createOptions.body,
              headBranch: createOptions.headBranch,
            }));

      return Task.resolve(createdPullRequest);
    },

    ensurePullRequestSemVerNoneLabel(pullRequestNumber) {
      state.ensurePullRequestSemVerNoneLabelCallNumbers.push(pullRequestNumber);
      const error = state.ensurePullRequestSemVerNoneLabelErrors.at(state.ensurePullRequestSemVerNoneLabelCallCount);
      state.ensurePullRequestSemVerNoneLabelCallCount += 1;

      if (error !== undefined) {
        return Task.reject(error);
      }

      return Task.resolve(Unit);
    },
  };

  return {client, state};
}

type FakeGitClientState = {
  mainSnapshot: WebAppVersionSynchronizationMainSnapshot;
  existingBranchNames: readonly string[];
  branchInspection: WebAppVersionSynchronizationBranchInspection | undefined;
  workingTreePackageDocuments: WebAppPackageDocuments;
  changedFilePaths: readonly string[];
  mainVerificationError: Error | undefined;
  prepareLatestMainCallCount: number;
  createBranchOptions: CreateWebAppVersionSynchronizationBranchOptions[];
  inspectBranchOptions: InspectWebAppVersionSynchronizationBranchOptions[];
  writePackageDocumentsOptions: WriteWebAppVersionSynchronizationPackageDocumentsOptions[];
  commitOptions: CommitWebAppVersionSynchronizationOptions[];
  pushBranchOptions: PushWebAppVersionSynchronizationBranchOptions[];
  verifyMainCommitArguments: string[];
};

type FakeGitClient = {
  readonly client: WebAppVersionSynchronizationGitClient;
  readonly state: FakeGitClientState;
};

type CreateFakeGitClientOptions = {
  readonly mainSnapshot?: WebAppVersionSynchronizationMainSnapshot;
  readonly existingBranchNames?: readonly string[];
  readonly branchInspection?: WebAppVersionSynchronizationBranchInspection;
  readonly changedFilePaths?: readonly string[];
  readonly mainVerificationError?: Error;
};

function createFakeGitClient(options: CreateFakeGitClientOptions = {}): FakeGitClient {
  const mainSnapshot = options.mainSnapshot ?? createMainSnapshot();
  const state: FakeGitClientState = {
    mainSnapshot,
    existingBranchNames: options.existingBranchNames ?? [],
    branchInspection: options.branchInspection,
    workingTreePackageDocuments: {
      rootPackageDocument: mainSnapshot.rootPackageDocument,
      webAppPackageDocument: mainSnapshot.webAppPackageDocument,
    },
    changedFilePaths: options.changedFilePaths ?? ['apps/webapp/package.json', 'package.json'],
    mainVerificationError: options.mainVerificationError,
    prepareLatestMainCallCount: 0,
    createBranchOptions: [],
    inspectBranchOptions: [],
    writePackageDocumentsOptions: [],
    commitOptions: [],
    pushBranchOptions: [],
    verifyMainCommitArguments: [],
  };

  const client: WebAppVersionSynchronizationGitClient = {
    prepareLatestMain() {
      state.prepareLatestMainCallCount += 1;

      return Task.resolve(state.mainSnapshot);
    },

    listExistingBranchNames() {
      return Task.resolve(state.existingBranchNames);
    },

    inspectBranch(inspectOptions) {
      state.inspectBranchOptions.push(inspectOptions);

      return Task.resolve(state.branchInspection);
    },

    createBranchFromMain(createOptions) {
      state.createBranchOptions.push(createOptions);

      return Task.resolve();
    },

    readWorkingTreePackageDocuments() {
      return Task.resolve(state.workingTreePackageDocuments);
    },

    writePackageDocuments(writeOptions) {
      state.writePackageDocumentsOptions.push(writeOptions);
      state.workingTreePackageDocuments = writeOptions;

      return Task.resolve();
    },

    getWorkingTreeChangedFilePaths() {
      return Task.resolve(state.changedFilePaths);
    },

    commit(commitOptions) {
      state.commitOptions.push(commitOptions);

      return Task.resolve(branchTipCommitSha);
    },

    pushBranch(pushOptions) {
      state.pushBranchOptions.push(pushOptions);

      return Task.resolve();
    },

    verifyMainCommit(mainCommitSha) {
      state.verifyMainCommitArguments.push(mainCommitSha);

      if (isUndefined(state.mainVerificationError) === false) {
        return Task.reject(state.mainVerificationError);
      }

      return Task.resolve();
    },
  };

  return {client, state};
}

type CreateSynchronizationOptions = {
  readonly githubClient: WebAppVersionSynchronizationGitHubClient;
  readonly gitClient: WebAppVersionSynchronizationGitClient;
  readonly releaseIdentifier?: string;
  readonly productionTagName?: string;
};

function createSynchronizationOptions(options: CreateSynchronizationOptions): SynchronizeWebAppVersionOptions {
  return {
    releaseIdentifier: options.releaseIdentifier ?? releaseIdentifier,
    productionTagName: options.productionTagName ?? productionTagName,
    commitAuthorName: 'otto-the-bot',
    commitAuthorEmail: 'otto@example.com',
    dependencies: {
      githubClient: options.githubClient,
      gitClient: options.gitClient,
    },
  };
}

type CreateSemVerSynchronizationOptions = {
  readonly productionTagName: string;
  readonly githubClient: WebAppVersionSynchronizationGitHubClient;
  readonly gitClient: WebAppVersionSynchronizationGitClient;
};

function createSemVerSynchronizationOptions(
  options: CreateSemVerSynchronizationOptions,
): SynchronizeSemVerWebAppVersionOptions {
  const synchronizationRequestResult = createSemVerWebAppVersionSynchronizationRequest(options.productionTagName);

  assert(synchronizationRequestResult.isOk);

  return {
    synchronizationRequest: synchronizationRequestResult.value,
    commitAuthorName: 'otto-the-bot',
    commitAuthorEmail: 'otto@example.com',
    dependencies: {
      githubClient: options.githubClient,
      gitClient: options.gitClient,
    },
  };
}

function expectSynchronizationResult(
  actualResult: Result<WebAppVersionSynchronizationResult, Error>,
): WebAppVersionSynchronizationResult {
  assert(actualResult.isOk);

  return actualResult.value;
}

function expectSemVerSynchronizationResult(
  actualResult: Result<SemVerWebAppVersionSynchronizationResult, Error>,
): SemVerWebAppVersionSynchronizationResult {
  assert(actualResult.isOk);

  return actualResult.value;
}

describe('WebApp version synchronization orchestration', () => {
  it('reports available without accessing Git', async () => {
    const fakeGitHubClient = createFakeGitHubClient();

    const actualResult = await inspectWebAppVersionSynchronization({
      releaseIdentifier,
      productionTagName,
      githubClient: fakeGitHubClient.client,
    });

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual({
      kind: 'available',
      releaseIdentifier,
      productionTagName,
    });
  });

  it('allocates 1.0.0 and creates the synchronization branch, commit, and pull request', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByListCall: [[], [], [], []],
    });
    const fakeGitClient = createFakeGitClient();

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );
    const synchronizationResult = expectSynchronizationResult(actualResult);

    expect(synchronizationResult).toMatchObject({
      action: 'created',
      releaseIdentifier,
      productionTagName,
      webAppVersion: '1.0.0',
      branchName: synchronizationBranchName,
      pullRequestNumber: 1,
    });
    expect(fakeGitClient.state.prepareLatestMainCallCount).toBe(1);
    expect(fakeGitClient.state.createBranchOptions).toEqual([{branchName: synchronizationBranchName, mainCommitSha}]);
    expect(fakeGitClient.state.writePackageDocumentsOptions[0]).toEqual({
      rootPackageDocument: {...createPackageDocument('0.27.0'), version: '1.0.0'},
      webAppPackageDocument: {...createPackageDocument('0.27.0'), version: '1.0.0'},
    });
    expect(fakeGitClient.state.commitOptions).toEqual([
      {
        message: 'Update WebApp version to 1.0.0',
        authorName: 'otto-the-bot',
        authorEmail: 'otto@example.com',
      },
    ]);
    expect(fakeGitClient.state.pushBranchOptions).toEqual([{branchName: synchronizationBranchName}]);
    expect(fakeGitClient.state.verifyMainCommitArguments).toEqual([mainCommitSha, mainCommitSha]);
    expect(fakeGitHubClient.state.createPullRequestOptions).toHaveLength(1);
    expect(fakeGitHubClient.state.ensurePullRequestSemVerNoneLabelCallNumbers).toEqual([1]);
    expect(fakeGitHubClient.state.createPullRequestOptions[0]).toMatchObject({
      title: 'Update WebApp version to 1.0.0',
      headBranch: synchronizationBranchName,
    });

    const createdPullRequestBody = fakeGitHubClient.state.createPullRequestOptions[0].body;
    const markerResult = parseWebAppVersionSynchronizationMarker(createdPullRequestBody);

    assert(markerResult.isOk);
    expect(markerResult.value).toEqual({
      releaseIdentifier,
      productionTagName,
      webAppVersion: '1.0.0',
    });
  });

  it('bootstraps the next release after an earlier Production release has no synchronization marker', async () => {
    const failedProductionReleaseIdentifier = '2026-09-23.1';
    const failedProductionTagName = '2026-09-23.1-production';
    const nextProductionReleaseIdentifier = '2026-09-30.1';
    const nextProductionTagName = '2026-09-30.1-production';
    const fakeGitHubClient = createFakeGitHubClient({pullRequestsByListCall: [[], [], [], [], []]});

    const failedReleaseInspectionResult = await inspectWebAppVersionSynchronization({
      releaseIdentifier: failedProductionReleaseIdentifier,
      productionTagName: failedProductionTagName,
      githubClient: fakeGitHubClient.client,
    });

    assert(failedReleaseInspectionResult.isOk);
    expect(failedReleaseInspectionResult.value.kind).toBe('available');

    const fakeGitClient = createFakeGitClient();
    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        releaseIdentifier: nextProductionReleaseIdentifier,
        productionTagName: nextProductionTagName,
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    expect(expectSynchronizationResult(actualResult).webAppVersion).toBe('1.0.0');
    expect(fakeGitClient.state.writePackageDocumentsOptions[0]).toEqual({
      rootPackageDocument: {...createPackageDocument('0.27.0'), version: '1.0.0'},
      webAppPackageDocument: {...createPackageDocument('0.27.0'), version: '1.0.0'},
    });
  });

  it('increments only the patch version after the bootstrap release', async () => {
    const fakeGitHubClient = createFakeGitHubClient({pullRequestsByListCall: [[], [], [], []]});
    const fakeGitClient = createFakeGitClient({mainSnapshot: createMainSnapshot('1.0.9')});

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    expect(expectSynchronizationResult(actualResult).webAppVersion).toBe('1.0.10');
    expect(fakeGitClient.state.createBranchOptions[0].branchName).toBe('webapp-version-2026-09-09.1-1.0.10');
  });

  it('reuses a matching open pull request without incrementing or mutating Git', async () => {
    const matchingPullRequest = createSynchronizationPullRequest();
    const fakeGitHubClient = createFakeGitHubClient({pullRequestsByListCall: [[matchingPullRequest]]});
    const fakeGitClient = createFakeGitClient();

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );
    const synchronizationResult = expectSynchronizationResult(actualResult);

    expect(synchronizationResult.action).toBe('already-open');
    expect(synchronizationResult.webAppVersion).toBe('1.0.0');
    expect(fakeGitClient.state.prepareLatestMainCallCount).toBe(0);
    expect(fakeGitHubClient.state.createPullRequestOptions).toHaveLength(0);
    expect(fakeGitHubClient.state.ensurePullRequestSemVerNoneLabelCallNumbers).toEqual([1]);
  });

  it('reuses a matching merged pull request even when main has advanced', async () => {
    const matchingPullRequest = createSynchronizationPullRequest({state: 'closed', mergedAt: '2026-09-09T12:00:00Z'});
    const fakeGitHubClient = createFakeGitHubClient({pullRequestsByListCall: [[matchingPullRequest]]});
    const fakeGitClient = createFakeGitClient({mainSnapshot: createMainSnapshot('1.0.4')});

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    expect(expectSynchronizationResult(actualResult)).toMatchObject({
      action: 'already-merged',
      webAppVersion: '1.0.0',
    });
    expect(fakeGitClient.state.prepareLatestMainCallCount).toBe(0);
    expect(fakeGitHubClient.state.createPullRequestOptions).toHaveLength(0);
    expect(fakeGitHubClient.state.ensurePullRequestSemVerNoneLabelCallNumbers).toEqual([]);
  });

  it('fails closed when an open synchronization pull request has a conflicting release-impact label', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByListCall: [[createSynchronizationPullRequest()]],
      ensurePullRequestSemVerNoneLabelErrors: [
        new Error('GitHub pull request #1 has conflicting release-impact labels: semver:patch'),
      ],
    });
    const fakeGitClient = createFakeGitClient();

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('semver:patch');
    expect(actualResult.error.message).toContain('#1');
    expect(fakeGitHubClient.state.ensurePullRequestSemVerNoneLabelCallNumbers).toEqual([1]);
  });

  it('fails closed when a matching pull request was closed without merge', async () => {
    const closedPullRequest = createSynchronizationPullRequest({state: 'closed'});
    const fakeGitHubClient = createFakeGitHubClient({pullRequestsByListCall: [[closedPullRequest]]});
    const fakeGitClient = createFakeGitClient();

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('closed without merging');
    expect(fakeGitClient.state.prepareLatestMainCallCount).toBe(0);
    expect(fakeGitHubClient.state.createPullRequestOptions).toHaveLength(0);
  });

  it('blocks allocation when a previous release has an open synchronization pull request', async () => {
    const previousReleasePullRequest = createSynchronizationPullRequest({
      releaseIdentifier: '2026-09-02.1',
      number: 7,
    });
    const fakeGitHubClient = createFakeGitHubClient({pullRequestsByListCall: [[previousReleasePullRequest]]});
    const fakeGitClient = createFakeGitClient();

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('#7');
    expect(actualResult.error.message).toContain(previousReleasePullRequest.url);
    expect(fakeGitClient.state.prepareLatestMainCallCount).toBe(0);
  });

  it('blocks allocation when a previous release synchronization pull request was closed without merging', async () => {
    const previousReleasePullRequest = createSynchronizationPullRequest({
      releaseIdentifier: '2026-09-02.1',
      state: 'closed',
      number: 7,
    });
    const fakeGitHubClient = createFakeGitHubClient({pullRequestsByListCall: [[previousReleasePullRequest]]});
    const fakeGitClient = createFakeGitClient();

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('closed-without-merge');
    expect(actualResult.error.message).toContain('#7');
    expect(fakeGitClient.state.prepareLatestMainCallCount).toBe(0);
    expect(fakeGitHubClient.state.createPullRequestOptions).toHaveLength(0);
  });

  it('allocates after a previous release synchronization pull request was merged', async () => {
    const previousReleasePullRequest = createSynchronizationPullRequest({
      releaseIdentifier: '2026-09-02.1',
      state: 'closed',
      mergedAt: '2026-09-02T12:00:00Z',
      number: 7,
    });
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByListCall: [[previousReleasePullRequest], [], [], []],
    });
    const fakeGitClient = createFakeGitClient();

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    expect(expectSynchronizationResult(actualResult)).toMatchObject({
      action: 'created',
      webAppVersion: '1.0.0',
    });
  });

  it('fails closed when a matching synchronization pull request hides another unresolved release', async () => {
    const matchingPullRequest = createSynchronizationPullRequest();
    const previousReleasePullRequest = createSynchronizationPullRequest({
      releaseIdentifier: '2026-09-02.1',
      number: 7,
    });
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByListCall: [[matchingPullRequest, previousReleasePullRequest]],
    });
    const fakeGitClient = createFakeGitClient();

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('conflict');
    expect(fakeGitClient.state.prepareLatestMainCallCount).toBe(0);
    expect(fakeGitHubClient.state.createPullRequestOptions).toHaveLength(0);
  });

  it('fails closed when duplicate synchronization records exist for the release', async () => {
    const firstPullRequest = createSynchronizationPullRequest({number: 1});
    const secondPullRequest = createSynchronizationPullRequest({number: 2});
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByListCall: [[firstPullRequest, secondPullRequest]],
    });
    const fakeGitClient = createFakeGitClient();

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('Multiple synchronization records');
    expect(fakeGitClient.state.prepareLatestMainCallCount).toBe(0);
  });

  it('fails closed when a claimed synchronization marker is malformed', async () => {
    const malformedPullRequest = createSynchronizationPullRequest({
      body: '<!-- wire-webapp-version-sync release=invalid -->',
    });
    const fakeGitHubClient = createFakeGitHubClient({pullRequestsByListCall: [[malformedPullRequest]]});

    const actualResult = await inspectWebAppVersionSynchronization({
      releaseIdentifier,
      productionTagName,
      githubClient: fakeGitHubClient.client,
    });

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('invalid marker');
  });

  it('recovers a valid deterministic branch without creating another commit or pushing it', async () => {
    const fakeGitHubClient = createFakeGitHubClient({pullRequestsByListCall: [[], [], []]});
    const fakeGitClient = createFakeGitClient({
      existingBranchNames: [synchronizationBranchName],
      branchInspection: createValidBranchInspection(),
    });

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    expect(expectSynchronizationResult(actualResult).action).toBe('recovered');
    expect(fakeGitClient.state.createBranchOptions).toHaveLength(0);
    expect(fakeGitClient.state.writePackageDocumentsOptions).toHaveLength(0);
    expect(fakeGitClient.state.commitOptions).toHaveLength(0);
    expect(fakeGitClient.state.pushBranchOptions).toHaveLength(0);
    expect(fakeGitClient.state.verifyMainCommitArguments).toEqual([mainCommitSha]);
    expect(fakeGitHubClient.state.createPullRequestOptions).toHaveLength(1);
    expect(fakeGitHubClient.state.ensurePullRequestSemVerNoneLabelCallNumbers).toEqual([1]);
  });

  it.each([
    {
      description: 'a branch with an unexpected version',
      existingBranchNames: ['webapp-version-2026-09-09.1-1.0.1'],
      branchInspection: undefined,
    },
    {
      description: 'a branch with an unrelated changed file',
      existingBranchNames: [synchronizationBranchName],
      branchInspection: {...createValidBranchInspection(), changedFilePaths: ['README.md']},
    },
    {
      description: 'a branch with an unexpected extra commit',
      existingBranchNames: [synchronizationBranchName],
      branchInspection: {...createValidBranchInspection(), commitParentCount: 2},
    },
    {
      description: 'a branch whose base is outside main history',
      existingBranchNames: [synchronizationBranchName],
      branchInspection: {...createValidBranchInspection(), isBasedOnMainHistory: false},
    },
  ])('rejects $description during interrupted-branch recovery', async ({existingBranchNames, branchInspection}) => {
    const fakeGitHubClient = createFakeGitHubClient({pullRequestsByListCall: [[], []]});
    const fakeGitClient = createFakeGitClient({existingBranchNames, branchInspection});

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    assert(actualResult.isErr);
    expect(fakeGitHubClient.state.createPullRequestOptions).toHaveLength(0);
    expect(fakeGitClient.state.pushBranchOptions).toHaveLength(0);
  });

  it('fails before pushing when main changes during allocation', async () => {
    const fakeGitHubClient = createFakeGitHubClient({pullRequestsByListCall: [[], [], []]});
    const fakeGitClient = createFakeGitClient({
      mainVerificationError: new Error('origin/main changed during WebApp version synchronization'),
    });

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('origin/main changed');
    expect(fakeGitClient.state.commitOptions).toHaveLength(1);
    expect(fakeGitClient.state.pushBranchOptions).toHaveLength(0);
    expect(fakeGitHubClient.state.createPullRequestOptions).toHaveLength(0);
  });

  it('does not create a duplicate when another matching pull request appears before commit', async () => {
    const matchingPullRequest = createSynchronizationPullRequest();
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByListCall: [[], [], [matchingPullRequest]],
    });
    const fakeGitClient = createFakeGitClient();

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    expect(expectSynchronizationResult(actualResult).action).toBe('already-open');
    expect(fakeGitHubClient.state.ensurePullRequestSemVerNoneLabelCallNumbers).toEqual([1]);
    expect(fakeGitClient.state.commitOptions).toHaveLength(0);
    expect(fakeGitClient.state.pushBranchOptions).toHaveLength(0);
    expect(fakeGitHubClient.state.createPullRequestOptions).toHaveLength(0);
  });

  it('does not create a duplicate when another matching pull request appears after push', async () => {
    const matchingPullRequest = createSynchronizationPullRequest();
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByListCall: [[], [], [], [matchingPullRequest]],
    });
    const fakeGitClient = createFakeGitClient();

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    expect(expectSynchronizationResult(actualResult).action).toBe('already-open');
    expect(fakeGitHubClient.state.ensurePullRequestSemVerNoneLabelCallNumbers).toEqual([1]);
    expect(fakeGitClient.state.commitOptions).toHaveLength(1);
    expect(fakeGitClient.state.pushBranchOptions).toHaveLength(1);
    expect(fakeGitHubClient.state.createPullRequestOptions).toHaveLength(0);
  });

  it('reports a post-push pull request failure without retrying or changing GitHub state', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByListCall: [[], [], [], []],
      createPullRequestError: new Error('GitHub unavailable'),
    });
    const fakeGitClient = createFakeGitClient();

    const actualResult = await synchronizeWebAppVersion(
      createSynchronizationOptions({
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe('GitHub unavailable');
    expect(fakeGitClient.state.pushBranchOptions).toHaveLength(1);
    expect(fakeGitHubClient.state.createPullRequestOptions).toHaveLength(1);
  });
});

describe('SemVer WebApp version synchronization orchestration', () => {
  it.each([
    {productionTagName: 'v1.1.0', expectedVersion: '1.1.0'},
    {productionTagName: 'v1.2.0', expectedVersion: '1.2.0'},
  ])('reconciles package metadata directly to $productionTagName', async ({productionTagName, expectedVersion}) => {
    const fakeGitHubClient = createFakeGitHubClient();
    const fakeGitClient = createFakeGitClient({mainSnapshot: createMainSnapshot('1.0.0')});
    const actualResult = await synchronizeSemVerWebAppVersion(
      createSemVerSynchronizationOptions({
        productionTagName,
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );
    const synchronizationResult = expectSemVerSynchronizationResult(actualResult);

    expect(synchronizationResult).toMatchObject({
      action: 'created',
      productionTagName,
      webAppVersion: expectedVersion,
      branchName: `webapp-version-${expectedVersion}`,
      pullRequestNumber: 11,
    });
    expect(fakeGitClient.state.writePackageDocumentsOptions[0]).toEqual({
      rootPackageDocument: {...createPackageDocument('1.0.0'), version: expectedVersion},
      webAppPackageDocument: {...createPackageDocument('1.0.0'), version: expectedVersion},
    });
    expect(fakeGitClient.state.commitOptions[0]?.message).toBe(`Update WebApp version to ${expectedVersion}`);
    expect(fakeGitHubClient.state.createPullRequestOptions[0]).toMatchObject({
      title: `Update WebApp version to ${expectedVersion}`,
      headBranch: `webapp-version-${expectedVersion}`,
    });
    expect(fakeGitHubClient.state.createPullRequestOptions[0]?.body).toContain(`Production tag: ${productionTagName}`);
    expect(fakeGitHubClient.state.createPullRequestOptions[0]?.body).toContain(`WebApp version: ${expectedVersion}`);
    expect(fakeGitHubClient.state.ensurePullRequestSemVerNoneLabelCallNumbers).toEqual([11]);
  });

  it('refuses to downgrade package metadata when the main version is higher than the tag', async () => {
    const fakeGitHubClient = createFakeGitHubClient();
    const fakeGitClient = createFakeGitClient({mainSnapshot: createMainSnapshot('1.2.0')});
    const actualResult = await synchronizeSemVerWebAppVersion(
      createSemVerSynchronizationOptions({
        productionTagName: 'v1.1.0',
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('Refusing to downgrade');
    expect(fakeGitClient.state.createBranchOptions).toHaveLength(0);
    expect(fakeGitHubClient.state.createPullRequestOptions).toHaveLength(0);
  });

  it('fails closed when package metadata already equals the tag without a matching record', async () => {
    const fakeGitHubClient = createFakeGitHubClient();
    const fakeGitClient = createFakeGitClient({mainSnapshot: createMainSnapshot('1.1.0')});
    const actualResult = await synchronizeSemVerWebAppVersion(
      createSemVerSynchronizationOptions({
        productionTagName: 'v1.1.0',
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('already equals 1.1.0');
    expect(fakeGitClient.state.createBranchOptions).toHaveLength(0);
    expect(fakeGitHubClient.state.createPullRequestOptions).toHaveLength(0);
  });

  it('returns already-merged for a matching merged SemVer record without Git access', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByListCall: [
        [createSemVerSynchronizationPullRequest({state: 'closed', mergedAt: '2026-10-12T12:00:00Z'})],
      ],
    });
    const fakeGitClient = createFakeGitClient({mainSnapshot: createMainSnapshot('1.1.0')});
    const actualResult = await synchronizeSemVerWebAppVersion(
      createSemVerSynchronizationOptions({
        productionTagName: 'v1.1.0',
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    expect(expectSemVerSynchronizationResult(actualResult).action).toBe('already-merged');
    expect(fakeGitClient.state.prepareLatestMainCallCount).toBe(0);
    expect(fakeGitHubClient.state.ensurePullRequestSemVerNoneLabelCallNumbers).toEqual([]);
  });

  it('returns already-open for a matching open SemVer record', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByListCall: [[createSemVerSynchronizationPullRequest()]],
    });
    const fakeGitClient = createFakeGitClient();
    const actualResult = await synchronizeSemVerWebAppVersion(
      createSemVerSynchronizationOptions({
        productionTagName: 'v1.1.0',
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    expect(expectSemVerSynchronizationResult(actualResult).action).toBe('already-open');
    expect(fakeGitClient.state.prepareLatestMainCallCount).toBe(0);
    expect(fakeGitHubClient.state.ensurePullRequestSemVerNoneLabelCallNumbers).toEqual([11]);
  });

  it('fails closed when an open SemVer synchronization pull request has a conflicting impact label', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByListCall: [[createSemVerSynchronizationPullRequest()]],
      ensurePullRequestSemVerNoneLabelErrors: [
        new Error('GitHub pull request #11 has conflicting release-impact labels: semver:patch'),
      ],
    });
    const fakeGitClient = createFakeGitClient();
    const actualResult = await synchronizeSemVerWebAppVersion(
      createSemVerSynchronizationOptions({
        productionTagName: 'v1.1.0',
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('semver:patch');
    expect(actualResult.error.message).toContain('#11');
    expect(fakeGitHubClient.state.ensurePullRequestSemVerNoneLabelCallNumbers).toEqual([11]);
  });

  it('retries label reconciliation for an already-open SemVer record after the first labeling attempt failed', async () => {
    const matchingPullRequest = createSemVerSynchronizationPullRequest();
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByListCall: [[], [], [], [], [matchingPullRequest]],
      ensurePullRequestSemVerNoneLabelErrors: [new Error('GitHub label update failed'), undefined],
    });
    const fakeGitClient = createFakeGitClient();
    const synchronizationOptions = createSemVerSynchronizationOptions({
      productionTagName: 'v1.1.0',
      githubClient: fakeGitHubClient.client,
      gitClient: fakeGitClient.client,
    });

    const firstResult = await synchronizeSemVerWebAppVersion(synchronizationOptions);

    assert(firstResult.isErr);
    expect(firstResult.error.message).toBe('GitHub label update failed');

    const retryResult = await synchronizeSemVerWebAppVersion(synchronizationOptions);

    expect(expectSemVerSynchronizationResult(retryResult).action).toBe('already-open');
    expect(fakeGitHubClient.state.ensurePullRequestSemVerNoneLabelCallNumbers).toEqual([11, 11]);
    expect(fakeGitHubClient.state.createPullRequestOptions).toHaveLength(1);
    expect(fakeGitClient.state.createBranchOptions).toHaveLength(1);
  });

  it('fails for a matching closed-without-merge record', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByListCall: [[createSemVerSynchronizationPullRequest({state: 'closed'})]],
    });
    const fakeGitClient = createFakeGitClient();
    const actualResult = await synchronizeSemVerWebAppVersion(
      createSemVerSynchronizationOptions({
        productionTagName: 'v1.1.0',
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('closed without merging');
    expect(fakeGitClient.state.prepareLatestMainCallCount).toBe(0);
  });

  it('blocks while a different synchronization request remains unresolved', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByListCall: [[createSemVerSynchronizationPullRequest({productionTagName: 'v1.1.0'})]],
    });
    const fakeGitClient = createFakeGitClient();
    const actualResult = await synchronizeSemVerWebAppVersion(
      createSemVerSynchronizationOptions({
        productionTagName: 'v1.2.0',
        githubClient: fakeGitHubClient.client,
        gitClient: fakeGitClient.client,
      }),
    );

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('blocked by open pull request');
    expect(fakeGitClient.state.prepareLatestMainCallCount).toBe(0);
  });

  it('fails closed when a claimed SemVer synchronization record is malformed', async () => {
    const fakeGitHubClient = createFakeGitHubClient({
      pullRequestsByListCall: [
        [
          createSemVerSynchronizationPullRequest({
            body: '<!-- wire-webapp-version-sync:v2 production-tag=v1.1.0 version=1.2.0 -->',
          }),
        ],
      ],
    });
    const synchronizationRequestResult = createSemVerWebAppVersionSynchronizationRequest('v1.1.0');

    assert(synchronizationRequestResult.isOk);

    const actualResult = await inspectSemVerWebAppVersionSynchronization({
      synchronizationRequest: synchronizationRequestResult.value,
      githubClient: fakeGitHubClient.client,
    });

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('invalid marker');
  });
});
