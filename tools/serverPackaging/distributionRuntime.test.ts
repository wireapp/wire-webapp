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

import {spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {delimiter, dirname, join, resolve} from 'node:path';

const bundledBuildRecipes = 'package-server-public: build-server-bundle build-webapp-public';
const historicalBuildRecipes =
  'build-server-bundle:\n    rspack build\npackage-server-public: build-server build-webapp-public';
const commonRuntimePaths = ['apps/server/Dockerfile', 'run.sh', '.env.defaults', 'apps/server/dist/index.js'];
const bundleRuntimePaths = ['apps/server/dist/index.js.map', 'apps/server/dist/dbs/GeoLite2-Country.mmdb'];
const historicalManifestPaths = ['package.json', 'apps/server/package.json'];

type DistributionFixtureOptions = {
  readonly validatorPath: string;
  readonly sourceBuildRecipes: string | undefined;
  readonly missingPath?: string;
  readonly emptyPath?: string;
  readonly sourceIsUnavailable?: boolean;
};

function validateDistributionFixture(options: DistributionFixtureOptions): ReturnType<typeof spawnSync> {
  const fixtureDirectory = mkdtempSync(join(tmpdir(), 'distribution-runtime-'));

  try {
    const contextDirectory = join(fixtureDirectory, 'context');
    // Include legacy manifests even in bundled fixtures: they must not permit a downgrade.
    for (const runtimePath of [...commonRuntimePaths, ...bundleRuntimePaths, ...historicalManifestPaths]) {
      if (runtimePath !== options.missingPath) {
        const destinationPath = join(contextDirectory, runtimePath);
        mkdirSync(dirname(destinationPath), {recursive: true});
        writeFileSync(destinationPath, runtimePath === options.emptyPath ? '' : 'runtime fixture');
      }
    }
    const executableDirectory = join(fixtureDirectory, 'executables');
    mkdirSync(executableDirectory);
    // Stub only the Git boundary; runtime path checks execute against real files.
    writeFileSync(
      join(executableDirectory, 'git'),
      `#!/usr/bin/env bash
set -eu
if [[ "\${FIXTURE_SOURCE_IS_UNAVAILABLE}" == true ]]; then exit 1; fi
case "$*" in
  'cat-file -e immutable-source^{commit}') exit 0 ;;
  'cat-file -e immutable-source:justfile') [[ "\${FIXTURE_HAS_JUSTFILE}" == true ]] ;;
  'show immutable-source:justfile') printf '%s' "\${FIXTURE_BUILD_RECIPES}" ;;
  *) echo "Unexpected Git request: $*" >&2; exit 1 ;;
esac
`,
      {mode: 0o755},
    );

    const validatorContents = readFileSync(options.validatorPath, 'utf8');
    const runtimeValidationOffset = validatorContents.indexOf(
      'bash "${script_directory}/../serverPackaging/validateDistributionRuntime.sh"',
    );
    if (runtimeValidationOffset < 0) {
      throw new Error(`Distribution validator does not validate its runtime: ${options.validatorPath}`);
    }
    const runtimeValidationEnd = validatorContents.indexOf('\n\n', runtimeValidationOffset);
    const runtimeValidationCommand = validatorContents.slice(runtimeValidationOffset, runtimeValidationEnd);

    return spawnSync('bash', ['-c', runtimeValidationCommand], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${executableDirectory}${delimiter}${process.env.PATH ?? ''}`,
        script_directory: dirname(resolve(options.validatorPath)),
        DISTRIBUTION_CONTEXT_PATH: contextDirectory,
        production_tag_commit_sha: 'immutable-source',
        maintenance_tag_commit_sha: 'immutable-source',
        FIXTURE_HAS_JUSTFILE: String(options.sourceBuildRecipes !== undefined),
        FIXTURE_BUILD_RECIPES: options.sourceBuildRecipes ?? '',
        FIXTURE_SOURCE_IS_UNAVAILABLE: String(options.sourceIsUnavailable === true),
      },
    });
  } finally {
    rmSync(fixtureDirectory, {recursive: true, force: true});
  }
}

describe.each([
  'tools/productionDistribution/validateProductionDistribution.sh',
  'tools/maintenanceRelease/validateMaintenanceDistribution.sh',
])('distribution runtime validation through %s', validatorPath => {
  it('accepts a complete bundled runtime without npm manifests', () => {
    for (const missingPath of historicalManifestPaths) {
      const verification = validateDistributionFixture({
        validatorPath,
        sourceBuildRecipes: bundledBuildRecipes,
        missingPath,
      });
      expect(verification.status).toBe(0);
    }
  });

  it.each([...commonRuntimePaths, ...bundleRuntimePaths])('rejects a bundled runtime missing %s', missingPath => {
    const verification = validateDistributionFixture({
      validatorPath,
      sourceBuildRecipes: bundledBuildRecipes,
      missingPath,
    });
    expect(verification.status).toBe(1);
    expect(verification.stderr).toContain(missingPath);
    expect(verification.stderr).toContain('source immutable-source');
  });

  it.each(bundleRuntimePaths)('rejects an empty bundled runtime file: %s', emptyPath => {
    const verification = validateDistributionFixture({
      validatorPath,
      sourceBuildRecipes: bundledBuildRecipes,
      emptyPath,
    });
    expect(verification.status).toBe(1);
    expect(verification.stderr).toContain(emptyPath);
  });

  it.each([historicalBuildRecipes, undefined])(
    'accepts historical compiled runtimes without bundled assets: %s',
    sourceBuildRecipes => {
      for (const missingPath of bundleRuntimePaths) {
        const verification = validateDistributionFixture({validatorPath, sourceBuildRecipes, missingPath});
        expect(verification.status).toBe(0);
      }
    },
  );

  it.each(['apps/server/dist/index.js', ...historicalManifestPaths])(
    'rejects an incomplete historical runtime: %s',
    missingPath => {
      const verification = validateDistributionFixture({
        validatorPath,
        sourceBuildRecipes: historicalBuildRecipes,
        missingPath,
      });
      expect(verification.status).toBe(1);
      expect(verification.stderr).toContain(missingPath);
    },
  );

  it('fails closed when the validated source revision cannot be inspected', () => {
    const verification = validateDistributionFixture({
      validatorPath,
      sourceBuildRecipes: bundledBuildRecipes,
      sourceIsUnavailable: true,
    });
    expect(verification.status).toBe(1);
    expect(verification.stderr).toContain('Cannot inspect distribution source commit: immutable-source');
  });
});
