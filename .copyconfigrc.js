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

const pkg = require('./package.json');
const appConfigPkg = require('./app-config/package.json');
const {execSync} = require('child_process');

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
  let currentBranch = '';
  let currentTag = '';

  try {
    currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  } catch (error) {}
  try {
    currentTag = execSync('git tag -l --points-at HEAD').toString().trim();
  } catch (error) {}

  switch (currentBranch) {
    case 'dev': {
      // On staging bump use production config
      if (currentTag.includes('staging')) {
        console.log(`Selecting configuration "master" (reason: branch "${currentBranch}" & tag "${currentTag}")`);
        return 'master';
      }
      // When merging master back to dev with the last commit being a production release tag
      // And for all other cases
      console.log(`Selecting configuration "staging" (reason: branch "${currentBranch}")`);
      return 'staging';
    }
    case 'master': {
      // On production release use production config
      if (currentTag.includes('production')) {
        console.log(`Selecting configuration "master" (reason: branch "${currentBranch}" & tag "${currentTag}")`);
        return 'master';
      }
      // When merging dev into master with the last commit being a staging bump tag
      // And for all other cases
      console.log(`Selecting configuration "staging" (reason: branch "${currentBranch}")`);
      return 'staging';
    }
    default: {
      console.log('Selecting configuration "staging" (reason: default)');
      return 'staging';
    }
  }
};

const configurationEntry = `wire-web-config-default-${selectConfiguration()}`;
const repositoryUrl = appConfigPkg.dependencies[configurationEntry];

console.log('Repo URL', repositoryUrl);

module.exports = {
  files: {
    [`${pkg.name}/content/**`]: 'resource/',
    [`${pkg.name}/.env.defaults`]: `${__dirname}/.env.defaults`,
  },
  repositoryUrl,
};
