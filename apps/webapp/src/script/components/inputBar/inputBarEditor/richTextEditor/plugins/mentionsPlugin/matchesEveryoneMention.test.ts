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

import {matchesEveryoneMention} from './mentionsPlugin';

describe('matchesEveryoneMention', () => {
  it.each(['', 'a', 'al', 'all', 'A', 'AL', 'All'])('matches the query "%s"', query => {
    expect(matchesEveryoneMention(query)).toBe(true);
  });

  it.each(['b', 'alle', 'allison', 'x', ' all'])('does not match the query "%s"', query => {
    expect(matchesEveryoneMention(query)).toBe(false);
  });

  it('does not match when there is no active query', () => {
    expect(matchesEveryoneMention(null)).toBe(false);
    expect(matchesEveryoneMention(undefined)).toBe(false);
  });
});
