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

import {
  decideWebAppVersionSynchronizationPreflight,
  validateWebAppVersionSynchronizationPreflight,
} from './webappVersionSynchronizationPreflight.ts';
import {
  createWebAppVersionSynchronizationBranchName,
  type WebAppVersionSynchronizationBranchName,
  type WebAppVersionSynchronizationInspection,
} from './webappVersionSynchronization.ts';
import {validateWebAppVersion} from './webappVersion.ts';
import type {WebAppVersion} from './webappVersion.ts';

type MatchingPullRequestDetails = {
  readonly branchName: WebAppVersionSynchronizationBranchName;
  readonly pullRequestNumber: number;
  readonly pullRequestUrl: string;
  readonly webAppVersion: WebAppVersion;
};

function createMatchingPullRequestDetails(): MatchingPullRequestDetails {
  const branchNameResult = createWebAppVersionSynchronizationBranchName('2026-09-09.1', '1.0.0');

  if (branchNameResult.isErr) {
    throw branchNameResult.error;
  }

  const {value: branchName} = branchNameResult;
  const webAppVersionResult = validateWebAppVersion('1.0.0');

  if (webAppVersionResult.isErr) {
    throw webAppVersionResult.error;
  }

  const {value: webAppVersion} = webAppVersionResult;

  return {
    branchName,
    pullRequestNumber: 123,
    pullRequestUrl: 'https://github.com/wireapp/wire-webapp/pull/123',
    webAppVersion,
  };
}

describe('WebApp version synchronization preflight', () => {
  it.each(['available', 'matching-open', 'matching-merged'] as const)('allows %s inspection state', state => {
    const inspection: WebAppVersionSynchronizationInspection =
      state === 'available'
        ? {
            kind: state,
            releaseIdentifier: '2026-09-09.1',
            productionTagName: '2026-09-09.1-production',
          }
        : {
            kind: state,
            releaseIdentifier: '2026-09-09.1',
            productionTagName: '2026-09-09.1-production',
            ...createMatchingPullRequestDetails(),
          };

    const decision = decideWebAppVersionSynchronizationPreflight(inspection);

    expect(decision).toEqual({state: 'allowed', inspection});
  });

  it('blocks a matching synchronization pull request that was closed without merging', () => {
    const matchingPullRequestDetails = createMatchingPullRequestDetails();
    const inspection: WebAppVersionSynchronizationInspection = {
      kind: 'closed-without-merge',
      releaseIdentifier: '2026-09-09.1',
      productionTagName: '2026-09-09.1-production',
      ...matchingPullRequestDetails,
    };

    const decision = decideWebAppVersionSynchronizationPreflight(inspection);

    expect(decision.state).toBe('blocked');
    expect(decision).toMatchObject({
      diagnostic: expect.stringContaining('#123'),
    });
    expect(decision).toMatchObject({
      diagnostic: expect.stringContaining('https://github.com/wireapp/wire-webapp/pull/123'),
    });
  });

  it('blocks a release with a previous unresolved synchronization pull request', () => {
    const matchingPullRequestDetails = createMatchingPullRequestDetails();
    const inspection: WebAppVersionSynchronizationInspection = {
      kind: 'blocked-by-previous-unresolved',
      releaseIdentifier: '2026-09-16.1',
      productionTagName: '2026-09-16.1-production',
      blockingReleaseIdentifier: '2026-09-09.1',
      blockingProductionTagName: '2026-09-09.1-production',
      blockingWebAppVersion: matchingPullRequestDetails.webAppVersion,
      blockingSynchronizationState: 'open',
      branchName: matchingPullRequestDetails.branchName,
      pullRequestNumber: matchingPullRequestDetails.pullRequestNumber,
      pullRequestUrl: matchingPullRequestDetails.pullRequestUrl,
    };

    const decision = decideWebAppVersionSynchronizationPreflight(inspection);

    expect(decision.state).toBe('blocked');
    expect(decision).toMatchObject({
      diagnostic: expect.stringContaining('2026-09-09.1'),
    });
    expect(decision).toMatchObject({
      diagnostic: expect.stringContaining('https://github.com/wireapp/wire-webapp/pull/123'),
    });
  });

  it('blocks conflicting synchronization history', () => {
    const inspection: WebAppVersionSynchronizationInspection = {
      kind: 'conflict',
      releaseIdentifier: '2026-09-09.1',
      productionTagName: '2026-09-09.1-production',
      reason: 'Multiple unresolved synchronization records exist',
    };

    const decision = decideWebAppVersionSynchronizationPreflight(inspection);

    expect(decision).toEqual({state: 'blocked', inspection, diagnostic: expect.any(String)});
    expect(decision).toMatchObject({
      diagnostic: expect.stringContaining('Multiple unresolved synchronization records exist'),
    });
  });

  it('returns an error for a blocked preflight decision', () => {
    const inspection: WebAppVersionSynchronizationInspection = {
      kind: 'conflict',
      releaseIdentifier: '2026-09-09.1',
      productionTagName: '2026-09-09.1-production',
      reason: 'Multiple unresolved synchronization records exist',
    };

    const result = validateWebAppVersionSynchronizationPreflight(inspection);

    expect(result.isErr).toBe(true);

    if (result.isErr) {
      expect(result.error.message).toContain('Multiple unresolved synchronization records exist');
    }
  });

  it('returns success for an allowed preflight decision', () => {
    const inspection: WebAppVersionSynchronizationInspection = {
      kind: 'available',
      releaseIdentifier: '2026-09-09.1',
      productionTagName: '2026-09-09.1-production',
    };

    const result = validateWebAppVersionSynchronizationPreflight(inspection);

    expect(result.isOk).toBe(true);
  });
});
