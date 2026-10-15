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

import {defineConfig} from '@playwright/test';
import {resolve} from 'node:path';

const internalBuildPort = 4173;
const publicBuildPort = 4174;
const smokeTestDirectory = resolve(__dirname, 'test/rspack-smoke');
const smokeTestOutputDirectory = resolve(__dirname, 'test-results/rspack-smoke');
const smokeReportDirectory = resolve(__dirname, 'playwright-report/rspack-smoke');

type BuildProjectOptions = {
  readonly name: string;
  readonly use: {
    readonly baseURL: string;
    readonly browserName: 'chromium';
  };
};

function createBuildProjectOptions(buildVariant: 'internal' | 'public', port: number): BuildProjectOptions {
  const baseURL = `http://127.0.0.1:${port}`;

  return {
    name: `rspack-${buildVariant}`,
    use: {
      baseURL,
      browserName: 'chromium',
    },
  };
}

export default defineConfig({
  testDir: smokeTestDirectory,
  testMatch: '**/*.spec.ts',
  tsconfig: resolve(__dirname, 'tsconfig.playwright.json'),
  fullyParallel: true,
  forbidOnly: process.env.CI === 'true',
  reporter: [
    ['list'],
    ['html', {outputFolder: smokeReportDirectory, open: 'never'}],
  ],
  outputDir: smokeTestOutputDirectory,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    createBuildProjectOptions('internal', internalBuildPort),
    createBuildProjectOptions('public', publicBuildPort),
  ],
  webServer: [
    {
      command: `node test/rspack-smoke/server.ts --variant internal --port ${internalBuildPort}`,
      cwd: __dirname,
      url: `http://127.0.0.1:${internalBuildPort}/`,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `node test/rspack-smoke/server.ts --variant public --port ${publicBuildPort}`,
      cwd: __dirname,
      url: `http://127.0.0.1:${publicBuildPort}/`,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
