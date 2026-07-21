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

import {validateRecoveryBuildArtifactMetadata} from './recoveryBuildArtifactMetadata';
import {formatRecoverableBuildArtifactMetadataOutputs} from './recoveryBuildArtifactMetadataOutput';
import type {BuildArtifactHtmlDocument} from './buildArtifactMetadata';
import type {BuildMetadata} from '@wireapp/config';

const releaseBuildMetadata: BuildMetadata = {
  version: '2026-07-20.1',
  assetVersion: '2026-07-20.1-025edc6',
  commit: '025edc663787b3d2da366f21a5958013201e6cd4',
  builtAt: '2026-07-20T06:18:03.123Z',
};

const matchingHtmlDocuments: readonly BuildArtifactHtmlDocument[] = [
  {
    archiveFilePath: 'static/index.html',
    contents: `<!--! ${releaseBuildMetadata.version} --><script src="/min/app.js?v=${releaseBuildMetadata.assetVersion}"></script>`,
  },
];

const expectedCommit = releaseBuildMetadata.commit;

function validateMetadata(metadata: unknown, expectedVersion: string) {
  return validateRecoveryBuildArtifactMetadata({
    expectedCommit,
    expectedVersion,
    htmlDocuments: matchingHtmlDocuments,
    metadata,
  });
}

describe('recovery build artifact metadata validation', () => {
  it('accepts current four-field metadata', () => {
    const validationResult = validateMetadata(releaseBuildMetadata, releaseBuildMetadata.version);

    expect(validationResult.isOk).toBe(true);
    if (validationResult.isOk) {
      expect(validationResult.value).toStrictEqual({kind: 'current', metadata: releaseBuildMetadata});
    }
  });

  it.each(['2026.07.15.12.00', '2026.07.20.06.18.03'])(
    'accepts historical timestamp metadata with %s',
    historicalVersion => {
      const legacyMetadata = {version: historicalVersion, commit: expectedCommit};

      const validationResult = validateMetadata(legacyMetadata, historicalVersion);

      expect(validationResult.isOk).toBe(true);
      if (validationResult.isOk) {
        expect(validationResult.value).toStrictEqual({kind: 'legacy', metadata: legacyMetadata});
      }
    },
  );

  it.each([
    ['assetVersion', {...releaseBuildMetadata, assetVersion: undefined}],
    ['builtAt', {...releaseBuildMetadata, builtAt: undefined}],
  ])('rejects current metadata missing %s', (_fieldName, metadata) => {
    const validationResult = validateMetadata(metadata, releaseBuildMetadata.version);

    expect(validationResult.isErr).toBe(true);
    if (validationResult.isErr) {
      expect(validationResult.error.message).toBe('Build artifact metadata is invalid');
    }
  });

  it('rejects arbitrary two-field metadata', () => {
    const validationResult = validateMetadata(
      {version: '2026-07-20.1', commit: expectedCommit},
      releaseBuildMetadata.version,
    );

    expect(validationResult.isErr).toBe(true);
    if (validationResult.isErr) {
      expect(validationResult.error.message).toBe('Legacy build artifact metadata is invalid');
    }
  });

  it('rejects a legacy commit mismatch', () => {
    const validationResult = validateMetadata(
      {
        version: '2026.07.15.12.00',
        commit: 'fedcba9876543210fedcba9876543210fedcba98',
      },
      '2026.07.15.12.00',
    );

    expect(validationResult.isErr).toBe(true);
    if (validationResult.isErr) {
      expect(validationResult.error.message).toContain('Legacy build artifact commit');
    }
  });

  it('rejects a current commit mismatch', () => {
    const validationResult = validateMetadata(
      {
        ...releaseBuildMetadata,
        commit: 'fedcba9876543210fedcba9876543210fedcba98',
        assetVersion: '2026-07-20.1-fedcba9',
      },
      releaseBuildMetadata.version,
    );

    expect(validationResult.isErr).toBe(true);
    if (validationResult.isErr) {
      expect(validationResult.error.message).toContain('Build artifact commit');
    }
  });

  it('rejects a current expected version mismatch', () => {
    const validationResult = validateMetadata(releaseBuildMetadata, '2026-07-20.2');

    expect(validationResult.isErr).toBe(true);
    if (validationResult.isErr) {
      expect(validationResult.error.message).toContain('Build artifact version');
    }
  });

  it('leaves unavailable legacy outputs empty', () => {
    const legacyMetadata = {
      version: '2026.07.15.12.00',
      commit: expectedCommit,
    };
    const validationResult = validateMetadata(legacyMetadata, legacyMetadata.version);

    expect(validationResult.isOk).toBe(true);
    if (validationResult.isOk) {
      expect(formatRecoverableBuildArtifactMetadataOutputs(validationResult.value)).toBe(
        [
          `artifact_version=${legacyMetadata.version}`,
          'artifact_asset_version=',
          `artifact_commit=${legacyMetadata.commit}`,
          'artifact_built_at=',
          '',
        ].join('\n'),
      );
    }
  });

  it('writes all four current outputs exactly', () => {
    const validationResult = validateMetadata(releaseBuildMetadata, releaseBuildMetadata.version);

    expect(validationResult.isOk).toBe(true);
    if (validationResult.isOk) {
      expect(formatRecoverableBuildArtifactMetadataOutputs(validationResult.value)).toBe(
        [
          `artifact_version=${releaseBuildMetadata.version}`,
          `artifact_asset_version=${releaseBuildMetadata.assetVersion}`,
          `artifact_commit=${releaseBuildMetadata.commit}`,
          `artifact_built_at=${releaseBuildMetadata.builtAt}`,
          '',
        ].join('\n'),
      );
    }
  });
});
