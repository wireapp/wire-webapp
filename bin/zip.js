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

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const archive = archiver('zip');

const ROOT_PATH = path.resolve(__dirname, '..');
const SERVER_PATH = path.resolve(ROOT_PATH, 'server');
const DIST_PATH = path.resolve(ROOT_PATH, 'server/dist');
const S3_PATH = path.resolve(ROOT_PATH, 'server/dist/s3');

archive.file(path.join(SERVER_PATH, 'package.json'), {name: 'package.json'});
archive.file(path.join(ROOT_PATH, '.env.defaults'), {name: '.env.defaults'});
archive.file(path.join(ROOT_PATH, 'Procfile'), {name: 'Procfile'});
archive.directory(DIST_PATH, false);

if (!fs.existsSync(S3_PATH)) {
  fs.mkdirSync(S3_PATH);
}
const output = fs.createWriteStream(path.join(S3_PATH, 'ebs.zip'));

archive.pipe(output);

archive.finalize();
