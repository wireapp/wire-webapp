/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

const path = require('path');

const rootDir = path.join(__dirname, '..', '..');
const pkg = require(path.join(rootDir, 'package.json'));
const appConfigPkg = require('./app-config/package.json');
const {execSync} = require('child_process');
require('dotenv').config();

/**
 * Selects configuration based on current branch and tagged commits
 * @returns {string} the configuration name
 */
const selectConfiguration = () => {
  const distribution = process.env.DISTRIBUTION !== 'wire' && process.env.DISTRIBUTION;
  if (distribution) {
    console.log(`Selecting configuration "${distribution}" (reason: custom distribution)`);
    return distribution;
  }
  let currentTag = '';
  try {
    currentTag = execSync('git tag -l --points-at HEAD').toString().trim();
  } catch (error) {}

  if (currentTag.includes('staging') || currentTag.includes('production')) {
    console.log(`Selecting configuration "master" (reason: tag "${currentTag}")`);
    return 'master';
  }

  console.log('Selecting configuration "staging" (reason: default)');
  return 'staging';
};

let repositoryUrl;
const forcedConfigUrl = process.env.FORCED_CONFIG_URL;
if (forcedConfigUrl) {
  console.log(`Selecting configuration "${forcedConfigUrl}" (reason: forced config URL)`);
  repositoryUrl = forcedConfigUrl;
} else {
  const configurationEntry = `wire-web-config-default-${selectConfiguration()}`;
  repositoryUrl = appConfigPkg.dependencies[configurationEntry];
}

console.log('Repo URL', repositoryUrl);

module.exports = {
  files: {
    [`${pkg.name}/content/**`]: 'resource/',
    [`${pkg.name}/.env.defaults`]: path.join(rootDir, '.env.defaults'),
  },
  repositoryUrl,
};
