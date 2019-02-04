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

const {join, resolve} = require('path');
const {execSync} = require('child_process');

const root = resolve(__dirname, '..');

const downloadFromCrowdin = () => {
  const crowdinYaml = join(root, 'keys', 'crowdin.yaml');
  execSync(`crowdin download --identity="${crowdinYaml}"`, {stdio: [0, 1]});
};

downloadFromCrowdin();
