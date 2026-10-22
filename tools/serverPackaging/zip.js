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

const archiver = require('archiver');

const fs = require('fs');
const path = require('path');

const {createPackagedServerManifest, findLocalWorkspaceDependencyPackages} = require('./workspaceDependencies.ts');

const archive = archiver('zip');

const ROOT_PATH = path.resolve(__dirname, '../..');
const SERVER_PATH = path.resolve(ROOT_PATH, 'apps/server');
const DIST_PATH = path.resolve(SERVER_PATH, 'dist');
const S3_PATH = path.resolve(DIST_PATH, 's3');

// Create output directory first
if (!fs.existsSync(S3_PATH)) {
  fs.mkdirSync(S3_PATH, {recursive: true});
}
const output = fs.createWriteStream(path.join(S3_PATH, 'ebs.zip'));

// Read local workspace package metadata and mark bundled dependencies with their package versions.
const serverPackageManifest = JSON.parse(fs.readFileSync(path.join(SERVER_PATH, 'package.json'), 'utf8'));
const librariesDirectory = path.join(ROOT_PATH, 'libraries');
const workspacePackages = fs
  .readdirSync(librariesDirectory, {withFileTypes: true})
  .filter(libraryDirectory => {
    return libraryDirectory.isDirectory();
  })
  .map(libraryDirectory => {
    return path.join(librariesDirectory, libraryDirectory.name);
  })
  .flatMap(workspacePackageDirectory => {
    const packageManifestPath = path.join(workspacePackageDirectory, 'package.json');

    if (!fs.existsSync(packageManifestPath)) {
      return [];
    }

    return [
      {
        directoryPath: workspacePackageDirectory,
        manifest: JSON.parse(fs.readFileSync(packageManifestPath, 'utf8')),
      },
    ];
  });
const workspaceDependencyPackages = findLocalWorkspaceDependencyPackages({
  dependencies: serverPackageManifest.dependencies || {},
  workspacePackages,
});

workspaceDependencyPackages.forEach(workspacePackage => {
  console.info(`Marking workspace dependency as pre-bundled: ${workspacePackage.manifest.name}`);
});

const packageJson = createPackagedServerManifest({
  serverPackageManifest,
  workspacePackages,
});

// Write modified package.json to a temp file
const tempPackageJsonPath = path.join(DIST_PATH, 'package.json.tmp');
const packageJsonIndentationSpaces = 2;
fs.writeFileSync(tempPackageJsonPath, JSON.stringify(packageJson, null, packageJsonIndentationSpaces));
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
