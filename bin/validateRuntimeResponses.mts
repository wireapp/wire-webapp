#!/usr/bin/env node

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

import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import {validateRuntimeResponses} from './validateRuntimeResponses.ts';
import type {BuildMetadata} from '@wireapp/config';

function readRequiredEnvironmentValue(environmentVariableName: string): string {
  const environmentValue = process.env[environmentVariableName];

  if (typeof environmentValue !== 'string' || environmentValue.length === 0) {
    throw new Error('Missing required runtime verification input ' + environmentVariableName);
  }

  return environmentValue;
}

function readExpectedBuildMetadata(): BuildMetadata {
  return {
    version: readRequiredEnvironmentValue('EXPECTED_VERSION'),
    assetVersion: readRequiredEnvironmentValue('EXPECTED_ASSET_VERSION'),
    commit: readRequiredEnvironmentValue('EXPECTED_COMMIT'),
    builtAt: readRequiredEnvironmentValue('EXPECTED_BUILT_AT'),
  };
}

function run(): void {
  const validationErrors = validateRuntimeResponses({
    versionResponse: readFileSync(0, 'utf8'),
    runtimeConfigurationResponse: readRequiredEnvironmentValue('RUNTIME_CONFIG_RESPONSE'),
    expectedBuildMetadata: readExpectedBuildMetadata(),
    expectedBackendRest: readRequiredEnvironmentValue('EXPECTED_BACKEND_REST'),
    expectedBackendWebSocket: readRequiredEnvironmentValue('EXPECTED_BACKEND_WS'),
  });

  if (validationErrors.length > 0) {
    validationErrors.forEach(validationError => {
      console.error(validationError);
    });
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
