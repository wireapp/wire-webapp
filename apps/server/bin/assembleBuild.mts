#!/usr/bin/env node

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

import {cpSync, existsSync, mkdirSync, readdirSync, rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

type BuildVariant = 'development' | 'internal' | 'public';
type AssemblyScope = 'artifact' | 'webapp';

const workspaceRootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const serverBuildOutputPath = path.resolve(workspaceRootPath, 'apps/server/build/server');
const buildMetadataFilePath = path.resolve(workspaceRootPath, 'apps/server/build/metadata/version.json');
const artifactOutputPath = path.resolve(workspaceRootPath, 'apps/server/dist');

function isBuildVariant(value: unknown): value is BuildVariant {
  return value === 'development' || value === 'internal' || value === 'public';
}

function isAssemblyScope(value: unknown): value is AssemblyScope {
  return value === 'artifact' || value === 'webapp';
}

function resolveWebappBuildOutputPath(buildVariant: BuildVariant): string {
  return path.resolve(workspaceRootPath, `apps/webapp/dist/${buildVariant}`);
}

function assertPathExists(requiredPath: string): void {
  if (!existsSync(requiredPath)) {
    throw new Error(`Cannot assemble webapp artifact because '${requiredPath}' does not exist`);
  }
}

function copyDirectoryContents(sourceDirectoryPath: string, destinationDirectoryPath: string): void {
  assertPathExists(sourceDirectoryPath);
  mkdirSync(destinationDirectoryPath, {recursive: true});

  for (const directoryEntryName of readdirSync(sourceDirectoryPath)) {
    cpSync(
      path.resolve(sourceDirectoryPath, directoryEntryName),
      path.resolve(destinationDirectoryPath, directoryEntryName),
      {
        recursive: true,
      },
    );
  }
}

function assembleBuild(buildVariant: BuildVariant, assemblyScope: AssemblyScope): void {
  const webappBuildOutputPath = resolveWebappBuildOutputPath(buildVariant);

  assertPathExists(buildMetadataFilePath);
  assertPathExists(webappBuildOutputPath);
  if (assemblyScope === 'artifact') {
    assertPathExists(serverBuildOutputPath);
  }

  rmSync(artifactOutputPath, {force: true, recursive: true});
  mkdirSync(artifactOutputPath, {recursive: true});

  if (assemblyScope === 'artifact') {
    copyDirectoryContents(serverBuildOutputPath, artifactOutputPath);
  }

  copyDirectoryContents(webappBuildOutputPath, path.resolve(artifactOutputPath, 'static'));
  cpSync(buildMetadataFilePath, path.resolve(artifactOutputPath, 'version.json'));
}

function run(): void {
  const [buildVariant, assemblyScope] = process.argv.slice(2);

  if (!isBuildVariant(buildVariant) || !isAssemblyScope(assemblyScope)) {
    console.error('Usage: assembleBuild.mts <development|internal|public> <artifact|webapp>');
    process.exitCode = 1;
    return;
  }

  try {
    assembleBuild(buildVariant, assemblyScope);
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  }
}

run();
