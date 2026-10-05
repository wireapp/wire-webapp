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

import {
  readInspectionRuntimeEnvironment,
  readSynchronizationRuntimeEnvironment,
} from './webappVersionSynchronizationRuntime.ts';

function createRuntimeEnvironment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    GITHUB_API_URL: 'https://api.github.com',
    GITHUB_REPOSITORY: 'wireapp/wire-webapp',
    GITHUB_WORKSPACE: '/workspace/wire-webapp',
    ...overrides,
  };
}

describe('WebApp version synchronization runtime environment', () => {
  it('allows inspection with GITHUB_TOKEN without an Otto token', () => {
    const actualResult = readInspectionRuntimeEnvironment(
      createRuntimeEnvironment({GITHUB_TOKEN: 'github-read-token'}),
    );

    assert(actualResult.isOk);
    expect(actualResult.value.githubToken).toBe('github-read-token');
  });

  it('requires GITHUB_TOKEN for inspection', () => {
    const actualResult = readInspectionRuntimeEnvironment(createRuntimeEnvironment());

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('GITHUB_TOKEN');
  });

  it('allows synchronization with the Otto token without GITHUB_TOKEN', () => {
    const actualResult = readSynchronizationRuntimeEnvironment(
      createRuntimeEnvironment({OTTO_THE_BOT_GH_TOKEN: 'otto-write-token'}),
    );

    assert(actualResult.isOk);
    expect(actualResult.value.ottoTheBotGitHubToken).toBe('otto-write-token');
  });

  it('requires the Otto token for synchronization', () => {
    const actualResult = readSynchronizationRuntimeEnvironment(createRuntimeEnvironment());

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('OTTO_THE_BOT_GH_TOKEN');
  });

  it('does not include credentials in validation failures', () => {
    const actualResult = readInspectionRuntimeEnvironment(
      createRuntimeEnvironment({GITHUB_API_URL: 'not-a-url', GITHUB_TOKEN: 'github-read-token'}),
    );

    assert(actualResult.isErr);
    expect(actualResult.error.message).not.toContain('github-read-token');
    expect(actualResult.error.message).not.toContain('otto-write-token');
  });
});
