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

import {readFileSync, readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';

import {isBuildMetadata} from '@wireapp/config';

import {validateBuildArtifactMetadata} from './buildArtifactMetadata.ts';
import {verifyPublicProductionBundle} from './verifyPublicProductionBundle.ts';
import {validateWebappBuildArtifactContract} from './webappBuildArtifactContract.ts';
import type {WebappBuildArtifactHtmlDocument} from './webappBuildArtifactContract.ts';

type StaticAssetDirectoryOptions = {
  readonly destinationDirectoryPath: string;
  readonly sourceDirectoryPath: string;
};

type WebappBuildValidationOptions = {
  readonly artifactDirectoryPath: string;
  readonly isPublicBuild: boolean;
  readonly metadataFilePath: string;
};

const firstArgumentIndex = 2;
const scriptFileArgumentIndex = 1;
const metadataFileArgumentOffset = 1;
const buildVariantArgumentOffset = 2;
const scriptFilePath = process.argv.at(scriptFileArgumentIndex) ?? process.cwd();
const workspaceRootPath = path.resolve(path.dirname(scriptFilePath), '../..');
const webappDirectoryPath = path.resolve(workspaceRootPath, 'apps/webapp');
const webappRequire = createRequire(path.resolve(webappDirectoryPath, 'package.json'));

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function listSourceFilesRecursively(sourceDirectoryPath: string): readonly string[] {
  const filePaths: string[] = [];

  for (const directoryEntry of readdirSync(sourceDirectoryPath, {withFileTypes: true})) {
    const directoryEntryPath = path.resolve(sourceDirectoryPath, directoryEntry.name);

    if (directoryEntry.isDirectory()) {
      filePaths.push(...listSourceFilesRecursively(directoryEntryPath));
    } else if (directoryEntry.isFile()) {
      filePaths.push(directoryEntryPath);
    }
  }

  return filePaths;
}

function listDirectoryFiles(sourceDirectoryPath: string): readonly string[] {
  const filePaths: string[] = [];

  for (const directoryEntry of readdirSync(sourceDirectoryPath, {withFileTypes: true})) {
    if (directoryEntry.isFile()) {
      filePaths.push(path.resolve(sourceDirectoryPath, directoryEntry.name));
    }
  }

  return filePaths;
}

function resolveCopiedAssetPaths(options: StaticAssetDirectoryOptions): readonly string[] {
  const sourceFiles = listSourceFilesRecursively(options.sourceDirectoryPath);

  return sourceFiles.map(sourceFilePath => {
    const relativeSourceFilePath = path.relative(options.sourceDirectoryPath, sourceFilePath);

    return toPosixPath(path.join(options.destinationDirectoryPath, relativeSourceFilePath));
  });
}

function resolveCopiedStaticAssetPaths(): readonly string[] {
  const webappResourceDirectoryPath = path.resolve(webappDirectoryPath, 'resource');
  const webappStaticAssetDirectoryPath = path.resolve(webappDirectoryPath, 'assets');
  const mediaPipeWasmDirectoryPath = path.resolve(workspaceRootPath, 'node_modules/@mediapipe/tasks-vision/wasm');
  const coreCryptoSourceDirectoryPath = path.resolve(workspaceRootPath, 'node_modules/@wireapp/core-crypto/src');
  const pdfJsPackageJsonPath = webappRequire.resolve('pdfjs-dist/package.json');
  const pdfJsWorkerPath = path.resolve(path.dirname(pdfJsPackageJsonPath), 'build/pdf.worker.mjs');
  const mediaPipeWasmAssetPaths = listDirectoryFiles(mediaPipeWasmDirectoryPath).map(filePath => {
    return toPosixPath(path.join('min/mediapipe/wasm', path.basename(filePath)));
  });
  const coreCryptoAssetPaths = listSourceFilesRecursively(coreCryptoSourceDirectoryPath).map(filePath => {
    return toPosixPath(path.join('min', path.basename(filePath)));
  });

  return [
    ...resolveCopiedAssetPaths({
      destinationDirectoryPath: '.',
      sourceDirectoryPath: webappResourceDirectoryPath,
    }),
    ...resolveCopiedAssetPaths({
      destinationDirectoryPath: 'assets',
      sourceDirectoryPath: webappStaticAssetDirectoryPath,
    }),
    ...mediaPipeWasmAssetPaths,
    ...coreCryptoAssetPaths,
    toPosixPath(path.join('min', path.basename(pdfJsWorkerPath))),
  ];
}

function readArtifactFilePaths(artifactDirectoryPath: string): readonly string[] {
  return listSourceFilesRecursively(artifactDirectoryPath).map(artifactFilePath => {
    return toPosixPath(path.relative(artifactDirectoryPath, artifactFilePath));
  });
}

function readHtmlDocuments(
  artifactDirectoryPath: string,
  artifactFilePaths: readonly string[],
): readonly WebappBuildArtifactHtmlDocument[] {
  return artifactFilePaths
    .filter(artifactFilePath => {
      return artifactFilePath.endsWith('.html');
    })
    .map(artifactFilePath => {
      return {
        relativePath: artifactFilePath,
        contents: readFileSync(path.resolve(artifactDirectoryPath, artifactFilePath), 'utf8'),
      };
    });
}

function resolveWorkspacePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(workspaceRootPath, filePath);
}

function validateWebappBuild(options: WebappBuildValidationOptions): void {
  const {artifactDirectoryPath, isPublicBuild, metadataFilePath} = options;
  const artifactFilePaths = readArtifactFilePaths(artifactDirectoryPath);
  const htmlDocuments = readHtmlDocuments(artifactDirectoryPath, artifactFilePaths);
  const artifactMetadata = JSON.parse(readFileSync(metadataFilePath, 'utf8')) as unknown;

  if (isBuildMetadata(artifactMetadata) === false) {
    throw new Error(`Build metadata '${metadataFilePath}' has an invalid structure`);
  }

  const metadataValidationResult = validateBuildArtifactMetadata({
    expectedCommit: artifactMetadata.commit,
    expectedVersion: artifactMetadata.version,
    htmlDocuments: htmlDocuments.map(htmlDocument => {
      return {
        archiveFilePath: htmlDocument.relativePath,
        contents: htmlDocument.contents,
      };
    }),
    metadata: artifactMetadata,
  });

  if (metadataValidationResult.isErr) {
    throw metadataValidationResult.error;
  }

  const contractValidationResult = validateWebappBuildArtifactContract({
    artifactFilePaths,
    copiedStaticAssetPaths: resolveCopiedStaticAssetPaths(),
    htmlDocuments,
  });

  if (contractValidationResult.isErr) {
    throw contractValidationResult.error;
  }

  if (isPublicBuild) {
    const publicBundleValidationResult = verifyPublicProductionBundle(artifactDirectoryPath);

    if (publicBundleValidationResult.status === 'failed') {
      const datadogReferences = publicBundleValidationResult.references.map(reference => {
        return `${reference.filePath}:${reference.lineNumber}: ${reference.matchedText}`;
      });

      throw new Error(`Datadog SDK references were found in the public bundle:\n${datadogReferences.join('\n')}`);
    }
  }

  console.info(
    JSON.stringify({
      artifactDirectoryPath,
      metadata: metadataValidationResult.value,
      publicBuild: isPublicBuild,
      contract: contractValidationResult.value,
    }),
  );
}

function main(): void {
  const artifactDirectoryArgument = process.argv.at(firstArgumentIndex);

  if (artifactDirectoryArgument === undefined || artifactDirectoryArgument.trim().length === 0) {
    console.error('Usage: validateWebappBuildArtifacts.mts <artifact-directory> [metadata-file] [public]');
    process.exitCode = 1;
    return;
  }

  const metadataFileArgument =
    process.argv.at(firstArgumentIndex + metadataFileArgumentOffset) ??
    process.env.WIRE_WEBAPP_BUILD_METADATA_PATH ??
    'apps/server/dist/version.json';
  const buildVariantArgument = process.argv.at(firstArgumentIndex + buildVariantArgumentOffset);

  try {
    validateWebappBuild({
      artifactDirectoryPath: resolveWorkspacePath(artifactDirectoryArgument),
      isPublicBuild: buildVariantArgument === 'public',
      metadataFilePath: resolveWorkspacePath(metadataFileArgument),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(errorMessage);
    process.exitCode = 1;
  }
}

main();
