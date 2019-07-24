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

const Proteus = require('@wireapp/proteus');
const _sodium = require('libsodium-wrappers-sumo');
let sodium = _sodium;

beforeAll(async () => {
  await _sodium.ready;
  sodium = _sodium;
});

const convert_arg_type = type => {
  if (!type) {
    return new Uint8Array(0);
  }

  if (typeof type === 'string') {
    return sodium.from_hex(type);
  }

  if (type instanceof Array) {
    return new Uint8Array(type);
  }

  return type;
};

describe('HMAC RFC 5869 Test Vectors', () => {
  it('works with SHA-256 (Test Case 1 from RFC 5869)', () => {
    const vector = {
      ikm: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b',
      info: 'f0f1f2f3f4f5f6f7f8f9',
      length: 42,
      okm: '3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865',
      salt: '000102030405060708090a0b0c',
    };

    const vector_array = [vector.salt, vector.ikm, vector.info].map(convert_arg_type);
    const result = sodium.to_hex(Proteus.util.KeyDerivationUtil.hkdf(...vector_array, vector.length));

    expect(result).toBe(vector.okm);
    expect(result.length).toBe(vector.length + vector.length);
  });

  it('works with long key material', () => {
    const vector = {
      ikm:
        '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f',
      info:
        'b0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff',
      length: 82,
      okm:
        'b11e398dc80327a1c8e7f78c596a49344f012eda2d4efad8a050cc4c19afa97c59045a99cac7827271cb41c65e590e09da3275600c2f09b8367793a9aca3db71cc30c58179ec3e87c14c01d5c1f3434f1d87',
      salt:
        '606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeaf',
    };

    const vector_array = [vector.salt, vector.ikm, vector.info].map(convert_arg_type);
    const result = sodium.to_hex(Proteus.util.KeyDerivationUtil.hkdf(...vector_array, vector.length));

    expect(result).toBe(vector.okm);
    expect(result.length).toBe(vector.length + vector.length);
  });

  it('works without salt', () => {
    const vector = {
      ikm: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b',
      info: undefined,
      length: 42,
      okm: '8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1879ec3454e5f3c738d2d9d201395faa4b61a96c8',
      salt: undefined,
    };

    const vector_array = [vector.salt, vector.ikm, vector.info].map(convert_arg_type);
    const result = sodium.to_hex(Proteus.util.KeyDerivationUtil.hkdf(...vector_array, vector.length));

    expect(result).toBe(vector.okm);
    expect(result.length).toBe(vector.length + vector.length);
  });
});

describe('HMAC Real World Scenarios', () => {
  it('works with a predefined data set', () => {
    const vector = {
      ikm: '507ec3747913b51d9244c2d7be84cad9c71a5b04b89c49cc9e4c81dc7eb2d25c',
      info: '686173685f72617463686574',
      length: 64,
      okm:
        '16390fa0e7e7a9b7cd16b3e435330e18a02df7136a154e5c6e3818549c75b1b0baa38ee1d38364a45033b42ab18448faf6f1296c928cf7c5cdf22096ba7a2d39',
      salt: undefined,
    };

    const vector_array = [vector.salt, vector.ikm, vector.info].map(convert_arg_type);
    const result = sodium.to_hex(Proteus.util.KeyDerivationUtil.hkdf(...vector_array, vector.length));

    expect(result).toBe(vector.okm);
    expect(result.length).toBe(vector.length + vector.length);
  });
});
