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

import {validateBuildMetadataResponse, validateRuntimeResponses} from './validateRuntimeResponses';
import type {BuildMetadata} from '@wireapp/config';

const mainBuildMetadata: BuildMetadata = {
  version: 'main-bdb93c9',
  assetVersion: 'main-bdb93c9',
  commit: 'bdb93c9269866d577c012f3a781cbe904f7bf47c',
  builtAt: '2026-07-20T14:43:21.123Z',
};

const matchingRuntimeConfiguration = `window.wire = window.wire || {}; window.wire.env = ${JSON.stringify({
  BACKEND_REST: 'https://backend.example.com',
  BACKEND_WS: 'wss://backend.example.com',
})};`;

function validateMatchingRuntimeResponses(
  buildMetadata: BuildMetadata,
  runtimeConfiguration: string,
): readonly string[] {
  return validateRuntimeResponses({
    versionResponse: JSON.stringify(buildMetadata),
    runtimeConfigurationResponse: runtimeConfiguration,
    expectedBuildMetadata: mainBuildMetadata,
    expectedBackendRest: 'https://backend.example.com/',
    expectedBackendWebSocket: 'wss://backend.example.com/',
  });
}

function expectValidationError(validationErrors: readonly string[], expectedFieldName: string): void {
  expect(validationErrors.some(validationError => validationError.startsWith(expectedFieldName))).toBe(true);
}

describe('runtime build metadata verification', () => {
  it('accepts complete matching metadata and backend configuration', () => {
    expect(validateMatchingRuntimeResponses(mainBuildMetadata, matchingRuntimeConfiguration)).toEqual([]);
  });

  test.each([
    ['version', {...mainBuildMetadata, version: 'main-other-version'}],
    ['assetVersion', {...mainBuildMetadata, assetVersion: 'main-other-assets'}],
    ['commit', {...mainBuildMetadata, commit: 'other-commit'}],
    ['builtAt', {...mainBuildMetadata, builtAt: '2026-07-20T15:43:21.123Z'}],
  ])('rejects a %s mismatch', (propertyName, mismatchedBuildMetadata) => {
    const validationErrors = validateMatchingRuntimeResponses(mismatchedBuildMetadata, matchingRuntimeConfiguration);

    expectValidationError(validationErrors, propertyName);
  });

  it('rejects missing assetVersion', () => {
    const versionResponse = JSON.stringify({
      version: mainBuildMetadata.version,
      commit: mainBuildMetadata.commit,
      builtAt: mainBuildMetadata.builtAt,
    });

    const validationErrors = validateBuildMetadataResponse(versionResponse, mainBuildMetadata);

    expectValidationError(validationErrors, 'assetVersion');
  });

  it('rejects missing builtAt', () => {
    const versionResponse = JSON.stringify({
      version: mainBuildMetadata.version,
      assetVersion: mainBuildMetadata.assetVersion,
      commit: mainBuildMetadata.commit,
    });

    const validationErrors = validateBuildMetadataResponse(versionResponse, mainBuildMetadata);

    expectValidationError(validationErrors, 'builtAt');
  });

  it('rejects malformed JSON', () => {
    const validationErrors = validateBuildMetadataResponse('{not-json', mainBuildMetadata);

    expect(validationErrors).toEqual(['/version response is not valid JSON']);
  });

  it('continues validating backend configuration', () => {
    const runtimeConfiguration = matchingRuntimeConfiguration.replaceAll(
      'backend.example.com',
      'other-backend.example.com',
    );

    const validationErrors = validateMatchingRuntimeResponses(mainBuildMetadata, runtimeConfiguration);

    expectValidationError(validationErrors, 'BACKEND_REST');
    expectValidationError(validationErrors, 'BACKEND_WS');
  });

  it('does not reconstruct assetVersion or builtAt from other metadata fields', () => {
    const actualBuildMetadata = {
      version: mainBuildMetadata.version,
      assetVersion: 'main-bdb93c9-reconstructed',
      commit: mainBuildMetadata.commit,
      builtAt: '2026-07-20T15:43:21.123Z',
    };

    const validationErrors = validateMatchingRuntimeResponses(actualBuildMetadata, matchingRuntimeConfiguration);

    expect(validationErrors).toHaveLength(2);
    expectValidationError(validationErrors, 'assetVersion');
    expectValidationError(validationErrors, 'builtAt');
  });
});
