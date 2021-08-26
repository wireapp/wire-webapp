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

require('dotenv').config();

/**
 * This script creates a Docker image of "wire-webapp" and uploads it to:
 * https://quay.io/repository/wire/webapp?tab=tags
 *
 * To run this script, you need to have Docker installed (i.e. "Docker Desktop for Mac"). The docker deamon (or Docker for Desktop app) has to be started before running this script.
 *
 * Demo execution:
 * yarn docker '' staging '2021-08-25' '1240cfda9e609470cf1154e18f5bc582ca8907ff'
 */

/** Either empty (for our own cloud releases) or a suffix (i.e. '-ey') for custom deployments */
const distributionParam = process.argv[2] || '';
/** Either 'staging' (for internal releases / staging bumps) or 'production' (for cloud releases) */
const stageParam = process.argv[3] || '';
/** Version tag of webapp (i.e. "2021-08-25") */
const versionParam = process.argv[4] || '';
/** Commit ID of https://github.com/wireapp/wire-webapp (i.e. "1240cfda9e609470cf1154e18f5bc582ca8907ff") */
const commitSha = process.env.GITHUB_SHA || process.argv[5];
const commitShortSha = commitSha.substring(0, 7);
const configurationEntry = `wire-web-config-default-${
  distributionParam || stageParam === 'production' ? 'master' : 'staging'
}`;
const configVersion = appConfigPkg.dependencies[configurationEntry].split('#')[1];
const dockerRegistryDomain = 'quay.io';
const repository = `${dockerRegistryDomain}/wire/webapp${distributionParam ? `-${distributionParam}` : ''}`;

const tags = [];
if (stageParam) {
  tags.push(`${repository}:${stageParam}`);
}
if (stageParam === 'production') {
  tags.push(`${repository}:${versionParam}-${configVersion}-${commitShortSha}`);
}

const dockerCommands = [
  `echo "$DOCKER_PASSWORD" | docker login --username "$DOCKER_USERNAME" --password-stdin ${dockerRegistryDomain}`,
  `docker build . --tag ${commitShortSha}`,
];

tags.forEach(containerImageTagValue => {
  dockerCommands.push(
    `docker tag ${commitShortSha} ${containerImageTagValue}`,
    `docker push ${containerImageTagValue}`,
  );
});

dockerCommands.push(`docker logout ${dockerRegistryDomain}`);

dockerCommands.forEach(command => {
  child.execSync(command, {stdio: 'inherit'});
});
