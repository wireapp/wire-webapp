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

import {Maybe} from 'true-myth';

import {
  createBuildMetadata,
  getShortCommitSha,
  isBuildMetadata,
  parseBuildMetadata,
  resolveAssetVersion,
  resolveBuildVersion,
} from './buildMetadata';

describe('build metadata', () => {
  it('preserves an explicit release identifier', () => {
    const actualVersion = resolveBuildVersion(Maybe.just('2026-07-20.1'), '025edc6f1234567890');

    expect(actualVersion).toBe('2026-07-20.1');
  });

  it('preserves an explicit main version', () => {
    const actualVersion = resolveBuildVersion(Maybe.just('main-025edc6'), '025edc6f1234567890');

    expect(actualVersion).toBe('main-025edc6');
  });

  it('uses the short commit SHA for local fallback versions', () => {
    const actualVersion = resolveBuildVersion(Maybe.nothing(), '025edc6f1234567890');

    expect(actualVersion).toBe('dev-025edc6');
  });

  it('uses an explicit unknown fallback when no commit is available', () => {
    const actualVersion = resolveBuildVersion(Maybe.nothing(), '');

    expect(actualVersion).toBe('dev-unknown');
  });

  it('returns the short commit SHA without changing the full SHA', () => {
    const actualShortCommitSha = getShortCommitSha('025edc6f1234567890');

    expect(actualShortCommitSha).toBe('025edc6');
  });

  it('creates deterministic metadata when all inputs are supplied', () => {
    const buildMetadataInput = {
      version: '2026-07-20.1',
      commit: '025edc6f1234567890',
      builtAt: '2026-07-20T06:18:03.123Z',
    };

    const firstMetadata = createBuildMetadata(buildMetadataInput);
    const secondMetadata = createBuildMetadata(buildMetadataInput);

    expect(firstMetadata).toStrictEqual({
      version: '2026-07-20.1',
      assetVersion: '2026-07-20.1-025edc6',
      commit: '025edc6f1234567890',
      builtAt: '2026-07-20T06:18:03.123Z',
    });
    expect(secondMetadata).toStrictEqual(firstMetadata);
    expect(firstMetadata.commit).toBe('025edc6f1234567890');
    expect(isBuildMetadata(firstMetadata)).toBe(true);
  });

  it('derives different asset versions for different commits with the same release version', () => {
    const firstMetadata = createBuildMetadata({
      version: '2026-07-20.1',
      commit: '025edc6f1234567890',
      builtAt: '2026-07-20T06:18:03.123Z',
    });
    const secondMetadata = createBuildMetadata({
      version: '2026-07-20.1',
      commit: 'fedcba9876543210',
      builtAt: '2026-07-20T06:18:03.123Z',
    });

    expect(firstMetadata.assetVersion).toBe('2026-07-20.1-025edc6');
    expect(secondMetadata.assetVersion).toBe('2026-07-20.1-fedcba9');
    expect(firstMetadata.assetVersion).not.toBe(secondMetadata.assetVersion);
  });

  it('derives the same asset version for the same logical version and commit', () => {
    const firstAssetVersion = resolveAssetVersion('2026-07-20.1', '025edc6f1234567890');
    const secondAssetVersion = resolveAssetVersion('2026-07-20.1', '025edc6f1234567890');

    expect(firstAssetVersion).toBe('2026-07-20.1-025edc6');
    expect(secondAssetVersion).toBe(firstAssetVersion);
  });

  it.each([
    ['main-025edc6', '025edc6f1234567890', 'main-025edc6'],
    ['dev-025edc6', '025edc6f1234567890', 'dev-025edc6'],
    ['dev-unknown', 'unknown', 'dev-unknown'],
  ])('does not suffix the %s version twice', (logicalVersion, commitSha, expectedAssetVersion) => {
    const actualAssetVersion = resolveAssetVersion(logicalVersion, commitSha);

    expect(actualAssetVersion).toBe(expectedAssetVersion);
  });

  it('rejects metadata with an asset version inconsistent with its logical version and commit', () => {
    const inconsistentMetadata = {
      version: '2026-07-20.1',
      assetVersion: 'wrong-value',
      commit: '025edc6f1234567890',
      builtAt: '2026-07-20T06:18:03.123Z',
    };

    expect(isBuildMetadata(inconsistentMetadata)).toBe(false);
    expect(parseBuildMetadata(JSON.stringify(inconsistentMetadata)).isNothing).toBe(true);
  });

  it('accepts only ISO 8601 UTC timestamps with milliseconds', () => {
    expect(
      parseBuildMetadata(
        JSON.stringify({
          version: '2026-07-20.1',
          assetVersion: '2026-07-20.1-025edc6',
          commit: '025edc6f1234567890',
          builtAt: '2026-07-20T06:18:03.123Z',
        }),
      ).isJust,
    ).toBe(true);
    expect(
      parseBuildMetadata(
        JSON.stringify({
          version: '2026-07-20.1',
          assetVersion: '2026-07-20.1-025edc6',
          commit: '025edc6f1234567890',
          builtAt: '2026-07-20T06:18:03Z',
        }),
      ).isNothing,
    ).toBe(true);
    expect(
      parseBuildMetadata(
        JSON.stringify({
          version: '2026-07-20.1',
          assetVersion: '2026-07-20.1-025edc6',
          commit: '025edc6f1234567890',
          builtAt: '2026.07.20.06.18.03',
        }),
      ).isNothing,
    ).toBe(true);
  });

  it.each(['2026.07.20.06.18.03', '2026.07.20.06.18'])(
    'rejects the historical dot-separated timestamp "%s" as a logical version',
    historicalTimestampVersion => {
      expect(
        parseBuildMetadata(
          JSON.stringify({
            version: historicalTimestampVersion,
            assetVersion: `${historicalTimestampVersion}-025edc6`,
            commit: '025edc6f1234567890',
            builtAt: '2026-07-20T06:18:03.123Z',
          }),
        ).isNothing,
      ).toBe(true);
    },
  );

  it.each(['2026-07-20.1', '2026-07-20-production.1', 'main-025edc6', 'dev-025edc6'])(
    'accepts the logical version "%s"',
    logicalVersion => {
      const metadata = createBuildMetadata({
        version: logicalVersion,
        commit: '025edc6f1234567890',
        builtAt: '2026-07-20T06:18:03.123Z',
      });

      expect(isBuildMetadata(metadata)).toBe(true);
    },
  );

  it('parses only metadata that satisfies the asset-version derivation rule', () => {
    expect(
      parseBuildMetadata(
        JSON.stringify({
          version: '2026-07-20.1',
          assetVersion: '2026-07-20.1-025edc6',
          commit: '025edc6f1234567890',
          builtAt: '2026-07-20T06:18:03.123Z',
        }),
      ).isJust,
    ).toBe(true);
  });
});
