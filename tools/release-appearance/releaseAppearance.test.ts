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

import {Maybe} from 'true-myth';

import {
  compareBetaCandidates,
  deserializeReleaseAppearanceState,
  mergeReleaseAppearanceComments,
  mergeReleaseAppearanceState,
  parseBetaCandidateTag,
  parsePersistentMarkerComment,
  parseProductionTag,
  renderPersistentComment,
  serializeReleaseAppearanceState,
  validateSameReleaseIdentifier,
} from './releaseAppearance.ts';
import type {ReleaseAppearanceState} from './releaseAppearance.ts';

function createReleaseAppearanceState(betaTag: Maybe<string>, productionTag: Maybe<string>): ReleaseAppearanceState {
  return {beta: betaTag, production: productionTag};
}

test('parses and compares valid release tags', () => {
  const betaNineResult = parseBetaCandidateTag('2026-07-21.3-beta.9');
  const betaTenResult = parseBetaCandidateTag('2026-07-21.3-beta.10');
  const productionResult = parseProductionTag('2026-07-21.3-production');

  assert(betaNineResult.isOk);
  assert(betaTenResult.isOk);
  assert(productionResult.isOk);
  assert.deepStrictEqual(betaTenResult.value, {
    releaseIdentifier: '2026-07-21.3',
    candidateNumber: 10n,
  });
  assert.equal(compareBetaCandidates(betaNineResult.value, betaTenResult.value), -1);
  assert.equal(validateSameReleaseIdentifier(betaTenResult.value, productionResult.value).isOk, true);
});

test('rejects invalid release tags', () => {
  const invalidBetaTags = [
    '2026-07-21-beta.1',
    '2026-07-21.3-beta.0',
    '2026-07-21.3-beta.01',
    'release/2026-07-21.3-beta.1',
    '2026-07-21.3-production',
  ];
  const invalidProductionTags = [
    '2026-07-21-production.1',
    '2026-07-21.0-production',
    '2026-07-21.3-beta.1',
    'release/2026-07-21.3-production',
  ];

  for (const invalidBetaTag of invalidBetaTags) {
    assert.equal(parseBetaCandidateTag(invalidBetaTag).isErr, true);
  }

  for (const invalidProductionTag of invalidProductionTags) {
    assert.equal(parseProductionTag(invalidProductionTag).isErr, true);
  }
});

test('converts between serialized optional fields and domain Maybe values', () => {
  const serializedState = {
    beta: '2026-08-01.1-beta.1',
    production: '2026-08-08.1-production',
  };

  const domainState = deserializeReleaseAppearanceState(serializedState);

  assert(domainState.beta.isJust);
  assert.equal(domainState.beta.value, serializedState.beta);
  assert(domainState.production.isJust);
  assert.equal(domainState.production.value, serializedState.production);
  assert.deepStrictEqual(serializeReleaseAppearanceState(domainState), serializedState);
});

test('serializes and parses first appearances from different releases', () => {
  const state = createReleaseAppearanceState(Maybe.just('2026-08-01.1-beta.1'), Maybe.just('2026-08-08.1-production'));
  const renderedComment = renderPersistentComment(state);

  const parsedStateResult = parsePersistentMarkerComment(renderedComment);

  assert(parsedStateResult.isOk);
  assert(parsedStateResult.value.isJust);
  const parsedState = parsedStateResult.value.value;
  assert(parsedState.beta.isJust);
  assert(parsedState.production.isJust);
  assert.equal(parsedState.beta.value, '2026-08-01.1-beta.1');
  assert.equal(parsedState.production.value, '2026-08-08.1-production');
});

test('preserves cross-release values during later Beta processing', () => {
  const existingState = createReleaseAppearanceState(
    Maybe.just('2026-08-01.1-beta.1'),
    Maybe.just('2026-08-08.1-production'),
  );
  const desiredState = createReleaseAppearanceState(Maybe.just('2026-08-15.1-beta.1'), Maybe.nothing<string>());

  const mergedState = mergeReleaseAppearanceState(existingState, desiredState);

  assert.equal(mergedState, existingState);
});

test('preserves cross-release values during later Production processing', () => {
  const existingState = createReleaseAppearanceState(
    Maybe.just('2026-08-01.1-beta.1'),
    Maybe.just('2026-08-08.1-production'),
  );
  const desiredState = createReleaseAppearanceState(
    Maybe.just('2026-08-15.1-beta.1'),
    Maybe.just('2026-08-15.1-production'),
  );

  const mergedState = mergeReleaseAppearanceState(existingState, desiredState);

  assert.equal(mergedState, existingState);
});

test('fills only missing first-appearance values', () => {
  const existingState = createReleaseAppearanceState(Maybe.just('2026-07-21.3-beta.1'), Maybe.nothing<string>());
  const desiredState = createReleaseAppearanceState(
    Maybe.just('2026-07-21.3-beta.2'),
    Maybe.just('2026-07-21.3-production'),
  );

  const mergedState = mergeReleaseAppearanceState(existingState, desiredState);

  assert(mergedState.beta.isJust);
  assert(mergedState.production.isJust);
  assert.equal(mergedState.beta.value, '2026-07-21.3-beta.1');
  assert.equal(mergedState.production.value, '2026-07-21.3-production');
});

test('creates and updates persistent comments without changing unrelated comments', () => {
  const unrelatedComment = 'Unrelated discussion';
  const betaState = createReleaseAppearanceState(Maybe.just('2026-07-21.3-beta.1'), Maybe.nothing<string>());
  const productionState = createReleaseAppearanceState(Maybe.nothing<string>(), Maybe.just('2026-07-28.1-production'));
  const existingComments = [unrelatedComment, renderPersistentComment(betaState)];

  const mergedCommentsResult = mergeReleaseAppearanceComments(existingComments, productionState);

  assert(mergedCommentsResult.isOk);
  assert.equal(mergedCommentsResult.value[0], unrelatedComment);
  const mergedMarkerComment = Maybe.of(mergedCommentsResult.value[1]);
  assert(mergedMarkerComment.isJust);
  assert.match(mergedMarkerComment.value, /2026-07-21\.3-beta\.1/);
  assert.match(mergedMarkerComment.value, /2026-07-28\.1-production/);
});

test('rejects malformed and unknown persistent marker state', () => {
  const malformedComments = [
    '<!-- wire-webapp-release-appearance:v1\n{"beta":}\n-->',
    '<!-- wire-webapp-release-appearance:v1\n{"beta":"invalid"}\n-->',
    '<!-- wire-webapp-release-appearance:v1\n{"edge":"2026-07-21.3"}\n-->',
    '<!-- wire-webapp-release-appearance:v2\n{"beta":"2026-07-21.3-beta.1"}\n-->',
  ];

  for (const malformedComment of malformedComments) {
    assert.equal(parsePersistentMarkerComment(malformedComment).isErr, true);
  }
});

test('rejects duplicate persistent marker comments', () => {
  const betaState = createReleaseAppearanceState(Maybe.just('2026-07-21.3-beta.1'), Maybe.nothing<string>());
  const markerComment = renderPersistentComment(betaState);

  const mergeResult = mergeReleaseAppearanceComments([markerComment, markerComment], betaState);

  assert.equal(mergeResult.isErr, true);
});
