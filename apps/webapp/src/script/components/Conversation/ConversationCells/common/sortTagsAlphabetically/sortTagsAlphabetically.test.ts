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

import {sortTagsAlphabetically} from './sortTagsAlphabetically';

describe('sortTagsAlphabetically', () => {
  it('sorts tags alphabetically without case affecting their order', () => {
    expect(sortTagsAlphabetically(['Zulu', 'alpha', 'Beta'])).toEqual(['alpha', 'Beta', 'Zulu']);
  });

  it('preserves accent differences when ordering free-text tags', () => {
    expect(sortTagsAlphabetically(['résumé', 'resume'])).toEqual(['resume', 'résumé']);
  });

  it('sorts non-ASCII tag names', () => {
    expect(sortTagsAlphabetically(['Яблоко', 'арбуз', 'Банан'])).toEqual(['арбуз', 'Банан', 'Яблоко']);
  });

  it('does not mutate the original tags', () => {
    const tags = ['Zulu', 'alpha'];

    sortTagsAlphabetically(tags);

    expect(tags).toEqual(['Zulu', 'alpha']);
  });
});
