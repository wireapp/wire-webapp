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

const distributionParam = process.argv[2] || '';
const stageParam = process.argv[3] || '';
const versionParam = process.argv[4] || '';
const commitSha = process.env.GITHUB_SHA || 'COMMIT_ID';
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
