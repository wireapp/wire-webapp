#!/usr/bin/env node

/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

const child = require('child_process');
const nodeFileSystem = require('fs');
const path = require('path');
const appConfigPkg = require('../apps/webapp/app-config/package.json');

require('dotenv').config({quiet: true});

/**
 * This script creates a Docker image of "wire-webapp" and uploads it to:
 * https://quay.io/repository/wire/webapp?tab=tags
 *
 * To run this script, you need to have Docker installed (i.e. "Docker Desktop for Mac"). The docker daemon (or Docker for Desktop app) has to be started before running this script. Make sure to set "DOCKER_USERNAME" and "DOCKER_PASSWORD" in your local ".env" file or system environment variables.
 *
 * Note: You must run "./bin/yarn nx run server:package" from the repository root before creating the Docker image, otherwise the compiled JavaScript code (and other assets) won't be part of the bundle.
 *
 * Demo execution:
 * ./bin/yarn docker staging '2021-08-25' '1240cfda9e609470cf1154e18f5bc582ca8907ff'
 * ./bin/yarn docker staging '2021-08-25' '1240cfda9e609470cf1154e18f5bc582ca8907ff' --pr
 */

function selectReleaseCommit({releaseCommitSha, commandLineCommitSha, pullRequestCommitSha, githubSha}) {
  return releaseCommitSha || commandLineCommitSha || pullRequestCommitSha || githubSha;
}

function createUniqueImageTag({versionTag, configurationVersion, releaseCommitSha}) {
  return versionTag.replace('/', '-') + '-' + configurationVersion + '-' + releaseCommitSha.substring(0, 7);
}

function runProcess(command, commandArguments, processOptions, spawnProcess = child.spawnSync) {
  const result = spawnProcess(command, commandArguments, {
    ...processOptions,
    shell: false,
  });

  if (result.error) {
    throw new Error(`${command} failed with status ${result.status ?? 'unknown'}: ${result.error.message}`, {
      cause: result.error,
    });
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }

  return result;
}

function getCurrentCommitSha() {
  return child.execFileSync('git', ['rev-parse', 'HEAD']).toString().trim();
}

function resolveDockerContextPath(configuredPath, workingDirectory) {
  if (!configuredPath) {
    return workingDirectory;
  }

  if (configuredPath.includes('\0')) {
    throw new Error('Docker context path must not contain null bytes');
  }

  const resolvedWorkingDirectory = path.resolve(workingDirectory);
  const resolvedDockerContextPath = path.resolve(resolvedWorkingDirectory, configuredPath);
  const relativeDockerContextPath = path.relative(resolvedWorkingDirectory, resolvedDockerContextPath);
  const escapesWorkingDirectory =
    relativeDockerContextPath === '..' ||
    relativeDockerContextPath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeDockerContextPath);

  if (escapesWorkingDirectory) {
    throw new Error('Docker context path must remain inside the working directory');
  }

  return resolvedDockerContextPath;
}

function requireDockerBuildPaths(dockerContextPath, dockerfilePath) {
  if (!nodeFileSystem.existsSync(dockerContextPath)) {
    throw new Error(`Docker context directory does not exist: ${dockerContextPath}`);
  }

  if (!nodeFileSystem.statSync(dockerContextPath).isDirectory()) {
    throw new Error(`Docker context path is not a directory: ${dockerContextPath}`);
  }

  if (!nodeFileSystem.existsSync(dockerfilePath)) {
    throw new Error(`Dockerfile does not exist: ${dockerfilePath}`);
  }

  if (!nodeFileSystem.statSync(dockerfilePath).isFile()) {
    throw new Error(`Dockerfile path is not a file: ${dockerfilePath}`);
  }
}

function writeImageTag(outputPath, imageTag) {
  if (outputPath) {
    nodeFileSystem.writeFileSync(outputPath, imageTag);
  }
}

function runDockerPublication(
  commandLineArguments,
  environment,
  {
    runProcess: executeProcess = runProcess,
    getCurrentCommitSha: readCurrentCommitSha = getCurrentCommitSha,
    writeFile = writeImageTag,
  } = {},
) {
  /** Version tag of webapp (e.g. "2023-11-09-staging.0", "dev", "pr-123") */
  const versionTag = commandLineArguments[0].replace('/', '-');
  const uniqueTagOut = commandLineArguments[1] || '';
  /** Flag to indicate if this is a PR build */
  const isPullRequest = commandLineArguments.includes('--pr');
  const commandLineCommitSha = commandLineArguments[2]?.startsWith('--') ? undefined : commandLineArguments[2];
  /** Commit ID of https://github.com/wireapp/wire-webapp (i.e. "1240cfda9e609470cf1154e18f5bc582ca8907ff") */
  const releaseCommitSha = selectReleaseCommit({
    releaseCommitSha: environment.WIRE_WEBAPP_RELEASE_COMMIT_SHA,
    commandLineCommitSha,
    pullRequestCommitSha:
      isPullRequest && !environment.WIRE_WEBAPP_RELEASE_COMMIT_SHA && !commandLineCommitSha
        ? readCurrentCommitSha()
        : undefined,
    githubSha: environment.GITHUB_SHA,
  });
  const printImageTagOnly = commandLineArguments.includes('--print-image-tag');

  if (!releaseCommitSha) {
    throw new Error(
      'A release commit SHA is required through WIRE_WEBAPP_RELEASE_COMMIT_SHA, an argument, or GITHUB_SHA',
    );
  }

  const commitShortSha = releaseCommitSha.substring(0, 7);
  const dockerRegistryDomain = 'quay.io';
  const repository = dockerRegistryDomain + '/wire/webapp';
  const containerImageTags = [];
  const requiredEnvironmentDefaultKeys = [
    'BACKEND_NAME',
    'BRAND_NAME',
    'URL_ACCOUNT_BASE',
    'BACKEND_REST',
    'BACKEND_WS',
  ];
  const environmentDefaultsSmokeCheckCommand = [
    'test -s /dist/.env.defaults',
    ...requiredEnvironmentDefaultKeys.map(requiredEnvironmentDefaultKey => {
      return 'grep -q "^' + requiredEnvironmentDefaultKey + '=" /dist/.env.defaults';
    }),
  ].join(' && ');

  /** Defines which config version (listed in "app-config/package.json") is going to be used */
  const configurationEntry = versionTag.includes('production')
    ? 'wire-web-config-default-master'
    : 'wire-web-config-default-staging';
  const configurationVersion = appConfigPkg.dependencies[configurationEntry].split('#')[1];
  const uniqueImageTag = createUniqueImageTag({versionTag, configurationVersion, releaseCommitSha});

  if (printImageTagOnly) {
    console.log(uniqueImageTag);
    return uniqueImageTag;
  }

  /** One Docker image can have multiple tags, e.g. "production" (links always to the latest production build) & "2021-08-30-production.0-v0.28.25-0-1240cfd" (links to a fixed production build) */
  containerImageTags.push(repository + ':' + versionTag);

  if (!isPullRequest) {
    containerImageTags.push(repository + ':' + uniqueImageTag);
  }

  if (isPullRequest) {
    containerImageTags.push(repository + ':' + versionTag + '-' + commitShortSha);
  }

  const dockerUsername = environment.DOCKER_USERNAME;
  const dockerPassword = environment.DOCKER_PASSWORD;
  if (!dockerUsername || !dockerPassword) {
    throw new Error('DOCKER_USERNAME and DOCKER_PASSWORD are required');
  }

  const dockerContextPath = resolveDockerContextPath(environment.WIRE_WEBAPP_DOCKER_CONTEXT_PATH, process.cwd());
  const dockerfilePath = path.join(dockerContextPath, 'apps/server/Dockerfile');
  requireDockerBuildPaths(dockerContextPath, dockerfilePath);

  executeProcess('docker', ['login', '--username', dockerUsername, '--password-stdin', dockerRegistryDomain], {
    env: environment,
    input: `${dockerPassword}\n`,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  executeProcess('docker', ['build', dockerContextPath, '--file', dockerfilePath, '--tag', commitShortSha], {
    stdio: 'inherit',
    env: environment,
  });
  executeProcess(
    'docker',
    ['run', '--rm', '--entrypoint', 'sh', commitShortSha, '-c', environmentDefaultsSmokeCheckCommand],
    {stdio: 'inherit', env: environment},
  );
  writeFile(uniqueTagOut, uniqueImageTag);

  containerImageTags.forEach(containerImageTagValue => {
    executeProcess('docker', ['tag', commitShortSha, containerImageTagValue], {
      stdio: 'inherit',
      env: environment,
    });
    executeProcess('docker', ['push', containerImageTagValue], {
      stdio: 'inherit',
      env: environment,
    });
  });

  executeProcess('docker', ['logout', dockerRegistryDomain], {
    stdio: 'inherit',
    env: environment,
  });

  return uniqueImageTag;
}

if (require.main === module) {
  runDockerPublication(process.argv.slice(2), process.env);
}

module.exports = {
  createUniqueImageTag,
  resolveDockerContextPath,
  runDockerPublication,
  runProcess,
  selectReleaseCommit,
};
