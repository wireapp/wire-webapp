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
import {spawnSync} from 'node:child_process';
import {chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

const {
  createUniqueImageTag,
  readConfigurationVersion,
  resolveDockerContextPath,
  runDockerPublication,
  runProcess,
  selectWebAppConfigurationEntry,
  selectReleaseCommit,
} = require('./pushDocker');

type DockerPublicationShellExecutionOptions = {
  readonly existingImmutableImage: boolean;
};

type DockerPublicationShellExecution = {
  readonly exitStatus: number | null;
  readonly standardError: string;
  readonly dockerCalls: string;
  readonly githubOutput: string;
  readonly imageTagOutput: string;
};

function runDockerPublicationShell(options: DockerPublicationShellExecutionOptions): DockerPublicationShellExecution {
  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'wire-webapp-docker-publication-'));
  const fakeDockerDirectory = path.join(temporaryDirectory, 'fake-bin');
  const dockerContextDirectory = path.join(temporaryDirectory, 'docker-context');
  const serverDirectory = path.join(dockerContextDirectory, 'apps/server');
  const selectedReleaseDirectory = path.join(temporaryDirectory, 'selected-release');
  const selectedReleaseManifestPath = path.join(selectedReleaseDirectory, 'apps/webapp/app-config/package.json');
  const dockerCallLogPath = path.join(temporaryDirectory, 'docker-calls.txt');
  const dockerBuildMarkerPath = path.join(temporaryDirectory, 'docker-build-complete');
  const githubOutputPath = path.join(temporaryDirectory, 'github-output.txt');
  const imageTagOutputPath = path.join(temporaryDirectory, 'image-tag.txt');
  const fakeDockerPath = path.join(fakeDockerDirectory, 'docker');

  try {
    mkdirSync(fakeDockerDirectory, {recursive: true});
    mkdirSync(serverDirectory, {recursive: true});
    mkdirSync(path.dirname(selectedReleaseManifestPath), {recursive: true});
    writeFileSync(path.join(serverDirectory, 'Dockerfile'), 'FROM scratch\n');
    writeFileSync(
      selectedReleaseManifestPath,
      JSON.stringify({
        dependencies: {
          'wire-web-config-default-master': 'https://github.com/wireapp/wire-web-config-wire#v0.12.4-0',
        },
      }),
    );
    writeFileSync(
      fakeDockerPath,
      [
        '#!/usr/bin/env bash',
        'set -euo pipefail',
        'printf "%s\\n" "$*" >> "${DOCKER_CALL_LOG}"',
        'if [[ "$1" == "manifest" ]]; then',
        '  if [[ "${DOCKER_IMAGE_EXISTS}" == "true" || -f "${DOCKER_BUILD_MARKER}" ]]; then',
        '    exit 0',
        '  fi',
        '  exit 1',
        'fi',
        'if [[ "$1" == "build" ]]; then',
        '  touch "${DOCKER_BUILD_MARKER}"',
        'fi',
      ].join('\n'),
    );
    chmodSync(fakeDockerPath, 0o755);

    const publishScriptPath = path.join(process.cwd(), 'tools/dockerPublication/publishProductionDocker.sh');
    const processResult = spawnSync('bash', [publishScriptPath], {
      cwd: temporaryDirectory,
      encoding: 'utf8',
      env: {
        ...process.env,
        DOCKER_CALL_LOG: dockerCallLogPath,
        DOCKER_BUILD_MARKER: dockerBuildMarkerPath,
        DOCKER_IMAGE_EXISTS: options.existingImmutableImage ? 'true' : 'false',
        DOCKER_PASSWORD: 'test-password',
        DOCKER_REPOSITORY: 'quay.io/wire/webapp',
        DOCKER_USERNAME: 'test-user',
        GITHUB_OUTPUT: githubOutputPath,
        PRODUCTION_IMAGE_TAG_OUTPUT_PATH: imageTagOutputPath,
        PRODUCTION_TAG: '2026-07-15.1-production',
        RELEASE_COMMIT_SHA: '1234567890abcdef',
        WIRE_WEBAPP_CONFIG_MANIFEST_PATH: selectedReleaseManifestPath,
        WIRE_WEBAPP_DOCKER_CONTEXT_PATH: 'docker-context',
        WIRE_WEBAPP_RELEASE_COMMIT_SHA: '1234567890abcdef',
        PATH: `${fakeDockerDirectory}${path.delimiter}${process.env.PATH}`,
      },
    });

    if (processResult.status !== 0) {
      throw new Error(`Production Docker publication script failed: ${processResult.stdout}${processResult.stderr}`);
    }

    return {
      exitStatus: processResult.status,
      standardError: processResult.stderr,
      dockerCalls: readFileSync(dockerCallLogPath, 'utf8'),
      githubOutput: readFileSync(githubOutputPath, 'utf8'),
      imageTagOutput:
        processResult.status === 0 && !options.existingImmutableImage ? readFileSync(imageTagOutputPath, 'utf8') : '',
    };
  } finally {
    rmSync(temporaryDirectory, {recursive: true, force: true});
  }
}

type ProcessEvent =
  | {
      kind: 'process';
      command: string;
      commandArguments: string[];
      processOptions: Record<string, unknown>;
    }
  | {
      kind: 'write';
      filePath: string;
      fileContents: string;
    };

describe('pushDocker metadata', () => {
  it('selects production configuration for a stable SemVer Production tag', () => {
    const actualConfigurationEntry = selectWebAppConfigurationEntry('v1.1.0', 'v1.1.0');

    expect(actualConfigurationEntry).toBe('wire-web-config-default-master');
  });

  it('preserves production configuration selection for legacy Production tags', () => {
    const actualConfigurationEntry = selectWebAppConfigurationEntry('2026-10-06.1-production', undefined);

    expect(actualConfigurationEntry).toBe('wire-web-config-default-master');
  });

  it('keeps Beta tags on staging configuration', () => {
    const actualConfigurationEntry = selectWebAppConfigurationEntry('v1.1.0-beta.1', undefined);

    expect(actualConfigurationEntry).toBe('wire-web-config-default-staging');
  });

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

  it('reads the configuration version from the selected release manifest', () => {
    const selectedReleaseManifestPath = '/workspace/selected-release/apps/webapp/app-config/package.json';
    const selectedReleaseManifestContents = JSON.stringify({
      dependencies: {
        'wire-web-config-default-master': 'https://github.com/wireapp/wire-web-config-wire#v0.12.4-0',
      },
    });

    const actualConfigurationVersion = readConfigurationVersion({
      configurationEntry: 'wire-web-config-default-master',
      configurationManifestPath: selectedReleaseManifestPath,
      readFile(filePath: string, encoding: 'utf8') {
        expect(filePath).toBe(selectedReleaseManifestPath);
        expect(encoding).toBe('utf8');

        return selectedReleaseManifestContents;
      },
    });

    expect(actualConfigurationVersion).toBe('v0.12.4-0');
  });

  it('keeps the existing image tag when the selected release and tooling versions match', () => {
    const configurationManifestPath = path.join(process.cwd(), 'apps/webapp/app-config/package.json');
    const actualConfigurationVersion = readConfigurationVersion({
      configurationEntry: 'wire-web-config-default-master',
      configurationManifestPath,
    });

    const actualImageTag = createUniqueImageTag({
      versionTag: '2026-07-15.1-production',
      configurationVersion: actualConfigurationVersion,
      releaseCommitSha: '1234567890abcdef',
    });

    expect(actualConfigurationVersion).toBe('v0.34.9-0');
    expect(actualImageTag).toBe('2026-07-15.1-production-v0.34.9-0-1234567');
  });

  it('fails clearly when selected release configuration metadata is missing', () => {
    const configurationManifestPath = '/workspace/selected-release/apps/webapp/app-config/package.json';

    expect(() => {
      return readConfigurationVersion({
        configurationEntry: 'wire-web-config-default-master',
        configurationManifestPath,
        readFile() {
          throw new Error('ENOENT');
        },
      });
    }).toThrow(`Failed to read WebApp configuration manifest at ${configurationManifestPath}: ENOENT`);
  });

  it.each([
    ['invalid JSON', '{'],
    ['missing configuration dependency', JSON.stringify({dependencies: {}})],
    [
      'missing Git reference',
      JSON.stringify({dependencies: {'wire-web-config-default-master': 'https://example.com/repo'}}),
    ],
    [
      'empty Git reference',
      JSON.stringify({dependencies: {'wire-web-config-default-master': 'https://example.com/repo#'}}),
    ],
  ])('fails clearly when selected release configuration metadata is malformed: %s', (_, manifestContents) => {
    const configurationManifestPath = '/workspace/selected-release/apps/webapp/app-config/package.json';

    expect(() => {
      return readConfigurationVersion({
        configurationEntry: 'wire-web-config-default-master',
        configurationManifestPath,
        readFile() {
          return manifestContents;
        },
      });
    }).toThrow(configurationManifestPath);
  });

  it('installs only the server production workspace from the npm lockfile', () => {
    const dockerfilePath = path.join(process.cwd(), 'apps/server/Dockerfile');
    const dockerfileContents = readFileSync(dockerfilePath, 'utf8');

    assert.match(dockerfileContents, /COPY package\.json package-lock\.json \.npmrc \.\//);
    assert.match(dockerfileContents, /COPY apps\/server\/package\.json \.\/apps\/server\/package\.json/);
    assert.match(dockerfileContents, /COPY libraries\/config\/package\.json \.\/libraries\/config\/package\.json/);
    assert.match(
      dockerfileContents,
      /RUN npm clean-install --omit=dev --workspace=@wireapp\/server --include-workspace-root=false --ignore-scripts/,
    );
    assert.doesNotMatch(dockerfileContents, /yarn|YARN/);
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

    assert.throws(() => {
      return resolveDockerContextPath('../outside', workingDirectory);
    }, /Docker context path must remain inside the working directory/);
    assert.throws(() => {
      return resolveDockerContextPath('/tmp/outside', workingDirectory);
    }, /Docker context path must remain inside the working directory/);
  });

  it('rejects a Docker context containing a null byte', () => {
    assert.throws(() => {
      return resolveDockerContextPath('distribution\0context', '/workspace/wire-webapp');
    }, /Docker context path must not contain null bytes/);
  });

  it('invokes Docker with separate arguments and writes the image tag without a shell', () => {
    const events: ProcessEvent[] = [];
    const environment = {
      DOCKER_PASSWORD: 'secret-password',
      DOCKER_USERNAME: 'docker-user',
      WIRE_WEBAPP_RELEASE_COMMIT_SHA: '1234567890abcdef',
      WIRE_WEBAPP_CONFIG_MANIFEST_PATH: '/workspace/selected-release/apps/webapp/app-config/package.json',
    };
    const outputPath = '/tmp/production-image-tag.txt';
    const actualImageTag = runDockerPublication({
      commandLineArguments: ['2026-07-15.1-production', outputPath],
      environment,
      dependencies: {
        readFile(filePath: string, encoding: 'utf8') {
          expect(filePath).toBe(environment.WIRE_WEBAPP_CONFIG_MANIFEST_PATH);
          expect(encoding).toBe('utf8');

          return JSON.stringify({
            dependencies: {
              'wire-web-config-default-master': 'https://github.com/wireapp/wire-web-config-wire#v0.12.4-0',
            },
          });
        },
        runProcess(command: string, commandArguments: string[], processOptions: Record<string, unknown>) {
          events.push({kind: 'process', command, commandArguments, processOptions});
        },
        writeFile(filePath: string, fileContents: string) {
          events.push({kind: 'write', filePath, fileContents});
        },
      },
    });

    const processEvents = events.filter((event): event is Extract<ProcessEvent, {kind: 'process'}> => {
      return event.kind === 'process';
    });
    const loginEvent = processEvents.find(event => {
      return event.commandArguments[0] === 'login';
    });
    const buildEvent = processEvents.find(event => {
      return event.commandArguments[0] === 'build';
    });
    const runEvent = processEvents.find(event => {
      return event.commandArguments[0] === 'run';
    });
    const tagEvents = processEvents.filter(event => {
      return event.commandArguments[0] === 'tag';
    });
    const pushEvents = processEvents.filter(event => {
      return event.commandArguments[0] === 'push';
    });
    const writeEvent = events.find(event => {
      return event.kind === 'write';
    });

    assert.ok(loginEvent);
    assert.ok(buildEvent);
    assert.ok(runEvent);
    assert.ok(writeEvent);

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
    expect(
      tagEvents.every(event => {
        return event.commandArguments.length === 3;
      }),
    ).toBe(true);
    expect(
      tagEvents.every(event => {
        return event.commandArguments[1] === '1234567';
      }),
    ).toBe(true);
    expect(
      tagEvents.map(event => {
        return event.commandArguments[2];
      }),
    ).toEqual([
      'quay.io/wire/webapp:2026-07-15.1-production',
      'quay.io/wire/webapp:2026-07-15.1-production-v0.12.4-0-1234567',
    ]);
    expect(
      pushEvents.every(event => {
        return event.commandArguments.length === 2;
      }),
    ).toBe(true);
    expect(
      pushEvents.every(event => {
        return typeof event.commandArguments[1] === 'string';
      }),
    ).toBe(true);
    expect(
      events
        .map(event => {
          return event.kind;
        })
        .slice(0, 4),
    ).toEqual(['process', 'process', 'process', 'write']);
    expect(writeEvent).toEqual({kind: 'write', filePath: outputPath, fileContents: actualImageTag});
  });

  it('uses the selected release image tag for both reuse and new image creation', () => {
    const expectedImageTag = '2026-07-15.1-production-v0.12.4-0-1234567';
    const immutableImageReference = `quay.io/wire/webapp:${expectedImageTag}`;

    const reuseExecution = runDockerPublicationShell({existingImmutableImage: true});
    const buildExecution = runDockerPublicationShell({existingImmutableImage: false});

    expect(reuseExecution.exitStatus).toBe(0);
    expect(reuseExecution.dockerCalls).toContain(`manifest inspect ${immutableImageReference}`);
    expect(reuseExecution.dockerCalls).toContain(`pull ${immutableImageReference}`);
    expect(reuseExecution.dockerCalls).toContain(
      `tag ${immutableImageReference} quay.io/wire/webapp:2026-07-15.1-production`,
    );
    expect(reuseExecution.dockerCalls).not.toContain('build ');
    expect(reuseExecution.githubOutput).toContain(`docker_image_tag=${expectedImageTag}`);

    expect(buildExecution.exitStatus).toBe(0);
    expect(buildExecution.standardError).toBe('');
    expect(buildExecution.dockerCalls).toContain(`manifest inspect ${immutableImageReference}`);
    expect(buildExecution.dockerCalls).toContain(`tag 1234567 ${immutableImageReference}`);
    expect(buildExecution.dockerCalls).toContain(`push ${immutableImageReference}`);
    expect(buildExecution.imageTagOutput).toBe(expectedImageTag);
    expect(buildExecution.githubOutput).toContain(`docker_image_tag=${expectedImageTag}`);
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
    assert.throws(() => {
      return runProcess('docker', ['push', 'quay.io/wire/webapp:production'], {}, () => {
        return {error: undefined, status: 7};
      });
    }, /docker exited with status 7/);
  });

  it('reports process startup errors without exposing unrelated input', () => {
    assert.throws(() => {
      return runProcess('docker', ['login', '--username', 'docker-user', '--password-stdin', 'quay.io'], {}, () => {
        return {
          error: new Error('not found'),
          status: null,
        };
      });
    }, /docker failed with status unknown: not found/);
  });
});
