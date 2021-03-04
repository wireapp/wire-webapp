#!/usr/bin/env node
/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

//@ts-check

const fs = require('fs');
const path = require('path');

const serverDist = path.resolve(__dirname, '../../server/dist');

const {config} = require(path.join(serverDist, 'config'));
const staticWebappDir = path.join(serverDist, 'static/');

const clientConfig = {
  ...config.CLIENT,
  APP_BASE: config.SERVER.APP_BASE,
};

const payload = `
window.wire = window.wire || {};
window.wire.env = ${JSON.stringify(clientConfig)};`;
fs.writeFileSync(path.join(staticWebappDir, 'config.js'), payload);
