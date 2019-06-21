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

describe('CBOR.Decoder', () => {
  const is_hex = str => typeof str === 'string' && /^[0-9a-f]+$/i.test(str) && str.length % 2 === 0;

  const from_hex = str => {
    if (!is_hex(str)) {
      throw new TypeError("The provided string doesn't look like hex data");
    }

    const result = new Uint8Array(str.length / 2);

    let index = 0;
    while (index < str.length) {
      result[index >>> 1] = parseInt(str.substr(index, 2), 16);
      index += 2;
    }

    return result;
  };

  const decoder = hex_str => new CBOR.Decoder(from_hex(hex_str).buffer);

  it('decodes unsigned integers', () => {
    expect(0).toBe(decoder('00').u8());
    expect(1).toBe(decoder('01').u8());
    expect(10).toBe(decoder('0a').u8());
    expect(23).toBe(decoder('17').u8());
    expect(24).toBe(decoder('1818').u8());
    expect(25).toBe(decoder('1819').u8());
    expect(100).toBe(decoder('1864').u8());
    expect(1000).toBe(decoder('1903e8').u16());
    expect(1000000).toBe(decoder('1a000f4240').u32());
    expect(1000000000000).toBe(decoder('1b000000e8d4a51000').u64());
    expect(Number.MAX_SAFE_INTEGER).toBe(decoder('1b001fffffffffffff').u64());
  });

  it('decodes signed integers', () => {
    expect(-1).toBe(decoder('20').i8());
    expect(-10).toBe(decoder('29').i8());
    expect(-100).toBe(decoder('3863').i8());
    expect(-500).toBe(decoder('3901f3').i16());
    expect(-1000).toBe(decoder('3903e7').i16());
    expect(-343434).toBe(decoder('3a00053d89').i32());
    expect(-23764523654).toBe(decoder('3b000000058879da85').i64());
  });

  it('decodes mixed integers', () => {
    expect(0).toBe(decoder('00').i8());
    expect(1).toBe(decoder('01').i8());
    expect(10).toBe(decoder('0a').i8());
    expect(23).toBe(decoder('17').i8());
    expect(24).toBe(decoder('1818').i8());
    expect(25).toBe(decoder('1819').i8());
    expect(100).toBe(decoder('1864').i8());
    expect(1000).toBe(decoder('1903e8').i16());
    expect(1000000).toBe(decoder('1a000f4240').i32());
  });

  it('decodes pure integers', () => {
    expect(0).toBe(decoder('00').int());
    expect(1).toBe(decoder('01').int());
    expect(10).toBe(decoder('0a').int());
    expect(23).toBe(decoder('17').int());
    expect(24).toBe(decoder('1818').int());
    expect(25).toBe(decoder('1819').int());
    expect(100).toBe(decoder('1864').int());
    expect(1000).toBe(decoder('1903e8').int());
    expect(1000000).toBe(decoder('1a000f4240').int());
    expect(1000000000000).toBe(decoder('1b000000e8d4a51000').int());
    expect(-1).toBe(decoder('20').int());
    expect(-10).toBe(decoder('29').int());
    expect(-100).toBe(decoder('3863').int());
    expect(-500).toBe(decoder('3901f3').int());
    expect(-1000).toBe(decoder('3903e7').int());
    expect(-343434).toBe(decoder('3a00053d89').int());
    expect(-23764523654).toBe(decoder('3b000000058879da85').int());
  });

  it('decodes unsigned integers', () => {
    expect(1000000000000).toBe(decoder('1b000000e8d4a51000').unsigned());
    expect(18446744073709551615).toBe(decoder('1bffffffffffffffff').unsigned());
  });

  it('decodes floats', () => {
    expect(0.0).toBe(decoder('f90000').f16());
    expect(-0.0).toBe(decoder('f98000').f16());
    expect(1.0).toBe(decoder('f93c00').f16());
    expect(1.5).toBe(decoder('f93e00').f16());
    expect(65504.0).toBe(decoder('f97bff').f16());

    expect(Number.POSITIVE_INFINITY).toBe(decoder('f97c00').f16());
    expect(Number.NEGATIVE_INFINITY).toBe(decoder('f9fc00').f16());
    expect(Number.isNaN(decoder('f97e00').f16()));

    expect(100000.0).toBe(decoder('fa47c35000').f32());
    expect(3.4028234663852886e38).toBe(decoder('fa7f7fffff').f32());
    expect(-4.1).toBe(decoder('fbc010666666666666').f64());

    expect(Number.POSITIVE_INFINITY).toBe(decoder('fa7f800000').f32());
    expect(Number.NEGATIVE_INFINITY).toBe(decoder('faff800000').f32());
    expect(Number.isNaN(decoder('fa7fc00000').f32()));

    expect(1.0e300).toBe(decoder('fb7e37e43c8800759c').f64());
    expect(Number.POSITIVE_INFINITY).toBe(decoder('fb7ff0000000000000').f64());
    expect(Number.NEGATIVE_INFINITY).toBe(decoder('fbfff0000000000000').f64());
    expect(Number.isNaN(decoder('fb7ff8000000000000').f64()));
  });

  it('decodes booleans', () => {
    expect(false).toBe(decoder('f4').bool());
    expect(true).toBe(decoder('f5').bool());
  });

  it('decodes bytes', () => {
    const decoded = decoder('4401020304');
    const expected = new Uint8Array([1, 2, 3, 4]).buffer;
    expect(decoded.bytes()).toEqual(expected);
  });

  it('decodes text', () => {
    expect('dfsdfsdf\r\nsdf\r\nhello\r\nsdfsfsdfs').toBe(
      decoder('781f64667364667364660d0a7364660d0a68656c6c6f0d0a736466736673646673').text(),
    );
    expect('\u00fc').toBe(decoder('62c3bc').text());
  });

  it('handles optional values', () => {
    try {
      decoder('f6').u8();
      fail();
    } catch (error) {
      expect(error instanceof CBOR.DecodeError);
      expect(error.message).toEqual(CBOR.DecodeError.UNEXPECTED_TYPE);

      let decoded = decoder('f6');
      expect(null).toBe(decoded.optional(() => decoded.u8()));

      decoded = decoder('01');
      expect(1).toBe(decoded.optional(() => decoded.u8()));
    }
  });

  it('decodes arrays', () => {
    const decoded = decoder('83010203');
    expect(3).toBe(decoded.array());
    expect(1).toBe(decoded.u32());
    expect(2).toBe(decoded.u32());
    expect(3).toBe(decoded.u32());
  });

  it('decodes objects', () => {
    const decoded = decoder('a3616101616202616303');
    expect(3).toBe(decoded.object());

    const obj = {};
    for (let index = 0; index <= 2; index++) {
      obj[decoded.text()] = decoded.u8();
    }

    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
    expect(obj.c).toBe(3);
  });

  it('can skip values', () => {
    const decoded = decoder('a66161016162820203616382040561647f657374726561646d696e67ff61659f070405ff61666568656c6c6f');
    expect(6).toBe(decoded.object());

    return [0, 1, 2, 3, 4, 5].map(() => {
      switch (decoded.text()) {
        case 'a':
          expect(1).toBe(decoded.u8());
          break;
        case 'b':
          expect(2).toBe(decoded.array());
          expect(2).toBe(decoded.u8());
          expect(3).toBe(decoded.u8());
          break;
        case 'c':
        case 'd':
        case 'e':
          decoded.skip();
          break;
        case 'f':
          expect('hello').toBe(decoded.text());
          break;
      }
    });
  });

  it('decodes arrays of arrays', () => {
    const decoded = decoder('828301020383010203');

    expect(2).toBe(decoded.array());
    [0, 1].map(() => {
      expect(3).toBe(decoded.array());
      expect(1).toBe(decoded.u32());
      expect(2).toBe(decoded.u32());
      expect(3).toBe(decoded.u32());
    });
  });

  it('decodes undefined values', () => {
    const decoded = decoder('f7');
    expect(undefined).toBe(decoded.optional(() => decoded.u8()));
  });
});
