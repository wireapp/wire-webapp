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

import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

type NativeCommandResult = {
  readonly exitCode: number | null;
  readonly standardError: string;
  readonly standardOutput: string;
};

const releaseMetadataEntrypointPath = join(process.cwd(), 'tools/release-cli/releaseMetadataCli.mts');
const productionDistributionEntrypointPath = join(process.cwd(), 'tools/release-cli/productionDistributionCli.mts');

function runNativeCommand(entrypointPath: string, commandLineArguments: readonly string[]): NativeCommandResult {
  const childProcessResult = spawnSync(process.execPath, [entrypointPath, ...commandLineArguments], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  return {
    exitCode: childProcessResult.status,
    standardError: childProcessResult.stderr,
    standardOutput: childProcessResult.stdout,
  };
}

function writeJsonFile(directoryPath: string, fileName: string, value: unknown): string {
  const filePath = join(directoryPath, fileName);
  writeFileSync(filePath, JSON.stringify(value), 'utf8');
  return filePath;
}

describe('release metadata CLI entrypoint', () => {
  it('writes help to standard output', () => {
    const actualResult = runNativeCommand(releaseMetadataEntrypointPath, ['--help']);

    expect(actualResult.exitCode).toBe(0);
    expect(actualResult.standardOutput).toContain('Usage: releaseMetadataCli');
  });

  it('preserves the variadic existing-tag contract', () => {
    const actualResult = runNativeCommand(releaseMetadataEntrypointPath, [
      'next-beta-tag',
      '2026-06-19.1',
      '2026-06-19.1-beta.1',
      '2026-06-19.1-beta.2',
    ]);

    expect(actualResult.exitCode).toBe(0);
    expect(actualResult.standardOutput).toBe('2026-06-19.1-beta.3\n');
  });

  it('rejects unknown commands with a non-zero exit code', () => {
    const actualResult = runNativeCommand(releaseMetadataEntrypointPath, ['unknown-command']);

    expect(actualResult.exitCode).toBe(1);
    expect(actualResult.standardError).toContain("error: unknown command 'unknown-command'");
  });

  it('rejects missing required positional arguments with a non-zero exit code', () => {
    const actualResult = runNativeCommand(releaseMetadataEntrypointPath, ['release-branch']);

    expect(actualResult.exitCode).toBe(1);
    expect(actualResult.standardError).toContain("error: missing required argument 'release-identifier'");
  });
});

describe('production distribution CLI entrypoint', () => {
  it('writes help to standard output', () => {
    const actualResult = runNativeCommand(productionDistributionEntrypointPath, ['--help']);

    expect(actualResult.exitCode).toBe(0);
    expect(actualResult.standardOutput).toContain('Usage: productionDistributionCli');
  });

  it('preserves the publish machine-readable output', () => {
    const temporaryDirectoryPath = mkdtempSync(join(tmpdir(), 'wire-production-distribution-cli-'));

    try {
      const chartsPath = writeJsonFile(temporaryDirectoryPath, 'charts.json', []);
      const actualResult = runNativeCommand(productionDistributionEntrypointPath, [
        'select-helm-chart',
        '--charts-path',
        chartsPath,
        '--image-tag',
        'dev-test-image',
      ]);

      expect(actualResult.exitCode).toBe(0);
      expect(actualResult.standardOutput).toBe('publish\n');
    } finally {
      rmSync(temporaryDirectoryPath, {force: true, recursive: true});
    }
  });

  it('preserves the reuse machine-readable output', () => {
    const temporaryDirectoryPath = mkdtempSync(join(tmpdir(), 'wire-production-distribution-cli-'));

    try {
      const chartsPath = writeJsonFile(temporaryDirectoryPath, 'charts.json', [
        {version: '1.2.3', app_version: 'dev-test-image'},
      ]);
      const actualResult = runNativeCommand(productionDistributionEntrypointPath, [
        'select-helm-chart',
        '--charts-path',
        chartsPath,
        '--image-tag',
        'dev-test-image',
      ]);

      expect(actualResult.exitCode).toBe(0);
      expect(actualResult.standardOutput).toBe('reuse:1.2.3\n');
    } finally {
      rmSync(temporaryDirectoryPath, {force: true, recursive: true});
    }
  });

  it('accepts the optional expected commit SHA before domain validation', () => {
    const temporaryDirectoryPath = mkdtempSync(join(tmpdir(), 'wire-production-distribution-cli-'));

    try {
      const artifactMetadataPath = writeJsonFile(temporaryDirectoryPath, 'artifact-metadata.json', {});
      const manifestPath = writeJsonFile(temporaryDirectoryPath, 'manifest.json', {});
      const actualResult = runNativeCommand(productionDistributionEntrypointPath, [
        'validate-manifest',
        '--artifact-metadata-path',
        artifactMetadataPath,
        '--manifest-path',
        manifestPath,
        '--production-tag',
        '2026-06-19.1-production',
        '--production-tag-commit-sha',
        'a'.repeat(40),
        '--expected-commit-sha',
        'b'.repeat(40),
        '--source-run-id',
        'run-123',
      ]);

      expect(actualResult.exitCode).toBe(1);
      expect(actualResult.standardError).toContain('Production tag commit does not match the expected commit SHA');
    } finally {
      rmSync(temporaryDirectoryPath, {force: true, recursive: true});
    }
  });

  it('rejects unknown options with a non-zero exit code', () => {
    const actualResult = runNativeCommand(productionDistributionEntrypointPath, [
      'select-helm-chart',
      '--charts-path',
      '/dev/null',
      '--image-tag',
      'dev-test-image',
      '--unknown-option',
    ]);

    expect(actualResult.exitCode).toBe(1);
    expect(actualResult.standardError).toContain("error: unknown option '--unknown-option'");
  });

  it('rejects missing required options with a non-zero exit code', () => {
    const actualResult = runNativeCommand(productionDistributionEntrypointPath, [
      'select-helm-chart',
      '--image-tag',
      'dev-test-image',
    ]);

    expect(actualResult.exitCode).toBe(1);
    expect(actualResult.standardError).toContain("error: required option '--charts-path <path>' not specified");
  });
});
