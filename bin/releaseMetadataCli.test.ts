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

  it('rejects an invalid production tag name', () => {
    const actualResult = runCommand(['validate-production-tag', '2026-06-19.0-production']);

    expect(actualResult).toEqual({
      errors: ['Invalid production tag name: 2026-06-19.0-production'],
      exitCode: 1,
      outputs: [],
    });
  });

  it('prints usage text for missing command arguments', () => {
    const actualResult = runCommand(['next-beta-tag']);

    expect(actualResult.exitCode).toBe(1);
    expect(actualResult.outputs).toEqual([]);
    expect(actualResult.errors[0]).toContain('Usage:');
  });
});
