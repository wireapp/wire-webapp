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

import {defineConfig, devices, ReporterDescription} from '@playwright/test';
import {config} from 'dotenv';
import {resolve} from 'node:path';

config({path: resolve(__dirname, './test/e2e_tests/.env'), quiet: true});

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
  /* Due to the tests usually requiring registration and login of a new user the default 30s timeout isn't sufficient */
  timeout: 90_000,
  /* Retry on CI only */
  retries: process.env.CI ? numberOfRetriesOnCI : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? numberOfParallelWorkersOnCI : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', {outputFolder: 'playwright-report/html', open: 'never'}],
    ['json', {outputFile: 'playwright-report/report.json'}],
    ['line'],
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
          args: [
            '--use-fake-device-for-media-stream', // Provide fake devices for audio & video device input
            '--use-fake-ui-for-media-stream', // Bypasses the popup to grant permission and select video / audio input device by automatically selecting the default one
            '--mute-audio', // Mute all audio output from the test browser because e.g. the ringtone of a call can be annoying during testing
          ],
        },
      }, // or 'chrome-beta'
    },
  ],
});
