/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {numberToHex} from './numberToHex';

describe('numberToHex', () => {
  it('should convert a number to a hex string', () => {
    expect(numberToHex(0)).toBe('0x0');
    expect(numberToHex(1)).toBe('0x1');
    expect(numberToHex(10)).toBe('0xA');
    expect(numberToHex(15)).toBe('0xF');
    expect(numberToHex(16)).toBe('0x10');
    expect(numberToHex(255)).toBe('0xFF');
    expect(numberToHex(256)).toBe('0x100');
    expect(numberToHex(61489)).toBe('0xF031');
    expect(numberToHex(65535)).toBe('0xFFFF');
    expect(numberToHex(65536)).toBe('0x10000');
    expect(numberToHex(4294967295)).toBe('0xFFFFFFFF');
    expect(numberToHex(4294967296)).toBe('0x100000000');
  });
});
