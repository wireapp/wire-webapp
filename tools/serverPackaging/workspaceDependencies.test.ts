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

import type {LocalWorkspacePackage, WorkspaceDependencyFunctions} from './workspaceDependencies.ts';

const workspaceDependencyFunctions: WorkspaceDependencyFunctions = require('./workspaceDependencies.ts');

describe('server workspace dependency packaging', () => {
  const configWorkspacePackage: LocalWorkspacePackage = {
    directoryPath: '/repository/libraries/config',
    manifest: {
      name: '@wireapp/config',
      version: '1.0.0',
    },
  };

  it('identifies a local package from an npm-compatible semver dependency', () => {
    const actualWorkspacePackages = workspaceDependencyFunctions.findLocalWorkspaceDependencyPackages({
      dependencies: {
        '@wireapp/config': '^1.0.0',
        express: '^4.21.0',
      },
      workspacePackages: [configWorkspacePackage],
    });

    expect(actualWorkspacePackages).toEqual([configWorkspacePackage]);
  });

  it('writes the local package version into the server archive manifest', () => {
    const actualPackageManifest = workspaceDependencyFunctions.createPackagedServerManifest({
      serverPackageManifest: {
        name: '@wireapp/server',
        dependencies: {
          '@wireapp/config': '^1.0.0',
          express: '^4.21.0',
        },
      },
      workspacePackages: [configWorkspacePackage],
    });
    const expectedPackageManifest = {
      name: '@wireapp/server',
      dependencies: {
        '@wireapp/config': '1.0.0',
        express: '^4.21.0',
      },
    };

    expect(actualPackageManifest).toEqual(expectedPackageManifest);
  });
});
