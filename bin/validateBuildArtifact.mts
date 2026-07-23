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

import {Maybe} from 'true-myth';

import {readBuildArtifactHtmlDocuments, readBuildArtifactMetadata} from './buildArtifactArchive.ts';
import {validateBuildArtifactMetadata} from './buildArtifactMetadata.ts';
import {formatBuildArtifactMetadataOutputs} from './buildArtifactMetadataOutput.ts';
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

  appendFileSync(githubOutputPath.value, formatBuildArtifactMetadataOutputs(metadata));
}

function validateArtifact(): BuildMetadata {
  const artifactPath = readRequiredEnvironmentValue('BUILD_ARTIFACT_PATH');
  const expectedVersion = readRequiredEnvironmentValue('EXPECTED_VERSION');
  const expectedCommit = readRequiredEnvironmentValue('EXPECTED_COMMIT');
  const validationResult = validateBuildArtifactMetadata({
    expectedCommit,
    expectedVersion,
    htmlDocuments: readBuildArtifactHtmlDocuments(artifactPath),
    metadata: readBuildArtifactMetadata(artifactPath),
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
