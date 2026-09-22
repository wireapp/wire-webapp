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
  createWebAppVersionSynchronizationMarker,
  parseWebAppVersionSynchronizationMarker,
  resolveNextWebAppVersion,
  updateWebAppPackageDocuments,
  validateMatchingWebAppPackageVersions,
  validateWebAppVersion,
} from './webappVersion.ts';

type TestPackageDocument = Readonly<Record<string, unknown>>;

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
  it.each([
    ['0.27.0', '1.0.0'],
    ['0.99.999', '1.0.0'],
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
