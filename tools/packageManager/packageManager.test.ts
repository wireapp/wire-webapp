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

type PackageManagerFunctions = {
  readonly selectPackageManagerForSource: (options: {
    readonly packageManagerField: string | undefined;
    readonly hasNpmLockfile: boolean;
    readonly hasYarnLockfile: boolean;
    readonly hasYarnWrapper: boolean;
  }) => 'npm' | 'yarn';
};

const packageManagerFunctions: PackageManagerFunctions = require('./packageManager');

describe('historical source package manager selection', () => {
  it('selects npm for a source with npm metadata and a root package lock', () => {
    const actualPackageManager = packageManagerFunctions.selectPackageManagerForSource({
      packageManagerField: 'npm@11.19.0',
      hasNpmLockfile: true,
      hasYarnLockfile: false,
      hasYarnWrapper: false,
    });

    expect(actualPackageManager).toBe('npm');
  });

  it('selects Yarn for a historical source with Yarn metadata, lockfile, and wrapper', () => {
    const actualPackageManager = packageManagerFunctions.selectPackageManagerForSource({
      packageManagerField: 'yarn@4.18.1',
      hasNpmLockfile: false,
      hasYarnLockfile: true,
      hasYarnWrapper: true,
    });

    expect(actualPackageManager).toBe('yarn');
  });

  it('rejects checked-out source with conflicting lockfiles', () => {
    expect(() => {
      return packageManagerFunctions.selectPackageManagerForSource({
        packageManagerField: 'npm@11.19.0',
        hasNpmLockfile: true,
        hasYarnLockfile: true,
        hasYarnWrapper: true,
      });
    }).toThrow('Package manager metadata, lockfile, and available package-manager tooling do not agree.');
  });
});
