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
  createAuthoritativeBuildMetadata,
  createBuildMetadata,
  getShortCommitSha,
  isBuildMetadata,
  parseBuildMetadata,
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
      commit: '025edc6f1234567890',
      builtAt: '2026-07-20T06:18:03.123Z',
    });
    expect(secondMetadata).toStrictEqual(firstMetadata);
    expect(firstMetadata.commit).toBe('025edc6f1234567890');
    expect(isBuildMetadata(firstMetadata)).toBe(true);
  });

  it('accepts only ISO 8601 UTC timestamps with milliseconds', () => {
    expect(
      parseBuildMetadata(
        JSON.stringify({
          version: '2026-07-20.1',
          commit: '025edc6f1234567890',
          builtAt: '2026-07-20T06:18:03.123Z',
        }),
      ).isJust,
    ).toBe(true);
    expect(
      parseBuildMetadata(
        JSON.stringify({
          version: '2026-07-20.1',
          commit: '025edc6f1234567890',
          builtAt: '2026-07-20T06:18:03Z',
        }),
      ).isNothing,
    ).toBe(true);
    expect(
      parseBuildMetadata(
        JSON.stringify({
          version: '2026-07-20.1',
          commit: '025edc6f1234567890',
          builtAt: '2026.07.20.06.18.03',
        }),
      ).isNothing,
    ).toBe(true);
  });

  it('preserves metadata when the logical version and commit are unchanged', () => {
    const buildMetadataInput = {
      version: 'main-025edc6',
      commit: '025edc6f1234567890',
      builtAt: '2026-07-20T06:18:03.123Z',
    };
    const existingMetadata = createBuildMetadata({
      ...buildMetadataInput,
      builtAt: '2026-07-20T06:00:00.000Z',
    });

    const actualMetadata = createAuthoritativeBuildMetadata(Maybe.just(existingMetadata), buildMetadataInput);

    expect(actualMetadata).toStrictEqual(existingMetadata);
  });

  it('creates new metadata when the logical version changes', () => {
    const buildMetadataInput = {
      version: 'main-025edc6',
      commit: '025edc6f1234567890',
      builtAt: '2026-07-20T06:18:03.123Z',
    };
    const existingMetadata = createBuildMetadata({
      ...buildMetadataInput,
      version: 'dev-025edc6',
      builtAt: '2026-07-20T06:00:00.000Z',
    });

    const actualMetadata = createAuthoritativeBuildMetadata(Maybe.just(existingMetadata), buildMetadataInput);

    expect(actualMetadata).toStrictEqual(buildMetadataInput);
  });
});
