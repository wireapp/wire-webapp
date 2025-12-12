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
const appConfigPkg = require('../apps/webapp/app-config/package.json');

require('dotenv').config();

/**
 * This script creates a Docker image of "wire-webapp" and uploads it to:
 * https://quay.io/repository/wire/webapp?tab=tags
 *
 * To run this script, you need to have Docker installed (i.e. "Docker Desktop for Mac"). The docker daemon (or Docker for Desktop app) has to be started before running this script. Make sure to set "DOCKER_USERNAME" and "DOCKER_PASSWORD" in your local ".env" file or system environment variables.
 *
 * Note: You must run "yarn build:prod" before creating the Docker image, otherwise the compiled JavaScript code (and other assets) won't be part of the bundle.
 *
 * Demo execution:
 * yarn docker staging '2021-08-25' '1240cfda9e609470cf1154e18f5bc582ca8907ff'
 */

/** Version tag of webapp (e.g. "2023-11-09-staging.0", "dev") */
const versionTag = process.argv[2].replace('/', '-');
const uniqueTagOut = process.argv[3] || '';
/** Commit ID of https://github.com/wireapp/wire-webapp (i.e. "1240cfda9e609470cf1154e18f5bc582ca8907ff") */
const commitSha = process.env.GITHUB_SHA || process.argv[4];
const commitShortSha = commitSha.substring(0, 7);
const dockerRegistryDomain = 'quay.io';
const repository = `${dockerRegistryDomain}/wire/webapp`;

const tags = [];

/** One Docker image can have multiple tags, e.g. "production" (links always to the latest production build) & "2021-08-30-production.0-v0.28.25-0-1240cfd" (links to a fixed production build) */
tags.push(`${repository}:${versionTag}`);

/** Defines which config version (listed in "app-config/package.json") is going to be used */

var configurationEntry;
if (versionTag.includes('production')) {
  configurationEntry = 'wire-web-config-default-master';
} else {
  configurationEntry = 'wire-web-config-default-staging';
}
const configVersion = appConfigPkg.dependencies[configurationEntry].split('#')[1];
const uniqueTag = `${versionTag}-${configVersion}-${commitShortSha}`;
tags.push(`${repository}:${uniqueTag}`);

const dockerCommands = [
  `echo "$DOCKER_PASSWORD" | docker login --username "$DOCKER_USERNAME" --password-stdin ${dockerRegistryDomain}`,
  `docker build . --file apps/server/Dockerfile --tag ${commitShortSha}`,
  `if [ "${uniqueTagOut}" != "" ]; then echo -n "${uniqueTag}" > "${uniqueTagOut}"; fi`,
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
