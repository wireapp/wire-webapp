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

import {createStableWebAppTagName, parseStableWebAppTagName} from './webappReleaseIdentity.ts';
import type {StableWebAppTagName} from './webappReleaseIdentity.ts';
import {validateWebAppVersion} from './webappVersion.ts';
import type {WebAppVersion} from './webappVersion.ts';

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

export type WebAppVersionSynchronizationMarker = {
  readonly productionTagName: StableWebAppTagName;
  readonly webAppVersion: WebAppVersion;
};

export type WebAppVersionSynchronizationRecord = {
  readonly pullRequest: WebAppVersionSynchronizationPullRequest;
  readonly marker: WebAppVersionSynchronizationMarker;
};

export type WebAppVersionSynchronizationRequest = WebAppVersionSynchronizationMarker;

export type WebAppVersionSynchronizationUnresolvedState = 'open' | 'closed-without-merge';

type WebAppVersionSynchronizationInspectionDetails = {
  readonly productionTagName: StableWebAppTagName;
  readonly webAppVersion: WebAppVersion;
  readonly pullRequestNumber: number;
  readonly pullRequestUrl: string;
  readonly branchName: WebAppVersionSynchronizationBranchName;
};

export type WebAppVersionSynchronizationInspection =
  | {
      readonly kind: 'available';
      readonly productionTagName: StableWebAppTagName;
      readonly webAppVersion: WebAppVersion;
    }
  | ({readonly kind: 'matching-open'} & WebAppVersionSynchronizationInspectionDetails)
  | ({readonly kind: 'matching-merged'} & WebAppVersionSynchronizationInspectionDetails)
  | ({readonly kind: 'closed-without-merge'} & WebAppVersionSynchronizationInspectionDetails)
  | ({readonly kind: 'blocked-by-previous-unresolved'} & WebAppVersionSynchronizationInspectionDetails & {
        readonly blockingProductionTagName: StableWebAppTagName;
        readonly blockingWebAppVersion: WebAppVersion;
        readonly blockingSynchronizationState: WebAppVersionSynchronizationUnresolvedState;
      })
  | {
      readonly kind: 'conflict';
      readonly productionTagName: StableWebAppTagName;
      readonly webAppVersion: WebAppVersion;
      readonly reason: string;
    };

export type WebAppVersionSynchronizationBranch = {
  readonly branchName: WebAppVersionSynchronizationBranchName;
  readonly productionTagName: StableWebAppTagName;
  readonly webAppVersion: WebAppVersion;
};

export type ResolveWebAppVersionSynchronizationStateOptions = {
  readonly request: WebAppVersionSynchronizationRequest;
  readonly pullRequests: readonly WebAppVersionSynchronizationPullRequest[];
};

type CreateWebAppVersionSynchronizationInspectionOptions = {
  readonly kind: 'matching-open' | 'matching-merged' | 'closed-without-merge';
  readonly record: WebAppVersionSynchronizationRecord;
};

const synchronizationBranchPrefix = 'webapp-version-';
const synchronizationMarkerPrefix = '<!-- wire-webapp-version-sync:semver';
const synchronizationMarkerPattern =
  /<!-- wire-webapp-version-sync:semver production-tag=([^\s]+) version=([^\s]+) -->/;
const synchronizationMarkerSearchPattern = new RegExp(synchronizationMarkerPattern.source, 'g');
const synchronizationBranchPattern = /^webapp-version-((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/;
const productionTagMarkerCaptureIndex = 1;
const synchronizedVersionMarkerCaptureIndex = 2;

export function createWebAppVersionSynchronizationRequest(
  productionTagName: string,
): Result<WebAppVersionSynchronizationRequest, Error> {
  const webAppVersionResult = parseStableWebAppTagName(productionTagName);
  if (webAppVersionResult.isErr) {
    return Result.err(webAppVersionResult.error);
  }

  const stableTagNameResult = createStableWebAppTagName(webAppVersionResult.value);
  if (stableTagNameResult.isErr) {
    return Result.err(stableTagNameResult.error);
  }

  return Result.ok({
    productionTagName: stableTagNameResult.value,
    webAppVersion: webAppVersionResult.value,
  });
}

export function createWebAppVersionSynchronizationBranchName(
  webAppVersion: string,
): Result<WebAppVersionSynchronizationBranchName, Error> {
  const versionResult = validateWebAppVersion(webAppVersion);
  if (versionResult.isErr) {
    return Result.err(versionResult.error);
  }

  return Result.ok(`${synchronizationBranchPrefix}${versionResult.value}` as WebAppVersionSynchronizationBranchName);
}

export function validateWebAppVersionSynchronizationBranchName(
  branchName: string,
): Result<WebAppVersionSynchronizationBranch, Error> {
  const branchNameMatch = synchronizationBranchPattern.exec(branchName);
  const webAppVersionMaybe = Maybe.of(branchNameMatch).andThen(match => {
    return Maybe.of(match.at(1));
  });
  if (webAppVersionMaybe.isNothing) {
    return Result.err(new Error(`Invalid WebApp version synchronization branch name: ${branchName}`));
  }

  const webAppVersionResult = validateWebAppVersion(webAppVersionMaybe.value);
  if (webAppVersionResult.isErr) {
    return Result.err(new Error(`Invalid WebApp version synchronization branch name: ${branchName}`));
  }

  const expectedBranchNameResult = createWebAppVersionSynchronizationBranchName(webAppVersionResult.value);
  if (expectedBranchNameResult.isErr || expectedBranchNameResult.value !== branchName) {
    return Result.err(new Error(`Invalid WebApp version synchronization branch name: ${branchName}`));
  }

  const productionTagNameResult = createStableWebAppTagName(webAppVersionResult.value);
  if (productionTagNameResult.isErr) {
    return Result.err(productionTagNameResult.error);
  }

  return Result.ok({
    branchName: expectedBranchNameResult.value,
    productionTagName: productionTagNameResult.value,
    webAppVersion: webAppVersionResult.value,
  });
}

export function createWebAppVersionSynchronizationMarker(productionTagName: string): Result<string, Error> {
  const requestResult = createWebAppVersionSynchronizationRequest(productionTagName);
  if (requestResult.isErr) {
    return Result.err(requestResult.error);
  }

  const {productionTagName: stableTagName, webAppVersion} = requestResult.value;

  return Result.ok(`<!-- wire-webapp-version-sync:semver production-tag=${stableTagName} version=${webAppVersion} -->`);
}

export function parseWebAppVersionSynchronizationMarker(
  value: unknown,
): Result<WebAppVersionSynchronizationMarker, Error> {
  if (!isString(value)) {
    return Result.err(new Error('WebApp version synchronization marker must be a string'));
  }

  const markerPrefixes = value.match(/<!-- wire-webapp-version-sync:semver/g);
  if (!isNonEmptyArray(markerPrefixes) || markerPrefixes.length !== 1) {
    return Result.err(new Error('WebApp version synchronization marker must occur exactly once'));
  }

  const markerMatches = value.match(synchronizationMarkerSearchPattern);
  if (!isNonEmptyArray(markerMatches) || markerMatches.length !== 1) {
    return Result.err(new Error('Malformed WebApp version synchronization marker'));
  }

  const markerMatch = synchronizationMarkerPattern.exec(markerMatches.at(0) ?? '');
  const productionTagName = Maybe.of(markerMatch).andThen(match => {
    return Maybe.of(match.at(productionTagMarkerCaptureIndex));
  });
  const webAppVersion = Maybe.of(markerMatch).andThen(match => {
    return Maybe.of(match.at(synchronizedVersionMarkerCaptureIndex));
  });
  if (productionTagName.isNothing || webAppVersion.isNothing) {
    return Result.err(new Error('Malformed WebApp version synchronization marker'));
  }

  const requestResult = createWebAppVersionSynchronizationRequest(productionTagName.value);
  if (requestResult.isErr) {
    return Result.err(new Error(`Malformed WebApp version synchronization marker: ${requestResult.error.message}`));
  }

  if (requestResult.value.webAppVersion !== webAppVersion.value) {
    return Result.err(
      new Error(
        `WebApp version synchronization marker version ${webAppVersion.value} does not match Production tag ${productionTagName.value}`,
      ),
    );
  }

  return Result.ok(requestResult.value);
}

function isWebAppVersionSynchronizationPullRequest(pullRequest: WebAppVersionSynchronizationPullRequest): boolean {
  return (
    pullRequest.body.includes(synchronizationMarkerPrefix) || synchronizationBranchPattern.test(pullRequest.headBranch)
  );
}

export function parseWebAppVersionSynchronizationRecord(
  pullRequest: WebAppVersionSynchronizationPullRequest,
): Result<Maybe<WebAppVersionSynchronizationRecord>, Error> {
  if (!isWebAppVersionSynchronizationPullRequest(pullRequest)) {
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

  const branchResult = validateWebAppVersionSynchronizationBranchName(pullRequest.headBranch);
  if (branchResult.isErr || branchResult.value.webAppVersion !== markerResult.value.webAppVersion) {
    return Result.err(
      new Error(
        `WebApp version synchronization pull request #${pullRequest.number} has unexpected branch ${pullRequest.headBranch}`,
      ),
    );
  }

  if (pullRequest.baseBranch !== 'main') {
    return Result.err(
      new Error(`WebApp version synchronization pull request #${pullRequest.number} does not target main`),
    );
  }

  if (pullRequest.state === 'open' && !isNull(pullRequest.mergedAt)) {
    return Result.err(new Error(`Open WebApp version synchronization pull request #${pullRequest.number} is merged`));
  }

  return Result.ok(Maybe.just({pullRequest, marker: markerResult.value}));
}

function createSynchronizationInspection(
  options: CreateWebAppVersionSynchronizationInspectionOptions,
): WebAppVersionSynchronizationInspection {
  const {kind, record} = options;

  return {
    kind,
    productionTagName: record.marker.productionTagName,
    webAppVersion: record.marker.webAppVersion,
    pullRequestNumber: record.pullRequest.number,
    pullRequestUrl: record.pullRequest.url,
    branchName: record.pullRequest.headBranch as WebAppVersionSynchronizationBranchName,
  };
}

export function resolveWebAppVersionSynchronizationState(
  options: ResolveWebAppVersionSynchronizationStateOptions,
): Result<WebAppVersionSynchronizationInspection, Error> {
  const {request, pullRequests} = options;
  const records: WebAppVersionSynchronizationRecord[] = [];

  for (const pullRequest of pullRequests) {
    const recordResult = parseWebAppVersionSynchronizationRecord(pullRequest);
    if (recordResult.isErr) {
      return Result.err(recordResult.error);
    }

    if (recordResult.value.isJust) {
      records.push(recordResult.value.value);
    }
  }

  const matchingRecords = records.filter(record => {
    return record.marker.productionTagName === request.productionTagName;
  });
  if (matchingRecords.length > 1) {
    return Result.ok({
      kind: 'conflict',
      productionTagName: request.productionTagName,
      webAppVersion: request.webAppVersion,
      reason: 'Multiple synchronization records exist for the requested Production tag',
    });
  }

  const unresolvedRecords = records.filter(record => {
    return record.pullRequest.state === 'open' || isNull(record.pullRequest.mergedAt);
  });
  if (unresolvedRecords.length > 1) {
    return Result.ok({
      kind: 'conflict',
      productionTagName: request.productionTagName,
      webAppVersion: request.webAppVersion,
      reason: 'Multiple unresolved synchronization records exist',
    });
  }

  const matchingRecordMaybe = Maybe.of(matchingRecords.at(0));
  if (matchingRecordMaybe.isJust) {
    const matchingRecord = matchingRecordMaybe.value;
    const differentUnresolvedRecordMaybe = maybe.find(record => {
      return record.pullRequest.number !== matchingRecord.pullRequest.number;
    }, unresolvedRecords);
    if (differentUnresolvedRecordMaybe.isJust) {
      return Result.ok({
        kind: 'conflict',
        productionTagName: request.productionTagName,
        webAppVersion: request.webAppVersion,
        reason: 'A synchronization record for the requested release coexists with an unresolved different release',
      });
    }

    if (matchingRecord.pullRequest.state === 'open') {
      return Result.ok(createSynchronizationInspection({kind: 'matching-open', record: matchingRecord}));
    }

    if (isNull(matchingRecord.pullRequest.mergedAt)) {
      return Result.ok(createSynchronizationInspection({kind: 'closed-without-merge', record: matchingRecord}));
    }

    return Result.ok(createSynchronizationInspection({kind: 'matching-merged', record: matchingRecord}));
  }

  const unresolvedRecordMaybe = Maybe.of(unresolvedRecords.at(0));
  if (unresolvedRecordMaybe.isJust) {
    const blockingRecord = unresolvedRecordMaybe.value;

    return Result.ok({
      kind: 'blocked-by-previous-unresolved',
      productionTagName: request.productionTagName,
      webAppVersion: request.webAppVersion,
      blockingProductionTagName: blockingRecord.marker.productionTagName,
      blockingWebAppVersion: blockingRecord.marker.webAppVersion,
      blockingSynchronizationState: blockingRecord.pullRequest.state === 'open' ? 'open' : 'closed-without-merge',
      pullRequestNumber: blockingRecord.pullRequest.number,
      pullRequestUrl: blockingRecord.pullRequest.url,
      branchName: blockingRecord.pullRequest.headBranch as WebAppVersionSynchronizationBranchName,
    });
  }

  return Result.ok({
    kind: 'available',
    productionTagName: request.productionTagName,
    webAppVersion: request.webAppVersion,
  });
}

export function createWebAppVersionSynchronizationPullRequestTitle(webAppVersion: string): Result<string, Error> {
  const versionResult = validateWebAppVersion(webAppVersion);
  if (versionResult.isErr) {
    return Result.err(versionResult.error);
  }

  return Result.ok(`Update WebApp version to ${versionResult.value}`);
}

export function createWebAppVersionSynchronizationPullRequestBody(productionTagName: string): Result<string, Error> {
  const requestResult = createWebAppVersionSynchronizationRequest(productionTagName);
  if (requestResult.isErr) {
    return Result.err(requestResult.error);
  }

  const markerResult = createWebAppVersionSynchronizationMarker(requestResult.value.productionTagName);
  if (markerResult.isErr) {
    return Result.err(markerResult.error);
  }

  const {productionTagName: stableTagName, webAppVersion} = requestResult.value;

  return Result.ok(
    [
      'Synchronizes the WebApp package version with the successfully released Production version.',
      '',
      `Production tag: ${stableTagName}`,
      `WebApp package version: ${webAppVersion}`,
      '',
      'Production was already verified and distributed. This pull request only reconciles repository package metadata and does not perform a release.',
      '',
      markerResult.value,
    ].join('\n'),
  );
}
