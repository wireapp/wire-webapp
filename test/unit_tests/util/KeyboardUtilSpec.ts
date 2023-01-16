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

import {KEY, isOneOfKeys, isArrowKey, isKey, isEnterKey, isEscapeKey} from 'Util/KeyboardUtil';

describe('KEY', () => {
  describe('isArrowKey', () => {
    it('returns whether an arrow key has been pressed', () => {
      expect(isArrowKey({key: KEY.ARROW_DOWN} as KeyboardEvent)).toBeTruthy();
      expect(isArrowKey({key: KEY.ARROW_LEFT} as KeyboardEvent)).toBeTruthy();
      expect(isArrowKey({key: KEY.ARROW_RIGHT} as KeyboardEvent)).toBeTruthy();
      expect(isArrowKey({key: KEY.ARROW_UP} as KeyboardEvent)).toBeTruthy();
      expect(isArrowKey({key: KEY.ESC} as KeyboardEvent)).toBeFalsy();
    });
  });

  describe('isEnterKey', () => {
    it('returns whether the enter key has been pressed', () => {
      expect(isEnterKey({key: KEY.ENTER} as KeyboardEvent)).toBeTruthy();
      expect(isEnterKey({key: KEY.ESC} as KeyboardEvent)).toBeFalsy();
    });
  });

  describe('isEscapeKey', () => {
    it('returns whether the escape key has been pressed', () => {
      expect(isEscapeKey({key: KEY.ESC} as KeyboardEvent)).toBeTruthy();
      expect(isEscapeKey({key: KEY.ENTER} as KeyboardEvent)).toBeFalsy();
    });
  });

  describe('isKey', () => {
    it('returns whether the expected key has been pressed', () => {
      expect(isKey({key: KEY.KEY_V} as KeyboardEvent, KEY.KEY_V)).toBeTruthy();

      expect(isKey({key: KEY.KEY_V} as KeyboardEvent)).toBeFalsy();
      expect(isKey({key: KEY.KEY_V} as KeyboardEvent, '')).toBeFalsy();
      expect(isKey({key: KEY.KEY_V} as KeyboardEvent, KEY.ARROW_RIGHT)).toBeFalsy();
    });
  });

  describe('isOneOfKeys', () => {
    it('returns whether one the expected key has been pressed', () => {
      expect(isOneOfKeys({key: KEY.KEY_V} as KeyboardEvent, [KEY.KEY_V])).toBeTruthy();

      expect(isOneOfKeys({key: KEY.KEY_V} as KeyboardEvent, [KEY.KEY_V, KEY.ARROW_RIGHT])).toBeTruthy();

      expect(isOneOfKeys({key: KEY.KEY_V} as KeyboardEvent, [KEY.ARROW_RIGHT, KEY.KEY_V])).toBeTruthy();

      expect(isOneOfKeys({key: KEY.KEY_V} as KeyboardEvent)).toBeFalsy();
      expect(isOneOfKeys({key: KEY.KEY_V} as KeyboardEvent, [])).toBeFalsy();
      expect(isOneOfKeys({key: KEY.KEY_V} as KeyboardEvent, [''])).toBeFalsy();
      expect(isOneOfKeys({key: KEY.KEY_V} as KeyboardEvent, [KEY.ARROW_LEFT])).toBeFalsy();

      expect(isOneOfKeys({key: KEY.KEY_V} as KeyboardEvent, [KEY.ARROW_LEFT, KEY.ARROW_RIGHT])).toBeFalsy();
    });
  });
});
