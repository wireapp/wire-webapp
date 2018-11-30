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

const logger = require('logdown')('postinstall');
logger.state.isEnabled = true;

if (process.env.NODE_ENV === 'production') {
  /**
   * Running "npm install" with NODE_ENV set to production will skip downloading development dependencies, that's why
   * we cannot execute grunt in such a scenario. Read more: https://docs.npmjs.com/cli/install
   */
  logger.log('Skipping "grunt init" because it is not needed in a production environment.');
  process.exit(0);
}

const {spawn} = require('child_process');

const child = spawn('grunt', ['init'], {
  // Shell needs to be activated to exit child processes on Windows with "Ctrl + C" (SIGINT events)
  shell: true,
  stdio: 'inherit',
});

child.on('exit', () => process.exit(0));
