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

const srcFolder = '../';
const distFolder = '../dist/';
const npmModulesFolder = '../../../node_modules/';

const assetFolders = ['.ebextensions/', 'robots/', 'templates/', 'certificate'];

assetFolders.forEach(assetFolder => {
  fs.copySync(path.resolve(__dirname, srcFolder, assetFolder), path.resolve(__dirname, distFolder, assetFolder));
});

fs.copySync(
  path.resolve(__dirname, npmModulesFolder, '@wireapp/telemetry/lib/embed.js'),
  path.resolve(__dirname, distFolder, 'libs/wire/telemetry/embed.js'),
);

// Bundle all workspace dependencies for deployment
// Read server's package.json to find workspace dependencies
const serverPackageJson = require('../package.json');
const workspaceDeps = Object.entries(serverPackageJson.dependencies || {})
  .filter(([, version]) => version.startsWith('workspace:'))
  .map(([name]) => name);

console.log('Bundling workspace dependencies:', workspaceDeps.join(', '));

workspaceDeps.forEach(depName => {
  // Map package name to library folder (e.g., @wireapp/config -> config)
  const libName = depName.split('/').pop(); // Extract last part after /

  // Find the library in the monorepo
  const libraryPath = path.resolve(__dirname, '../../../libraries', libName);

  if (!fs.existsSync(libraryPath)) {
    throw new Error(`Workspace dependency ${depName} not found at ${libraryPath}`);
  }

  // Copy the compiled lib directory
  const libSrc = path.join(libraryPath, 'lib');
  const libDest = path.resolve(__dirname, distFolder, 'node_modules', depName, 'lib');

  // Copy the package.json
  const pkgSrc = path.join(libraryPath, 'package.json');
  const pkgDest = path.resolve(__dirname, distFolder, 'node_modules', depName, 'package.json');

  console.log(`  - Bundling ${depName} from ${libraryPath}`);

  // Ensure the directory exists
  fs.ensureDirSync(path.resolve(__dirname, distFolder, 'node_modules', depName));

  // Copy files
  if (fs.existsSync(libSrc)) {
    fs.copySync(libSrc, libDest);
  }
  fs.copySync(pkgSrc, pkgDest);
});
