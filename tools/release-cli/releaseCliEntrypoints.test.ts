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

type WriteJsonFileOptions = {
  readonly directoryPath: string;
  readonly fileName: string;
  readonly value: unknown;
};

const releaseMetadataEntrypointPath = join(process.cwd(), 'tools/release-cli/releaseMetadataCli.mts');
const productionDistributionEntrypointPath = join(process.cwd(), 'tools/release-cli/productionDistributionCli.mts');
const releaseAppearanceEntrypointPath = join(process.cwd(), 'tools/release-cli/releaseAppearanceCommand.mts');
const previewNextBetaEntrypointPath = join(process.cwd(), 'tools/release-cli/previewNextBetaCommand.mts');

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

function writeJsonFile(writeJsonFileOptions: WriteJsonFileOptions): string {
  const {directoryPath, fileName, value} = writeJsonFileOptions;
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

  it('preserves the variadic maintenance-tag contract', () => {
    const actualResult = runNativeCommand(releaseMetadataEntrypointPath, [
      'next-maintenance-tag',
      '2026-07-27.1-airgap-a',
      '2026-07-27.1-airgap-b-maintenance.9',
      '2026-07-27.1-airgap-a-maintenance.9',
      '2026-07-27.1-production',
    ]);

    expect(actualResult.exitCode).toBe(0);
    expect(actualResult.standardOutput).toBe('2026-07-27.1-airgap-a-maintenance.10\n');
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
      const chartsPath = writeJsonFile({directoryPath: temporaryDirectoryPath, fileName: 'charts.json', value: []});
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
      const chartsPath = writeJsonFile({
        directoryPath: temporaryDirectoryPath,
        fileName: 'charts.json',
        value: [{version: '1.2.3', app_version: 'dev-test-image'}],
      });
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
      const artifactMetadataPath = writeJsonFile({
        directoryPath: temporaryDirectoryPath,
        fileName: 'artifact-metadata.json',
        value: {},
      });
      const manifestPath = writeJsonFile({directoryPath: temporaryDirectoryPath, fileName: 'manifest.json', value: {}});
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

describe('release appearance CLI entrypoint', () => {
  it('writes help to standard output', () => {
    const actualResult = runNativeCommand(releaseAppearanceEntrypointPath, ['--help']);

    expect(actualResult.exitCode).toBe(0);
    expect(actualResult.standardOutput).toContain('Usage: releaseAppearanceCommand');
  });

  it('supports every release-appearance workflow command shape', () => {
    const betaWriteResult = runNativeCommand(releaseAppearanceEntrypointPath, [
      'beta',
      '2026-06-19.1-beta.1',
      'a'.repeat(40),
    ]);
    const betaDryRunResult = runNativeCommand(releaseAppearanceEntrypointPath, [
      'beta',
      '2026-06-19.1-beta.1',
      'a'.repeat(40),
      '--dry-run',
    ]);
    const productionWriteResult = runNativeCommand(releaseAppearanceEntrypointPath, [
      'production',
      '2026-06-19.1-production',
      'a'.repeat(40),
      '2026-06-19.1-beta.1',
    ]);
    const productionDryRunResult = runNativeCommand(releaseAppearanceEntrypointPath, [
      'production',
      '2026-06-19.1-production',
      'a'.repeat(40),
      '2026-06-19.1-beta.1',
      '--dry-run',
    ]);

    expect(betaWriteResult.exitCode).toBe(1);
    expect(betaWriteResult.standardError).toContain('GITHUB_API_URL must be set');
    expect(betaDryRunResult.exitCode).toBe(1);
    expect(betaDryRunResult.standardError).toContain('GITHUB_API_URL must be set');
    expect(productionWriteResult.exitCode).toBe(1);
    expect(productionWriteResult.standardError).toContain('GITHUB_API_URL must be set');
    expect(productionDryRunResult.exitCode).toBe(1);
    expect(productionDryRunResult.standardError).toContain('GITHUB_API_URL must be set');
  });

  it('preserves domain validation for malformed complete commit SHAs', () => {
    const actualResult = runNativeCommand(releaseAppearanceEntrypointPath, ['beta', '2026-06-19.1-beta.1', 'abcdef0']);

    expect(actualResult.exitCode).toBe(1);
    expect(actualResult.standardError).toContain('Release commit SHA must contain exactly 40 hexadecimal characters');
  });

  it('rejects unknown commands and missing required arguments', () => {
    const unknownCommandResult = runNativeCommand(releaseAppearanceEntrypointPath, ['unknown-command']);
    const missingArgumentResult = runNativeCommand(releaseAppearanceEntrypointPath, ['production']);

    expect(unknownCommandResult.exitCode).toBe(1);
    expect(unknownCommandResult.standardError).toContain("error: unknown command 'unknown-command'");
    expect(missingArgumentResult.exitCode).toBe(1);
    expect(missingArgumentResult.standardError).toContain("error: missing required argument 'production-tag'");
  });
});

describe('preview next Beta CLI entrypoint', () => {
  it('writes help to standard output', () => {
    const actualResult = runNativeCommand(previewNextBetaEntrypointPath, ['--help']);

    expect(actualResult.exitCode).toBe(0);
    expect(actualResult.standardOutput).toContain('Usage: previewNextBetaCommand');
  });

  it('preserves target commit validation after Commander parses the argument', () => {
    const actualResult = runNativeCommand(previewNextBetaEntrypointPath, ['g'.repeat(40)]);

    expect(actualResult.exitCode).toBe(1);
    expect(actualResult.standardError).toContain(
      'Target main commit SHA must contain exactly 40 hexadecimal characters',
    );
  });

  it('rejects unknown options and missing required arguments', () => {
    const unknownOptionResult = runNativeCommand(previewNextBetaEntrypointPath, ['--unknown-option']);
    const missingArgumentResult = runNativeCommand(previewNextBetaEntrypointPath, []);

    expect(unknownOptionResult.exitCode).toBe(1);
    expect(unknownOptionResult.standardError).toContain("error: unknown option '--unknown-option'");
    expect(missingArgumentResult.exitCode).toBe(1);
    expect(missingArgumentResult.standardError).toContain("error: missing required argument 'target-main-commit-sha'");
  });
});
