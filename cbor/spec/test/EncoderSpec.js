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

  const encoded = (expected, closure) => {
    const encoder = new CBOR.Encoder();
    closure(encoder);
    return to_hex(new Uint8Array(encoder.get_buffer())) === expected;
  };

  it('encodes unsigned integers', () => {
    expect(encoded('00', encoder => encoder.u8(0))).toBe(true);
    expect(encoded('00', encoder => encoder.u8(0))).toBe(true);
    expect(encoded('01', encoder => encoder.u8(1))).toBe(true);
    expect(encoded('0a', encoder => encoder.u8(10))).toBe(true);
    expect(encoded('17', encoder => encoder.u8(23))).toBe(true);
    expect(encoded('1818', encoder => encoder.u8(24))).toBe(true);
    expect(encoded('1819', encoder => encoder.u8(25))).toBe(true);
    expect(encoded('1864', encoder => encoder.u8(100))).toBe(true);
    expect(encoded('1903e8', encoder => encoder.u16(1000))).toBe(true);
    expect(encoded('1a000f4240', encoder => encoder.u32(1000000))).toBe(true);
    expect(encoded('1b000000e8d4a51000', encoder => encoder.u64(1000000000000))).toBe(true);
    expect(encoded('1b001fffffffffffff', encoder => encoder.u64(Number.MAX_SAFE_INTEGER))).toBe(true);
    expect(() => encoded('1bffffffffffffffff')).toThrow();
    expect(encoder => encoder.u64(18446744073709551615)).toThrow();
  });

  it('encodes signed integers', () => {
    expect(encoded('20', encoder => encoder.i8(-1))).toBe(true);
    expect(encoded('29', encoder => encoder.i8(-10))).toBe(true);
    expect(encoded('3863', encoder => encoder.i8(-100))).toBe(true);
    expect(encoded('3901f3', encoder => encoder.i16(-500))).toBe(true);
    expect(encoded('3903e7', encoder => encoder.i16(-1000))).toBe(true);
    expect(encoded('3a00053d89', encoder => encoder.i32(-343434))).toBe(true);
    expect(encoded('3b000000058879da85', encoder => encoder.i64(-23764523654))).toBe(true);
  });

  it('encodes booleans', () => {
    expect(encoded('f4', encoder => encoder.bool(false))).toBe(true);
    expect(encoded('f5', encoder => encoder.bool(true))).toBe(true);
  });

  it('encodes floats', () => {
    expect(encoded('fa47c35000', encoder => encoder.f32(100000.0))).toBe(true);
    expect(encoded('fa7f7fffff', encoder => encoder.f32(3.4028234663852886e38))).toBe(true);
    expect(encoded('fbc010666666666666', encoder => encoder.f64(-4.1))).toBe(true);

    expect(encoded('fa7f800000', encoder => encoder.f32(Number.POSITIVE_INFINITY))).toBe(true);
    expect(encoded('faff800000', encoder => encoder.f32(Number.NEGATIVE_INFINITY))).toBe(true);
    expect(encoded('fa7fc00000', encoder => encoder.f32(Number.NaN))).toBe(true);

    expect(encoded('fb7ff0000000000000', encoder => encoder.f64(Number.POSITIVE_INFINITY))).toBe(true);
    expect(encoded('fbfff0000000000000', encoder => encoder.f64(Number.NEGATIVE_INFINITY))).toBe(true);
    expect(encoded('fb7ff8000000000000', encoder => encoder.f64(Number.NaN))).toBe(true);
  });

  it('encodes bytes', () => {
    expect(encoded('4401020304', encoder => encoder.bytes(new Uint8Array([1, 2, 3, 4])))).toBe(true);
  });

  it('encodes text', () => {
    expect(encoded('62c3bc', encoder => encoder.text('\u00fc'))).toBe(true);
    expect(
      encoded('781f64667364667364660d0a7364660d0a68656c6c6f0d0a736466736673646673', encoder =>
        encoder.text('dfsdfsdf\r\nsdf\r\nhello\r\nsdfsfsdfs')
      )
    ).toBe(true);
  });

  it('handles null values', () => {
    expect(encoded('f6', encoder => encoder.null())).toBe(true);
  });

  it('encodes arrays', () => {
    expect(
      encoded('83010203', encoder => {
        encoder.array(3);
        encoder.u32(1);
        encoder.u32(2);
        encoder.u32(3);
      })
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
      })
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
      })
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
      })
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
      })
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
      })
    ).toBe(true);
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
      })
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
      })
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
      })
    ).toBe(true);
  });

  it('only creates ArrayBuffers with a valid length', () => {
    const encoder = new CBOR.Encoder();

    const typedArray = new Uint8Array([159, 1, 130, 2, 3, 159, 4, 5, 255]);
    encoder.buffer = typedArray;

    const newLength = encoder._new_buffer_length(1);
    expect(newLength).toBe(13);
  });
});
