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

import {extractEmojiDataEntries} from './EmojiDataSource';

describe('EmojiDataSource', () => {
  it('extracts emoji entries from the nested emoji-picker-react data shape', () => {
    const emojiDataSource = {
      categories: {
        smileys_people: {category: 'smileys_people', name: 'people & body'},
      },
      emojis: {
        smileys_people: [{n: ['grinning face'], u: '1f600'}],
        objects: [{n: ['watch'], u: '231a'}],
      },
    };

    expect(extractEmojiDataEntries(emojiDataSource)).toEqual([
      {n: ['grinning face'], u: '1f600'},
      {n: ['watch'], u: '231a'},
    ]);
  });

  it('extracts emoji entries from the legacy top-level category map shape', () => {
    const emojiDataSource = {
      smileys_people: [{n: ['grinning face'], u: '1f600'}],
      objects: [{n: ['watch'], u: '231a'}],
    };

    expect(extractEmojiDataEntries(emojiDataSource)).toEqual([
      {n: ['grinning face'], u: '1f600'},
      {n: ['watch'], u: '231a'},
    ]);
  });

  it('returns an empty list for invalid emoji data structures', () => {
    const invalidEmojiDataSource = {
      emojis: {
        smileys_people: [{name: 'grinning face', unicode: '1f600'}],
      },
    };

    expect(extractEmojiDataEntries(invalidEmojiDataSource)).toEqual([]);
  });
});
