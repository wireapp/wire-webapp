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

/* eslint-disable no-magic-numbers */

import {base64MD5FromBuffer, bufferToString} from './buffer';

describe('"base64MD5FromBuffer"', () => {
  it('can generate base64 encoded md5 hash from buffer', () => {
    const size = 8;
    const array = new Uint8Array([size, size]);
    const base64Result = base64MD5FromBuffer(array.buffer);
    const base64Expected = 'w+7NCDwPSCf1JgWbA7deTA==';

    expect(base64Result).toBe(base64Expected);
  });
});

describe('"bufferToString"', () => {
  it('converts an ArrayBuffer to a string', () => {
    const array = new Uint8Array([87, 105, 114, 101]);
    const stringResult = bufferToString(array.buffer);
    const stringExpected = 'Wire';

    expect(stringResult).toBe(stringExpected);
  });
});
