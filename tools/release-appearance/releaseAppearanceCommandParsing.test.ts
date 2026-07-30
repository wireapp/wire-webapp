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

import assert from 'node:assert';

import {parseCommandLineArguments, readCommandEnvironment} from './releaseAppearanceCommandParsing.ts';
import type {ParsedCommand} from './releaseAppearanceCommandParsing.ts';

const validEnvironment: NodeJS.ProcessEnv = {
  GITHUB_API_URL: 'https://api.github.com',
  GITHUB_REPOSITORY: 'wireapp/wire-webapp',
  GITHUB_STEP_SUMMARY: '/tmp/summary.md',
  GITHUB_TOKEN: 'token',
};

type SupportedCommandTestCase = readonly [readonly string[], ParsedCommand];

const supportedCommandTestCases: readonly SupportedCommandTestCase[] = [
  [
    ['beta', '2026-07-21.3-beta.1', 'a'.repeat(40)],
    {stage: 'beta', releaseTag: '2026-07-21.3-beta.1', releaseCommit: 'a'.repeat(40)},
  ],
  [
    ['production', '2026-07-21.3-production', 'a'.repeat(40), '2026-07-21.3-beta.2'],
    {
      stage: 'production',
      releaseTag: '2026-07-21.3-production',
      releaseCommit: 'a'.repeat(40),
      promotedBetaTag: '2026-07-21.3-beta.2',
    },
  ],
];

describe('release appearance command parsing', (): void => {
  it.each(supportedCommandTestCases)(
    'parses a supported command',
    (commandLineArguments: readonly string[], expectedCommand: ParsedCommand): void => {
      const result = parseCommandLineArguments(commandLineArguments);

      assert(result.isOk);
      expect(result.value).toEqual(expectedCommand);
    },
  );

  it.each([
    {commandLineArguments: [], expectedMessage: 'Usage:'},
    {commandLineArguments: ['beta'], expectedMessage: 'Usage:'},
    {commandLineArguments: ['production', 'tag', 'not-a-sha', 'beta-tag'], expectedMessage: 'Release commit SHA'},
    {commandLineArguments: ['unsupported', 'tag', 'a'.repeat(40)], expectedMessage: 'Usage:'},
  ])(
    'rejects an invalid command',
    (testCase: {readonly commandLineArguments: readonly string[]; readonly expectedMessage: string}): void => {
      const result = parseCommandLineArguments(testCase.commandLineArguments);

      assert(result.isErr);
      expect(result.error.message).toContain(testCase.expectedMessage);
    },
  );

  it.each([
    {environment: {GITHUB_API_URL: 'not-a-url'}, expectedMessage: 'must be a valid URL'},
    {environment: {...validEnvironment, GITHUB_REPOSITORY: 'wire-webapp'}, expectedMessage: 'OWNER/REPOSITORY'},
    {environment: {...validEnvironment, GITHUB_TOKEN: '   '}, expectedMessage: 'must be set'},
  ])(
    'rejects invalid environment values',
    (testCase: {readonly environment: NodeJS.ProcessEnv; readonly expectedMessage: string}): void => {
      const result = readCommandEnvironment(testCase.environment);

      assert(result.isErr);
      expect(result.error.message).toContain(testCase.expectedMessage);
    },
  );

  it('parses the required environment values', (): void => {
    const result = readCommandEnvironment(validEnvironment);

    assert(result.isOk);
    expect(result.value).toEqual({
      githubApiUrl: 'https://api.github.com/',
      githubRepository: 'wireapp/wire-webapp',
      githubStepSummary: '/tmp/summary.md',
      githubToken: 'token',
    });
  });
});
