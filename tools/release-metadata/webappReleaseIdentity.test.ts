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

import {
  createBetaWebAppTagName,
  createNextBetaWebAppTagName,
  createStableWebAppTagName,
  createWebAppReleaseBranchName,
  parseBetaWebAppTagName,
  parseStableWebAppTagName,
  parseWebAppReleaseBranchName,
  validateBetaWebAppTagVersion,
} from './webappReleaseIdentity.ts';
import {validateWebAppVersion} from './webappVersion.ts';

describe('WebApp SemVer release identity', () => {
  it.each([
    ['1.0.0', 'v1.0.0'],
    ['1.4.7', 'v1.4.7'],
    ['2.0.0', 'v2.0.0'],
  ])('creates stable tag %s as %s', (version, expectedTagName) => {
    const actualTagNameResult = createStableWebAppTagName(version);

    assert(actualTagNameResult.isOk);
    expect(actualTagNameResult.value).toBe(expectedTagName);
  });

  it('parses a stable WebApp tag', () => {
    const actualVersionResult = parseStableWebAppTagName('v1.4.7');

    assert(actualVersionResult.isOk);
    expect(actualVersionResult.value).toBe('1.4.7');
  });

  it.each(['1.0.0', 'v1.0', 'v01.0.0', 'v1.0.0-beta.1', 'v1.0.0+build', 'v1.0.0-production'])(
    'rejects invalid stable WebApp tag %s',
    tagName => {
      const actualVersionResult = parseStableWebAppTagName(tagName);

      assert(actualVersionResult.isErr);
    },
  );

  it.each([
    {version: '1.4.0', candidateNumber: 1, expectedTagName: 'v1.4.0-beta.1'},
    {version: '1.4.0', candidateNumber: 2, expectedTagName: 'v1.4.0-beta.2'},
    {version: '2.0.0', candidateNumber: 17, expectedTagName: 'v2.0.0-beta.17'},
  ])('creates beta tag $expectedTagName', options => {
    const actualTagNameResult = createBetaWebAppTagName(options.version, options.candidateNumber);

    assert(actualTagNameResult.isOk);
    expect(actualTagNameResult.value).toBe(options.expectedTagName);
  });

  it('parses a beta tag into its stable version and candidate number', () => {
    const actualBetaTagResult = parseBetaWebAppTagName('v1.4.0-beta.2');

    assert(actualBetaTagResult.isOk);
    expect(actualBetaTagResult.value).toEqual({version: '1.4.0', candidateNumber: 2});
  });

  it('validates a Beta tag belongs to the requested release version', () => {
    const actualTagResult = validateBetaWebAppTagVersion({tagName: 'v1.1.0-beta.2', expectedVersion: '1.1.0'});

    assert(actualTagResult.isOk);
    expect(actualTagResult.value).toBe('v1.1.0-beta.2');
  });

  it('rejects a Beta tag from another release version', () => {
    const actualTagResult = validateBetaWebAppTagVersion({tagName: 'v1.2.0-beta.2', expectedVersion: '1.1.0'});

    assert(actualTagResult.isErr);
    expect(actualTagResult.error.message).toContain('belongs to 1.2.0, expected 1.1.0');
  });

  it('creates the first Beta candidate when no tags exist', () => {
    const versionResult = validateWebAppVersion('1.1.0');
    assert(versionResult.isOk);

    const actualTagNameResult = createNextBetaWebAppTagName(versionResult.value, []);

    assert(actualTagNameResult.isOk);
    expect(actualTagNameResult.value).toBe('v1.1.0-beta.1');
  });

  it('creates the first matching Beta candidate and ignores other release identities', () => {
    const versionResult = validateWebAppVersion('1.1.0');
    assert(versionResult.isOk);

    const actualTagNameResult = createNextBetaWebAppTagName(versionResult.value, [
      'v1.2.0-beta.9',
      '2026-10-06.1-beta.4',
      'v1.1.0',
    ]);

    assert(actualTagNameResult.isOk);
    expect(actualTagNameResult.value).toBe('v1.1.0-beta.1');
  });

  it('increments contiguous matching SemVer Beta candidates and ignores unrelated tags', () => {
    const versionResult = validateWebAppVersion('1.1.0');
    assert(versionResult.isOk);

    const actualTagNameResult = createNextBetaWebAppTagName(versionResult.value, [
      'v1.1.0-beta.1',
      'v1.1.0-beta.2',
      'v1.2.0-beta.9',
      '2026-10-06.1-beta.4',
    ]);

    assert(actualTagNameResult.isOk);
    expect(actualTagNameResult.value).toBe('v1.1.0-beta.3');
  });

  it('rejects a gap in matching SemVer Beta candidates', () => {
    const versionResult = validateWebAppVersion('1.1.0');
    assert(versionResult.isOk);

    const actualTagNameResult = createNextBetaWebAppTagName(versionResult.value, ['v1.1.0-beta.1', 'v1.1.0-beta.3']);

    assert(actualTagNameResult.isErr);
    expect(actualTagNameResult.error.message).toContain('v1.1.0-beta.2');
  });

  it('rejects matching SemVer Beta history when the first candidate is missing', () => {
    const versionResult = validateWebAppVersion('1.1.0');
    assert(versionResult.isOk);

    const actualTagNameResult = createNextBetaWebAppTagName(versionResult.value, ['v1.1.0-beta.2']);

    assert(actualTagNameResult.isErr);
    expect(actualTagNameResult.error.message).toContain('v1.1.0-beta.1');
  });

  it('rejects duplicate matching SemVer Beta candidate identities', () => {
    const versionResult = validateWebAppVersion('1.1.0');
    assert(versionResult.isOk);

    const actualTagNameResult = createNextBetaWebAppTagName(versionResult.value, ['v1.1.0-beta.2', 'v1.1.0-beta.2']);

    assert(actualTagNameResult.isErr);
    expect(actualTagNameResult.error.message).toContain('Duplicate WebApp Beta candidate');
  });

  it.each(['v1.1.0-beta.0', 'v1.1.0-beta.01', 'v1.1.0-beta.9007199254740992'])(
    'fails closed on malformed matching Beta candidate %s',
    malformedBetaTagName => {
      const versionResult = validateWebAppVersion('1.1.0');
      assert(versionResult.isOk);

      const actualTagNameResult = createNextBetaWebAppTagName(versionResult.value, [malformedBetaTagName]);

      assert(actualTagNameResult.isErr);
    },
  );

  it.each(['v1.4.0-beta.0', 'v1.4.0-beta.01', 'v1.4.0-alpha.1', 'v1.4.0-production'])(
    'rejects invalid WebApp Beta tag %s',
    tagName => {
      const actualBetaTagResult = parseBetaWebAppTagName(tagName);

      assert(actualBetaTagResult.isErr);
    },
  );

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid Beta candidate number %s', candidateNumber => {
    const actualTagNameResult = createBetaWebAppTagName('1.4.0', candidateNumber);

    assert(actualTagNameResult.isErr);
  });

  it('creates and parses a SemVer release branch', () => {
    const actualBranchNameResult = createWebAppReleaseBranchName('1.4.0');

    assert(actualBranchNameResult.isOk);
    expect(actualBranchNameResult.value).toBe('release/1.4.0');

    const actualVersionResult = parseWebAppReleaseBranchName(actualBranchNameResult.value);

    assert(actualVersionResult.isOk);
    expect(actualVersionResult.value).toBe('1.4.0');
  });

  it.each(['release/v1.4.0', 'release/1.4', 'release/1.4.0-beta.1', 'release/01.4.0'])(
    'rejects invalid SemVer release branch %s',
    branchName => {
      const actualVersionResult = parseWebAppReleaseBranchName(branchName);

      assert(actualVersionResult.isErr);
    },
  );

  it('does not parse a legacy date release branch as a SemVer branch', () => {
    const actualVersionResult = parseWebAppReleaseBranchName('release/2026-10-06.1');

    assert(actualVersionResult.isErr);
  });
});
