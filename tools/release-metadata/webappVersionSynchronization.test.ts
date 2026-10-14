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

import {
  createWebAppVersionSynchronizationBranchName,
  createWebAppVersionSynchronizationMarker,
  createWebAppVersionSynchronizationRequest,
  parseWebAppVersionSynchronizationMarker,
  parseWebAppVersionSynchronizationRecord,
  resolveWebAppVersionSynchronizationState,
  validateWebAppVersionSynchronizationBranchName,
} from './webappVersionSynchronization.ts';
import type {WebAppVersionSynchronizationPullRequest} from './webappVersionSynchronization.ts';

function createSynchronizationPullRequest(options: {
  readonly number: number;
  readonly productionTagName?: string;
  readonly webAppVersion?: string;
  readonly state?: 'open' | 'closed';
  readonly mergedAt?: string | null;
  readonly headBranch?: string;
  readonly body?: string;
}): WebAppVersionSynchronizationPullRequest {
  const productionTagName = options.productionTagName ?? 'v1.1.0';
  const webAppVersion = options.webAppVersion ?? '1.1.0';
  const markerResult = createWebAppVersionSynchronizationMarker(productionTagName);
  assert(markerResult.isOk);

  return {
    number: options.number,
    url: `https://github.com/wireapp/wire-webapp/pull/${options.number}`,
    title: `Update WebApp version to ${webAppVersion}`,
    body: options.body ?? markerResult.value,
    state: options.state ?? 'open',
    mergedAt: options.mergedAt ?? null,
    baseBranch: 'main',
    headBranch: options.headBranch ?? `webapp-version-${webAppVersion}`,
  };
}

function createSynchronizationRequest(
  productionTagName: string,
): ReturnType<typeof createWebAppVersionSynchronizationRequest> {
  return createWebAppVersionSynchronizationRequest(productionTagName);
}

describe('WebApp version synchronization identity', () => {
  it('creates and validates the version-only synchronization branch', () => {
    const branchNameResult = createWebAppVersionSynchronizationBranchName('1.1.0');

    assert(branchNameResult.isOk);
    expect(branchNameResult.value).toBe('webapp-version-1.1.0');

    const branchResult = validateWebAppVersionSynchronizationBranchName(branchNameResult.value);

    assert(branchResult.isOk);
    expect(branchResult.value).toEqual({
      branchName: 'webapp-version-1.1.0',
      productionTagName: 'v1.1.0',
      webAppVersion: '1.1.0',
    });
  });

  it.each(['webapp-version-1.1.0-extra', 'webapp-version-01.1.0', 'webapp-version-1.1.0-beta.1'])(
    'rejects a non-canonical synchronization branch %s',
    branchName => {
      expect(validateWebAppVersionSynchronizationBranchName(branchName).isErr).toBe(true);
    },
  );

  it('writes and validates one durable SemVer marker whose values agree', () => {
    const markerResult = createWebAppVersionSynchronizationMarker('v1.1.0');

    assert(markerResult.isOk);
    expect(markerResult.value).toBe('<!-- wire-webapp-version-sync:semver production-tag=v1.1.0 version=1.1.0 -->');

    const parsedMarkerResult = parseWebAppVersionSynchronizationMarker(`Body\n${markerResult.value}`);

    assert(parsedMarkerResult.isOk);
    expect(parsedMarkerResult.value).toEqual({productionTagName: 'v1.1.0', webAppVersion: '1.1.0'});
  });

  it.each([
    '<!-- wire-webapp-version-sync:semver production-tag=v1.1.0 version=1.2.0 -->',
    '<!-- wire-webapp-version-sync:semver production-tag=v1.1.0 version=1.1.0-beta.1 -->',
    '<!-- wire-webapp-version-sync:semver production-tag=v01.1.0 version=1.1.0 -->',
    '<!-- wire-webapp-version-sync:semver production-tag=v1.1.0 version=1.1.0 -->\n<!-- wire-webapp-version-sync:semver production-tag=v1.1.0 version=1.1.0 -->',
  ])('rejects malformed synchronization marker %s', marker => {
    expect(parseWebAppVersionSynchronizationMarker(marker).isErr).toBe(true);
  });

  it('ignores historical date-based synchronization pull requests', () => {
    const historicalPullRequest: WebAppVersionSynchronizationPullRequest = {
      number: 42,
      url: 'https://github.com/wireapp/wire-webapp/pull/42',
      title: 'Update WebApp version to 1.0.1',
      body: '<!-- wire-webapp-version-sync release=2026-10-06.1 production-tag=2026-10-06.1-production version=1.0.1 -->',
      state: 'open',
      mergedAt: null,
      baseBranch: 'main',
      headBranch: 'webapp-version-2026-10-06.1-1.0.1',
    };

    const recordResult = parseWebAppVersionSynchronizationRecord(historicalPullRequest);

    assert(recordResult.isOk);
    expect(recordResult.value.isNothing).toBe(true);
  });

  it('recognizes and reuses an open matching synchronization pull request', () => {
    const requestResult = createSynchronizationRequest('v1.1.0');
    assert(requestResult.isOk);

    const inspectionResult = resolveWebAppVersionSynchronizationState({
      request: requestResult.value,
      pullRequests: [createSynchronizationPullRequest({number: 12})],
    });

    assert(inspectionResult.isOk);
    expect(inspectionResult.value).toMatchObject({
      kind: 'matching-open',
      productionTagName: 'v1.1.0',
      webAppVersion: '1.1.0',
      pullRequestNumber: 12,
      branchName: 'webapp-version-1.1.0',
    });
  });

  it('recognizes a matching merged synchronization pull request', () => {
    const requestResult = createSynchronizationRequest('v1.1.0');
    assert(requestResult.isOk);

    const inspectionResult = resolveWebAppVersionSynchronizationState({
      request: requestResult.value,
      pullRequests: [createSynchronizationPullRequest({number: 13, state: 'closed', mergedAt: '2026-10-14T10:00:00Z'})],
    });

    assert(inspectionResult.isOk);
    expect(inspectionResult.value.kind).toBe('matching-merged');
  });

  it('reports a closed unmerged request as unresolved', () => {
    const requestResult = createSynchronizationRequest('v1.1.0');
    assert(requestResult.isOk);

    const inspectionResult = resolveWebAppVersionSynchronizationState({
      request: requestResult.value,
      pullRequests: [createSynchronizationPullRequest({number: 14, state: 'closed', mergedAt: null})],
    });

    assert(inspectionResult.isOk);
    expect(inspectionResult.value.kind).toBe('closed-without-merge');
  });

  it('rejects competing open synchronization pull requests', () => {
    const requestResult = createSynchronizationRequest('v1.2.0');
    assert(requestResult.isOk);

    const inspectionResult = resolveWebAppVersionSynchronizationState({
      request: requestResult.value,
      pullRequests: [
        createSynchronizationPullRequest({number: 15, productionTagName: 'v1.1.0', webAppVersion: '1.1.0'}),
        createSynchronizationPullRequest({number: 16, productionTagName: 'v1.2.0', webAppVersion: '1.2.0'}),
      ],
    });

    assert(inspectionResult.isOk);
    expect(inspectionResult.value.kind).toBe('conflict');
  });
});
