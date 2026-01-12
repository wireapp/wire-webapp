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
const SERVER_PATH = path.resolve(ROOT_PATH, 'apps/server');
const DIST_PATH = path.resolve(SERVER_PATH, 'dist');
const S3_PATH = path.resolve(DIST_PATH, 's3');

// Create output directory first
if (!fs.existsSync(S3_PATH)) {
  fs.mkdirSync(S3_PATH, {recursive: true});
}
const output = fs.createWriteStream(path.join(S3_PATH, 'ebs.zip'));

// Read and modify package.json to remove all workspace dependencies
const packageJson = JSON.parse(fs.readFileSync(path.join(SERVER_PATH, 'package.json'), 'utf8'));

// Collect and remove all workspace:* dependencies, mark them as bundled
const workspaceDeps = [];
if (packageJson.dependencies) {
  Object.keys(packageJson.dependencies).forEach(dep => {
    if (packageJson.dependencies[dep].startsWith('workspace:')) {
      console.log(`Removing workspace dependency: ${dep}`);
      workspaceDeps.push(dep);
      delete packageJson.dependencies[dep];
    }
  });
}

// Mark workspace packages as bundledDependencies so npm doesn't remove them
if (workspaceDeps.length > 0) {
  if (!packageJson.bundledDependencies) {
    packageJson.bundledDependencies = [];
  }
  packageJson.bundledDependencies.push(...workspaceDeps);
  console.log(`Marked as bundled:`, workspaceDeps.join(', '));
}

// Write modified package.json to a temp file
const tempPackageJsonPath = path.join(DIST_PATH, 'package.json.tmp');
fs.writeFileSync(tempPackageJsonPath, JSON.stringify(packageJson, null, 2));
archive.file(tempPackageJsonPath, {name: 'package.json'});
archive.file(path.join(ROOT_PATH, '.env.defaults'), {name: '.env.defaults'});
archive.file(path.join(SERVER_PATH, 'Procfile'), {name: 'Procfile'});
// Archive dist directory but exclude s3 subdirectory
archive.glob('**/*', {
  cwd: DIST_PATH,
  ignore: ['s3/**', '.ebextensions/**'],
});
// Add .ebextensions directory from server root (not from dist)
archive.directory(path.join(SERVER_PATH, '.ebextensions'), '.ebextensions');
// Add .platform directory for deployment hooks
archive.directory(path.join(SERVER_PATH, '.platform'), '.platform');

archive.pipe(output);

archive.finalize();
