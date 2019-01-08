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
/* eslint-disable no-console */

const fs = require('fs-extra');
const {execSync} = require('child_process');
const {resolve, join} = require('path');
const pkg = require('../package');

// const defaultGitConfigurationUrl = 'https://github.com/wireapp/wire-web-config-default';
const defaultGitConfigurationUrl = 'git@github.com:wireapp/wire-web-config-ey.git';
const gitConfigurationUrl = process.env.WIRE_CONFIGURATION_REPOSITORY || defaultGitConfigurationUrl;

console.log(`Loading configuration for project "${pkg.name}" from "${gitConfigurationUrl}"`);

const configDirName = 'config';
const configDir = resolve(configDirName);
const src = resolve(configDir, pkg.name, 'content');
const projectDir = resolve('./');
const dest = resolve(projectDir, 'resource');
const ignoreList = ['.DS_Store'];

console.log(`Cleaning config directory "${configDir}"`);
fs.removeSync(configDir);
execSync(`git clone ${gitConfigurationUrl} ${configDirName}`, {stdio: [0, 1]});

// Copy .env file configuration
fs.copySync(resolve(configDir, pkg.name, '.env'), resolve(projectDir, '.env'));

process.chdir(src);

const walkSync = (dir, fileList = []) =>
  fs.readdirSync(dir).reduce((fileListAccumulator, file) => {
    const isDirectory = fs.statSync(join(dir, file)).isDirectory();
    return isDirectory ? walkSync(join(dir, file), fileListAccumulator) : fileListAccumulator.concat([[dir, file]]);
  }, fileList);

const files = walkSync('./').filter(file => ignoreList.some(ignore => !file.includes(ignore)));

files.forEach(([dir, file]) => {
  const source = resolve(dir, file);
  const destination = resolve(dest, dir, file);

  console.log(`Copy file "${source}" -> "${destination}"`);

  fs.mkdirpSync(resolve(dir));
  fs.copySync(source, destination);
});

console.log(`Cleaning config directory "${configDir}"`);
fs.removeSync(configDir);
