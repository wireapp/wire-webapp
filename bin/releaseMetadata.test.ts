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

import {
  createNextBetaTagName,
  createProductionTagName,
  createReleaseBranchName,
  extractReleaseIdentifierFromBranchName,
  isReleaseBranchName,
  productionTagExists,
  productionTagPointsToCommit,
  resolveWebappBuildVersion,
  validateProductionTagName,
} from './releaseMetadata';
import type {CommitHash, ReleaseTagMetadata} from './releaseMetadata';

function createCommitHash(commitHash: string): CommitHash {
  return commitHash as CommitHash;
}

describe('releaseMetadata', () => {
  it.each(['release/2026-06-19.1', 'release/2026-06-19.2', 'release/2026-06-19.10'])(
    'isReleaseBranchName() accepts release branch name "%s"',
    branchName => {
      const actualIsReleaseBranchName = isReleaseBranchName(branchName);

      expect(actualIsReleaseBranchName).toBe(true);
    },
  );

  it('isReleaseBranchName() rejects release identifiers ending in .0', () => {
    const branchName = 'release/2026-06-19.0';

    const actualIsReleaseBranchName = isReleaseBranchName(branchName);

    expect(actualIsReleaseBranchName).toBe(false);
  });

  it.each([
    'dev',
    'master',
    'main',
    'release/foo',
    'release/2026-06-19',
    'release/2026-06-19.x',
    'release/2026-06-19.1-extra',
    'release/2026-6-19.1',
    'release/2026-06-9.1',
  ])('isReleaseBranchName() rejects invalid release branch name "%s"', invalidBranchName => {
    const actualIsReleaseBranchName = isReleaseBranchName(invalidBranchName);

    expect(actualIsReleaseBranchName).toBe(false);
  });

  it('extractReleaseIdentifierFromBranchName() extracts the release identifier from a valid release branch name', () => {
    const branchName = 'release/2026-06-19.1';

    const actualReleaseIdentifier = extractReleaseIdentifierFromBranchName(branchName);

    assert(actualReleaseIdentifier.isOk === true);

    expect(actualReleaseIdentifier.value).toBe('2026-06-19.1');
  });

  it('extractReleaseIdentifierFromBranchName() rejects an invalid release branch name', () => {
    const invalidBranchName = 'release/2026-06-01';

    const actualReleaseIdentifier = extractReleaseIdentifierFromBranchName(invalidBranchName);

    assert(actualReleaseIdentifier.isErr === true);

    expect(actualReleaseIdentifier.error.message).toBe('Invalid release branch name: release/2026-06-01');
  });

  it('createReleaseBranchName() creates the release branch name from the release identifier', () => {
    const releaseIdentifier = '2026-06-19.1';

    const actualReleaseBranchName = createReleaseBranchName(releaseIdentifier);

    assert(actualReleaseBranchName.isOk === true);

    expect(actualReleaseBranchName.value).toBe('release/2026-06-19.1');
  });

  it.each(['2026-06-19.0', '2026-06-19', '2026-6-19.1', 'release/2026-06-19.1'])(
    'createReleaseBranchName() rejects invalid release identifier "%s"',
    invalidReleaseIdentifier => {
      const actualReleaseBranchName = createReleaseBranchName(invalidReleaseIdentifier);

      assert(actualReleaseBranchName.isErr === true);

      expect(actualReleaseBranchName.error.message).toBe(`Invalid release identifier: ${invalidReleaseIdentifier}`);
    },
  );

  it('createProductionTagName() creates the production tag name from the release identifier', () => {
    const releaseIdentifier = '2026-06-19.1';

    const actualProductionTagName = createProductionTagName(releaseIdentifier);

    assert(actualProductionTagName.isOk === true);

    expect(actualProductionTagName.value).toBe('2026-06-19.1-production');
  });

  it('createProductionTagName() returns an Result Err for an invalid release identifier', () => {
    const invalidReleaseIdentifier = '2026-06-19';

    const actualProductionTagName = createProductionTagName(invalidReleaseIdentifier);

    assert(actualProductionTagName.isErr === true);

    expect(actualProductionTagName.error.message).toBe('Invalid release identifier: 2026-06-19');
  });

  it('validateProductionTagName() accepts a production tag name', () => {
    const productionTagName = '2026-06-19.1-production';

    const actualProductionTagName = validateProductionTagName(productionTagName);

    assert(actualProductionTagName.isOk === true);

    expect(actualProductionTagName.value).toBe(productionTagName);
  });

  it.each([
    '2026-06-19.0-production',
    '2026-06-19-production.1',
    '2026-06-19.1-beta.1',
    'release/2026-06-19.1-production',
  ])('validateProductionTagName() rejects invalid production tag name "%s"', invalidProductionTagName => {
    const actualProductionTagName = validateProductionTagName(invalidProductionTagName);

    assert(actualProductionTagName.isErr === true);

    expect(actualProductionTagName.error.message).toBe(`Invalid production tag name: ${invalidProductionTagName}`);
  });

  it.each([
    ['2026-06-19.1-production', '2026-06-19.1'],
    ['2026-06-19-production.1', '2026-06-19-production.1'],
  ])(
    'resolveWebappBuildVersion() preserves the version for production tag "%s"',
    (productionTagName, expectedVersion) => {
      const actualBuildVersion = resolveWebappBuildVersion(
        productionTagName,
        '025edc663787b3d2da366f21a5958013201e6cd4',
        'development',
      );

      assert(actualBuildVersion.isOk === true);

      expect(actualBuildVersion.value).toBe(expectedVersion);
    },
  );

  it.each([
    ['', 'main', 'main-025edc6'],
    ['', 'development', 'dev-025edc6'],
    ['2026-07-20-staging.1', 'development', 'dev-025edc6'],
    ['q1-2024', 'development', 'dev-025edc6'],
    ['q2-2025', 'development', 'dev-025edc6'],
  ])(
    'resolveWebappBuildVersion() resolves build reference "%s" on the %s channel to "%s"',
    (buildReferenceName, buildChannel, expectedVersion) => {
      const actualBuildVersion = resolveWebappBuildVersion(
        buildReferenceName,
        '025edc663787b3d2da366f21a5958013201e6cd4',
        buildChannel,
      );

      assert(actualBuildVersion.isOk === true);

      expect(actualBuildVersion.value).toBe(expectedVersion);
    },
  );

  it('resolveWebappBuildVersion() uses the explicit unknown fallback without a commit', () => {
    const actualBuildVersion = resolveWebappBuildVersion('', '', 'development');

    assert(actualBuildVersion.isOk === true);

    expect(actualBuildVersion.value).toBe('dev-unknown');
  });

  it('resolveWebappBuildVersion() rejects unknown non-empty tags', () => {
    const actualBuildVersion = resolveWebappBuildVersion('2026-06-19.1-production.unknown', '025edc6', 'development');

    assert(actualBuildVersion.isErr === true);

    expect(actualBuildVersion.error.message).toBe('Invalid production tag name: 2026-06-19.1-production.unknown');
  });

  it('resolveWebappBuildVersion() requires a production tag on the production channel', () => {
    const actualBuildVersion = resolveWebappBuildVersion('', '025edc663787b3d2da366f21a5958013201e6cd4', 'production');

    assert(actualBuildVersion.isErr === true);

    expect(actualBuildVersion.error.message).toBe('A production webapp build requires a production tag name');
  });

  it('resolveWebappBuildVersion() rejects a non-production tag on the production channel', () => {
    const actualBuildVersion = resolveWebappBuildVersion(
      '2026-07-20-staging.1',
      '025edc663787b3d2da366f21a5958013201e6cd4',
      'production',
    );

    assert(actualBuildVersion.isErr === true);

    expect(actualBuildVersion.error.message).toBe('Invalid production tag name: 2026-07-20-staging.1');
  });

  it('createNextBetaTagName() increments the latest beta tag for the release identifier', () => {
    const releaseIdentifier = '2026-06-19.1';
    const existingTagNames = ['2026-06-19.1-beta.1', '2026-06-19.1-beta.2'];

    const actualNextBetaTagName = createNextBetaTagName(releaseIdentifier, existingTagNames);

    assert(actualNextBetaTagName.isOk === true);

    expect(actualNextBetaTagName.value).toBe('2026-06-19.1-beta.3');
  });

  it('createNextBetaTagName() ignores unrelated tags', () => {
    const releaseIdentifier = '2026-06-19.1';
    const existingTagNames = [
      '2026-06-18.1-beta.9',
      '2026-06-19.1-beta.1',
      '2026-06-19.1-production',
      '2026-06-19.1-beta.extra',
      'q2-2025',
    ];

    const actualNextBetaTagName = createNextBetaTagName(releaseIdentifier, existingTagNames);

    assert(actualNextBetaTagName.isOk === true);

    expect(actualNextBetaTagName.value).toBe('2026-06-19.1-beta.2');
  });

  it('createNextBetaTagName() starts at beta.1 when no beta tag exists for the release identifier', () => {
    const releaseIdentifier = '2026-06-19.1';
    const existingTagNames = ['2026-06-18.1-beta.1', '2026-06-19.1-production'];

    const actualNextBetaTagName = createNextBetaTagName(releaseIdentifier, existingTagNames);

    assert(actualNextBetaTagName.isOk === true);

    expect(actualNextBetaTagName.value).toBe('2026-06-19.1-beta.1');
  });

  it('createNextBetaTagName() returns an Result Err for an invalid release identifier', () => {
    const invalidReleaseIdentifier = '2026-06-19';

    const actualNextBetaTagName = createNextBetaTagName(invalidReleaseIdentifier, []);

    assert(actualNextBetaTagName.isErr === true);

    expect(actualNextBetaTagName.error.message).toBe('Invalid release identifier: 2026-06-19');
  });

  it('productionTagExists() detects that the production tag exists', () => {
    const releaseIdentifier = '2026-06-19.1';
    const existingTagNames = ['2026-06-19.1-beta.1', '2026-06-19.1-production'];

    const actualProductionTagExists = productionTagExists(releaseIdentifier, existingTagNames);

    assert(actualProductionTagExists.isOk === true);

    expect(actualProductionTagExists.value).toBe(true);
  });

  it('productionTagExists() detects that the production tag does not exist', () => {
    const releaseIdentifier = '2026-06-19.1';
    const existingTagNames = ['2026-06-19.1-beta.1', '2026-06-18.1-production'];

    const actualProductionTagExists = productionTagExists(releaseIdentifier, existingTagNames);

    assert(actualProductionTagExists.isOk === true);

    expect(actualProductionTagExists.value).toBe(false);
  });

  it('productionTagPointsToCommit() detects that the production tag points to the current commit', () => {
    const releaseIdentifier = '2026-06-19.1';
    const currentCommitHash = createCommitHash('1234567890abcdef');
    const releaseTagMetadata: ReleaseTagMetadata[] = [
      {tagName: '2026-06-19.1-beta.1', commitHash: createCommitHash('aaaaaaaaaaaaaaaa')},
      {tagName: '2026-06-19.1-production', commitHash: currentCommitHash},
    ];

    const actualProductionTagPointsToCommit = productionTagPointsToCommit({
      currentCommitHash,
      releaseIdentifier,
      releaseTagMetadata,
    });

    assert(actualProductionTagPointsToCommit.isOk === true);

    expect(actualProductionTagPointsToCommit.value).toBe(true);
  });

  it('productionTagPointsToCommit() detects that the production tag points to a different commit', () => {
    const releaseIdentifier = '2026-06-19.1';
    const currentCommitHash = createCommitHash('1234567890abcdef');
    const releaseTagMetadata: ReleaseTagMetadata[] = [
      {tagName: '2026-06-19.1-production', commitHash: createCommitHash('fedcba0987654321')},
    ];

    const actualProductionTagPointsToCommit = productionTagPointsToCommit({
      currentCommitHash,
      releaseIdentifier,
      releaseTagMetadata,
    });

    assert(actualProductionTagPointsToCommit.isOk === true);

    expect(actualProductionTagPointsToCommit.value).toBe(false);
  });

  it('productionTagPointsToCommit() detects that the production tag is absent', () => {
    const releaseIdentifier = '2026-06-19.1';
    const currentCommitHash = createCommitHash('1234567890abcdef');
    const releaseTagMetadata: ReleaseTagMetadata[] = [{tagName: '2026-06-19.1-beta.1', commitHash: currentCommitHash}];

    const actualProductionTagPointsToCommit = productionTagPointsToCommit({
      currentCommitHash,
      releaseIdentifier,
      releaseTagMetadata,
    });

    assert(actualProductionTagPointsToCommit.isOk === true);

    expect(actualProductionTagPointsToCommit.value).toBe(false);
  });
});
