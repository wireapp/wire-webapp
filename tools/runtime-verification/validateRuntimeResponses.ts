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

import type {BuildMetadata} from '@wireapp/config';

const buildMetadataPropertyNames = ['version', 'assetVersion', 'commit', 'builtAt'] as const;
const runtimeConfigurationPropertyNames = ['BACKEND_REST', 'BACKEND_WS'] as const;

type ParsedJsonValue = {
  readonly value: unknown;
  readonly errors: readonly string[];
};

export type RuntimeVerificationInput = {
  readonly versionResponse: string;
  readonly runtimeConfigurationResponse: string;
  readonly expectedBuildMetadata: BuildMetadata;
  readonly expectedBackendRest: string;
  readonly expectedBackendWebSocket: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Array.isArray(value) === false;
}

function normalizeUrl(url: string): string {
  let normalizedUrl = url;

  while (normalizedUrl.endsWith('/')) {
    normalizedUrl = normalizedUrl.slice(0, -1);
  }

  return normalizedUrl;
}

function parseJson(serializedValue: string, valueDescription: string): ParsedJsonValue {
  try {
    return {value: JSON.parse(serializedValue), errors: []};
  } catch {
    return {value: undefined, errors: [valueDescription + ' is not valid JSON']};
  }
}

export function validateBuildMetadataResponse(
  versionResponse: string,
  expectedBuildMetadata: BuildMetadata,
): readonly string[] {
  const parsedResponse = parseJson(versionResponse, '/version response');

  if (parsedResponse.errors.length > 0) {
    return parsedResponse.errors;
  }

  const responseValue = parsedResponse.value;

  if (!isRecord(responseValue)) {
    return ['/version response must be a JSON object'];
  }

  return buildMetadataPropertyNames.flatMap(propertyName => {
    const actualValue = responseValue[propertyName];

    if (typeof actualValue !== 'string' || actualValue.length === 0) {
      return [propertyName + ' must be a non-empty string'];
    }

    if (actualValue !== expectedBuildMetadata[propertyName]) {
      return [propertyName + ' does not match the expected artifact metadata'];
    }

    return [];
  });
}

function parseRuntimeConfiguration(runtimeConfigurationResponse: string): ParsedJsonValue {
  const assignmentMarker = 'window.wire.env = ';
  const assignmentStart = runtimeConfigurationResponse.lastIndexOf(assignmentMarker);

  if (assignmentStart < 0) {
    return {value: undefined, errors: ['runtime configuration does not contain window.wire.env']};
  }

  const serializedConfiguration = runtimeConfigurationResponse
    .slice(assignmentStart + assignmentMarker.length)
    .trim()
    .replace(/;$/, '');

  return parseJson(serializedConfiguration, 'runtime configuration');
}

export function validateRuntimeConfiguration(
  runtimeConfigurationResponse: string,
  expectedBackendRest: string,
  expectedBackendWebSocket: string,
): readonly string[] {
  const parsedConfiguration = parseRuntimeConfiguration(runtimeConfigurationResponse);

  if (parsedConfiguration.errors.length > 0) {
    return parsedConfiguration.errors;
  }

  const configurationValue = parsedConfiguration.value;

  if (!isRecord(configurationValue)) {
    return ['runtime configuration must be a JSON object'];
  }

  const expectedBackendValues: Record<(typeof runtimeConfigurationPropertyNames)[number], string> = {
    BACKEND_REST: normalizeUrl(expectedBackendRest),
    BACKEND_WS: normalizeUrl(expectedBackendWebSocket),
  };

  return runtimeConfigurationPropertyNames.flatMap(propertyName => {
    const actualValue = configurationValue[propertyName];

    if (typeof actualValue !== 'string' || actualValue.length === 0) {
      return [propertyName + ' must be a non-empty string'];
    }

    if (normalizeUrl(actualValue) !== expectedBackendValues[propertyName]) {
      return [propertyName + ' does not match the expected runtime backend'];
    }

    return [];
  });
}

export function validateRuntimeResponses(input: RuntimeVerificationInput): readonly string[] {
  return [
    ...validateBuildMetadataResponse(input.versionResponse, input.expectedBuildMetadata),
    ...validateRuntimeConfiguration(
      input.runtimeConfigurationResponse,
      input.expectedBackendRest,
      input.expectedBackendWebSocket,
    ),
  ];
}
