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

// tslint:disable:no-magic-numbers

import * as CBOR from '@wireapp/cbor';

describe('CBOR.Type', () => {
  describe('"major"', () => {
    it('detects types by numbers', () => {
      expect(CBOR.Type.major(CBOR.Type.UINT8)).toBe(0);
      expect(CBOR.Type.major(CBOR.Type.UINT16)).toBe(0);
      expect(CBOR.Type.major(CBOR.Type.UINT32)).toBe(0);
      expect(CBOR.Type.major(CBOR.Type.UINT64)).toBe(0);

      expect(CBOR.Type.major(CBOR.Type.INT8)).toBe(1);
      expect(CBOR.Type.major(CBOR.Type.INT16)).toBe(1);
      expect(CBOR.Type.major(CBOR.Type.INT32)).toBe(1);
      expect(CBOR.Type.major(CBOR.Type.INT64)).toBe(1);

      expect(CBOR.Type.major(CBOR.Type.BYTES)).toBe(2);

      expect(CBOR.Type.major(CBOR.Type.TEXT)).toBe(3);

      expect(CBOR.Type.major(CBOR.Type.ARRAY)).toBe(4);

      expect(CBOR.Type.major(CBOR.Type.OBJECT)).toBe(5);

      expect(CBOR.Type.major(CBOR.Type.TAGGED)).toBe(6);

      expect(CBOR.Type.major(CBOR.Type.BOOL)).toBe(7);
      expect(CBOR.Type.major(CBOR.Type.BREAK)).toBe(7);
      expect(CBOR.Type.major(CBOR.Type.FLOAT16)).toBe(7);
      expect(CBOR.Type.major(CBOR.Type.FLOAT32)).toBe(7);
      expect(CBOR.Type.major(CBOR.Type.FLOAT64)).toBe(7);
      expect(CBOR.Type.major(CBOR.Type.NULL)).toBe(7);
      expect(CBOR.Type.major(CBOR.Type.UNDEFINED)).toBe(7);
    });

    it('throws an error when there is an unknown type', () => {
      expect(() => CBOR.Type.major(99)).toThrowError(TypeError);
    });
  });
});
