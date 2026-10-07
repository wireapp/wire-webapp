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

import {isString} from '@sindresorhus/is';

import {
  compareWebAppVersions,
  createWebAppVersionSynchronizationMarker,
  incrementWebAppVersion,
  parseWebAppVersionSynchronizationMarker,
  resolveNextWebAppVersion,
  updateWebAppPackageDocuments,
  validateMatchingWebAppPackageVersions,
  validateWebAppVersion,
} from './webappVersion.ts';
import type {WebAppVersionBump} from './webappVersion.ts';

type TestPackageDocument = Readonly<Record<string, unknown>>;

type WebAppVersionIncrementTestCase = {
  readonly currentVersion: string;
  readonly bump: WebAppVersionBump;
  readonly expectedVersion: string;
};

function createTestPackageDocument(version?: string): TestPackageDocument {
  const packageDocument: Record<string, unknown> = {
    name: '@wireapp/example',
    private: true,
    scripts: {test: 'jest'},
  };

  if (isString(version)) {
    packageDocument.version = version;
  }

  return packageDocument;
}

function expectNextVersion(currentVersion: string, expectedVersion: string): void {
  const actualVersionResult = resolveNextWebAppVersion(currentVersion);

  assert(actualVersionResult.isOk);
  expect(actualVersionResult.value).toBe(expectedVersion);
}

describe('WebApp version domain logic', () => {
  it.each(['0.27.0', '1.0.0', '1.4.1', '2.10.27'])('accepts stable WebApp version %s unchanged', version => {
    const actualVersionResult = validateWebAppVersion(version);

    assert(actualVersionResult.isOk);
    expect(actualVersionResult.value).toBe(version);
  });

  it.each<WebAppVersionIncrementTestCase>([
    {currentVersion: '1.4.0', bump: 'patch', expectedVersion: '1.4.1'},
    {currentVersion: '1.4.0', bump: 'minor', expectedVersion: '1.5.0'},
    {currentVersion: '1.4.7', bump: 'minor', expectedVersion: '1.5.0'},
    {currentVersion: '1.4.7', bump: 'major', expectedVersion: '2.0.0'},
    {currentVersion: '2.9.8', bump: 'major', expectedVersion: '3.0.0'},
    {currentVersion: '0.27.0', bump: 'patch', expectedVersion: '0.27.1'},
    {currentVersion: '0.27.0', bump: 'minor', expectedVersion: '0.28.0'},
    {currentVersion: '0.27.0', bump: 'major', expectedVersion: '1.0.0'},
    {currentVersion: '9007199254740991.0.0', bump: 'patch', expectedVersion: '9007199254740991.0.1'},
    {currentVersion: '1.9007199254740991.0', bump: 'patch', expectedVersion: '1.9007199254740991.1'},
    {currentVersion: '1.0.9007199254740991', bump: 'minor', expectedVersion: '1.1.0'},
  ])('increments $currentVersion by $bump to $expectedVersion', options => {
    const {currentVersion, bump, expectedVersion} = options;
    const actualVersionResult = incrementWebAppVersion(currentVersion, bump);

    assert(actualVersionResult.isOk);
    expect(actualVersionResult.value).toBe(expectedVersion);
  });

  it.each<{readonly currentVersion: string; readonly bump: WebAppVersionBump}>([
    {currentVersion: '9007199254740991.0.0', bump: 'major'},
    {currentVersion: '1.9007199254740991.0', bump: 'minor'},
    {currentVersion: '1.0.9007199254740991', bump: 'patch'},
  ])('rejects $bump increment beyond the supported numeric range', options => {
    const actualVersionResult = incrementWebAppVersion(options.currentVersion, options.bump);

    assert(actualVersionResult.isErr);
    expect(actualVersionResult.error.message).toContain('Invalid WebApp version:');
  });

  it('accepts numeric components at the supported limit', () => {
    const currentVersion = '9007199254740991.9007199254740991.9007199254740991';
    const actualValidationResult = validateWebAppVersion(currentVersion);
    const actualComparisonResult = compareWebAppVersions(currentVersion, currentVersion);

    assert(actualValidationResult.isOk);
    expect(actualValidationResult.value).toBe(currentVersion);
    assert(actualComparisonResult.isOk);
    expect(actualComparisonResult.value).toBe(0);
  });

  it('rejects synchronization when PATCH increment exceeds the supported numeric range', () => {
    const actualResolutionResult = resolveNextWebAppVersion('1.0.9007199254740991');

    assert(actualResolutionResult.isErr);
  });

  it.each([
    ['1.0.9', '1.0.10', -1],
    ['1.2.0', '1.10.0', -1],
    ['1.0.0', '2.0.0', -1],
    ['2.0.0', '1.999.999', 1],
    ['1.2.3', '1.2.3', 0],
  ])('compares %s with %s as %s', (leftVersion, rightVersion, expectedComparison) => {
    const actualComparisonResult = compareWebAppVersions(leftVersion, rightVersion);

    assert(actualComparisonResult.isOk);
    expect(actualComparisonResult.value).toBe(expectedComparison);
  });

  it.each([
    '1.0',
    'v1.0.0',
    '1.0.0-beta.1',
    '1.0.0+build',
    '01.0.0',
    ' 1.0.0',
    '1.0.0 ',
    '1.0.0\n',
    '=1.0.0',
    '9007199254740992.0.0',
    '0.9007199254740992.0',
    '0.0.9007199254740992',
    `${'1'.repeat(257)}.0.0`,
  ])('rejects unsupported version %s in every stable version operation', invalidVersion => {
    const actualValidationResult = validateWebAppVersion(invalidVersion);
    const actualResolutionResult = resolveNextWebAppVersion(invalidVersion);
    const actualMajorIncrementResult = incrementWebAppVersion(invalidVersion, 'major');
    const actualMinorIncrementResult = incrementWebAppVersion(invalidVersion, 'minor');
    const actualPatchIncrementResult = incrementWebAppVersion(invalidVersion, 'patch');
    const actualLeftComparisonResult = compareWebAppVersions(invalidVersion, '1.0.0');
    const actualRightComparisonResult = compareWebAppVersions('1.0.0', invalidVersion);

    assert(actualValidationResult.isErr);
    assert(actualResolutionResult.isErr);
    assert(actualMajorIncrementResult.isErr);
    assert(actualMinorIncrementResult.isErr);
    assert(actualPatchIncrementResult.isErr);
    assert(actualLeftComparisonResult.isErr);
    assert(actualRightComparisonResult.isErr);

    const expectedErrorMessage = `Invalid WebApp version: ${invalidVersion}`;

    expect(actualValidationResult.error.message).toBe(expectedErrorMessage);
    expect(actualResolutionResult.error.message).toBe(expectedErrorMessage);
    expect(actualMajorIncrementResult.error.message).toBe(expectedErrorMessage);
    expect(actualMinorIncrementResult.error.message).toBe(expectedErrorMessage);
    expect(actualPatchIncrementResult.error.message).toBe(expectedErrorMessage);
    expect(actualLeftComparisonResult.error.message).toBe(expectedErrorMessage);
    expect(actualRightComparisonResult.error.message).toBe(expectedErrorMessage);
  });

  it.each([
    ['0.27.0', '1.0.0'],
    ['0.99.999', '1.0.0'],
    ['0.9007199254740991.9007199254740991', '1.0.0'],
    ['1.0.0', '1.0.1'],
    ['1.0.9', '1.0.10'],
    ['1.2.99', '1.2.100'],
    ['2.4.7', '2.4.8'],
  ])('resolves %s to %s', (currentVersion, expectedVersion) => {
    expectNextVersion(currentVersion, expectedVersion);
  });

  it.each([undefined, null, '', '1.0', '1.0.0-beta.1', '1.0.0+abc', '-1.0.0', '1.-1.0', 'one.0.0', '01.0.0'])(
    'rejects invalid WebApp version %s',
    invalidVersion => {
      const actualVersionResult = validateWebAppVersion(invalidVersion);

      assert(actualVersionResult.isErr);
    },
  );

  it('accepts matching root and WebApp package versions', () => {
    const actualVersionsResult = validateMatchingWebAppPackageVersions(
      createTestPackageDocument('0.27.0'),
      createTestPackageDocument('0.27.0'),
    );

    assert(actualVersionsResult.isOk);
    expect(actualVersionsResult.value).toEqual({rootVersion: '0.27.0', webAppVersion: '0.27.0'});
  });

  it('rejects mismatching root and WebApp package versions', () => {
    const actualVersionsResult = validateMatchingWebAppPackageVersions(
      createTestPackageDocument('0.27.0'),
      createTestPackageDocument('1.0.0'),
    );

    assert(actualVersionsResult.isErr);
    expect(actualVersionsResult.error.message).toContain('WebApp package versions disagree');
  });

  it('rejects a missing package version', () => {
    const actualVersionsResult = validateMatchingWebAppPackageVersions(
      createTestPackageDocument(),
      createTestPackageDocument('0.27.0'),
    );

    assert(actualVersionsResult.isErr);
    expect(actualVersionsResult.error.message).toBe('Missing WebApp package version: package.json');
  });

  it('rejects a malformed package version', () => {
    const actualVersionsResult = validateMatchingWebAppPackageVersions(
      createTestPackageDocument('1.0.0-beta.1'),
      createTestPackageDocument('1.0.0-beta.1'),
    );

    assert(actualVersionsResult.isErr);
    expect(actualVersionsResult.error.message).toContain('Invalid WebApp version: 1.0.0-beta.1');
  });

  it('updates only the version field in both package documents', () => {
    const rootPackageDocument = createTestPackageDocument('0.27.0');
    const webAppPackageDocument = createTestPackageDocument('0.27.0');
    const actualUpdateResult = updateWebAppPackageDocuments({
      rootPackageDocument,
      webAppPackageDocument,
      targetVersion: '1.0.0',
    });

    assert(actualUpdateResult.isOk);
    expect(actualUpdateResult.value).toEqual({
      rootPackageDocument: {...rootPackageDocument, version: '1.0.0'},
      webAppPackageDocument: {...webAppPackageDocument, version: '1.0.0'},
    });
  });

  it('rejects package updates before changing anything when versions disagree', () => {
    const actualUpdateResult = updateWebAppPackageDocuments({
      rootPackageDocument: createTestPackageDocument('0.27.0'),
      webAppPackageDocument: createTestPackageDocument('1.0.0'),
      targetVersion: '1.0.1',
    });

    assert(actualUpdateResult.isErr);
    expect(actualUpdateResult.error.message).toContain('WebApp package versions disagree');
  });
});

describe('WebApp version synchronization marker', () => {
  const markerOptions = {
    releaseIdentifier: '2026-09-09.1',
    productionTagName: '2026-09-09.1-production',
    webAppVersion: '1.0.0',
  };

  it('round-trips a synchronization marker', () => {
    const actualMarkerResult = createWebAppVersionSynchronizationMarker(markerOptions);

    assert(actualMarkerResult.isOk);

    const actualParsedMarkerResult = parseWebAppVersionSynchronizationMarker(actualMarkerResult.value);

    assert(actualParsedMarkerResult.isOk);
    expect(actualParsedMarkerResult.value).toEqual({
      releaseIdentifier: '2026-09-09.1',
      productionTagName: '2026-09-09.1-production',
      webAppVersion: '1.0.0',
    });
  });

  it('parses a marker embedded in a pull request body', () => {
    const markerResult = createWebAppVersionSynchronizationMarker(markerOptions);

    assert(markerResult.isOk);

    const actualMarkerResult = parseWebAppVersionSynchronizationMarker(
      `Synchronize deployed metadata.\n\n${markerResult.value}\n`,
    );

    assert(actualMarkerResult.isOk);
    expect(actualMarkerResult.value.webAppVersion).toBe('1.0.0');
  });

  it.each([
    '<!-- wire-webapp-version-sync release=2026-09-09.1 production-tag=2026-09-09.1-production -->',
    '<!-- wire-webapp-version-sync release=2026-09-09.1 version=1.0.0 -->',
    '<!-- wire-webapp-version-sync release=2026-09-09.1 production-tag=2026-09-09.1-production version=1.0.0',
    '<!-- wire-webapp-version-sync release=2026-09-09.1 production-tag=2026-09-09.1-production version=1.0.0-beta.1 -->',
    '<!-- wire-webapp-version-sync release=2026-09-09.1 production-tag=2026-09-10.1-production version=1.0.0 -->',
  ])('rejects malformed or incomplete marker %s', invalidMarker => {
    const actualMarkerResult = parseWebAppVersionSynchronizationMarker(invalidMarker);

    assert(actualMarkerResult.isErr);
  });

  it('rejects duplicate synchronization markers', () => {
    const markerResult = createWebAppVersionSynchronizationMarker(markerOptions);

    assert(markerResult.isOk);

    const actualMarkerResult = parseWebAppVersionSynchronizationMarker(`${markerResult.value}\n${markerResult.value}`);

    assert(actualMarkerResult.isErr);
    expect(actualMarkerResult.error.message).toBe('WebApp version synchronization marker must occur exactly once');
  });

  it('rejects a marker with an invalid release identifier', () => {
    const actualMarkerResult = createWebAppVersionSynchronizationMarker({
      ...markerOptions,
      releaseIdentifier: '2026-09-09.0',
      productionTagName: '2026-09-09.0-production',
    });

    assert(actualMarkerResult.isErr);
  });
});
