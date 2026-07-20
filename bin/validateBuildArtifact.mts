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

import {appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

import {Maybe} from 'true-myth';

import {validateBuildArtifactMetadata} from './buildArtifactMetadata.ts';
import type {BuildArtifactHtmlDocument} from './buildArtifactMetadata.ts';
import type {BuildMetadata} from '@wireapp/config';

function readRequiredEnvironmentValue(environmentVariableName: string): string {
  const environmentValue = Maybe.of(process.env[environmentVariableName]).andThen(value => {
    if (value.trim().length === 0) {
      return Maybe.nothing();
    }

    return Maybe.just(value);
  });

  if (environmentValue.isNothing) {
    throw new Error(`Environment variable ${environmentVariableName} is required`);
  }

  return environmentValue.value;
}

function readArchiveFile(artifactPath: string, archiveFilePath: string): string {
  return execFileSync('unzip', ['-p', artifactPath, archiveFilePath], {encoding: 'utf8'});
}

function readHtmlDocuments(artifactPath: string): readonly BuildArtifactHtmlDocument[] {
  const archiveFilePaths = execFileSync('unzip', ['-Z1', artifactPath], {encoding: 'utf8'})
    .split('\n')
    .filter(archiveFilePath => {
      return archiveFilePath.startsWith('static/') && archiveFilePath.endsWith('.html');
    });

  return archiveFilePaths.map(archiveFilePath => {
    return {
      archiveFilePath,
      contents: readArchiveFile(artifactPath, archiveFilePath),
    };
  });
}

function readArtifactMetadata(artifactPath: string): unknown {
  return JSON.parse(readArchiveFile(artifactPath, 'version.json'));
}

function writeMetadataOutputs(metadata: BuildMetadata): void {
  const githubOutputPath = Maybe.of(process.env.GITHUB_OUTPUT).andThen(value => {
    if (value.trim().length === 0) {
      return Maybe.nothing();
    }

    return Maybe.just(value);
  });

  if (githubOutputPath.isNothing) {
    return;
  }

  appendFileSync(
    githubOutputPath.value,
    `artifact_version=${metadata.version}\nartifact_commit=${metadata.commit}\nartifact_built_at=${metadata.builtAt}\n`,
  );
}

function validateArtifact(): BuildMetadata {
  const artifactPath = readRequiredEnvironmentValue('BUILD_ARTIFACT_PATH');
  const expectedVersion = readRequiredEnvironmentValue('EXPECTED_VERSION');
  const expectedCommit = readRequiredEnvironmentValue('EXPECTED_COMMIT');
  const validationResult = validateBuildArtifactMetadata({
    expectedCommit,
    expectedVersion,
    htmlDocuments: readHtmlDocuments(artifactPath),
    metadata: readArtifactMetadata(artifactPath),
  });

  if (validationResult.isErr) {
    throw validationResult.error;
  }

  return validationResult.value;
}

function run(): void {
  try {
    const metadata = validateArtifact();

    writeMetadataOutputs(metadata);
    console.log(JSON.stringify(metadata));
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  }
}

run();
