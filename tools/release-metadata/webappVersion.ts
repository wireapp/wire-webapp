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

import {isNonEmptyArray, isNull, isPlainObject, isString, isUndefined} from '@sindresorhus/is';
import {Result} from 'true-myth';

import {createProductionTagName} from './releaseMetadata.ts';
import type {ProductionTagName, ReleaseIdentifier} from './releaseMetadata.ts';

declare const webAppVersionBrand: unique symbol;

export type WebAppVersion = string & {readonly [webAppVersionBrand]: 'WebAppVersion'};

export type WebAppPackageDocument = Readonly<Record<string, unknown>>;

export type WebAppPackageVersions = {
  readonly rootVersion: WebAppVersion;
  readonly webAppVersion: WebAppVersion;
};

export type WebAppPackageDocuments = {
  readonly rootPackageDocument: WebAppPackageDocument;
  readonly webAppPackageDocument: WebAppPackageDocument;
};

export type UpdateWebAppPackageDocumentsOptions = {
  readonly rootPackageDocument: unknown;
  readonly webAppPackageDocument: unknown;
  readonly targetVersion: string;
};

export type CreateWebAppVersionSynchronizationMarkerOptions = {
  readonly releaseIdentifier: string;
  readonly productionTagName: string;
  readonly webAppVersion: string;
};

export type WebAppVersionSynchronizationMarker = {
  readonly releaseIdentifier: ReleaseIdentifier;
  readonly productionTagName: ProductionTagName;
  readonly webAppVersion: WebAppVersion;
};

type ValidatedWebAppPackageDocuments = WebAppPackageDocuments & WebAppPackageVersions;

const strictWebAppVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const releaseIdentifierPattern = String.raw`\d{4}-\d{2}-\d{2}\.[1-9]\d*`;
const patchVersionIncrement = BigInt('1');
const synchronizationMarkerPattern = new RegExp(
  String.raw`<!-- wire-webapp-version-sync release=(${releaseIdentifierPattern}) production-tag=(${releaseIdentifierPattern}-production) version=((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)) -->`,
);
const synchronizationMarkerSearchPattern = new RegExp(synchronizationMarkerPattern.source, 'g');

function validateWebAppPackageDocument(
  packageDocument: unknown,
  packagePath: string,
): Result<WebAppPackageDocument, Error> {
  if (isPlainObject(packageDocument) === false) {
    return Result.err(new Error(`WebApp package document is not an object: ${packagePath}`));
  }

  return Result.ok(packageDocument);
}

function validatePackageDocumentVersion(
  packageDocument: WebAppPackageDocument,
  packagePath: string,
): Result<WebAppVersion, Error> {
  const packageVersion = packageDocument.version;

  if (isUndefined(packageVersion)) {
    return Result.err(new Error(`Missing WebApp package version: ${packagePath}`));
  }

  const versionResult = validateWebAppVersion(packageVersion);

  if (versionResult.isErr) {
    return Result.err(new Error(`${versionResult.error.message} in ${packagePath}`));
  }

  return versionResult;
}

function validateWebAppPackageDocuments(
  rootPackageDocument: unknown,
  webAppPackageDocument: unknown,
): Result<ValidatedWebAppPackageDocuments, Error> {
  const validatedRootPackageDocumentResult = validateWebAppPackageDocument(rootPackageDocument, 'package.json');

  if (validatedRootPackageDocumentResult.isErr) {
    return Result.err(new Error(validatedRootPackageDocumentResult.error.message));
  }

  const {value: validatedRootPackageDocument} = validatedRootPackageDocumentResult;

  const validatedWebAppPackageDocumentResult = validateWebAppPackageDocument(
    webAppPackageDocument,
    'apps/webapp/package.json',
  );

  if (validatedWebAppPackageDocumentResult.isErr) {
    return Result.err(new Error(validatedWebAppPackageDocumentResult.error.message));
  }

  const {value: validatedWebAppPackageDocument} = validatedWebAppPackageDocumentResult;

  const rootVersionResult = validatePackageDocumentVersion(validatedRootPackageDocument, 'package.json');

  if (rootVersionResult.isErr) {
    return Result.err(new Error(rootVersionResult.error.message));
  }

  const {value: rootVersion} = rootVersionResult;

  const webAppVersionResult = validatePackageDocumentVersion(
    validatedWebAppPackageDocument,
    'apps/webapp/package.json',
  );

  if (webAppVersionResult.isErr) {
    return Result.err(new Error(webAppVersionResult.error.message));
  }

  const {value: webAppVersion} = webAppVersionResult;

  if (rootVersion !== webAppVersion) {
    return Result.err(
      new Error(
        `WebApp package versions disagree: package.json=${rootVersion}, apps/webapp/package.json=${webAppVersion}`,
      ),
    );
  }

  return Result.ok({
    rootPackageDocument: validatedRootPackageDocument,
    webAppPackageDocument: validatedWebAppPackageDocument,
    rootVersion,
    webAppVersion,
  });
}

function createWebAppVersionSynchronizationMarkerValue(
  options: CreateWebAppVersionSynchronizationMarkerOptions,
): Result<WebAppVersionSynchronizationMarker, Error> {
  const productionTagResult = createProductionTagName(options.releaseIdentifier);

  if (productionTagResult.isErr) {
    return Result.err(new Error(productionTagResult.error.message));
  }

  const {value: validatedProductionTagName} = productionTagResult;

  if (validatedProductionTagName !== options.productionTagName) {
    return Result.err(
      new Error(
        `Production tag ${options.productionTagName} does not match release identifier ${options.releaseIdentifier}`,
      ),
    );
  }

  const webAppVersionResult = validateWebAppVersion(options.webAppVersion);

  if (webAppVersionResult.isErr) {
    return Result.err(new Error(webAppVersionResult.error.message));
  }

  const {value: validatedWebAppVersion} = webAppVersionResult;

  return Result.ok({
    releaseIdentifier: options.releaseIdentifier as ReleaseIdentifier,
    productionTagName: validatedProductionTagName,
    webAppVersion: validatedWebAppVersion,
  });
}

export function validateWebAppVersion(version: unknown): Result<WebAppVersion, Error> {
  if (isString(version) === false) {
    return Result.err(new Error('WebApp version must be a string'));
  }

  if (strictWebAppVersionPattern.test(version) === false) {
    return Result.err(new Error(`Invalid WebApp version: ${version}`));
  }

  return Result.ok(version as WebAppVersion);
}

export function resolveNextWebAppVersion(currentVersion: string): Result<WebAppVersion, Error> {
  const currentVersionResult = validateWebAppVersion(currentVersion);

  if (currentVersionResult.isErr) {
    return Result.err(new Error(currentVersionResult.error.message));
  }

  const {value: validatedCurrentVersion} = currentVersionResult;
  const [majorVersion, minorVersion, patchVersion] = validatedCurrentVersion.split('.');

  if (majorVersion === '0') {
    return Result.ok('1.0.0' as WebAppVersion);
  }

  return Result.ok(`${majorVersion}.${minorVersion}.${BigInt(patchVersion) + patchVersionIncrement}` as WebAppVersion);
}

export function validateMatchingWebAppPackageVersions(
  rootPackageDocument: unknown,
  webAppPackageDocument: unknown,
): Result<WebAppPackageVersions, Error> {
  const validatedPackageDocumentsResult = validateWebAppPackageDocuments(rootPackageDocument, webAppPackageDocument);

  if (validatedPackageDocumentsResult.isErr) {
    return Result.err(new Error(validatedPackageDocumentsResult.error.message));
  }

  const {value: validatedPackageDocuments} = validatedPackageDocumentsResult;

  return Result.ok({
    rootVersion: validatedPackageDocuments.rootVersion,
    webAppVersion: validatedPackageDocuments.webAppVersion,
  });
}

export function updateWebAppPackageDocuments(
  options: UpdateWebAppPackageDocumentsOptions,
): Result<WebAppPackageDocuments, Error> {
  const validatedPackageDocumentsResult = validateWebAppPackageDocuments(
    options.rootPackageDocument,
    options.webAppPackageDocument,
  );

  if (validatedPackageDocumentsResult.isErr) {
    return Result.err(new Error(validatedPackageDocumentsResult.error.message));
  }

  const targetVersionResult = validateWebAppVersion(options.targetVersion);

  if (targetVersionResult.isErr) {
    return Result.err(new Error(targetVersionResult.error.message));
  }

  const {value: targetVersion} = targetVersionResult;

  const {value: validatedPackageDocuments} = validatedPackageDocumentsResult;
  const {rootPackageDocument, webAppPackageDocument} = validatedPackageDocuments;

  return Result.ok({
    rootPackageDocument: {...rootPackageDocument, version: targetVersion},
    webAppPackageDocument: {...webAppPackageDocument, version: targetVersion},
  });
}

export function createWebAppVersionSynchronizationMarker(
  options: CreateWebAppVersionSynchronizationMarkerOptions,
): Result<string, Error> {
  const markerValueResult = createWebAppVersionSynchronizationMarkerValue(options);

  if (markerValueResult.isErr) {
    return Result.err(new Error(markerValueResult.error.message));
  }

  const {value: marker} = markerValueResult;

  return Result.ok(
    `<!-- wire-webapp-version-sync release=${marker.releaseIdentifier} production-tag=${marker.productionTagName} version=${marker.webAppVersion} -->`,
  );
}

export function parseWebAppVersionSynchronizationMarker(
  value: unknown,
): Result<WebAppVersionSynchronizationMarker, Error> {
  if (isString(value) === false) {
    return Result.err(new Error('WebApp version synchronization marker must be a string'));
  }

  const markerMatches = value.match(synchronizationMarkerSearchPattern);

  if (isNonEmptyArray(markerMatches) === false) {
    return Result.err(new Error('Malformed WebApp version synchronization marker'));
  }

  if (markerMatches.length > 1) {
    return Result.err(new Error('WebApp version synchronization marker must occur exactly once'));
  }

  const firstMarker = markerMatches.at(0);

  if (isString(firstMarker) === false) {
    return Result.err(new Error('Malformed WebApp version synchronization marker'));
  }

  const markerMatch = synchronizationMarkerPattern.exec(firstMarker);

  if (isNull(markerMatch)) {
    return Result.err(new Error('Malformed WebApp version synchronization marker'));
  }

  const releaseIdentifier = markerMatch[1];
  const productionTagName = markerMatch[2];
  const webAppVersion = markerMatch[3];

  if (
    isString(releaseIdentifier) === false ||
    isString(productionTagName) === false ||
    isString(webAppVersion) === false
  ) {
    return Result.err(new Error('Malformed WebApp version synchronization marker'));
  }

  return createWebAppVersionSynchronizationMarkerValue({
    releaseIdentifier,
    productionTagName,
    webAppVersion,
  });
}
