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

export type LocalWorkspacePackage = {
  readonly directoryPath: string;
  readonly manifest: {
    readonly name: string;
    readonly version: string;
  };
};

type FindLocalWorkspaceDependencyPackagesOptions = {
  readonly dependencies: Readonly<Record<string, string>>;
  readonly workspacePackages: readonly LocalWorkspacePackage[];
};

type CreatePackagedServerManifestOptions = {
  readonly serverPackageManifest: Readonly<Record<string, unknown>> & {
    readonly dependencies?: Readonly<Record<string, string>>;
  };
  readonly workspacePackages: readonly LocalWorkspacePackage[];
};

type PackagedServerManifest = Readonly<Record<string, unknown>> & {
  readonly dependencies: Readonly<Record<string, string>>;
};

function findLocalWorkspaceDependencyPackages(
  options: FindLocalWorkspaceDependencyPackagesOptions,
): LocalWorkspacePackage[] {
  const declaredDependencyNames = new Set(Object.keys(options.dependencies));

  return options.workspacePackages.filter(workspacePackage => {
    return declaredDependencyNames.has(workspacePackage.manifest.name);
  });
}

function createPackagedServerManifest(options: CreatePackagedServerManifestOptions): PackagedServerManifest {
  const packagedDependencies: Record<string, string> = {...options.serverPackageManifest.dependencies};
  const workspaceDependencyPackages = findLocalWorkspaceDependencyPackages({
    dependencies: packagedDependencies,
    workspacePackages: options.workspacePackages,
  });

  workspaceDependencyPackages.forEach(workspacePackage => {
    packagedDependencies[workspacePackage.manifest.name] = workspacePackage.manifest.version;
  });

  return {
    ...options.serverPackageManifest,
    dependencies: packagedDependencies,
  };
}

export type WorkspaceDependencyFunctions = {
  readonly createPackagedServerManifest: typeof createPackagedServerManifest;
  readonly findLocalWorkspaceDependencyPackages: typeof findLocalWorkspaceDependencyPackages;
};

module.exports = {
  createPackagedServerManifest,
  findLocalWorkspaceDependencyPackages,
};
