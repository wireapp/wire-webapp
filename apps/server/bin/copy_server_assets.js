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
const path = require('path');
const {findLocalWorkspaceDependencyPackages} = require('../../../tools/serverPackaging/workspaceDependencies.ts');

const srcFolder = '../';
const serverOutputDirectory = path.resolve(
  process.env.WIRE_WEBAPP_SERVER_OUTPUT_PATH ?? path.resolve(__dirname, '../dist'),
);
const npmModulesFolder = '../../../node_modules/';
const librariesDirectory = path.resolve(__dirname, '../../../libraries');

const assetFolders = ['.ebextensions/', 'robots/', 'templates/', 'certificate'];

assetFolders.forEach(assetFolder => {
  fs.copySync(path.resolve(__dirname, srcFolder, assetFolder), path.resolve(serverOutputDirectory, assetFolder));
});

fs.copySync(
  path.resolve(__dirname, npmModulesFolder, '@wireapp/telemetry/lib/embed.js'),
  path.resolve(serverOutputDirectory, 'libs/wire/telemetry/embed.js'),
);

// Bundle all local workspace dependencies for deployment.
const serverPackageJson = require('../package.json');
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
        manifest: fs.readJsonSync(packageManifestPath),
      },
    ];
  });
const workspaceDependencyPackages = findLocalWorkspaceDependencyPackages({
  dependencies: serverPackageJson.dependencies || {},
  workspacePackages,
});

console.log(
  'Bundling workspace dependencies:',
  workspaceDependencyPackages.map(workspacePackage => workspacePackage.manifest.name).join(', '),
);

workspaceDependencyPackages.forEach(workspacePackage => {
  const dependencyName = workspacePackage.manifest.name;
  const libraryPath = workspacePackage.directoryPath;
  // Copy the package to node_modules preserving structure
  const packageDest = path.resolve(serverOutputDirectory, 'node_modules', dependencyName);

  console.log(`  - Bundling ${dependencyName} from ${libraryPath}`);

  // Ensure the directory exists
  fs.ensureDirSync(packageDest);

  // Copy package.json
  const pkgSrc = path.join(libraryPath, 'package.json');
  fs.copySync(pkgSrc, path.join(packageDest, 'package.json'));

  // Copy the compiled lib directory (preserving the lib folder structure)
  const libSrc = path.join(libraryPath, 'lib');
  if (fs.existsSync(libSrc)) {
    fs.copySync(libSrc, path.join(packageDest, 'lib'));
  } else {
    throw new Error(`Compiled lib directory not found for ${dependencyName} at ${libSrc}. Did you run the build?`);
  }
});
