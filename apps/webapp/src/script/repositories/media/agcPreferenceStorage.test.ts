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

import {Maybe} from 'true-myth';

import {parseSerializedAgcPreference} from './agcPreferenceStorage';

describe('parseSerializedAgcPreference', () => {
  it('returns the stored enabled AGC preference', () => {
    const storedAgcPreference = parseSerializedAgcPreference('true');

    expect(storedAgcPreference).toEqual(Maybe.just(true));
  });

  it('returns the stored disabled AGC preference', () => {
    const storedAgcPreference = parseSerializedAgcPreference('false');

    expect(storedAgcPreference).toEqual(Maybe.just(false));
  });

  it('returns nothing for non-boolean JSON values', () => {
    const storedAgcPreference = parseSerializedAgcPreference('"not-a-boolean"');

    expect(storedAgcPreference.isNothing).toBe(true);
  });

  it('returns nothing for malformed JSON values', () => {
    const storedAgcPreference = parseSerializedAgcPreference('not-json');

    expect(storedAgcPreference.isNothing).toBe(true);
  });
});
