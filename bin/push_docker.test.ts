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
import {readFileSync} from 'node:fs';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  createUniqueImageTag,
  resolveDockerContextPath,
  runDockerPublication,
  runProcess,
  selectReleaseCommit,
} = require('./push_docker');

describe('push_docker metadata', () => {
  it('prefers the explicit release environment over the caller SHA and argument', () => {
    const actualReleaseCommitSha = selectReleaseCommit({
      releaseCommitSha: 'release-commit-sha',
      commandLineCommitSha: 'argument-commit-sha',
      githubSha: 'caller-commit-sha',
    });

    expect(actualReleaseCommitSha).toBe('release-commit-sha');
  });

  it('uses the explicit release argument before GITHUB_SHA', () => {
    const actualReleaseCommitSha = selectReleaseCommit({
      commandLineCommitSha: 'argument-commit-sha',
      githubSha: 'caller-commit-sha',
    });

    expect(actualReleaseCommitSha).toBe('argument-commit-sha');
  });

  it('falls back to GITHUB_SHA for legacy callers without an explicit release commit', () => {
    const actualReleaseCommitSha = selectReleaseCommit({githubSha: 'caller-commit-sha'});

    expect(actualReleaseCommitSha).toBe('caller-commit-sha');
  });

  it('uses the pull request head commit before GITHUB_SHA for legacy pull request callers', () => {
    const actualReleaseCommitSha = selectReleaseCommit({
      pullRequestCommitSha: 'pull-request-head-sha',
      githubSha: 'caller-commit-sha',
    });

    expect(actualReleaseCommitSha).toBe('pull-request-head-sha');
  });

  it('generates immutable image metadata from the config version and short release commit', () => {
    const actualImageTag = createUniqueImageTag({
      versionTag: '2026-07-15.1-production',
      configurationVersion: 'v0.34.9-0',
      releaseCommitSha: '1234567890abcdef',
    });

    const expectedImageTag = '2026-07-15.1-production-v0.34.9-0-1234567';

    assert.equal(actualImageTag, expectedImageTag);
  });

  it('generates the expected immutable dev image tag', () => {
    const actualImageTag = createUniqueImageTag({
      versionTag: 'dev',
      configurationVersion: 'v0.34.9-0',
      releaseCommitSha: '1234567890abcdef',
    });

    const expectedImageTag = 'dev-v0.34.9-0-1234567';

    assert.equal(actualImageTag, expectedImageTag);
  });

  it('makes the Yarn wrapper executable after artifact download before invoking it', () => {
    const dockerfilePath = path.join(process.cwd(), 'apps/server/Dockerfile');
    const dockerfileContents = readFileSync(dockerfilePath, 'utf8');

    assert.match(
      dockerfileContents,
      /RUN chmod \+x \.\/bin\/yarn && \.\/bin\/yarn workspaces focus @wireapp\/server --production/,
    );
  });

  it('uses the working directory when no custom Docker context is configured', () => {
    const workingDirectory = '/workspace/wire-webapp';

    const actualContextPath = resolveDockerContextPath(undefined, workingDirectory);

    expect(actualContextPath).toBe(workingDirectory);
  });

  it('resolves a relative Docker context inside the working directory', () => {
    const workingDirectory = '/workspace/wire-webapp';

    const actualContextPath = resolveDockerContextPath('distribution-context', workingDirectory);

    expect(actualContextPath).toBe(path.join(workingDirectory, 'distribution-context'));
  });

  it('rejects a Docker context outside the working directory', () => {
    const workingDirectory = '/workspace/wire-webapp';

    assert.throws(
      () => resolveDockerContextPath('../outside', workingDirectory),
      /Docker context path must remain inside the working directory/,
    );
    assert.throws(
      () => resolveDockerContextPath('/tmp/outside', workingDirectory),
      /Docker context path must remain inside the working directory/,
    );
  });

  it('rejects a Docker context containing a null byte', () => {
    assert.throws(
      () => resolveDockerContextPath('distribution\0context', '/workspace/wire-webapp'),
      /Docker context path must not contain null bytes/,
    );
  });

  it('invokes Docker with separate arguments and writes the image tag without a shell', () => {
    const events: Array<Record<string, unknown>> = [];
    const environment = {
      DOCKER_PASSWORD: 'secret-password',
      DOCKER_USERNAME: 'docker-user',
      WIRE_WEBAPP_RELEASE_COMMIT_SHA: '1234567890abcdef',
    };
    const outputPath = '/tmp/production-image-tag.txt';
    const actualImageTag = runDockerPublication(['2026-07-15.1-production', outputPath], environment, {
      runProcess(command: string, commandArguments: string[], processOptions: Record<string, unknown>) {
        events.push({kind: 'process', command, commandArguments, processOptions});
      },
      writeFile(filePath: string, fileContents: string) {
        events.push({kind: 'write', filePath, fileContents});
      },
    });

    const processEvents = events.filter(event => event.kind === 'process');
    const loginEvent = processEvents.find(event => event.commandArguments[0] === 'login');
    const buildEvent = processEvents.find(event => event.commandArguments[0] === 'build');
    const runEvent = processEvents.find(event => event.commandArguments[0] === 'run');
    const tagEvents = processEvents.filter(event => event.commandArguments[0] === 'tag');
    const pushEvents = processEvents.filter(event => event.commandArguments[0] === 'push');
    const writeEvent = events.find(event => event.kind === 'write');

    expect(loginEvent.commandArguments).toEqual(['login', '--username', 'docker-user', '--password-stdin', 'quay.io']);
    expect(loginEvent.processOptions.input).toBe('secret-password\n');
    expect(buildEvent.commandArguments).toEqual([
      'build',
      process.cwd(),
      '--file',
      path.join(process.cwd(), 'apps/server/Dockerfile'),
      '--tag',
      '1234567',
    ]);
    expect(runEvent.commandArguments.slice(0, 6)).toEqual(['run', '--rm', '--entrypoint', 'sh', '1234567', '-c']);
    expect(tagEvents.every(event => event.commandArguments.length === 3)).toBe(true);
    expect(tagEvents.every(event => event.commandArguments[1] === '1234567')).toBe(true);
    expect(pushEvents.every(event => event.commandArguments.length === 2)).toBe(true);
    expect(pushEvents.every(event => typeof event.commandArguments[1] === 'string')).toBe(true);
    expect(events.map(event => event.kind).slice(0, 4)).toEqual(['process', 'process', 'process', 'write']);
    expect(writeEvent).toEqual({kind: 'write', filePath: outputPath, fileContents: actualImageTag});
  });

  it('always disables the shell at the process boundary', () => {
    let actualProcessOptions: Record<string, unknown> | undefined;

    runProcess(
      'docker',
      ['push', 'quay.io/wire/webapp:production'],
      {stdio: 'inherit'},
      (_command: string, _commandArguments: string[], processOptions: Record<string, unknown>) => {
        actualProcessOptions = processOptions;
        return {error: undefined, status: 0};
      },
    );

    expect(actualProcessOptions?.shell).toBe(false);
  });

  it('reports process failures with the executable and status', () => {
    assert.throws(
      () => runProcess('docker', ['push', 'quay.io/wire/webapp:production'], {}, () => ({error: undefined, status: 7})),
      /docker exited with status 7/,
    );
  });

  it('reports process startup errors without exposing unrelated input', () => {
    assert.throws(
      () =>
        runProcess('docker', ['login', '--username', 'docker-user', '--password-stdin', 'quay.io'], {}, () => ({
          error: new Error('not found'),
          status: null,
        })),
      /docker failed with status unknown: not found/,
    );
  });
});
