/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {includesOnlyEmojis} from 'Util/EmojiUtil';

describe('EmojiUtil', () => {
  describe('includesOnlyEmojis', () => {
    it('returns false for empty string', () => {
      expect(includesOnlyEmojis('')).toBeFalsy();
    });

    it('returns false for undefined', () => {
      expect(includesOnlyEmojis()).toBeFalsy();
    });

    it('returns true for text containing only emojis (Miscellaneous Symbols)', () => {
      expect(includesOnlyEmojis('☕')).toBeTruthy();
      expect(includesOnlyEmojis('⛄')).toBeTruthy();
      expect(includesOnlyEmojis('⚽')).toBeTruthy();
      expect(includesOnlyEmojis('🇩🇰')).toBeTruthy();
      expect(includesOnlyEmojis('🏌️‍♀️')).toBeTruthy();
    });

    it('returns true for text containing only emojis and whitespaces (Miscellaneous Symbols)', () => {
      expect(includesOnlyEmojis('☕ ⚽')).toBeTruthy();
      expect(includesOnlyEmojis('☕  ⚽')).toBeTruthy();
    });

    it('returns false for text containing only text and emojis', () => {
      expect(includesOnlyEmojis('Hey 💩')).toBeFalsy();
    });
  });
});
