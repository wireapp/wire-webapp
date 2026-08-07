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

import {formatBuildArtifactMetadataOutputs} from './buildArtifactMetadataOutput';
import type {BuildMetadata} from '@wireapp/config';

const mainBuildMetadata: BuildMetadata = {
  version: 'main-bdb93c9',
  assetVersion: 'main-bdb93c9',
  commit: 'bdb93c9269866d577c012f3a781cbe904f7bf47c',
  builtAt: '2026-07-20T14:43:21.123Z',
};

const releaseBuildMetadata: BuildMetadata = {
  version: '2026-07-20.1',
  assetVersion: '2026-07-20.1-025edc6',
  commit: '025edc663787b3d2da366f21a5958013201e6cd4',
  builtAt: '2026-07-20T06:18:03.123Z',
};

describe('artifact metadata GitHub outputs', () => {
  test.each([
    ['main metadata', mainBuildMetadata],
    ['release metadata', releaseBuildMetadata],
  ])('formats all validated artifact metadata outputs for %s', (_description, metadata) => {
    const actualOutput = formatBuildArtifactMetadataOutputs(metadata);
    const expectedOutput = [
      `artifact_version=${metadata.version}`,
      `artifact_asset_version=${metadata.assetVersion}`,
      `artifact_commit=${metadata.commit}`,
      `artifact_built_at=${metadata.builtAt}`,
      '',
    ].join('\n');

    expect(actualOutput).toBe(expectedOutput);
  });
});
