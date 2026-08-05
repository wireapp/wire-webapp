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

import {runReleaseMetadataCli} from './releaseMetadataCli';

type ReleaseMetadataCliTestResult = {
  readonly errors: readonly string[];
  readonly exitCode: number;
  readonly outputs: readonly string[];
};

function runCommand(commandLineArguments: readonly string[]): ReleaseMetadataCliTestResult {
  const errors: string[] = [];
  const outputs: string[] = [];
  const exitCode = runReleaseMetadataCli(commandLineArguments, {
    writeError(message) {
      errors.push(message);
    },
    writeOutput(message) {
      outputs.push(message);
    },
  });

  return {errors, exitCode, outputs};
}

describe('releaseMetadataCli', () => {
  it('prints the release identifier from a valid release branch name', () => {
    const actualResult = runCommand(['release-identifier-from-branch', 'release/2026-06-19.1']);

    expect(actualResult).toEqual({
      errors: [],
      exitCode: 0,
      outputs: ['2026-06-19.1'],
    });
  });

  it('rejects an invalid release branch name', () => {
    const actualResult = runCommand(['release-identifier-from-branch', 'release/2026-06-19.0']);

    expect(actualResult).toEqual({
      errors: ['Invalid release branch name: release/2026-06-19.0'],
      exitCode: 1,
      outputs: [],
    });
  });

  it('prints the release branch name for the release identifier', () => {
    const actualResult = runCommand(['release-branch', '2026-06-19.1']);

    expect(actualResult).toEqual({
      errors: [],
      exitCode: 0,
      outputs: ['release/2026-06-19.1'],
    });
  });

  it('rejects an invalid release branch release identifier', () => {
    const actualResult = runCommand(['release-branch', 'release/2026-06-19.1']);

    expect(actualResult).toEqual({
      errors: ['Invalid release identifier: release/2026-06-19.1'],
      exitCode: 1,
      outputs: [],
    });
  });

  it('prints the next beta tag name for the release identifier', () => {
    const actualResult = runCommand([
      'next-beta-tag',
      '2026-06-19.1',
      '2026-06-18.1-beta.9',
      '2026-06-19.1-beta.1',
      '2026-06-19.1-beta.2',
      '2026-06-19.1-production',
    ]);

    expect(actualResult).toEqual({
      errors: [],
      exitCode: 0,
      outputs: ['2026-06-19.1-beta.3'],
    });
  });

  it('prints the production tag name for the release identifier', () => {
    const actualResult = runCommand(['production-tag', '2026-06-19.1']);

    expect(actualResult).toEqual({
      errors: [],
      exitCode: 0,
      outputs: ['2026-06-19.1-production'],
    });
  });

  it('rejects an invalid production tag release identifier', () => {
    const actualResult = runCommand(['production-tag', '2026-06-19']);

    expect(actualResult).toEqual({
      errors: ['Invalid release identifier: 2026-06-19'],
      exitCode: 1,
      outputs: [],
    });
  });

  it('validates a production tag name', () => {
    const actualResult = runCommand(['validate-production-tag', '2026-06-19.1-production']);

    expect(actualResult).toEqual({
      errors: [],
      exitCode: 0,
      outputs: ['2026-06-19.1-production'],
    });
  });

  it('prints the ADR webapp build version', () => {
    const actualResult = runCommand([
      'webapp-build-version',
      '2026-06-19.1-production',
      '025edc663787b3d2da366f21a5958013201e6cd4',
      'development',
    ]);

    expect(actualResult).toEqual({
      errors: [],
      exitCode: 0,
      outputs: ['2026-06-19.1'],
    });
  });

  it('prints the complete legacy webapp build version', () => {
    const actualResult = runCommand([
      'webapp-build-version',
      '2026-06-19-production.1',
      '025edc663787b3d2da366f21a5958013201e6cd4',
      'development',
    ]);

    expect(actualResult).toEqual({
      errors: [],
      exitCode: 0,
      outputs: ['2026-06-19-production.1'],
    });
  });

  it.each(['2026-07-20-staging.1'])(
    'prints the development webapp build version for non-production reference "%s"',
    buildReferenceName => {
      const actualResult = runCommand([
        'webapp-build-version',
        buildReferenceName,
        '025edc663787b3d2da366f21a5958013201e6cd4',
        'development',
      ]);

      expect(actualResult).toEqual({
        errors: [],
        exitCode: 0,
        outputs: ['dev-025edc6'],
      });
    },
  );

  it('rejects an invalid production tag name', () => {
    const actualResult = runCommand(['validate-production-tag', '2026-06-19.0-production']);

    expect(actualResult).toEqual({
      errors: ['Invalid production tag name: 2026-06-19.0-production'],
      exitCode: 1,
      outputs: [],
    });
  });

  it('validates a maintenance line key', () => {
    const actualResult = runCommand(['validate-maintenance-line-key', '2026-07-27.1-airgap-a']);

    expect(actualResult).toEqual({
      errors: [],
      exitCode: 0,
      outputs: ['2026-07-27.1-airgap-a'],
    });
  });

  it('prints a maintenance branch name', () => {
    const actualResult = runCommand(['maintenance-branch', '2026-07-27.1-airgap-a']);

    expect(actualResult).toEqual({
      errors: [],
      exitCode: 0,
      outputs: ['maintenance/2026-07-27.1-airgap-a'],
    });
  });

  it('prints the maintenance line key from a branch name', () => {
    const actualResult = runCommand(['maintenance-line-key-from-branch', 'maintenance/2026-07-27.1-airgap-a']);

    expect(actualResult).toEqual({
      errors: [],
      exitCode: 0,
      outputs: ['2026-07-27.1-airgap-a'],
    });
  });

  it('prints maintenance tag metadata as JSON', () => {
    const actualResult = runCommand(['maintenance-tag-metadata', '2026-07-27.1-airgap-a-maintenance.12']);

    expect(actualResult).toEqual({
      errors: [],
      exitCode: 0,
      outputs: ['{"lineKey":"2026-07-27.1-airgap-a","sequence":12}'],
    });
  });

  it('prints the next maintenance tag and ignores unrelated tags', () => {
    const actualResult = runCommand([
      'next-maintenance-tag',
      '2026-07-27.1-airgap-a',
      '2026-07-27.1-airgap-b-maintenance.99',
      '2026-07-27.1-airgap-a-maintenance.9',
      '2026-07-27.1-airgap-a-maintenance.10',
    ]);

    expect(actualResult).toEqual({
      errors: [],
      exitCode: 0,
      outputs: ['2026-07-27.1-airgap-a-maintenance.11'],
    });
  });

  it('determines whether a maintenance tag points to the selected commit', () => {
    const actualResult = runCommand([
      'maintenance-tag-points-to-commit',
      '2026-07-27.1-airgap-a',
      '1234567890abcdef',
      '2026-07-27.1-airgap-b-maintenance.1',
      '1234567890abcdef',
      '2026-07-27.1-airgap-a-maintenance.1',
      '1234567890abcdef',
    ]);

    expect(actualResult).toEqual({
      errors: [],
      exitCode: 0,
      outputs: ['true'],
    });
  });

  it('rejects a blank selected commit', () => {
    const actualResult = runCommand([
      'maintenance-tag-points-to-commit',
      '2026-07-27.1-airgap-a',
      '   ',
      '2026-07-27.1-airgap-a-maintenance.1',
      '1234567890abcdef',
    ]);

    expect(actualResult.exitCode).toBe(1);
    expect(actualResult.outputs).toEqual([]);
    expect(actualResult.errors[0]).toContain('Usage:');
  });

  it('validates that a maintenance source belongs to the same release', () => {
    const actualResult = runCommand([
      'validate-maintenance-source',
      '2026-07-27.1-airgap-a',
      '2026-07-27.1-production',
    ]);

    expect(actualResult).toEqual({
      errors: [],
      exitCode: 0,
      outputs: ['2026-07-27.1'],
    });
  });

  it('prints usage text for missing command arguments', () => {
    const actualResult = runCommand(['next-beta-tag']);

    expect(actualResult.exitCode).toBe(1);
    expect(actualResult.outputs).toEqual([]);
    expect(actualResult.errors[0]).toContain('Usage:');
  });
});
