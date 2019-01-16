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

describe('z.util.emoji', () => {
  describe('includes_only_emojies', () => {
    it('returns false for empty string', () => {
      expect(z.util.EmojiUtil.includesOnlyEmojies('')).toBeFalsy();
    });

    it('returns false for undefined', () => {
      expect(z.util.EmojiUtil.includesOnlyEmojies('')).toBeFalsy();
    });

    it('returns true for text containing only emojies (Miscellaneous Symbols)', () => {
      expect(z.util.EmojiUtil.includesOnlyEmojies('☕')).toBeTruthy();
      expect(z.util.EmojiUtil.includesOnlyEmojies('⛄')).toBeTruthy();
      expect(z.util.EmojiUtil.includesOnlyEmojies('⚽')).toBeTruthy();
      expect(z.util.EmojiUtil.includesOnlyEmojies('🇩🇰')).toBeTruthy();
      expect(z.util.EmojiUtil.includesOnlyEmojies('🏌️‍♀️')).toBeTruthy();
    });

    it('returns true for text containing only emojies and whitespaces (Miscellaneous Symbols)', () => {
      expect(z.util.EmojiUtil.includesOnlyEmojies('☕ ⚽')).toBeTruthy();
      expect(z.util.EmojiUtil.includesOnlyEmojies('☕  ⚽')).toBeTruthy();
    });

    it('returns false for text containing only text and emojies', () => {
      expect(z.util.EmojiUtil.includesOnlyEmojies('Hey 💩')).toBeFalsy();
    });
  });
});
