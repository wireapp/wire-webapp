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

describe('z.util.KeyboardUtil.KEY', () => {
  describe('isArrowKey', () => {
    it('returns whether an arrow key has been pressed', () => {
      expect(z.util.KeyboardUtil.isArrowKey({key: z.util.KeyboardUtil.KEY.ARROW_DOWN})).toBeTruthy();
      expect(z.util.KeyboardUtil.isArrowKey({key: z.util.KeyboardUtil.KEY.ARROW_LEFT})).toBeTruthy();
      expect(z.util.KeyboardUtil.isArrowKey({key: z.util.KeyboardUtil.KEY.ARROW_RIGHT})).toBeTruthy();
      expect(z.util.KeyboardUtil.isArrowKey({key: z.util.KeyboardUtil.KEY.ARROW_UP})).toBeTruthy();
      expect(z.util.KeyboardUtil.isArrowKey({key: z.util.KeyboardUtil.KEY.ESC})).toBeFalsy();
    });
  });

  describe('isDeleteKey', () => {
    it('returns whether the delete key has been pressed', () => {
      expect(z.util.KeyboardUtil.isDeleteKey({key: z.util.KeyboardUtil.KEY.DELETE})).toBeTruthy();
      expect(z.util.KeyboardUtil.isDeleteKey({key: z.util.KeyboardUtil.KEY.ESC})).toBeFalsy();
    });
  });

  describe('isEnterKey', () => {
    it('returns whether the enter key has been pressed', () => {
      expect(z.util.KeyboardUtil.isEnterKey({key: z.util.KeyboardUtil.KEY.ENTER})).toBeTruthy();
      expect(z.util.KeyboardUtil.isEnterKey({key: z.util.KeyboardUtil.KEY.ESC})).toBeFalsy();
    });
  });

  describe('isEscapeKey', () => {
    it('returns whether the escape key has been pressed', () => {
      expect(z.util.KeyboardUtil.isEscapeKey({key: z.util.KeyboardUtil.KEY.ESC})).toBeTruthy();
      expect(z.util.KeyboardUtil.isEscapeKey({key: z.util.KeyboardUtil.KEY.ENTER})).toBeFalsy();
    });
  });

  describe('isKey', () => {
    it('returns whether the expected key has been pressed', () => {
      expect(
        z.util.KeyboardUtil.isKey({key: z.util.KeyboardUtil.KEY.KEY_V}, z.util.KeyboardUtil.KEY.KEY_V)
      ).toBeTruthy();

      expect(z.util.KeyboardUtil.isKey({key: z.util.KeyboardUtil.KEY.KEY_V})).toBeFalsy();
      expect(z.util.KeyboardUtil.isKey({key: z.util.KeyboardUtil.KEY.KEY_V}, '')).toBeFalsy();
      expect(
        z.util.KeyboardUtil.isKey({key: z.util.KeyboardUtil.KEY.KEY_V}, z.util.KeyboardUtil.KEY.ARROW_RIGHT)
      ).toBeFalsy();
    });
  });

  describe('isOneOfKeys', () => {
    it('returns whether one the expected key has been pressed', () => {
      expect(
        z.util.KeyboardUtil.isOneOfKeys({key: z.util.KeyboardUtil.KEY.KEY_V}, [z.util.KeyboardUtil.KEY.KEY_V])
      ).toBeTruthy();

      expect(
        z.util.KeyboardUtil.isOneOfKeys({key: z.util.KeyboardUtil.KEY.KEY_V}, [
          z.util.KeyboardUtil.KEY.KEY_V,
          z.util.KeyboardUtil.KEY.ARROW_RIGHT,
        ])
      ).toBeTruthy();

      expect(
        z.util.KeyboardUtil.isOneOfKeys({key: z.util.KeyboardUtil.KEY.KEY_V}, [
          z.util.KeyboardUtil.KEY.ARROW_RIGHT,
          z.util.KeyboardUtil.KEY.KEY_V,
        ])
      ).toBeTruthy();

      expect(z.util.KeyboardUtil.isOneOfKeys({key: z.util.KeyboardUtil.KEY.KEY_V})).toBeFalsy();
      expect(z.util.KeyboardUtil.isOneOfKeys({key: z.util.KeyboardUtil.KEY.KEY_V}, [])).toBeFalsy();
      expect(z.util.KeyboardUtil.isOneOfKeys({key: z.util.KeyboardUtil.KEY.KEY_V}, [''])).toBeFalsy();
      expect(
        z.util.KeyboardUtil.isOneOfKeys({key: z.util.KeyboardUtil.KEY.KEY_V}, [z.util.KeyboardUtil.KEY.ARROW_LEFT])
      ).toBeFalsy();

      expect(
        z.util.KeyboardUtil.isOneOfKeys({key: z.util.KeyboardUtil.KEY.KEY_V}, [
          z.util.KeyboardUtil.KEY.ARROW_LEFT,
          z.util.KeyboardUtil.KEY.ARROW_RIGHT,
        ])
      ).toBeFalsy();
    });
  });
});
