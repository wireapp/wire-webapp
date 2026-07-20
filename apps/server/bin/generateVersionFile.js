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

const {existsSync, mkdirSync, readFileSync, writeFileSync} = require('fs');
const {execFileSync} = require('child_process');
const path = require('path');

const {createBuildMetadata, resolveBuildVersion} = require('@wireapp/config');

const DEFAULT_METADATA_FILE_PATH = path.resolve(__dirname, '../dist/version.json');

function resolveCommitSha(explicitCommitSha) {
  if (explicitCommitSha.isJust) {
    return explicitCommitSha.value;
  }

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
  } catch (error) {
    return 'unknown';
  }
}

function isBuildMetadata(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.version === 'string' &&
    typeof value.commit === 'string' &&
    typeof value.builtAt === 'string'
  );
}

function readExistingBuildMetadata(metadataFilePath, maybeModule) {
  if (!existsSync(metadataFilePath)) {
    return maybeModule.nothing();
  }

  try {
    const parsedMetadata = JSON.parse(readFileSync(metadataFilePath, 'utf8'));

    return isBuildMetadata(parsedMetadata) ? maybeModule.just(parsedMetadata) : maybeModule.nothing();
  } catch (error) {
    return maybeModule.nothing();
  }
}

function createAuthoritativeBuildMetadata(existingBuildMetadata, resolvedBuildVersion, commitSha, builtAt) {
  return existingBuildMetadata.mapOrElse(
    () => {
      return createBuildMetadata({
        version: resolvedBuildVersion,
        commit: commitSha,
        builtAt,
      });
    },
    existingMetadata => {
      if (
        existingMetadata.version === resolvedBuildVersion &&
        existingMetadata.commit === commitSha &&
        existingMetadata.builtAt.endsWith('Z')
      ) {
        return existingMetadata;
      }

      return createBuildMetadata({
        version: resolvedBuildVersion,
        commit: commitSha,
        builtAt,
      });
    },
  );
}

async function generateVersionFile() {
  const {Maybe} = await import('true-myth');
  const metadataFilePath = process.env.WIRE_WEBAPP_BUILD_METADATA_PATH || DEFAULT_METADATA_FILE_PATH;
  const explicitCommitSha = Maybe.of(process.env.WIRE_WEBAPP_BUILD_COMMIT_SHA || null);
  const commitSha = resolveCommitSha(explicitCommitSha);
  const explicitVersion = Maybe.of(process.env.WIRE_WEBAPP_BUILD_VERSION || null);
  const resolvedBuildVersion = resolveBuildVersion(explicitVersion, commitSha);
  const builtAt = process.env.WIRE_WEBAPP_BUILD_TIMESTAMP || new Date().toISOString();
  const existingBuildMetadata = readExistingBuildMetadata(metadataFilePath, Maybe);
  const authoritativeBuildMetadata = createAuthoritativeBuildMetadata(
    existingBuildMetadata,
    resolvedBuildVersion,
    commitSha,
    builtAt,
  );

  mkdirSync(path.dirname(metadataFilePath), {recursive: true});
  writeFileSync(metadataFilePath, `${JSON.stringify(authoritativeBuildMetadata, null, 2)}\n`);
}

async function run() {
  try {
    await generateVersionFile();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

void run();
