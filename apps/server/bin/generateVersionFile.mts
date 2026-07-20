#!/usr/bin/env node

/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {Maybe} from 'true-myth';

import {
  createAuthoritativeBuildMetadata,
  isBuildMetadataInput,
  parseBuildMetadata,
  type BuildMetadata,
  type BuildMetadataInput,
  resolveBuildVersion,
} from '@wireapp/config';

const DEFAULT_METADATA_FILE_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/version.json');

function resolveNonEmptyEnvironmentValue(environmentValue: Maybe<string>): Maybe<string> {
  return environmentValue.andThen(environmentString => {
    if (environmentString.length === 0) {
      return Maybe.nothing();
    }

    return Maybe.just(environmentString);
  });
}

function resolveCommitSha(explicitCommitSha: Maybe<string>): string {
  if (explicitCommitSha.isJust) {
    return explicitCommitSha.value;
  }

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
  } catch {
    return 'unknown';
  }
}

function readExistingBuildMetadata(metadataFilePath: string): Maybe<BuildMetadata> {
  if (!existsSync(metadataFilePath)) {
    return Maybe.nothing();
  }

  try {
    return parseBuildMetadata(readFileSync(metadataFilePath, 'utf8'));
  } catch {
    return Maybe.nothing();
  }
}

function generateVersionFile(): void {
  const metadataFilePath = resolveNonEmptyEnvironmentValue(
    Maybe.of(process.env.WIRE_WEBAPP_BUILD_METADATA_PATH),
  ).unwrapOr(DEFAULT_METADATA_FILE_PATH);
  const explicitCommitSha = resolveNonEmptyEnvironmentValue(Maybe.of(process.env.WIRE_WEBAPP_BUILD_COMMIT));
  const commitSha = resolveCommitSha(explicitCommitSha);
  const explicitVersion = resolveNonEmptyEnvironmentValue(Maybe.of(process.env.WIRE_WEBAPP_BUILD_VERSION));
  const resolvedBuildVersion = resolveBuildVersion(explicitVersion, commitSha);
  const builtAt = resolveNonEmptyEnvironmentValue(Maybe.of(process.env.WIRE_WEBAPP_BUILD_TIMESTAMP)).unwrapOr(
    new Date().toISOString(),
  );
  const buildMetadataInput: BuildMetadataInput = {
    version: resolvedBuildVersion,
    commit: commitSha,
    builtAt,
  };
  if (!isBuildMetadataInput(buildMetadataInput)) {
    throw new Error('Invalid webapp build metadata input');
  }
  const existingBuildMetadata = readExistingBuildMetadata(metadataFilePath);
  const authoritativeBuildMetadata = createAuthoritativeBuildMetadata(existingBuildMetadata, buildMetadataInput);

  mkdirSync(path.dirname(metadataFilePath), {recursive: true});
  writeFileSync(metadataFilePath, `${JSON.stringify(authoritativeBuildMetadata, null, 2)}\n`);
}

function run(): void {
  try {
    generateVersionFile();
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  }
}

run();
