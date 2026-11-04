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

import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import process from 'node:process';

function attemptWireBuildsUpdate(targetBranchName: string, workingDirectory = process.cwd()): string {
  const updateScriptPath = path.join(process.cwd(), 'tools/wireBuilds/updateWireBuilds.sh');

  return execFileSync('bash', [updateScriptPath], {
    encoding: 'utf8',
    cwd: workingDirectory,
    env: {
      ...process.env,
      DOCKER_IMAGE_TAG: 'maintenance-image-1234567',
      GITHUB_OUTPUT: path.join(workingDirectory, 'github-output'),
      HELM_CHART_VERSION: '0.8.0-pre.3175',
      RELEASE_COMMIT_SHA: '1234567890abcdef1234567890abcdef12345678',
      WIRE_BUILDS_ALLOW_CUSTOM_BRANCHES: 'true',
      WIRE_BUILDS_TARGET_BRANCH: targetBranchName,
    },
  });
}

describe('maintenance wire-builds publication boundary', () => {
  it.each(['main', 'dev', 'bad..branch'])(
    'rejects protected or invalid wire-builds/%s before modifying the branch',
    targetBranchName => {
      expect(() => {
        attemptWireBuildsUpdate(targetBranchName);
      }).toThrow();
    },
  );

  it('rejects an incompatible top-level version before changing build.json', () => {
    const workingDirectory = mkdtempSync(path.join(tmpdir(), 'wire-builds-maintenance-'));
    const buildJsonPath = path.join(workingDirectory, 'build.json');
    const initialBuildJson = JSON.stringify(
      {
        version: '2026.09.0',
        helmCharts: {
          webapp: {
            repo: 'https://s3-eu-west-1.amazonaws.com/public.wire.com/charts-webapp',
            version: '0.8.0-pre.3713',
          },
        },
        unrelatedMetadata: {owner: 'integration'},
      },
      null,
      2,
    );
    writeFileSync(buildJsonPath, `${initialBuildJson}\n`);

    try {
      expect(() => {
        attemptWireBuildsUpdate('customers/gov-2027', workingDirectory);
      }).toThrow('must be a SemVer version');

      const actualBuildJson = readFileSync(buildJsonPath, 'utf8');
      const expectedBuildJson = `${initialBuildJson}\n`;
      expect(actualBuildJson).toBe(expectedBuildJson);
    } finally {
      rmSync(workingDirectory, {recursive: true, force: true});
    }
  });

  it('reuses an exact legacy S3 distribution without changing build.json or adding a commit', () => {
    const workingDirectory = mkdtempSync(path.join(tmpdir(), 'wire-builds-maintenance-'));
    const buildJsonPath = path.join(workingDirectory, 'build.json');
    const releaseCommitSha = '1234567890abcdef1234567890abcdef12345678';
    const initialBuildJson = JSON.stringify(
      {
        version: '1.0.0-174',
        helmCharts: {
          webapp: {
            repo: 'https://s3-eu-west-1.amazonaws.com/public.wire.com/charts-webapp',
            version: '0.8.0-pre.3175',
            meta: {
              appVersion: 'maintenance-image-1234567',
              commitURL: `https://github.com/wireapp/wire-webapp/commit/${releaseCommitSha}`,
              commit: releaseCommitSha,
            },
          },
          backend: {repo: 'https://charts.example.invalid/backend', version: '3.2.1'},
        },
        unrelatedMetadata: {owner: 'integration'},
      },
      null,
      2,
    );
    writeFileSync(buildJsonPath, `${initialBuildJson}\n`);

    try {
      execFileSync('git', ['init', '--quiet', '-b', 'customers/gov-2027'], {cwd: workingDirectory});
      execFileSync('git', ['config', 'user.email', 'test@example.invalid'], {cwd: workingDirectory});
      execFileSync('git', ['config', 'user.name', 'Maintenance test'], {cwd: workingDirectory});
      execFileSync('git', ['add', 'build.json'], {cwd: workingDirectory});
      execFileSync('git', ['-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Create distribution metadata'], {
        cwd: workingDirectory,
      });
      const initialCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: workingDirectory,
        encoding: 'utf8',
      }).trim();

      const actualUpdateOutput = attemptWireBuildsUpdate('customers/gov-2027', workingDirectory);
      const actualBuildJson = readFileSync(buildJsonPath, 'utf8');
      const actualCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: workingDirectory,
        encoding: 'utf8',
      }).trim();

      expect(actualUpdateOutput).toContain('already contains the exact WebApp distribution fields');
      expect(actualBuildJson).toBe(`${initialBuildJson}\n`);
      expect(actualCommit).toBe(initialCommit);
    } finally {
      rmSync(workingDirectory, {recursive: true, force: true});
    }
  });
});
