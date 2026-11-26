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

import {utf8ToUtf16BE} from './utf16Util';

describe('utf8ToUtf16BE', () => {
  it('converts a string to a UTF16 BigEndian array', () => {
    const string = '👁🧑🏾yay üüü';
    const expected = [
      254, 255, 216, 61, 220, 65, 216, 62, 221, 209, 216, 60, 223, 254, 0, 121, 0, 97, 0, 121, 0, 32, 0, 252, 0, 252, 0,
      252,
    ];

    const result = utf8ToUtf16BE(string);

    expect(result).toEqual(expected);
  });
});
