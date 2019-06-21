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

/* eslint no-magic-numbers: "off" */

const CBOR = require('../../');

describe('CBOR.Encoder', () => {
  const to_hex = bytes => {
    let str = '';

    for (const byte of Array.from(bytes)) {
      const alpha = byte & 0xf;
      const beta = byte >>> 4;
      const gamma = ((87 + alpha + (((alpha - 10) >> 8) & ~38)) << 8) | (87 + beta + (((beta - 10) >> 8) & ~38));

      str += String.fromCharCode(gamma & 0xff) + String.fromCharCode(gamma >>> 8);
    }

    return str;
  };

  const createTestBuffer = byteLength => {
    const placeholderText = Array(byteLength + 1).join('A');
    const buffer = new ArrayBuffer(placeholderText.length);
    const bufferView = new Uint8Array(buffer);
    for (let index = 0; index < placeholderText.length; index++) {
      bufferView[index] = placeholderText.charCodeAt(index);
    }
    return buffer;
  };

  const encoded = (expected, closure) => {
    const encoder = new CBOR.Encoder();
    closure(encoder);
    return to_hex(new Uint8Array(encoder.get_buffer())) === expected;
  };

  const assertBeginning = (expected, closure) => {
    const encoder = new CBOR.Encoder();
    closure(encoder);
    const hexValue = to_hex(new Uint8Array(encoder.get_buffer()));
    return hexValue.startsWith(expected);
  };

  describe('"u8"', () => {
    it('encodes unsigned integers', () => {
      expect(encoded('00', encoder => encoder.u8(0))).toBe(true);
      expect(encoded('00', encoder => encoder.u8(0))).toBe(true);
      expect(encoded('01', encoder => encoder.u8(1))).toBe(true);
      expect(encoded('0a', encoder => encoder.u8(10))).toBe(true);
      expect(encoded('1818', encoder => encoder.u8(24))).toBe(true);
      expect(encoded('1819', encoder => encoder.u8(25))).toBe(true);
      expect(encoded('1864', encoder => encoder.u8(100))).toBe(true);
    });

    it('encodes inside the boundaries', () => {
      expect(encoded('17', encoder => encoder.u8(23))).toBe(true);
      expect(encoded('18ff', encoder => encoder.u8(0xff))).toBe(true);
    });

    it('throws an error when number is out of range', () => {
      const encoder = new CBOR.Encoder();
      expect(() => encoder.u8(0xff + 1)).toThrowError(RangeError);
    });
  });

  describe('"u16"', () => {
    it('encodes unsigned integers', () => {
      expect(encoded('1818', encoder => encoder.u16(24))).toBe(true);
      expect(encoded('1861', encoder => encoder.u16(97))).toBe(true);
      expect(encoded('191337', encoder => encoder.u16(4919))).toBe(true);
      expect(encoded('192614', encoder => encoder.u16(9748))).toBe(true);
      expect(encoded('1903e8', encoder => encoder.u16(1000))).toBe(true);
    });

    it('encodes inside the boundaries', () => {
      expect(encoded('17', encoder => encoder.u16(23))).toBe(true);
      expect(encoded('18ff', encoder => encoder.u16(0xff))).toBe(true);
      expect(encoded('19ffff', encoder => encoder.u16(0xffff))).toBe(true);
    });

    it('throws an error when number is out of range', () => {
      const encoder = new CBOR.Encoder();
      expect(() => encoder.u16(0xffff + 1)).toThrowError(RangeError);
    });
  });

  describe('"u32"', () => {
    it('encodes unsigned integers', () => {
      expect(encoded('191337', encoder => encoder.u32(4919))).toBe(true);
      expect(encoded('1a000f4240', encoder => encoder.u32(1000000))).toBe(true);
    });

    it('encodes inside the boundaries', () => {
      expect(encoded('17', encoder => encoder.u32(23))).toBe(true);
      expect(encoded('18ff', encoder => encoder.u32(0xff))).toBe(true);
      expect(encoded('19ffff', encoder => encoder.u32(0xffff))).toBe(true);
      expect(encoded('1affffffff', encoder => encoder.u32(0xffffffff))).toBe(true);
    });

    it('throws an error when number is out of range', () => {
      const encoder = new CBOR.Encoder();
      expect(() => encoder.u32(0xffffffff + 1)).toThrowError(RangeError);
    });
  });

  describe('"u64"', () => {
    it('encodes unsigned integers', () => {
      expect(encoded('1b000000e8d4a51000', encoder => encoder.u64(1000000000000))).toBe(true);
    });

    it('encodes inside the boundaries', () => {
      expect(encoded('17', encoder => encoder.u64(23))).toBe(true);
      expect(encoded('18ff', encoder => encoder.u64(0xff))).toBe(true);
      expect(encoded('19ffff', encoder => encoder.u64(0xffff))).toBe(true);
      expect(encoded('1affffffff', encoder => encoder.u64(0xffffffff))).toBe(true);
      expect(encoded('1b001fffffffffffff', encoder => encoder.u64(Number.MAX_SAFE_INTEGER))).toBe(true);
    });

    it('throws an error when number is out of range', () => {
      const encoder = new CBOR.Encoder();
      expect(() => encoder.u64(Number.MAX_SAFE_INTEGER + 1)).toThrowError(RangeError);
    });
  });

  describe('"i8"', () => {
    it('encodes signed integers', () => {
      expect(encoded('20', encoder => encoder.i8(-1))).toBe(true);
      expect(encoded('29', encoder => encoder.i8(-10))).toBe(true);
      expect(encoded('3863', encoder => encoder.i8(-100))).toBe(true);
    });

    it('encodes inside the boundaries', () => {
      expect(encoded('00', encoder => encoder.i8(0))).toBe(true);
      expect(encoded('37', encoder => encoder.i8(-(23 + 1)))).toBe(true);
      expect(encoded('38ff', encoder => encoder.i8(-(0xff + 1)))).toBe(true);
    });

    it('throws an error when number is out of range', () => {
      const encoder = new CBOR.Encoder();
      expect(() => encoder.i8(-(0xff + 2))).toThrowError(RangeError);
    });
  });

  describe('"i16"', () => {
    it('encodes signed integers', () => {
      expect(encoded('3901f3', encoder => encoder.i16(-500))).toBe(true);
      expect(encoded('3903e7', encoder => encoder.i16(-1000))).toBe(true);
    });

    it('encodes inside the boundaries', () => {
      expect(encoded('0000', encoder => encoder.i16(0))).toBe(true);
      expect(encoded('37', encoder => encoder.i16(-(23 + 1)))).toBe(true);
      expect(encoded('38ff', encoder => encoder.i16(-(0xff + 1)))).toBe(true);
      expect(encoded('39ffff', encoder => encoder.i16(-(0xffff + 1)))).toBe(true);
    });

    it('throws an error when number is out of range', () => {
      const encoder = new CBOR.Encoder();
      expect(() => encoder.i16(-(0xffff + 2))).toThrowError(RangeError);
    });
  });

  describe('"i32"', () => {
    it('encodes signed integers', () => {
      expect(encoded('3a00053d89', encoder => encoder.i32(-343434))).toBe(true);
    });

    it('encodes inside the boundaries', () => {
      expect(encoded('00000000', encoder => encoder.i32(0))).toBe(true);
      expect(encoded('37', encoder => encoder.i32(-(23 + 1)))).toBe(true);
      expect(encoded('38ff', encoder => encoder.i32(-(0xff + 1)))).toBe(true);
      expect(encoded('39ffff', encoder => encoder.i32(-(0xffff + 1)))).toBe(true);
      expect(encoded('3a00ffffff', encoder => encoder.i32(-(0xffffff + 1)))).toBe(true);
      expect(encoded('3affffffff', encoder => encoder.i32(-(0xffffffff + 1)))).toBe(true);
    });

    it('throws an error when number is out of range', () => {
      const encoder = new CBOR.Encoder();
      expect(() => encoder.i32(-(0xffffffff + 2))).toThrowError(RangeError);
    });
  });

  describe('"i64"', () => {
    it('encodes signed integers', () => {
      expect(encoded('3b000000058879da85', encoder => encoder.i64(-23764523654))).toBe(true);
    });

    it('encodes inside the boundaries', () => {
      expect(encoded('0000000000000000', encoder => encoder.i64(0))).toBe(true);
      expect(encoded('37', encoder => encoder.i64(-(23 + 1)))).toBe(true);
      expect(encoded('38ff', encoder => encoder.i64(-(0xff + 1)))).toBe(true);
      expect(encoded('39ffff', encoder => encoder.i64(-(0xffff + 1)))).toBe(true);
      expect(encoded('3a00ffffff', encoder => encoder.i64(-(0xffffff + 1)))).toBe(true);
      expect(encoded('3affffffff', encoder => encoder.i64(-(0xffffffff + 1)))).toBe(true);
      expect(encoded('3b001fffffffffffff', encoder => encoder.i64(-(Number.MAX_SAFE_INTEGER + 1)))).toBe(true);
    });

    it('throws an error when number is out of range', () => {
      const encoder = new CBOR.Encoder();
      expect(() => encoder.i64(-(Number.MAX_SAFE_INTEGER + 3))).toThrowError(RangeError);
    });
  });

  describe('"bool"', () => {
    it('encodes booleans', () => {
      expect(encoded('f4', encoder => encoder.bool(false))).toBe(true);
      expect(encoded('f5', encoder => encoder.bool(true))).toBe(true);
    });
  });

  describe('"f32"', () => {
    it('encodes floats', () => {
      expect(encoded('fa47c35000', encoder => encoder.f32(100000.0))).toBe(true);
      expect(encoded('fa7f7fffff', encoder => encoder.f32(3.4028234663852886e38))).toBe(true);
      expect(encoded('fa7f800000', encoder => encoder.f32(Number.POSITIVE_INFINITY))).toBe(true);
      expect(encoded('faff800000', encoder => encoder.f32(Number.NEGATIVE_INFINITY))).toBe(true);
      expect(encoded('fa7fc00000', encoder => encoder.f32(Number.NaN))).toBe(true);
    });
  });

  describe('"f64"', () => {
    it('encodes floats', () => {
      expect(encoded('fbc010666666666666', encoder => encoder.f64(-4.1))).toBe(true);
      expect(encoded('fb7ff0000000000000', encoder => encoder.f64(Number.POSITIVE_INFINITY))).toBe(true);
      expect(encoded('fbfff0000000000000', encoder => encoder.f64(Number.NEGATIVE_INFINITY))).toBe(true);
      expect(encoded('fb7ff8000000000000', encoder => encoder.f64(Number.NaN))).toBe(true);
    });
  });

  describe('"bytes"', () => {
    it('encodes bytes', () => {
      expect(encoded('4401020304', encoder => encoder.bytes(new Uint8Array([1, 2, 3, 4])))).toBe(true);
    });

    it('encodes inside the boundaries', () => {
      expect(assertBeginning('58ff', encoder => encoder.bytes(createTestBuffer(0xff)))).toBe(true);
      expect(assertBeginning('59ffff', encoder => encoder.bytes(createTestBuffer(0xffff)))).toBe(true);
    });

    it('throws an error when number is out of range', () => {
      const encoder = new CBOR.Encoder();
      expect(() => encoder.bytes(createTestBuffer(Number.MAX_SAFE_INTEGER + 1))).toThrowError(RangeError);
    });
  });

  describe('"text"', () => {
    it('encodes text', () => {
      expect(encoded('62c3bc', encoder => encoder.text('\u00fc'))).toBe(true);
      expect(
        encoded('781f64667364667364660d0a7364660d0a68656c6c6f0d0a736466736673646673', encoder =>
          encoder.text('dfsdfsdf\r\nsdf\r\nhello\r\nsdfsfsdfs'),
        ),
      ).toBe(true);
    });
  });

  describe('"null"', () => {
    it('handles null values', () => {
      expect(encoded('f6', encoder => encoder.null())).toBe(true);
    });
  });

  describe('"undefined"', () => {
    it('handles undefined values', () => {
      expect(encoded('f7', encoder => encoder.undefined())).toBe(true);
    });
  });

  describe('"array"', () => {
    it('encodes arrays', () => {
      expect(
        encoded('83010203', encoder => {
          encoder.array(3);
          encoder.u32(1);
          encoder.u32(2);
          encoder.u32(3);
        }),
      ).toBe(true);

      expect(
        encoded('8301820203820405', encoder => {
          encoder
            .array(3)
            .u8(1)
            .array(2)
            .u8(2)
            .u8(3)
            .array(2)
            .u8(4)
            .u8(5);
        }),
      ).toBe(true);
    });

    it('handles indefinite arrays', () => {
      expect(
        encoded('9f018202039f0405ffff', encoder => {
          encoder
            .array_begin()
            .u8(1)
            .array(2)
            .u8(2)
            .u8(3)
            .array_begin()
            .u8(4)
            .u8(5)
            .array_end()
            .array_end();
        }),
      ).toBe(true);

      expect(
        encoded('9f01820203820405ff', encoder => {
          encoder
            .array_begin()
            .u8(1)
            .array(2)
            .u8(2)
            .u8(3)
            .array(2)
            .u8(4)
            .u8(5)
            .array_end();
        }),
      ).toBe(true);

      expect(
        encoded('83018202039f0405ff', encoder => {
          encoder
            .array(3)
            .u8(1)
            .array(2)
            .u8(2)
            .u8(3)
            .array_begin()
            .u8(4)
            .u8(5)
            .array_end();
        }),
      ).toBe(true);

      expect(
        encoded('83019f0203ff820405', encoder => {
          encoder
            .array(3)
            .u8(1)
            .array_begin()
            .u8(2)
            .u8(3)
            .array_end()
            .array(2)
            .u8(4)
            .u8(5);
        }),
      ).toBe(true);
    });
  });

  it('encodes objects', () => {
    expect(
      encoded('a26161016162820203', encoder => {
        encoder
          .object(2)
          .text('a')
          .u8(1)
          .text('b')
          .array(2)
          .u8(2)
          .u8(3);
      }),
    ).toBe(true);
  });

  describe('"object_begin"', () => {
    it('handles indefinite objects', () => {
      expect(
        encoded('bf6346756ef563416d7421ff', encoder => {
          encoder
            .object_begin()
            .text('Fun')
            .bool(true)
            .text('Amt')
            .i8(-2)
            .object_end();
        }),
      ).toBe(true);
    });

    it('handles indefinite objects', () => {
      expect(
        encoded('bf6346756ef563416d7421ff', encoder => {
          encoder
            .object_begin()
            .text('Fun')
            .bool(true)
            .text('Amt')
            .i8(-2)
            .object_end();
        }),
      ).toBe(true);
    });
  });

  describe('"_new_buffer_length"', () => {
    it('only creates ArrayBuffers with a valid length', () => {
      const encoder = new CBOR.Encoder();

      const typedArray = new Uint8Array([159, 1, 130, 2, 3, 159, 4, 5, 255]);
      encoder.buffer = typedArray;

      const newLength = encoder._new_buffer_length(1);
      expect(newLength).toBe(13);
    });
  });
});
