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
import semver from 'semver';
import {Result} from 'true-myth';

declare const webAppVersionBrand: unique symbol;

export type WebAppVersion = string & {readonly [webAppVersionBrand]: 'WebAppVersion'};

export type WebAppVersionBump = 'major' | 'minor' | 'patch';

export type WebAppVersionComparison = -1 | 0 | 1;

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

type ValidatedWebAppPackageDocuments = WebAppPackageDocuments & WebAppPackageVersions;

function validateWebAppPackageDocument(
  packageDocument: unknown,
  packagePath: string,
): Result<WebAppPackageDocument, Error> {
  if (!isPlainObject(packageDocument)) {
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

function isInvalidStableWebAppVersion(version: string): boolean {
  const parsedVersion = semver.parse(version, {loose: false});

  return (
    isNull(parsedVersion) ||
    isNonEmptyArray(parsedVersion.prerelease) ||
    isNonEmptyArray(parsedVersion.build) ||
    version.startsWith('v') ||
    parsedVersion.version !== version
  );
}

export function validateWebAppVersion(version: unknown): Result<WebAppVersion, Error> {
  if (!isString(version)) {
    return Result.err(new Error('WebApp version must be a string'));
  }

  if (isInvalidStableWebAppVersion(version)) {
    return Result.err(new Error(`Invalid WebApp version: ${version}`));
  }

  return Result.ok(version as WebAppVersion);
}

export function incrementWebAppVersion(currentVersion: string, bump: WebAppVersionBump): Result<WebAppVersion, Error> {
  const currentVersionResult = validateWebAppVersion(currentVersion);

  if (currentVersionResult.isErr) {
    return Result.err(currentVersionResult.error);
  }

  const incrementedVersion = semver.inc(currentVersionResult.value, bump);

  if (isNull(incrementedVersion)) {
    return Result.err(new Error(`Unable to increment WebApp version: ${currentVersion}`));
  }

  return validateWebAppVersion(incrementedVersion);
}

export function compareWebAppVersions(
  leftVersion: string,
  rightVersion: string,
): Result<WebAppVersionComparison, Error> {
  const leftVersionResult = validateWebAppVersion(leftVersion);

  if (leftVersionResult.isErr) {
    return Result.err(leftVersionResult.error);
  }

  const rightVersionResult = validateWebAppVersion(rightVersion);

  if (rightVersionResult.isErr) {
    return Result.err(rightVersionResult.error);
  }

  return Result.ok(semver.compare(leftVersionResult.value, rightVersionResult.value));
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
