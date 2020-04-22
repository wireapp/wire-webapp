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
const appConfigPkg = require('../app-config/package.json');
const pkg = require('../package.json');
const {execSync} = require('child_process');

require('dotenv').config();

let currentBranch = '';

try {
  currentBranch = execSync('git rev-parse HEAD').toString().trim();
} catch (error) {}

const distributionParam = process.argv[2];
const stageParam = process.argv[3];
const suffix = distributionParam ? `-${distributionParam}` : '';
const stage = stageParam ? `-${stageParam}` : '';
const buildCounter = process.env.TRAVIS_BUILD_NUMBER || 'BUILD_NUMBER';
const commitSha = process.env.TRAVIS_COMMIT || 'COMMIT_ID';
const commitShaLength = 7;
const commitShortSha = commitSha.substring(0, commitShaLength - 1);
const configurationEntry = suffix
  ? `wire-web-config-default${suffix}`
  : `wire-web-config-default${currentBranch === 'master' ? '-master' : '-staging'}`;
const dependencies = {
  ...appConfigPkg.dependencies,
  ...appConfigPkg.devDependencies,
  ...appConfigPkg.peerDependencies,
  ...appConfigPkg.optionalDependencies,
};

const configVersion = dependencies[configurationEntry].split('#')[1];
const dockerRegistryDomain = 'quay.io';
const repository = `${dockerRegistryDomain}/wire/webapp${suffix}`;

const dockerImageTag = `${repository}:${buildCounter}-${pkg.version}-${commitShortSha}-${configVersion}${stage}`;
const dockerImageStageTag = stageParam ? `${repository}:${stageParam}` : '';

const dockerCommands = [
  `echo "$DOCKER_PASSWORD" | docker login --username "$DOCKER_USERNAME" --password-stdin ${dockerRegistryDomain}`,
  `docker build . -t ${dockerImageTag} ${dockerImageStageTag ? `-t ${dockerImageStageTag}` : ''}`,
  `docker push ${dockerImageTag}`,
];

if (dockerImageStageTag) {
  dockerCommands.push(`docker push ${dockerImageStageTag}`);
}

dockerCommands.push(`docker logout ${dockerRegistryDomain}`);

dockerCommands.forEach(command => {
  child.execSync(command, {stdio: 'inherit'});
});
