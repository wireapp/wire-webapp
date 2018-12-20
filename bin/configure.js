#!/usr/bin/env node

/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

const fs = require('fs-extra');
const {execSync} = require('child_process');
const {resolve} = require('path');

const defaultGitConfigurationUrl = 'https://github.com/wireapp/wire-web-config-default';
const gitConfigurationUrl = process.env.WIRE_CONFIGURATION_REPOSITORY || defaultGitConfigurationUrl;
const configDir = 'config';

fs.removeSync(resolve(configDir));
execSync(`git clone ${gitConfigurationUrl} ${configDir}`, {stdio: [0, 1]});
execSync(`cd ${configDir} && yarn && yarn merge:wire-webapp`, {stdio: [0, 1]});
fs.removeSync(resolve(configDir));
