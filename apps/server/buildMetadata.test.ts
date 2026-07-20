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

import {Maybe, Result} from 'true-myth';

import {loadBuildMetadata, parseBuildMetadata} from './buildMetadata';

const authoritativeBuildMetadata = {
  version: 'main-025edc6',
  assetVersion: 'main-025edc6',
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
    const loadedBuildMetadataResult = loadBuildMetadata('/build/version.json', {
      readFile: metadataFilePath => {
        expect(metadataFilePath).toBe('/build/version.json');
        return JSON.stringify(authoritativeBuildMetadata);
      },
    });

    expect(loadedBuildMetadataResult).toStrictEqual(Result.ok(authoritativeBuildMetadata));

    if (loadedBuildMetadataResult.isOk) {
      expect(typeof loadedBuildMetadataResult.value.version).toBe('string');
    }
  });

  it('fails when the metadata file is missing', () => {
    const loadedBuildMetadataResult = loadBuildMetadata('/build/version.json', {
      readFile: () => {
        throw new Error('ENOENT: no such file or directory');
      },
    });

    expect(loadedBuildMetadataResult.isErr).toBe(true);
    if (loadedBuildMetadataResult.isErr) {
      expect(loadedBuildMetadataResult.error.message).toBe("Unable to read build metadata file '/build/version.json'");
    }
  });

  it('fails when the metadata file cannot be read', () => {
    const loadedBuildMetadataResult = loadBuildMetadata('/build/version.json', {
      readFile: () => {
        throw new Error('permission denied');
      },
    });

    expect(loadedBuildMetadataResult.isErr).toBe(true);
    if (loadedBuildMetadataResult.isErr) {
      expect(loadedBuildMetadataResult.error.message).toBe("Unable to read build metadata file '/build/version.json'");
    }
  });

  it('fails when the metadata file contains malformed JSON', () => {
    const loadedBuildMetadataResult = loadBuildMetadata('/build/version.json', {
      readFile: () => '{not-json',
    });

    expect(loadedBuildMetadataResult.isErr).toBe(true);
    if (loadedBuildMetadataResult.isErr) {
      expect(loadedBuildMetadataResult.error.message).toBe(
        "Build metadata file '/build/version.json' contains malformed JSON",
      );
    }
  });

  it('fails when the metadata file has an invalid structure', () => {
    const loadedBuildMetadataResult = loadBuildMetadata('/build/version.json', {
      readFile: () =>
        JSON.stringify({
          version: 'main-025edc6',
          commit: authoritativeBuildMetadata.commit,
          builtAt: authoritativeBuildMetadata.builtAt,
        }),
    });

    expect(loadedBuildMetadataResult.isErr).toBe(true);
    if (loadedBuildMetadataResult.isErr) {
      expect(loadedBuildMetadataResult.error.message).toBe(
        "Build metadata file '/build/version.json' has an invalid structure",
      );
    }
  });

  it('loads a structurally valid development fallback generated without Git metadata', () => {
    const loadedBuildMetadataResult = loadBuildMetadata('/build/version.json', {
      readFile: () => {
        return JSON.stringify({
          version: 'dev-unknown',
          assetVersion: 'dev-unknown',
          commit: 'unknown',
          builtAt: '1970-01-01T00:00:00.000Z',
        });
      },
    });

    expect(loadedBuildMetadataResult).toStrictEqual(
      Result.ok({
        version: 'dev-unknown',
        assetVersion: 'dev-unknown',
        commit: 'unknown',
        builtAt: '1970-01-01T00:00:00.000Z',
      }),
    );
  });
});
