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
 */

import {existsSync} from 'node:fs';
import {resolve} from 'node:path';

import {isNonEmptyString, isString} from '@sindresorhus/is';
import {defineConfig, devices} from '@playwright/test';
import {config} from 'dotenv';

type RspackBuildVariant = 'internal' | 'public';

const e2eEnvironmentPath = resolve(__dirname, './test/e2e_tests/.env');
const e2eEnvironmentTemplatePath = resolve(__dirname, './test/e2e_tests/.env.tpl');

if (!existsSync(e2eEnvironmentPath)) {
  throw new Error(
    `Authenticated Rspack E2E requires ${e2eEnvironmentPath}. Create it from ${e2eEnvironmentTemplatePath} and resolve the existing test backend settings.`,
  );
}

config({path: e2eEnvironmentPath, quiet: true});

function isRspackBuildVariant(value: unknown): value is RspackBuildVariant {
  return isString(value) && (value === 'internal' || value === 'public');
}

function hasResolvedEnvironmentValue(environmentValue: unknown): boolean {
  if (!isString(environmentValue) || !isNonEmptyString(environmentValue.trim())) {
    return false;
  }

  const isOnePasswordReference = environmentValue.startsWith('op://');
  const isUnresolvedTemplateValue = environmentValue.includes('{{');

  return !isOnePasswordReference && !isUnresolvedTemplateValue;
}

const rspackBuildVariant = process.env.WIRE_RSPACK_BUILD_VARIANT;
if (!isRspackBuildVariant(rspackBuildVariant)) {
  throw new Error('Select the Rspack build with --configuration=internal or --configuration=public.');
}

const requiredEnvironmentVariables = ['WEBAPP_URL', 'BACKEND_URL', 'BASIC_AUTH', 'DOMAIN'] as const;
const missingEnvironmentVariables = requiredEnvironmentVariables.filter(environmentVariableName => {
  return !hasResolvedEnvironmentValue(process.env[environmentVariableName]);
});

if (missingEnvironmentVariables.length > 0) {
  throw new Error(
    `Authenticated Rspack E2E requires resolved values for ${missingEnvironmentVariables.join(', ')} in ${e2eEnvironmentPath}.`,
  );
}

const configuredWebAppUrl = process.env.WEBAPP_URL;
if (!isNonEmptyString(configuredWebAppUrl)) {
  throw new Error('WEBAPP_URL is required for authenticated Rspack E2E.');
}

let applicationUrl: URL;
try {
  applicationUrl = new URL(configuredWebAppUrl);
} catch {
  throw new Error('WEBAPP_URL must be an absolute HTTPS URL for the configured Wire test environment.');
}

if (applicationUrl.protocol !== 'https:') {
  throw new Error(
    'WEBAPP_URL must use HTTPS so the configured test backend origin and browser security remain intact.',
  );
}

const buildDirectoryPath = resolve(__dirname, `dist/rspack-${rspackBuildVariant}`);
const requiredRspackEntryScriptPaths = ['min/app.js', 'min/auth.js'];
const missingRspackEntryScripts = requiredRspackEntryScriptPaths.filter(entryScriptPath => {
  return !existsSync(resolve(buildDirectoryPath, entryScriptPath));
});

if (missingRspackEntryScripts.length > 0) {
  const buildCommand = rspackBuildVariant === 'internal' ? 'build-rspack' : 'build-rspack-public';
  throw new Error(
    `Rspack ${rspackBuildVariant} output is missing ${missingRspackEntryScripts.join(', ')}. Run yarn nx run webapp:${buildCommand} first.`,
  );
}

const rspackAuthenticatedReportDirectory = resolve(__dirname, 'playwright-report/rspack-authenticated');
const rspackAuthenticatedOutputDirectory = resolve(__dirname, 'test-results/rspack-authenticated');
const e2eTestTimeoutMilliseconds = 90_000;

export default defineConfig({
  testDir: resolve(__dirname, 'test/e2e_tests'),
  testMatch: ['**/Authentication/authentication.spec.ts', '**/CriticalFlow/messagesIn1On1-TC-8750.spec.ts'],
  grep: /@TC-3472|@TC-8750/,
  tsconfig: resolve(__dirname, 'tsconfig.playwright.json'),
  fullyParallel: false,
  forbidOnly: process.env.CI === 'true',
  retries: 0,
  workers: 1,
  reporter: [['line'], ['html', {outputFolder: rspackAuthenticatedReportDirectory, open: 'never'}]],
  outputDir: rspackAuthenticatedOutputDirectory,
  timeout: e2eTestTimeoutMilliseconds,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: applicationUrl.origin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
    permissions: ['camera', 'microphone'],
    actionTimeout: 20_000,
    testIdAttribute: 'data-uie-name',
  },
  projects: [
    {
      name: `rspack-${rspackBuildVariant}`,
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['notifications', 'clipboard-read', 'clipboard-write'],
        launchOptions: {
          args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--mute-audio'],
        },
      },
    },
  ],
});
