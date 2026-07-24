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
  compareBetaCandidates,
  mergeReleaseAppearanceComments,
  mergeReleaseAppearanceState,
  parseBetaCandidateTag,
  parsePersistentMarkerComment,
  parseProductionTag,
  renderPersistentComment,
  validateSameReleaseIdentifier,
} from './releaseAppearance.ts';
import type {ReleaseAppearanceState} from './releaseAppearance.ts';

describe('release appearance', (): void => {
  test('parses a valid Beta candidate tag', (): void => {
    const actualResult = parseBetaCandidateTag('2026-07-21.3-beta.10');

    assert(actualResult.isOk);
    const actualValue = actualResult.value;
    const expectedValue = {
      releaseIdentifier: '2026-07-21.3',
      candidateNumber: 10n,
    };
    expect(actualValue).toStrictEqual(expectedValue);
  });

  test.each([
    '2026-07-21-beta.1',
    '2026-07-21.3-beta.0',
    '2026-07-21.3-beta.01',
    '2026-7-21.3-beta.1',
    'release/2026-07-21.3-beta.1',
    '2026-07-21.3-production',
  ])('rejects invalid Beta candidate tag %s', (invalidBetaTag): void => {
    assert(parseBetaCandidateTag(invalidBetaTag).isErr);
  });

  test('parses a valid Production tag', (): void => {
    const actualResult = parseProductionTag('2026-07-21.3-production');

    assert(actualResult.isOk);
    const actualValue = actualResult.value;
    const expectedValue = {releaseIdentifier: '2026-07-21.3'};
    expect(actualValue).toStrictEqual(expectedValue);
  });

  test.each([
    '2026-07-21-production.1',
    '2026-07-21.0-production',
    '2026-07-21.3-beta.1',
    '2026-7-21.3-production',
    'release/2026-07-21.3-production',
  ])('rejects invalid Production tag %s', (invalidProductionTag): void => {
    assert(parseProductionTag(invalidProductionTag).isErr);
  });

  test('compares Beta candidates by numeric candidate number', (): void => {
    const betaNineResult = parseBetaCandidateTag('2026-07-21.3-beta.9');
    const betaTenResult = parseBetaCandidateTag('2026-07-21.3-beta.10');

    assert(betaNineResult.isOk);
    assert(betaTenResult.isOk);
    expect(compareBetaCandidates(betaNineResult.value, betaTenResult.value)).toBe(-1);
    expect(compareBetaCandidates(betaTenResult.value, betaNineResult.value)).toBe(1);
  });

  test('validates that Beta and Production tags belong to the same release', (): void => {
    const betaCandidateResult = parseBetaCandidateTag('2026-07-21.3-beta.1');
    const matchingProductionTagResult = parseProductionTag('2026-07-21.3-production');
    const differentProductionTagResult = parseProductionTag('2026-07-22.1-production');

    assert(betaCandidateResult.isOk);
    assert(matchingProductionTagResult.isOk);
    assert(differentProductionTagResult.isOk);
    const matchingResult = validateSameReleaseIdentifier(betaCandidateResult.value, matchingProductionTagResult.value);

    assert(matchingResult.isOk);
    expect(matchingResult.value).toBe('2026-07-21.3');

    assert(validateSameReleaseIdentifier(betaCandidateResult.value, differentProductionTagResult.value).isErr);
  });

  test('creates the first Beta appearance comment', (): void => {
    const betaState: ReleaseAppearanceState = {beta: '2026-07-21.3-beta.1'};
    const actualResult = mergeReleaseAppearanceComments([], betaState);

    assert(actualResult.isOk);
    const actualValue = actualResult.value;
    const expectedValue = [renderPersistentComment(betaState)];
    expect(actualValue).toStrictEqual(expectedValue);
    expect(actualValue[0]).toMatch(/\| Beta \| `2026-07-21\.3-beta\.1` \|/);
    expect(actualValue[0]).toMatch(/\| Production \| Not yet deployed \|/);
  });

  test('adds Production to an existing Beta appearance', (): void => {
    const existingComments = [renderPersistentComment({beta: '2026-07-21.3-beta.1'})];
    const desiredReleaseState: ReleaseAppearanceState = {production: '2026-07-21.3-production'};

    const actualResult = mergeReleaseAppearanceComments(existingComments, desiredReleaseState);

    assert(actualResult.isOk);
    const expectedState: ReleaseAppearanceState = {
      beta: '2026-07-21.3-beta.1',
      production: '2026-07-21.3-production',
    };
    const actualValue = actualResult.value;
    const expectedValue = [renderPersistentComment(expectedState)];
    expect(actualValue).toStrictEqual(expectedValue);
  });

  test('preserves an existing Beta value while filling another missing value', (): void => {
    const existingState: ReleaseAppearanceState = {beta: '2026-07-21.3-beta.1'};
    const desiredState: ReleaseAppearanceState = {
      beta: '2026-07-21.3-beta.2',
      production: '2026-07-21.3-production',
    };

    const actualState = mergeReleaseAppearanceState(existingState, desiredState);

    const expectedState: ReleaseAppearanceState = {
      beta: '2026-07-21.3-beta.1',
      production: '2026-07-21.3-production',
    };
    expect(actualState).toStrictEqual(expectedState);
  });

  test('preserves an existing Production value', (): void => {
    const existingState: ReleaseAppearanceState = {production: '2026-07-21.3-production'};
    const desiredState: ReleaseAppearanceState = {production: '2026-07-21.3-production'};

    const actualState = mergeReleaseAppearanceState(existingState, desiredState);

    expect(actualState).toBe(existingState);
  });

  test('returns unchanged state and comments when nothing is missing', (): void => {
    const existingState: ReleaseAppearanceState = {
      beta: '2026-07-21.3-beta.1',
      production: '2026-07-21.3-production',
    };
    const existingComments = [renderPersistentComment(existingState)];

    const unchangedState = mergeReleaseAppearanceState(existingState, {beta: '2026-07-21.3-beta.2'});
    expect(unchangedState).toBe(existingState);

    const actualResult = mergeReleaseAppearanceComments(existingComments, {beta: '2026-07-21.3-beta.2'});

    assert(actualResult.isOk);
    expect(actualResult.value).toBe(existingComments);
  });

  test('ignores unrelated comments while updating the persistent comment', (): void => {
    const unrelatedComment = 'This discussion comment is unrelated to release appearance.';
    const existingComments = [unrelatedComment, renderPersistentComment({beta: '2026-07-21.3-beta.1'})];
    const desiredState: ReleaseAppearanceState = {production: '2026-07-21.3-production'};

    const actualResult = mergeReleaseAppearanceComments(existingComments, desiredState);

    assert(actualResult.isOk);
    expect(actualResult.value[0]).toBe(unrelatedComment);
    expect(actualResult.value[1]).toMatch(/\| Production \| `2026-07-21\.3-production` \|/);
  });

  test.each([
    '<!-- wire-webapp-release-appearance:v1\n{"beta":"legacy-2026-07-21-beta.1"}\n-->',
    '<!-- wire-webapp-release-appearance:v1\n{"beta":}\n-->',
    '<!-- wire-webapp-release-appearance:v1\n{"beta":"2026-07-21.3-beta.1","production":"2026-07-22.1-production"}\n-->',
  ])('rejects malformed marker state %s', (malformedComment): void => {
    assert(parsePersistentMarkerComment(malformedComment).isErr);
  });

  test('rejects unsupported marker versions', (): void => {
    const unsupportedMarkerComment = '<!-- wire-webapp-release-appearance:v2\n{"beta":"2026-07-21.3-beta.1"}\n-->';

    assert(parsePersistentMarkerComment(unsupportedMarkerComment).isErr);
  });

  test('rejects duplicate marker comments', (): void => {
    const markerComment = renderPersistentComment({beta: '2026-07-21.3-beta.1'});
    const duplicateComments = [markerComment, markerComment];

    assert(mergeReleaseAppearanceComments(duplicateComments, {production: '2026-07-21.3-production'}).isErr);
  });
});
