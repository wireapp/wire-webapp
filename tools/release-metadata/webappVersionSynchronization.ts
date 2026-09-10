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

import {isNull, isString} from '@sindresorhus/is';
import {Maybe, maybe, Result} from 'true-myth';

import {createProductionTagName} from './releaseMetadata.ts';
import type {ProductionTagName, ReleaseIdentifier} from './releaseMetadata.ts';
import {
  createWebAppVersionSynchronizationMarker,
  parseWebAppVersionSynchronizationMarker,
  validateWebAppVersion,
} from './webappVersion.ts';
import type {WebAppVersion, WebAppVersionSynchronizationMarker} from './webappVersion.ts';

declare const webAppVersionSynchronizationBranchNameBrand: unique symbol;

export type WebAppVersionSynchronizationBranchName = string & {
  readonly [webAppVersionSynchronizationBranchNameBrand]: 'WebAppVersionSynchronizationBranchName';
};

export type WebAppVersionSynchronizationPullRequest = {
  readonly number: number;
  readonly url: string;
  readonly title: string;
  readonly body: string;
  readonly state: 'open' | 'closed';
  readonly mergedAt: string | null;
  readonly baseBranch: string;
  readonly headBranch: string;
};

export type WebAppVersionSynchronizationRecord = {
  readonly pullRequest: WebAppVersionSynchronizationPullRequest;
  readonly marker: WebAppVersionSynchronizationMarker;
};

export type WebAppVersionSynchronizationUnresolvedState = 'open' | 'closed-without-merge';

export type WebAppVersionSynchronizationInspection =
  | {
      readonly kind: 'available';
      readonly releaseIdentifier: ReleaseIdentifier;
      readonly productionTagName: ProductionTagName;
    }
  | {
      readonly kind: 'matching-open' | 'matching-merged' | 'closed-without-merge';
      readonly releaseIdentifier: ReleaseIdentifier;
      readonly productionTagName: ProductionTagName;
      readonly webAppVersion: WebAppVersion;
      readonly pullRequestNumber: number;
      readonly pullRequestUrl: string;
      readonly branchName: WebAppVersionSynchronizationBranchName;
    }
  | {
      readonly kind: 'blocked-by-previous-unresolved';
      readonly releaseIdentifier: ReleaseIdentifier;
      readonly productionTagName: ProductionTagName;
      readonly blockingReleaseIdentifier: ReleaseIdentifier;
      readonly blockingProductionTagName: ProductionTagName;
      readonly blockingWebAppVersion: WebAppVersion;
      readonly blockingSynchronizationState: WebAppVersionSynchronizationUnresolvedState;
      readonly pullRequestNumber: number;
      readonly pullRequestUrl: string;
      readonly branchName: WebAppVersionSynchronizationBranchName;
    }
  | {
      readonly kind: 'conflict';
      readonly releaseIdentifier: ReleaseIdentifier;
      readonly productionTagName: ProductionTagName;
      readonly reason: string;
    };

export type WebAppVersionSynchronizationBranch = {
  readonly branchName: WebAppVersionSynchronizationBranchName;
  readonly releaseIdentifier: ReleaseIdentifier;
  readonly webAppVersion: WebAppVersion;
};

export type CreateWebAppVersionSynchronizationPullRequestBodyOptions = {
  readonly releaseIdentifier: string;
  readonly productionTagName: string;
  readonly webAppVersion: string;
};

const synchronizationBranchPrefix = 'webapp-version-';
const synchronizationPullRequestTitlePrefix = 'Update WebApp version to ';
const synchronizationBranchPattern = new RegExp(
  String.raw`^${synchronizationBranchPrefix}(\d{4}-\d{2}-\d{2}\.[1-9]\d*)-((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$`,
);
const synchronizationMarkerPrefix = '<!-- wire-webapp-version-sync';

function createSynchronizationRequest(
  releaseIdentifier: string,
  productionTagName: string,
): Result<{readonly releaseIdentifier: ReleaseIdentifier; readonly productionTagName: ProductionTagName}, Error> {
  const productionTagNameResult = createProductionTagName(releaseIdentifier);

  if (productionTagNameResult.isErr) {
    return Result.err(productionTagNameResult.error);
  }

  const {value: validatedProductionTagName} = productionTagNameResult;

  if (validatedProductionTagName !== productionTagName) {
    return Result.err(
      new Error(`Production tag ${productionTagName} does not match release identifier ${releaseIdentifier}`),
    );
  }

  return Result.ok({
    releaseIdentifier: releaseIdentifier as ReleaseIdentifier,
    productionTagName: validatedProductionTagName,
  });
}

function isClaimedWebAppVersionSynchronizationPullRequest(
  pullRequest: WebAppVersionSynchronizationPullRequest,
): boolean {
  return (
    pullRequest.body.includes(synchronizationMarkerPrefix) ||
    pullRequest.headBranch.startsWith(synchronizationBranchPrefix) ||
    pullRequest.title.startsWith(synchronizationPullRequestTitlePrefix)
  );
}

function createExistingSynchronizationInspection(
  kind: 'matching-open' | 'matching-merged' | 'closed-without-merge',
  synchronizationRecord: WebAppVersionSynchronizationRecord,
): WebAppVersionSynchronizationInspection {
  return {
    kind,
    releaseIdentifier: synchronizationRecord.marker.releaseIdentifier,
    productionTagName: synchronizationRecord.marker.productionTagName,
    webAppVersion: synchronizationRecord.marker.webAppVersion,
    pullRequestNumber: synchronizationRecord.pullRequest.number,
    pullRequestUrl: synchronizationRecord.pullRequest.url,
    branchName: synchronizationRecord.pullRequest.headBranch as WebAppVersionSynchronizationBranchName,
  };
}

export function createWebAppVersionSynchronizationBranchName(
  releaseIdentifier: string,
  webAppVersion: string,
): Result<WebAppVersionSynchronizationBranchName, Error> {
  const productionTagNameResult = createProductionTagName(releaseIdentifier);

  if (productionTagNameResult.isErr) {
    return Result.err(productionTagNameResult.error);
  }

  const webAppVersionResult = validateWebAppVersion(webAppVersion);

  if (webAppVersionResult.isErr) {
    return Result.err(webAppVersionResult.error);
  }

  const {value: validatedWebAppVersion} = webAppVersionResult;

  return Result.ok(
    `${synchronizationBranchPrefix}${releaseIdentifier}-${validatedWebAppVersion}` as WebAppVersionSynchronizationBranchName,
  );
}

export function validateWebAppVersionSynchronizationBranchName(
  branchName: string,
): Result<WebAppVersionSynchronizationBranch, Error> {
  const branchNameMatch = synchronizationBranchPattern.exec(branchName);

  if (isNull(branchNameMatch)) {
    return Result.err(new Error(`Invalid WebApp version synchronization branch name: ${branchName}`));
  }

  const releaseIdentifier = branchNameMatch[1];
  const webAppVersion = branchNameMatch[2];

  if (isString(releaseIdentifier) === false || isString(webAppVersion) === false) {
    return Result.err(new Error(`Invalid WebApp version synchronization branch name: ${branchName}`));
  }

  const expectedBranchNameResult = createWebAppVersionSynchronizationBranchName(releaseIdentifier, webAppVersion);

  if (expectedBranchNameResult.isErr) {
    return Result.err(expectedBranchNameResult.error);
  }

  const {value: expectedBranchName} = expectedBranchNameResult;

  if (expectedBranchName !== branchName) {
    return Result.err(new Error(`Invalid WebApp version synchronization branch name: ${branchName}`));
  }

  return Result.ok({
    branchName: expectedBranchName,
    releaseIdentifier: releaseIdentifier as ReleaseIdentifier,
    webAppVersion: webAppVersion as WebAppVersion,
  });
}

export function parseWebAppVersionSynchronizationPullRequest(
  pullRequest: WebAppVersionSynchronizationPullRequest,
): Result<Maybe<WebAppVersionSynchronizationRecord>, Error> {
  if (isClaimedWebAppVersionSynchronizationPullRequest(pullRequest) === false) {
    return Result.ok(Maybe.nothing<WebAppVersionSynchronizationRecord>());
  }

  const markerResult = parseWebAppVersionSynchronizationMarker(pullRequest.body);

  if (markerResult.isErr) {
    return Result.err(
      new Error(
        `Pull request #${pullRequest.number} claims to synchronize the WebApp version but has an invalid marker: ${markerResult.error.message}`,
      ),
    );
  }

  const {value: marker} = markerResult;

  if (pullRequest.baseBranch !== 'main') {
    return Result.err(
      new Error(`WebApp version synchronization pull request #${pullRequest.number} does not target main`),
    );
  }

  const expectedBranchNameResult = createWebAppVersionSynchronizationBranchName(
    marker.releaseIdentifier,
    marker.webAppVersion,
  );

  if (expectedBranchNameResult.isErr) {
    return Result.err(expectedBranchNameResult.error);
  }

  const {value: expectedBranchName} = expectedBranchNameResult;

  if (expectedBranchName !== pullRequest.headBranch) {
    return Result.err(
      new Error(
        `WebApp version synchronization pull request #${pullRequest.number} has unexpected branch ${pullRequest.headBranch}`,
      ),
    );
  }

  if (pullRequest.state === 'open' && isNull(pullRequest.mergedAt) === false) {
    return Result.err(new Error(`Open WebApp version synchronization pull request #${pullRequest.number} is merged`));
  }

  return Result.ok(Maybe.just({pullRequest, marker}));
}

export function resolveWebAppVersionSynchronizationState(
  releaseIdentifier: string,
  productionTagName: string,
  pullRequests: readonly WebAppVersionSynchronizationPullRequest[],
): Result<WebAppVersionSynchronizationInspection, Error> {
  const synchronizationRequestResult = createSynchronizationRequest(releaseIdentifier, productionTagName);

  if (synchronizationRequestResult.isErr) {
    return Result.err(synchronizationRequestResult.error);
  }

  const {value: synchronizationRequest} = synchronizationRequestResult;

  const synchronizationRecordsResult = pullRequests.reduce((recordsResult, pullRequest) => {
    return recordsResult.andThen(synchronizationRecords => {
      return parseWebAppVersionSynchronizationPullRequest(pullRequest).andThen(synchronizationRecordMaybe => {
        if (synchronizationRecordMaybe.isNothing) {
          return Result.ok(synchronizationRecords);
        }

        const {value: synchronizationRecord} = synchronizationRecordMaybe;

        return Result.ok([...synchronizationRecords, synchronizationRecord]);
      });
    });
  }, Result.ok<readonly WebAppVersionSynchronizationRecord[], Error>([]));

  if (synchronizationRecordsResult.isErr) {
    return Result.err(synchronizationRecordsResult.error);
  }

  const {value: synchronizationRecords} = synchronizationRecordsResult;

  const requestedReleaseRecords = synchronizationRecords.filter(record => {
    return record.marker.releaseIdentifier === synchronizationRequest.releaseIdentifier;
  });

  const conflictingProductionTagRecord = maybe.find(record => {
    return record.marker.productionTagName !== synchronizationRequest.productionTagName;
  }, requestedReleaseRecords);

  if (conflictingProductionTagRecord.isJust) {
    const {value: conflictingRecord} = conflictingProductionTagRecord;

    return Result.ok({
      kind: 'conflict',
      releaseIdentifier: synchronizationRequest.releaseIdentifier,
      productionTagName: synchronizationRequest.productionTagName,
      reason: `A synchronization record for the release uses a different Production tag: ${conflictingRecord.marker.productionTagName}`,
    });
  }

  if (requestedReleaseRecords.length > 1) {
    return Result.ok({
      kind: 'conflict',
      releaseIdentifier: synchronizationRequest.releaseIdentifier,
      productionTagName: synchronizationRequest.productionTagName,
      reason: 'Multiple synchronization records exist for the requested release',
    });
  }

  const requestedReleaseRecord = maybe.find(record => {
    return record.marker.releaseIdentifier === synchronizationRequest.releaseIdentifier;
  }, synchronizationRecords);

  const unresolvedSynchronizationRecords = synchronizationRecords.filter(record => {
    return record.pullRequest.state === 'open' || isNull(record.pullRequest.mergedAt);
  });

  if (unresolvedSynchronizationRecords.length > 1) {
    return Result.ok({
      kind: 'conflict',
      releaseIdentifier: synchronizationRequest.releaseIdentifier,
      productionTagName: synchronizationRequest.productionTagName,
      reason: 'Multiple unresolved synchronization records exist',
    });
  }

  const unresolvedDifferentReleaseRecord = maybe.find(record => {
    return record.marker.releaseIdentifier !== synchronizationRequest.releaseIdentifier;
  }, unresolvedSynchronizationRecords);

  if (requestedReleaseRecord.isJust && unresolvedDifferentReleaseRecord.isJust) {
    return Result.ok({
      kind: 'conflict',
      releaseIdentifier: synchronizationRequest.releaseIdentifier,
      productionTagName: synchronizationRequest.productionTagName,
      reason: 'A synchronization record for the requested release coexists with an unresolved different release',
    });
  }

  if (requestedReleaseRecord.isJust) {
    const {value: synchronizationRecord} = requestedReleaseRecord;

    if (synchronizationRecord.pullRequest.state === 'open') {
      return Result.ok(createExistingSynchronizationInspection('matching-open', synchronizationRecord));
    }

    if (isNull(synchronizationRecord.pullRequest.mergedAt)) {
      return Result.ok(createExistingSynchronizationInspection('closed-without-merge', synchronizationRecord));
    }

    return Result.ok(createExistingSynchronizationInspection('matching-merged', synchronizationRecord));
  }

  const previousUnresolvedRecord = maybe.find(record => {
    return record.pullRequest.state === 'open' || isNull(record.pullRequest.mergedAt);
  }, synchronizationRecords);

  if (previousUnresolvedRecord.isJust) {
    const {value: synchronizationRecord} = previousUnresolvedRecord;
    const blockingSynchronizationState: WebAppVersionSynchronizationUnresolvedState =
      synchronizationRecord.pullRequest.state === 'open' ? 'open' : 'closed-without-merge';

    return Result.ok({
      kind: 'blocked-by-previous-unresolved',
      releaseIdentifier: synchronizationRequest.releaseIdentifier,
      productionTagName: synchronizationRequest.productionTagName,
      blockingReleaseIdentifier: synchronizationRecord.marker.releaseIdentifier,
      blockingProductionTagName: synchronizationRecord.marker.productionTagName,
      blockingWebAppVersion: synchronizationRecord.marker.webAppVersion,
      blockingSynchronizationState,
      pullRequestNumber: synchronizationRecord.pullRequest.number,
      pullRequestUrl: synchronizationRecord.pullRequest.url,
      branchName: synchronizationRecord.pullRequest.headBranch as WebAppVersionSynchronizationBranchName,
    });
  }

  return Result.ok({
    kind: 'available',
    releaseIdentifier: synchronizationRequest.releaseIdentifier,
    productionTagName: synchronizationRequest.productionTagName,
  });
}

export function createWebAppVersionSynchronizationPullRequestTitle(webAppVersion: string): Result<string, Error> {
  const webAppVersionResult = validateWebAppVersion(webAppVersion);

  if (webAppVersionResult.isErr) {
    return Result.err(webAppVersionResult.error);
  }

  const {value: validatedWebAppVersion} = webAppVersionResult;

  return Result.ok(`${synchronizationPullRequestTitlePrefix}${validatedWebAppVersion}`);
}

export function createWebAppVersionSynchronizationPullRequestBody(
  options: CreateWebAppVersionSynchronizationPullRequestBodyOptions,
): Result<string, Error> {
  const markerResult = createWebAppVersionSynchronizationMarker(options);

  if (markerResult.isErr) {
    return Result.err(markerResult.error);
  }

  const {value: marker} = markerResult;

  return Result.ok(
    [
      'Synchronizes the WebApp package version with the successfully deployed Production release.',
      '',
      `WebApp version: ${options.webAppVersion}`,
      `Release: ${options.releaseIdentifier}`,
      `Production tag: ${options.productionTagName}`,
      '',
      'Production was already deployed and runtime-verified. This pull request only synchronizes repository package metadata; it does not modify the released artifact.',
      '',
      marker,
    ].join('\n'),
  );
}
