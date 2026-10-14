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

import type {PullRequestReleaseImpact} from './pullRequestReleaseImpact.ts';
import {resolveNextWebAppReleaseVersion, resolveWebAppVersionBump} from './webappReleaseVersion.ts';
import type {WebAppVersionBump} from './webappVersion.ts';

type WebAppVersionBumpTestCase = {
  readonly releaseImpacts: readonly PullRequestReleaseImpact[];
  readonly expectedBump: WebAppVersionBump;
};

type WebAppReleaseVersionTestCase = {
  readonly currentVersion: string;
  readonly releaseImpacts: readonly PullRequestReleaseImpact[];
  readonly expectedVersion: string;
};

type UnversionedWebAppChangesTestCase = {
  readonly releaseImpacts: readonly PullRequestReleaseImpact[];
};

describe('WebApp release version domain logic', () => {
  it.each<WebAppVersionBumpTestCase>([
    {releaseImpacts: ['patch'], expectedBump: 'patch'},
    {releaseImpacts: ['none', 'patch'], expectedBump: 'patch'},
    {releaseImpacts: ['patch', 'patch', 'none'], expectedBump: 'patch'},
    {releaseImpacts: ['patch', 'minor', 'none'], expectedBump: 'minor'},
    {releaseImpacts: ['minor', 'patch', 'minor'], expectedBump: 'minor'},
    {releaseImpacts: ['patch', 'major', 'minor'], expectedBump: 'major'},
    {releaseImpacts: ['patch', 'major', 'minor', 'none'], expectedBump: 'major'},
    {releaseImpacts: ['none', 'major'], expectedBump: 'major'},
    {releaseImpacts: ['major', 'patch'], expectedBump: 'major'},
  ])('resolves $releaseImpacts to $expectedBump regardless of ordering', options => {
    const {releaseImpacts, expectedBump} = options;
    const actualBumpResult = resolveWebAppVersionBump(releaseImpacts);
    const actualReversedBumpResult = resolveWebAppVersionBump(releaseImpacts.toReversed());

    assert(actualBumpResult.isOk);
    assert(actualReversedBumpResult.isOk);
    expect(actualBumpResult.value).toBe(expectedBump);
    expect(actualReversedBumpResult.value).toBe(expectedBump);
  });

  it.each<UnversionedWebAppChangesTestCase>([
    {releaseImpacts: []},
    {releaseImpacts: ['none']},
    {releaseImpacts: ['none', 'none']},
    {releaseImpacts: ['none', 'none', 'none']},
  ])('rejects $releaseImpacts without allocating a release version', options => {
    const actualBumpResult = resolveWebAppVersionBump(options.releaseImpacts);
    const actualVersionResult = resolveNextWebAppReleaseVersion('1.4.0', options.releaseImpacts);

    assert(actualBumpResult.isErr);
    assert(actualVersionResult.isErr);
    expect(actualBumpResult.error.message).toBe('No release-impacting WebApp changes are present');
    expect(actualVersionResult.error.message).toBe(actualBumpResult.error.message);
  });

  it.each<WebAppReleaseVersionTestCase>([
    {currentVersion: '1.4.0', releaseImpacts: ['patch'], expectedVersion: '1.4.1'},
    {currentVersion: '1.4.0', releaseImpacts: ['none', 'patch'], expectedVersion: '1.4.1'},
    {currentVersion: '1.4.0', releaseImpacts: ['none', 'patch', 'patch'], expectedVersion: '1.4.1'},
    {currentVersion: '1.4.0', releaseImpacts: ['patch', 'minor'], expectedVersion: '1.5.0'},
    {currentVersion: '1.4.7', releaseImpacts: ['minor', 'none'], expectedVersion: '1.5.0'},
    {currentVersion: '1.4.7', releaseImpacts: ['patch', 'major', 'minor'], expectedVersion: '2.0.0'},
    {currentVersion: '0.27.0', releaseImpacts: ['patch'], expectedVersion: '0.27.1'},
    {currentVersion: '0.27.0', releaseImpacts: ['minor'], expectedVersion: '0.28.0'},
    {currentVersion: '0.27.0', releaseImpacts: ['major'], expectedVersion: '1.0.0'},
  ])('resolves $currentVersion with $releaseImpacts to $expectedVersion', options => {
    const {currentVersion, releaseImpacts, expectedVersion} = options;
    const actualVersionResult = resolveNextWebAppReleaseVersion(currentVersion, releaseImpacts);

    assert(actualVersionResult.isOk);
    expect(actualVersionResult.value).toBe(expectedVersion);
  });

  it('returns the existing stable version domain error for an invalid current version', () => {
    const actualVersionResult = resolveNextWebAppReleaseVersion('1.4.0-beta.1', ['patch']);

    assert(actualVersionResult.isErr);
    expect(actualVersionResult.error.message).toBe('Invalid WebApp version: 1.4.0-beta.1');
  });

  it('leaves the included release impacts unchanged', () => {
    const releaseImpacts: readonly PullRequestReleaseImpact[] = Object.freeze(['patch', 'none', 'major', 'minor']);
    const actualBumpResult = resolveWebAppVersionBump(releaseImpacts);
    const actualVersionResult = resolveNextWebAppReleaseVersion('1.4.7', releaseImpacts);

    assert(actualBumpResult.isOk);
    assert(actualVersionResult.isOk);
    expect(actualBumpResult.value).toBe('major');
    expect(actualVersionResult.value).toBe('2.0.0');
    expect(releaseImpacts).toEqual(['patch', 'none', 'major', 'minor']);
  });
});
