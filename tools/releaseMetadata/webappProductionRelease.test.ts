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

import assert from 'node:assert';

import {parseWebAppProductionRelease, resolveWebappBuildVersion} from './webappProductionRelease.ts';

describe('WebApp Production release tags', () => {
  it.each([
    ['v1.0.0', '1.0.0'],
    ['v1.10.0', '1.10.0'],
    ['v2.0.0', '2.0.0'],
  ])('parses stable WebApp Production tag %s as version %s', (tagName, version) => {
    const actualProductionReleaseResult = parseWebAppProductionRelease(tagName);

    assert(actualProductionReleaseResult.isOk);
    expect(actualProductionReleaseResult.value).toEqual({
      kind: 'semver',
      tagName,
      version,
      buildVersion: version,
    });
  });

  it('parses the bootstrap legacy Production tag without changing its build version', () => {
    const actualProductionReleaseResult = parseWebAppProductionRelease('2026-10-06.1-production');

    assert(actualProductionReleaseResult.isOk);
    expect(actualProductionReleaseResult.value).toEqual({
      kind: 'legacy',
      tagName: '2026-10-06.1-production',
      buildVersion: '2026-10-06.1',
    });
  });

  it.each([
    '1.0.0',
    'v1.1',
    'v01.0.0',
    'v1.0.0-beta.1',
    'v1.0.0-production',
    'v1.0.0+build',
    '2026-10-06-production.1',
  ])('rejects invalid WebApp Production tag %s', tagName => {
    const actualProductionReleaseResult = parseWebAppProductionRelease(tagName);

    expect(actualProductionReleaseResult.isErr).toBe(true);
  });
});

describe('WebApp Production build version resolution', () => {
  it('resolves a stable SemVer Production tag to its WebApp version', () => {
    const actualBuildVersionResult = resolveWebappBuildVersion('v1.1.0', 'a'.repeat(40), 'production');

    assert(actualBuildVersionResult.isOk);
    expect(actualBuildVersionResult.value).toBe('1.1.0');
  });

  it('rejects a Beta tag as a Production build reference', () => {
    const actualBuildVersionResult = resolveWebappBuildVersion('v1.1.0-beta.1', 'a'.repeat(40), 'production');

    assert(actualBuildVersionResult.isErr);
    expect(actualBuildVersionResult.error.message).toContain('Invalid production tag name');
  });

  it('preserves historical timestamp Production build versions', () => {
    const historicalBuildVersion = '2026-10-06-production.1';
    const actualBuildVersionResult = resolveWebappBuildVersion(historicalBuildVersion, 'a'.repeat(40), 'production');

    assert(actualBuildVersionResult.isOk);
    expect(actualBuildVersionResult.value).toBe(historicalBuildVersion);
  });
});
