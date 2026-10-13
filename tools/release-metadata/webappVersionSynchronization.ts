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

import {isNonEmptyArray, isNull, isString} from '@sindresorhus/is';
import {Maybe, maybe, Result} from 'true-myth';

import {createProductionTagName} from './releaseMetadata.ts';
import type {ProductionTagName, ReleaseIdentifier} from './releaseMetadata.ts';
import {createStableWebAppTagName, parseStableWebAppTagName} from './webappReleaseIdentity.ts';
import type {StableWebAppTagName} from './webappReleaseIdentity.ts';
import {
  createWebAppVersionSynchronizationMarker,
  parseWebAppVersionSynchronizationMarker,
  validateWebAppVersion,
} from './webappVersion.ts';
import type {WebAppVersion, WebAppVersionSynchronizationMarker} from './webappVersion.ts';

const webappVersionCaptureIndex = 2;

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

export type SemVerWebAppVersionSynchronizationMarker = {
  readonly productionTagName: StableWebAppTagName;
  readonly webAppVersion: WebAppVersion;
};

export type ParsedWebAppVersionSynchronizationRecord =
  | {
      readonly kind: 'legacy';
      readonly pullRequest: WebAppVersionSynchronizationPullRequest;
      readonly marker: WebAppVersionSynchronizationMarker;
    }
  | {
      readonly kind: 'semver';
      readonly pullRequest: WebAppVersionSynchronizationPullRequest;
      readonly marker: SemVerWebAppVersionSynchronizationMarker;
    };

export type WebAppVersionSynchronizationRequest =
  | {
      readonly kind: 'legacy';
      readonly releaseIdentifier: ReleaseIdentifier;
      readonly productionTagName: ProductionTagName;
    }
  | {
      readonly kind: 'semver';
      readonly productionTagName: StableWebAppTagName;
      readonly webAppVersion: WebAppVersion;
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

export type WebAppVersionSynchronizationBranch =
  | {
      readonly kind: 'legacy';
      readonly branchName: WebAppVersionSynchronizationBranchName;
      readonly releaseIdentifier: ReleaseIdentifier;
      readonly webAppVersion: WebAppVersion;
    }
  | {
      readonly kind: 'semver';
      readonly branchName: WebAppVersionSynchronizationBranchName;
      readonly productionTagName: StableWebAppTagName;
      readonly webAppVersion: WebAppVersion;
    };

export type SemVerWebAppVersionSynchronizationInspection =
  | {
      readonly kind: 'available';
      readonly productionTagName: StableWebAppTagName;
      readonly webAppVersion: WebAppVersion;
    }
  | {
      readonly kind: 'matching-open';
      readonly productionTagName: StableWebAppTagName;
      readonly webAppVersion: WebAppVersion;
      readonly pullRequestNumber: number;
      readonly pullRequestUrl: string;
      readonly branchName: WebAppVersionSynchronizationBranchName;
    }
  | {
      readonly kind: 'matching-merged';
      readonly productionTagName: StableWebAppTagName;
      readonly webAppVersion: WebAppVersion;
      readonly pullRequestNumber: number;
      readonly pullRequestUrl: string;
      readonly branchName: WebAppVersionSynchronizationBranchName;
    }
  | {
      readonly kind: 'closed-without-merge';
      readonly productionTagName: StableWebAppTagName;
      readonly webAppVersion: WebAppVersion;
      readonly pullRequestNumber: number;
      readonly pullRequestUrl: string;
      readonly branchName: WebAppVersionSynchronizationBranchName;
    }
  | {
      readonly kind: 'blocked-by-previous-unresolved';
      readonly productionTagName: StableWebAppTagName;
      readonly webAppVersion: WebAppVersion;
      readonly blockingProductionTagName: string;
      readonly blockingWebAppVersion: WebAppVersion;
      readonly blockingSynchronizationState: WebAppVersionSynchronizationUnresolvedState;
      readonly pullRequestNumber: number;
      readonly pullRequestUrl: string;
      readonly branchName: WebAppVersionSynchronizationBranchName;
    }
  | {
      readonly kind: 'conflict';
      readonly productionTagName: StableWebAppTagName;
      readonly webAppVersion: WebAppVersion;
      readonly reason: string;
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
const semverSynchronizationMarkerPattern =
  /<!-- wire-webapp-version-sync:v2 production-tag=([^\s]+) version=([^\s]+) -->/;
const semverSynchronizationMarkerSearchPattern = new RegExp(semverSynchronizationMarkerPattern.source, 'g');
const semverSynchronizationBranchPattern = /^webapp-version-(.+)$/;
const semverMarkerProductionTagCaptureIndex = 1;
const semverMarkerVersionCaptureIndex = 2;

function createSynchronizationRequest(
  releaseIdentifier: string,
  productionTagName: string,
): Result<Extract<WebAppVersionSynchronizationRequest, {readonly kind: 'legacy'}>, Error> {
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
    kind: 'legacy',
    releaseIdentifier: releaseIdentifier as ReleaseIdentifier,
    productionTagName: validatedProductionTagName,
  });
}

export function createSemVerWebAppVersionSynchronizationRequest(
  productionTagName: string,
): Result<Extract<WebAppVersionSynchronizationRequest, {readonly kind: 'semver'}>, Error> {
  const webAppVersionResult = parseStableWebAppTagName(productionTagName);

  if (webAppVersionResult.isErr) {
    return Result.err(webAppVersionResult.error);
  }

  const stableProductionTagNameResult = createStableWebAppTagName(webAppVersionResult.value);

  if (stableProductionTagNameResult.isErr) {
    return Result.err(stableProductionTagNameResult.error);
  }

  return Result.ok({
    kind: 'semver',
    productionTagName: stableProductionTagNameResult.value,
    webAppVersion: webAppVersionResult.value,
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

export function createSemVerWebAppVersionSynchronizationBranchName(
  webAppVersion: string,
): Result<WebAppVersionSynchronizationBranchName, Error> {
  const webAppVersionResult = validateWebAppVersion(webAppVersion);

  if (webAppVersionResult.isErr) {
    return Result.err(webAppVersionResult.error);
  }

  return Result.ok(
    `${synchronizationBranchPrefix}${webAppVersionResult.value}` as WebAppVersionSynchronizationBranchName,
  );
}

export function validateWebAppVersionSynchronizationBranchName(
  branchName: string,
): Result<Extract<WebAppVersionSynchronizationBranch, {readonly kind: 'legacy'}>, Error> {
  const branchNameMatch = synchronizationBranchPattern.exec(branchName);

  if (isNull(branchNameMatch)) {
    return Result.err(new Error(`Invalid WebApp version synchronization branch name: ${branchName}`));
  }

  const releaseIdentifier = branchNameMatch[1];
  const webAppVersion = branchNameMatch[webappVersionCaptureIndex];

  if (!isString(releaseIdentifier) || !isString(webAppVersion)) {
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
    kind: 'legacy',
    branchName: expectedBranchName,
    releaseIdentifier: releaseIdentifier as ReleaseIdentifier,
    webAppVersion: webAppVersion as WebAppVersion,
  });
}

export function validateSemVerWebAppVersionSynchronizationBranchName(
  branchName: string,
): Result<Extract<WebAppVersionSynchronizationBranch, {readonly kind: 'semver'}>, Error> {
  const branchNameMatch = semverSynchronizationBranchPattern.exec(branchName);

  if (isNull(branchNameMatch)) {
    return Result.err(new Error(`Invalid SemVer WebApp version synchronization branch name: ${branchName}`));
  }

  const webAppVersion = branchNameMatch.at(1);

  if (!isString(webAppVersion)) {
    return Result.err(new Error(`Invalid SemVer WebApp version synchronization branch name: ${branchName}`));
  }

  const webAppVersionResult = validateWebAppVersion(webAppVersion);

  if (webAppVersionResult.isErr) {
    return Result.err(new Error(`Invalid SemVer WebApp version synchronization branch name: ${branchName}`));
  }

  const expectedBranchNameResult = createSemVerWebAppVersionSynchronizationBranchName(webAppVersionResult.value);

  if (expectedBranchNameResult.isErr || expectedBranchNameResult.value !== branchName) {
    return Result.err(new Error(`Invalid SemVer WebApp version synchronization branch name: ${branchName}`));
  }

  const productionTagNameResult = createStableWebAppTagName(webAppVersionResult.value);

  if (productionTagNameResult.isErr) {
    return Result.err(productionTagNameResult.error);
  }

  return Result.ok({
    kind: 'semver',
    branchName: expectedBranchNameResult.value,
    productionTagName: productionTagNameResult.value,
    webAppVersion: webAppVersionResult.value,
  });
}

export function parseWebAppVersionSynchronizationPullRequest(
  pullRequest: WebAppVersionSynchronizationPullRequest,
): Result<Maybe<WebAppVersionSynchronizationRecord>, Error> {
  if (!isClaimedWebAppVersionSynchronizationPullRequest(pullRequest)) {
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

  if (pullRequest.state === 'open' && !isNull(pullRequest.mergedAt)) {
    return Result.err(new Error(`Open WebApp version synchronization pull request #${pullRequest.number} is merged`));
  }

  return Result.ok(Maybe.just({pullRequest, marker}));
}

export function createSemVerWebAppVersionSynchronizationMarker(productionTagName: string): Result<string, Error> {
  const requestResult = createSemVerWebAppVersionSynchronizationRequest(productionTagName);

  if (requestResult.isErr) {
    return Result.err(requestResult.error);
  }

  const {value: request} = requestResult;

  return Result.ok(
    `<!-- wire-webapp-version-sync:v2 production-tag=${request.productionTagName} version=${request.webAppVersion} -->`,
  );
}

export function parseSemVerWebAppVersionSynchronizationMarker(
  value: unknown,
): Result<SemVerWebAppVersionSynchronizationMarker, Error> {
  if (!isString(value)) {
    return Result.err(new Error('SemVer WebApp version synchronization marker must be a string'));
  }

  const allMarkerPrefixes = value.match(/<!-- wire-webapp-version-sync/g);

  if (!isNonEmptyArray(allMarkerPrefixes) || allMarkerPrefixes.length !== 1) {
    return Result.err(new Error('SemVer WebApp version synchronization marker must occur exactly once'));
  }

  const markerMatches = value.match(semverSynchronizationMarkerSearchPattern);

  if (!isNonEmptyArray(markerMatches) || markerMatches.length !== 1) {
    return Result.err(new Error('Malformed SemVer WebApp version synchronization marker'));
  }

  const markerMatch = semverSynchronizationMarkerPattern.exec(markerMatches.at(0) ?? '');

  if (isNull(markerMatch)) {
    return Result.err(new Error('Malformed SemVer WebApp version synchronization marker'));
  }

  const productionTagName = markerMatch.at(semverMarkerProductionTagCaptureIndex);
  const webAppVersion = markerMatch.at(semverMarkerVersionCaptureIndex);

  if (!isString(productionTagName) || !isString(webAppVersion)) {
    return Result.err(new Error('Malformed SemVer WebApp version synchronization marker'));
  }

  const requestResult = createSemVerWebAppVersionSynchronizationRequest(productionTagName);

  if (requestResult.isErr) {
    return Result.err(
      new Error(`Malformed SemVer WebApp version synchronization marker: ${requestResult.error.message}`),
    );
  }

  if (requestResult.value.webAppVersion !== webAppVersion) {
    return Result.err(
      new Error(
        `SemVer WebApp version synchronization marker version ${webAppVersion} does not match Production tag ${productionTagName}`,
      ),
    );
  }

  return Result.ok({
    productionTagName: requestResult.value.productionTagName,
    webAppVersion: requestResult.value.webAppVersion,
  });
}

function parseSemVerWebAppVersionSynchronizationPullRequest(
  pullRequest: WebAppVersionSynchronizationPullRequest,
): Result<Maybe<ParsedWebAppVersionSynchronizationRecord>, Error> {
  if (!isClaimedWebAppVersionSynchronizationPullRequest(pullRequest)) {
    return Result.ok(Maybe.nothing<ParsedWebAppVersionSynchronizationRecord>());
  }

  const markerResult = parseSemVerWebAppVersionSynchronizationMarker(pullRequest.body);

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

  const expectedBranchNameResult = createSemVerWebAppVersionSynchronizationBranchName(marker.webAppVersion);

  if (expectedBranchNameResult.isErr || expectedBranchNameResult.value !== pullRequest.headBranch) {
    return Result.err(
      new Error(
        `WebApp version synchronization pull request #${pullRequest.number} has unexpected branch ${pullRequest.headBranch}`,
      ),
    );
  }

  if (pullRequest.state === 'open' && !isNull(pullRequest.mergedAt)) {
    return Result.err(new Error(`Open WebApp version synchronization pull request #${pullRequest.number} is merged`));
  }

  return Result.ok(
    Maybe.just({
      kind: 'semver',
      pullRequest,
      marker,
    }),
  );
}

export function parseWebAppVersionSynchronizationRecord(
  pullRequest: WebAppVersionSynchronizationPullRequest,
): Result<Maybe<ParsedWebAppVersionSynchronizationRecord>, Error> {
  if (pullRequest.body.includes('wire-webapp-version-sync:v2')) {
    return parseSemVerWebAppVersionSynchronizationPullRequest(pullRequest);
  }

  const legacyRecordResult = parseWebAppVersionSynchronizationPullRequest(pullRequest);

  if (legacyRecordResult.isErr || legacyRecordResult.value.isNothing) {
    return legacyRecordResult.map(legacyRecordMaybe => {
      return legacyRecordMaybe.map(legacyRecord => {
        return {kind: 'legacy', ...legacyRecord};
      });
    });
  }

  return Result.ok(
    legacyRecordResult.value.map(legacyRecord => {
      return {kind: 'legacy', ...legacyRecord};
    }),
  );
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
      return parseWebAppVersionSynchronizationRecord(pullRequest).andThen(synchronizationRecordMaybe => {
        if (synchronizationRecordMaybe.isNothing) {
          return Result.ok(synchronizationRecords);
        }

        const {value: synchronizationRecord} = synchronizationRecordMaybe;

        return Result.ok([...synchronizationRecords, synchronizationRecord]);
      });
    });
  }, Result.ok<readonly ParsedWebAppVersionSynchronizationRecord[], Error>([]));

  if (synchronizationRecordsResult.isErr) {
    return Result.err(synchronizationRecordsResult.error);
  }

  const {value: synchronizationRecords} = synchronizationRecordsResult;

  const requestedReleaseRecords = synchronizationRecords.filter(
    (record): record is Extract<ParsedWebAppVersionSynchronizationRecord, {readonly kind: 'legacy'}> => {
      return record.kind === 'legacy' && record.marker.releaseIdentifier === synchronizationRequest.releaseIdentifier;
    },
  );

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
  }, requestedReleaseRecords);

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
    return record.kind === 'semver' || record.marker.releaseIdentifier !== synchronizationRequest.releaseIdentifier;
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

    if (synchronizationRecord.kind === 'semver') {
      return Result.ok({
        kind: 'conflict',
        releaseIdentifier: synchronizationRequest.releaseIdentifier,
        productionTagName: synchronizationRequest.productionTagName,
        reason: `An unresolved SemVer synchronization exists for ${synchronizationRecord.marker.productionTagName}`,
      });
    }

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

function createExistingSemVerSynchronizationInspection(
  kind: 'matching-open' | 'matching-merged' | 'closed-without-merge',
  synchronizationRecord: Extract<ParsedWebAppVersionSynchronizationRecord, {readonly kind: 'semver'}>,
): SemVerWebAppVersionSynchronizationInspection {
  const synchronizationDetails = {
    productionTagName: synchronizationRecord.marker.productionTagName,
    webAppVersion: synchronizationRecord.marker.webAppVersion,
    pullRequestNumber: synchronizationRecord.pullRequest.number,
    pullRequestUrl: synchronizationRecord.pullRequest.url,
    branchName: synchronizationRecord.pullRequest.headBranch as WebAppVersionSynchronizationBranchName,
  };

  if (kind === 'matching-open') {
    return {kind, ...synchronizationDetails};
  }

  if (kind === 'matching-merged') {
    return {kind, ...synchronizationDetails};
  }

  return {kind, ...synchronizationDetails};
}

export function resolveSemVerWebAppVersionSynchronizationState(
  productionTagName: string,
  pullRequests: readonly WebAppVersionSynchronizationPullRequest[],
): Result<SemVerWebAppVersionSynchronizationInspection, Error> {
  const synchronizationRequestResult = createSemVerWebAppVersionSynchronizationRequest(productionTagName);

  if (synchronizationRequestResult.isErr) {
    return Result.err(synchronizationRequestResult.error);
  }

  return resolveSemVerWebAppVersionSynchronizationStateForRequest(synchronizationRequestResult.value, pullRequests);
}

export function resolveSemVerWebAppVersionSynchronizationStateForRequest(
  synchronizationRequest: Extract<WebAppVersionSynchronizationRequest, {readonly kind: 'semver'}>,
  pullRequests: readonly WebAppVersionSynchronizationPullRequest[],
): Result<SemVerWebAppVersionSynchronizationInspection, Error> {
  const synchronizationRecordsResult = pullRequests.reduce((recordsResult, pullRequest) => {
    return recordsResult.andThen(synchronizationRecords => {
      return parseWebAppVersionSynchronizationRecord(pullRequest).andThen(synchronizationRecordMaybe => {
        if (synchronizationRecordMaybe.isNothing) {
          return Result.ok(synchronizationRecords);
        }

        return Result.ok([...synchronizationRecords, synchronizationRecordMaybe.value]);
      });
    });
  }, Result.ok<readonly ParsedWebAppVersionSynchronizationRecord[], Error>([]));

  if (synchronizationRecordsResult.isErr) {
    return Result.err(synchronizationRecordsResult.error);
  }

  const {value: synchronizationRecords} = synchronizationRecordsResult;
  const requestedRecords = synchronizationRecords.filter(
    (record): record is Extract<ParsedWebAppVersionSynchronizationRecord, {readonly kind: 'semver'}> => {
      return record.kind === 'semver' && record.marker.productionTagName === synchronizationRequest.productionTagName;
    },
  );

  if (requestedRecords.length > 1) {
    return Result.ok({
      kind: 'conflict',
      productionTagName: synchronizationRequest.productionTagName,
      webAppVersion: synchronizationRequest.webAppVersion,
      reason: 'Multiple synchronization records exist for the requested Production tag',
    });
  }

  const unresolvedSynchronizationRecords = synchronizationRecords.filter(record => {
    return record.pullRequest.state === 'open' || isNull(record.pullRequest.mergedAt);
  });

  if (unresolvedSynchronizationRecords.length > 1) {
    return Result.ok({
      kind: 'conflict',
      productionTagName: synchronizationRequest.productionTagName,
      webAppVersion: synchronizationRequest.webAppVersion,
      reason: 'Multiple unresolved synchronization records exist',
    });
  }

  const requestedRecord = maybe.find(record => {
    return record.kind === 'semver' && record.marker.productionTagName === synchronizationRequest.productionTagName;
  }, requestedRecords);
  const unresolvedDifferentRecord = maybe.find(record => {
    return record.kind !== 'semver' || record.marker.productionTagName !== synchronizationRequest.productionTagName;
  }, unresolvedSynchronizationRecords);

  if (requestedRecord.isJust && unresolvedDifferentRecord.isJust) {
    return Result.ok({
      kind: 'conflict',
      productionTagName: synchronizationRequest.productionTagName,
      webAppVersion: synchronizationRequest.webAppVersion,
      reason: 'A synchronization record for the requested tag coexists with an unresolved different release',
    });
  }

  if (requestedRecord.isJust) {
    const {value: synchronizationRecord} = requestedRecord;

    if (synchronizationRecord.pullRequest.state === 'open') {
      return Result.ok(createExistingSemVerSynchronizationInspection('matching-open', synchronizationRecord));
    }

    if (isNull(synchronizationRecord.pullRequest.mergedAt)) {
      return Result.ok(createExistingSemVerSynchronizationInspection('closed-without-merge', synchronizationRecord));
    }

    return Result.ok(createExistingSemVerSynchronizationInspection('matching-merged', synchronizationRecord));
  }

  if (unresolvedDifferentRecord.isJust) {
    const {value: synchronizationRecord} = unresolvedDifferentRecord;
    const marker = synchronizationRecord.marker;

    return Result.ok({
      kind: 'blocked-by-previous-unresolved',
      productionTagName: synchronizationRequest.productionTagName,
      webAppVersion: synchronizationRequest.webAppVersion,
      blockingProductionTagName: marker.productionTagName,
      blockingWebAppVersion: marker.webAppVersion,
      blockingSynchronizationState:
        synchronizationRecord.pullRequest.state === 'open' ? 'open' : 'closed-without-merge',
      pullRequestNumber: synchronizationRecord.pullRequest.number,
      pullRequestUrl: synchronizationRecord.pullRequest.url,
      branchName: synchronizationRecord.pullRequest.headBranch as WebAppVersionSynchronizationBranchName,
    });
  }

  return Result.ok({
    kind: 'available',
    productionTagName: synchronizationRequest.productionTagName,
    webAppVersion: synchronizationRequest.webAppVersion,
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

export function createSemVerWebAppVersionSynchronizationPullRequestBody(
  productionTagName: string,
): Result<string, Error> {
  const markerResult = createSemVerWebAppVersionSynchronizationMarker(productionTagName);

  if (markerResult.isErr) {
    return Result.err(markerResult.error);
  }

  const requestResult = createSemVerWebAppVersionSynchronizationRequest(productionTagName);

  if (requestResult.isErr) {
    return Result.err(requestResult.error);
  }

  const {value: request} = requestResult;

  return Result.ok(
    [
      'Synchronizes the WebApp package version with the successfully deployed Production release.',
      '',
      `Production tag: ${request.productionTagName}`,
      `WebApp version: ${request.webAppVersion}`,
      '',
      'Production was already released and runtime-verified. This pull request only reconciles repository package metadata and does not perform a release.',
      '',
      markerResult.value,
    ].join('\n'),
  );
}
