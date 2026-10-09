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

import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import process from 'node:process';

type PolicyCommandEnvironment = {
  readonly TARGET_BRANCH?: string;
  readonly PULL_REQUEST_LABELS_JSON?: string;
};

type PolicyCommandResult = {
  readonly exitCode: number | null;
  readonly standardError: string;
  readonly standardOutput: string;
};

const policyEntrypointPath = join(process.cwd(), 'tools/release-cli/pullRequestSemverPolicy.mts');

function runPolicyCommand(environment: PolicyCommandEnvironment): PolicyCommandResult {
  const commandResult = spawnSync(
    process.execPath,
    ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', policyEntrypointPath],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: environment,
    },
  );

  return {
    exitCode: commandResult.status,
    standardError: commandResult.stderr,
    standardOutput: commandResult.stdout,
  };
}

describe('pull request SemVer policy CLI', () => {
  it.each([
    {targetBranch: 'main', labels: ['feature', 'semver:minor'], impact: 'minor'},
    {targetBranch: 'release/2026-10-06.1', labels: ['semver:patch'], impact: 'patch'},
    {targetBranch: 'maintenance/2026-07-27.1-airgap-a', labels: ['semver:patch'], impact: 'patch'},
    {targetBranch: 'main', labels: ['semver:none'], impact: 'none'},
  ])('accepts $impact targeting $targetBranch', options => {
    const actualResult = runPolicyCommand({
      TARGET_BRANCH: options.targetBranch,
      PULL_REQUEST_LABELS_JSON: JSON.stringify(options.labels),
    });

    expect(actualResult.exitCode).toBe(0);
    expect(actualResult.standardOutput).toBe(`Pull request SemVer policy passed: ${options.impact}\n`);
    expect(actualResult.standardError).toBe('');
  });

  it.each([
    {targetBranch: 'main', labels: [], diagnostic: 'no release-impact label'},
    {targetBranch: 'main', labels: ['semver:patch', 'semver:minor'], diagnostic: 'conflicting'},
    {targetBranch: 'release/2026-10-06.1', labels: ['semver:minor'], diagnostic: 'allow only'},
    {targetBranch: 'maintenance/2026-07-27.1-airgap-a', labels: ['semver:major'], diagnostic: 'allow only'},
    {targetBranch: 'feature/example', labels: ['semver:patch'], diagnostic: 'Unsupported'},
  ])('rejects $labels targeting $targetBranch', options => {
    const actualResult = runPolicyCommand({
      TARGET_BRANCH: options.targetBranch,
      PULL_REQUEST_LABELS_JSON: JSON.stringify(options.labels),
    });

    expect(actualResult.exitCode).toBe(1);
    expect(actualResult.standardError).toContain(options.diagnostic);
    expect(actualResult.standardOutput).toBe('');
  });

  it.each<PolicyCommandEnvironment>([
    {},
    {TARGET_BRANCH: 'main'},
    {PULL_REQUEST_LABELS_JSON: '["semver:patch"]'},
    {TARGET_BRANCH: '', PULL_REQUEST_LABELS_JSON: '[]'},
    {TARGET_BRANCH: '  ', PULL_REQUEST_LABELS_JSON: '[]'},
    {TARGET_BRANCH: 'main', PULL_REQUEST_LABELS_JSON: ''},
  ])('rejects missing or empty environment values in %j', environment => {
    const actualResult = runPolicyCommand(environment);

    expect(actualResult.exitCode).toBe(1);
    expect(actualResult.standardError).toContain('Invalid SemVer policy environment');
    expect(actualResult.standardOutput).toBe('');
  });

  it.each(['invalid-json', '["semver:patch"', 'undefined'])('rejects malformed labels JSON %s', labelsJson => {
    const actualResult = runPolicyCommand({TARGET_BRANCH: 'main', PULL_REQUEST_LABELS_JSON: labelsJson});

    expect(actualResult.exitCode).toBe(1);
    expect(actualResult.standardError).toContain('must contain valid JSON');
    expect(actualResult.standardOutput).toBe('');
  });

  it.each(['null', '{}', '"semver:patch"', '[42]', '[{"name":"semver:patch"}]', '["semver:patch",null]'])(
    'rejects labels JSON with an invalid structure: %s',
    labelsJson => {
      const actualResult = runPolicyCommand({TARGET_BRANCH: 'main', PULL_REQUEST_LABELS_JSON: labelsJson});

      expect(actualResult.exitCode).toBe(1);
      expect(actualResult.standardError).toContain('must be an array of strings');
      expect(actualResult.standardOutput).toBe('');
    },
  );

  it('can be imported without executing validation or changing the process exit code', () => {
    const actualResult = spawnSync(
      process.execPath,
      [
        '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
        '--input-type=module',
        '-e',
        `await import(${JSON.stringify(policyEntrypointPath)}); console.log(process.exitCode);`,
      ],
      {encoding: 'utf8', env: {}},
    );

    expect(actualResult.status).toBe(0);
    expect(actualResult.stdout).toBe('undefined\n');
    expect(actualResult.stderr).toBe('');
  });
});
