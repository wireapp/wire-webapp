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

const {execSync} = require('child_process');
const path = require('path');

const rootDir = path.join(__dirname, '..', '..');
const pkg = require(path.join(rootDir, 'package.json'));
const appConfigPkg = require('./app-config/package.json');

const {selectConfiguration} = require('./configuration-selection');
require('dotenv').config({quiet: true});

/**
 * Reads the tag at HEAD for the compatibility fallback.
 * @returns {string} the tag at HEAD, or an empty string when Git is unavailable
 */
function readCurrentTag() {
  try {
    return execSync('git tag -l --points-at HEAD').toString().trim();
  } catch (error) {
    return '';
  }
}

const forcedConfigUrl = process.env.FORCED_CONFIG_URL;
const configurationSelection = selectConfiguration({
  forcedConfigUrl,
  distribution: process.env.DISTRIBUTION,
  webappConfiguration: process.env.WIRE_WEBAPP_CONFIGURATION,
  currentTag: readCurrentTag(),
});
const selectedLegacyDependencyKey =
  configurationSelection.configurationDependencyKey === undefined
    ? 'not applicable (forced URL)'
    : configurationSelection.configurationDependencyKey;

const configurationSelectionLog = `Configuration selection: semantic profile "${configurationSelection.semanticProfile}", selected legacy dependency key "${selectedLegacyDependencyKey}", selection reason: ${configurationSelection.selectionReason}`;
console.info(configurationSelectionLog);

const repositoryUrl =
  configurationSelection.repositoryUrl === undefined
    ? appConfigPkg.dependencies[configurationSelection.configurationDependencyKey]
    : configurationSelection.repositoryUrl;
const repositoryUrlForLog =
  configurationSelection.repositoryUrl === undefined ? repositoryUrl : 'provided by FORCED_CONFIG_URL (redacted)';

console.info(`Resolved repository URL: ${repositoryUrlForLog}`);

module.exports = {
  files: {
    [`${pkg.name}/content/**`]: 'resource/',
    [`${pkg.name}/.env.defaults`]: path.join(rootDir, '.env.defaults'),
  },
  repositoryUrl,
};
