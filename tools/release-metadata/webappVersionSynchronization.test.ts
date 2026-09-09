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

import {Maybe} from 'true-myth';

import {
  createWebAppVersionSynchronizationBranchName,
  createWebAppVersionSynchronizationPullRequestBody,
  createWebAppVersionSynchronizationPullRequestTitle,
  parseWebAppVersionSynchronizationPullRequest,
  resolveWebAppVersionSynchronizationState,
  validateWebAppVersionSynchronizationBranchName,
} from './webappVersionSynchronization.ts';
import type {WebAppVersionSynchronizationPullRequest} from './webappVersionSynchronization.ts';

const releaseIdentifier = '2026-09-09.1';
const productionTagName = '2026-09-09.1-production';

type CreatePullRequestOptions = {
  readonly releaseIdentifier?: string;
  readonly productionTagName?: string;
  readonly webAppVersion?: string;
  readonly state?: 'open' | 'closed';
  readonly mergedAt?: string | null;
  readonly baseBranch?: string;
  readonly headBranch?: string;
  readonly body?: string;
  readonly title?: string;
  readonly number?: number;
};

function createPullRequest(options: CreatePullRequestOptions = {}): WebAppVersionSynchronizationPullRequest {
  const actualReleaseIdentifier = options.releaseIdentifier ?? releaseIdentifier;
  const actualProductionTagName = options.productionTagName ?? productionTagName;
  const actualWebAppVersion = options.webAppVersion ?? '1.0.0';
  const actualBranchName = `webapp-version-${actualReleaseIdentifier}-${actualWebAppVersion}`;

  return {
    number: options.number ?? 1,
    url: `https://github.com/wireapp/wire-webapp/pull/${options.number ?? 1}`,
    title: options.title ?? `Update WebApp version to ${actualWebAppVersion}`,
    body:
      options.body ??
      `<!-- wire-webapp-version-sync release=${actualReleaseIdentifier} production-tag=${actualProductionTagName} version=${actualWebAppVersion} -->`,
    state: options.state ?? 'open',
    mergedAt: options.mergedAt ?? null,
    baseBranch: options.baseBranch ?? 'main',
    headBranch: options.headBranch ?? actualBranchName,
  };
}

describe('WebApp version synchronization branch planning', () => {
  it('creates and validates a deterministic branch name', () => {
    const branchNameResult = createWebAppVersionSynchronizationBranchName(releaseIdentifier, '1.0.0');

    assert(branchNameResult.isOk);
    expect(branchNameResult.value).toBe('webapp-version-2026-09-09.1-1.0.0');

    const validatedBranchNameResult = validateWebAppVersionSynchronizationBranchName(branchNameResult.value);

    assert(validatedBranchNameResult.isOk);
    expect(validatedBranchNameResult.value).toEqual({
      branchName: 'webapp-version-2026-09-09.1-1.0.0',
      releaseIdentifier,
      webAppVersion: '1.0.0',
    });
  });

  it.each([
    'webapp-version-2026-09-09.1-1.0',
    'webapp-version-2026-09-09.1-1.0.0-beta.1',
    'webapp-version-2026-09-09.0-1.0.0',
    'webapp-version-2026-09-09.1-01.0.0',
  ])('rejects invalid branch name %s', branchName => {
    const actualBranchNameResult = validateWebAppVersionSynchronizationBranchName(branchName);

    assert(actualBranchNameResult.isErr);
  });

  it('creates the descriptive pull request title and body', () => {
    const actualTitleResult = createWebAppVersionSynchronizationPullRequestTitle('1.0.0');
    const actualBodyResult = createWebAppVersionSynchronizationPullRequestBody({
      releaseIdentifier,
      productionTagName,
      webAppVersion: '1.0.0',
    });

    assert(actualTitleResult.isOk);
    assert(actualBodyResult.isOk);
    expect(actualTitleResult.value).toBe('Update WebApp version to 1.0.0');
    expect(actualBodyResult.value).toContain('WebApp version: 1.0.0');
    expect(actualBodyResult.value).toContain(`Release: ${releaseIdentifier}`);
    expect(actualBodyResult.value).toContain(`Production tag: ${productionTagName}`);
    expect(actualBodyResult.value).toContain('Production was already deployed and runtime-verified.');
    expect(actualBodyResult.value).toContain(
      `<!-- wire-webapp-version-sync release=${releaseIdentifier} production-tag=${productionTagName} version=1.0.0 -->`,
    );
  });
});

describe('WebApp version synchronization pull request discovery', () => {
  it('ignores unrelated pull requests', () => {
    const actualResult = parseWebAppVersionSynchronizationPullRequest(
      createPullRequest({
        title: 'Update documentation',
        body: 'Documentation change',
        headBranch: 'documentation-update',
      }),
    );

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual(Maybe.nothing());
  });

  it('parses a valid synchronization pull request', () => {
    const actualResult = parseWebAppVersionSynchronizationPullRequest(createPullRequest());

    assert(actualResult.isOk);
    assert(actualResult.value.isJust);
    expect(actualResult.value.value.marker).toEqual({
      releaseIdentifier,
      productionTagName,
      webAppVersion: '1.0.0',
    });
  });

  it.each([
    {title: 'Update WebApp version to 1.0.0', body: 'missing marker'},
    {
      headBranch: 'webapp-version-2026-09-09.1-1.0.1',
      body: 'missing marker',
      title: 'Update WebApp version to 1.0.1',
    },
    {
      body: '<!-- wire-webapp-version-sync release=2026-09-09.1 production-tag=2026-09-09.1-production -->',
    },
    {
      baseBranch: 'release/2026-09-09.1',
    },
    {
      headBranch: 'webapp-version-2026-09-09.1-1.0.1',
    },
    {
      state: 'open' as const,
      mergedAt: '2026-09-09T12:00:00Z',
    },
  ])('rejects a claimed synchronization pull request with invalid state', options => {
    const actualResult = parseWebAppVersionSynchronizationPullRequest(createPullRequest(options));

    assert(actualResult.isErr);
  });
});

describe('WebApp version synchronization state resolution', () => {
  it('reports available when no synchronization history exists', () => {
    const actualResult = resolveWebAppVersionSynchronizationState(releaseIdentifier, productionTagName, []);

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual({
      kind: 'available',
      releaseIdentifier,
      productionTagName,
    });
  });

  it('reuses the version from a matching open pull request', () => {
    const actualResult = resolveWebAppVersionSynchronizationState(releaseIdentifier, productionTagName, [
      createPullRequest(),
    ]);

    assert(actualResult.isOk);
    expect(actualResult.value).toMatchObject({
      kind: 'matching-open',
      webAppVersion: '1.0.0',
      pullRequestNumber: 1,
    });
  });

  it('reuses the version from a matching merged pull request', () => {
    const actualResult = resolveWebAppVersionSynchronizationState(releaseIdentifier, productionTagName, [
      createPullRequest({state: 'closed', mergedAt: '2026-09-09T12:00:00Z'}),
    ]);

    assert(actualResult.isOk);
    expect(actualResult.value).toMatchObject({kind: 'matching-merged', webAppVersion: '1.0.0'});
  });

  it('reports a matching closed pull request that was not merged', () => {
    const actualResult = resolveWebAppVersionSynchronizationState(releaseIdentifier, productionTagName, [
      createPullRequest({state: 'closed'}),
    ]);

    assert(actualResult.isOk);
    expect(actualResult.value).toMatchObject({kind: 'closed-without-merge', webAppVersion: '1.0.0'});
  });

  it('blocks a new release when another synchronization pull request is open', () => {
    const actualResult = resolveWebAppVersionSynchronizationState(releaseIdentifier, productionTagName, [
      createPullRequest({
        releaseIdentifier: '2026-09-02.1',
        productionTagName: '2026-09-02.1-production',
        number: 2,
      }),
    ]);

    assert(actualResult.isOk);
    expect(actualResult.value).toMatchObject({
      kind: 'blocked-by-previous-open',
      blockingReleaseIdentifier: '2026-09-02.1',
      blockingWebAppVersion: '1.0.0',
      pullRequestNumber: 2,
    });
  });

  it('reports a conflict when multiple records exist for one release', () => {
    const actualResult = resolveWebAppVersionSynchronizationState(releaseIdentifier, productionTagName, [
      createPullRequest(),
      createPullRequest({number: 2}),
    ]);

    assert(actualResult.isOk);
    expect(actualResult.value).toMatchObject({kind: 'conflict'});
  });

  it('fails closed when a claimed synchronization pull request has a malformed marker', () => {
    const actualResult = resolveWebAppVersionSynchronizationState(releaseIdentifier, productionTagName, [
      createPullRequest({body: '<!-- wire-webapp-version-sync release=invalid -->'}),
    ]);

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('claims to synchronize the WebApp version');
  });

  it('rejects a request whose Production tag does not match its release identifier', () => {
    const actualResult = resolveWebAppVersionSynchronizationState(releaseIdentifier, '2026-09-10.1-production', []);

    assert(actualResult.isErr);
  });
});
