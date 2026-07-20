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

import {validateBuildArtifactMetadata} from './buildArtifactMetadata';

const mainBuildMetadata = {
  version: 'main-025edc6',
  commit: '025edc663787b3d2da366f21a5958013201e6cd4',
  builtAt: '2026-07-20T06:18:03.123Z',
};

function createHtmlDocument(version: string): {readonly archiveFilePath: string; readonly contents: string} {
  return {
    archiveFilePath: 'static/index.html',
    contents: `<!-- ${version} --><link href="/image/favicon.ico?${version}"><script src="/min/app.js?v=${version}">`,
  };
}

describe('build artifact metadata validation', () => {
  it('accepts a main artifact whose metadata and generated HTML agree', () => {
    const validationResult = validateBuildArtifactMetadata({
      expectedCommit: mainBuildMetadata.commit,
      expectedVersion: mainBuildMetadata.version,
      htmlDocuments: [createHtmlDocument(mainBuildMetadata.version)],
      metadata: mainBuildMetadata,
    });

    expect(validationResult.isOk).toBe(true);

    if (validationResult.isOk) {
      expect(validationResult.value).toStrictEqual(mainBuildMetadata);
    }
  });

  it('accepts an explicit release identifier', () => {
    const releaseMetadata = {
      ...mainBuildMetadata,
      version: '2026-07-20.1',
    };

    const validationResult = validateBuildArtifactMetadata({
      expectedCommit: releaseMetadata.commit,
      expectedVersion: releaseMetadata.version,
      htmlDocuments: [createHtmlDocument(releaseMetadata.version)],
      metadata: releaseMetadata,
    });

    expect(validationResult.isOk).toBe(true);
  });

  it('rejects an artifact version that differs from the expected version', () => {
    const validationResult = validateBuildArtifactMetadata({
      expectedCommit: mainBuildMetadata.commit,
      expectedVersion: 'main-fedcba9',
      htmlDocuments: [createHtmlDocument(mainBuildMetadata.version)],
      metadata: mainBuildMetadata,
    });

    expect(validationResult.isErr).toBe(true);
  });

  it('rejects an artifact commit that differs from the expected commit', () => {
    const validationResult = validateBuildArtifactMetadata({
      expectedCommit: 'fedcba9876543210fedcba9876543210fedcba98',
      expectedVersion: mainBuildMetadata.version,
      htmlDocuments: [createHtmlDocument(mainBuildMetadata.version)],
      metadata: mainBuildMetadata,
    });

    expect(validationResult.isErr).toBe(true);
  });

  it('rejects generated HTML that uses a different version', () => {
    const validationResult = validateBuildArtifactMetadata({
      expectedCommit: mainBuildMetadata.commit,
      expectedVersion: mainBuildMetadata.version,
      htmlDocuments: [createHtmlDocument('dev-025edc6')],
      metadata: mainBuildMetadata,
    });

    expect(validationResult.isErr).toBe(true);
  });

  it('rejects metadata with the old dot-separated timestamp format', () => {
    const validationResult = validateBuildArtifactMetadata({
      expectedCommit: mainBuildMetadata.commit,
      expectedVersion: mainBuildMetadata.version,
      htmlDocuments: [createHtmlDocument(mainBuildMetadata.version)],
      metadata: {...mainBuildMetadata, builtAt: '2026.07.20.06.18.03'},
    });

    expect(validationResult.isErr).toBe(true);
  });
});
