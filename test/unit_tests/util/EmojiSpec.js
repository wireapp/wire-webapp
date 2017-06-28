/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

// grunt test_init && grunt test_run:util/Emoji

'use strict';

describe('z.util.emoji', function() {
  describe('includes_only_emojies', function() {
    it('returns false for empty string', function() {
      expect(z.util.emoji.includes_only_emojies('')).toBeFalsy();
    });

    it('returns false for undefined', function() {
      expect(z.util.emoji.includes_only_emojies('')).toBeFalsy();
    });

    it('returns true for text containing only emojies (Miscellaneous Symbols)', function() {
      expect(z.util.emoji.includes_only_emojies('☕')).toBeTruthy();
      expect(z.util.emoji.includes_only_emojies('⛄')).toBeTruthy();
      expect(z.util.emoji.includes_only_emojies('⚽')).toBeTruthy();
      expect(z.util.emoji.includes_only_emojies('🇩🇰')).toBeTruthy();
      expect(z.util.emoji.includes_only_emojies('🏌️‍♀️')).toBeTruthy();
    });

    it('returns true for text containing only emojies and whitespaces (Miscellaneous Symbols)', function() {
      expect(z.util.emoji.includes_only_emojies('☕ ⚽')).toBeTruthy();
      expect(z.util.emoji.includes_only_emojies('☕  ⚽')).toBeTruthy();
    });

    it('returns false for text containing only text and emojies', function() {
      expect(z.util.emoji.includes_only_emojies('Hey 💩')).toBeFalsy();
    });
  });
});
