/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {defineConfig, devices} from '@playwright/test';
import {config} from 'dotenv';

config({path: './test/e2e_tests/.env'});

const numberOfRetriesOnCI = 1;
const numberOfParallelWorkersOnCI = 1;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
module.exports = defineConfig({
  testDir: './test/e2e_tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? numberOfRetriesOnCI : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? numberOfParallelWorkersOnCI : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', {outputFolder: 'playwright-report', open: 'never'}],
    ['json', {outputFile: 'playwright-report/report.json'}],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    permissions: ['camera', 'microphone'],
    actionTimeout: 20_000, // 20 seconds
    testIdAttribute: 'data-uie-name',
  },
  expect: {
    timeout: 10_000, // 10 seconds
  },
  projects: [
    /* Test against branded browsers. */
    {
      name: 'Google Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        headless: process.env.HEADLESS !== 'false',
        launchOptions: {
          args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
        },
      }, // or 'chrome-beta'
    },
  ],
});
