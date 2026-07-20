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

import {loadBuildMetadata, parseBuildMetadata} from './buildMetadata';

const authoritativeBuildMetadata = {
  version: 'main-025edc6',
  commit: '025edc6f1234567890',
  builtAt: '2026-07-20T06:18:03.123Z',
};

describe('server build metadata', () => {
  it('parses the authoritative metadata object', () => {
    const parsedBuildMetadata = parseBuildMetadata(JSON.stringify(authoritativeBuildMetadata));

    expect(parsedBuildMetadata).toStrictEqual(Maybe.just(authoritativeBuildMetadata));
  });

  it('rejects metadata without an ISO 8601 UTC timestamp', () => {
    const parsedBuildMetadata = parseBuildMetadata(
      JSON.stringify({...authoritativeBuildMetadata, builtAt: '2026.07.20.06.18.03'}),
    );

    expect(parsedBuildMetadata.isNothing).toBe(true);
  });

  it('rejects malformed metadata JSON', () => {
    const parsedBuildMetadata = parseBuildMetadata('{not-json');

    expect(parsedBuildMetadata.isNothing).toBe(true);
  });

  it('loads metadata through the supplied file reader', () => {
    const loadedBuildMetadata = loadBuildMetadata('/build/version.json', {
      readFile: metadataFilePath => {
        expect(metadataFilePath).toBe('/build/version.json');
        return JSON.stringify(authoritativeBuildMetadata);
      },
    });

    expect(loadedBuildMetadata).toStrictEqual(authoritativeBuildMetadata);
    expect(typeof loadedBuildMetadata.version).toBe('string');
  });

  it('uses a deterministic development fallback when the metadata file cannot be read', () => {
    const loadedBuildMetadata = loadBuildMetadata('/build/version.json', {
      readFile: () => {
        throw new Error('metadata file unavailable');
      },
    });

    expect(loadedBuildMetadata).toStrictEqual({
      version: 'dev-unknown',
      commit: 'unknown',
      builtAt: '1970-01-01T00:00:00.000Z',
    });
  });
});
