/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

const fs = require('node:fs');
const path = require('node:path');

const sourceDirectoryArgumentIndex = 2;

/**
 * @param {{
 *   readonly packageManagerField: string | undefined;
 *   readonly hasNpmLockfile: boolean;
 *   readonly hasYarnLockfile: boolean;
 *   readonly hasYarnWrapper: boolean;
 * }} options
 * @returns {'npm' | 'yarn'}
 */
function selectPackageManagerForSource(options) {
  const packageManagerFieldIsString = typeof options.packageManagerField === 'string';
  const packageManagerIsNpm = packageManagerFieldIsString && options.packageManagerField.startsWith('npm@');
  const packageManagerIsYarn = packageManagerFieldIsString && options.packageManagerField.startsWith('yarn@');

  if (packageManagerIsNpm && options.hasNpmLockfile && !options.hasYarnLockfile) {
    return 'npm';
  }

  if (packageManagerIsYarn && options.hasYarnLockfile && options.hasYarnWrapper && !options.hasNpmLockfile) {
    return 'yarn';
  }

  throw new Error('Package manager metadata, lockfile, and available package-manager tooling do not agree.');
}

/**
 * @param {string} sourceDirectoryPath
 * @returns {'npm' | 'yarn'}
 */
function readPackageManagerForSourceDirectory(sourceDirectoryPath) {
  const packageManifestPath = path.join(sourceDirectoryPath, 'package.json');
  const packageManifest = JSON.parse(fs.readFileSync(packageManifestPath, 'utf8'));

  return selectPackageManagerForSource({
    packageManagerField: packageManifest.packageManager,
    hasNpmLockfile: fs.existsSync(path.join(sourceDirectoryPath, 'package-lock.json')),
    hasYarnLockfile: fs.existsSync(path.join(sourceDirectoryPath, 'yarn.lock')),
    hasYarnWrapper: fs.existsSync(path.join(sourceDirectoryPath, 'bin/yarn')),
  });
}

module.exports = {
  readPackageManagerForSourceDirectory,
  selectPackageManagerForSource,
};

if (require.main === module) {
  const sourceDirectoryPath = process.argv[sourceDirectoryArgumentIndex];

  if (sourceDirectoryPath === undefined) {
    throw new Error('A checked-out source directory path is required.');
  }

  console.info(readPackageManagerForSourceDirectory(sourceDirectoryPath));
}
