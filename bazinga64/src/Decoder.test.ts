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

import {
  helloDecodedArray,
  helloDecodedString,
  helloEncodedArray,
  helloEncodedString,
  numberEncoded,
} from './test/TestValues';

import * as bazinga64 from './index';

const fixtures = require('./test/fixtures.json');

describe('fromBase64', () => {
  it('decodes arrays', () => {
    const decoded = bazinga64.Decoder.fromBase64(helloEncodedArray);
    const arrayBufferView = new Uint8Array(helloDecodedArray);
    expect(decoded.asBytes).toEqual(arrayBufferView);
    expect(decoded.asString).toBe(helloDecodedString);
  });

  it('does not decode from an array with an invalid length', () => {
    expect(() => {
      bazinga64.Decoder.fromBase64(helloDecodedArray);
    }).toThrow();
  });

  it('decodes into a byte array', () => {
    const decoded = bazinga64.Decoder.fromBase64(helloEncodedString);
    const arrayBufferView = new Uint8Array(helloDecodedArray);
    expect(decoded.asBytes).toEqual(arrayBufferView);
    expect(decoded.asString).toBe(helloDecodedString);
  });

  it('decodes into a string', () => {
    const encoded = 'SGVsbG8sIHdvcmxk';
    const decoded = bazinga64.Decoder.fromBase64(encoded);
    expect(decoded.asString).toBe('Hello, world');
  });

  it('decodes numbers', () => {
    const decoded = bazinga64.Decoder.fromBase64(numberEncoded);
    expect(decoded.asString).toBe('1337');
  });

  it('sanitizes characters not found in the Base64 alphabet (according to RFC 2045).', () => {
    const firstLine = 'owABAaEAWEASf22tK9iQp8my5sgvtK8qiURy+5aCBglRKYLuwTlDYVBeAyydEVNDHd+pPoqvt1Es';
    const secondLine = '4zfU8cH1ccO02+4kfgoaAqEAoQBYIFBeAyydEVNDHd+pPoqvt1Es4zfU8cH1ccO02+4kfgoa';

    // RFC 2045: The encoded output stream must be represented in lines of no more than 76 characters each.
    let encoded = `${firstLine}\r\n${secondLine}`;
    let bytes = bazinga64.Decoder.fromBase64(encoded).asBytes;
    expect(bytes.byteLength).toBeDefined();

    encoded = `${firstLine}${secondLine}:`;
    bytes = bazinga64.Decoder.fromBase64(encoded).asBytes;
    expect(bytes.byteLength).toBeDefined();

    encoded = `${firstLine}${secondLine}.`;
    bytes = bazinga64.Decoder.fromBase64(encoded).asBytes;
    expect(bytes.byteLength).toBeDefined();

    encoded = `${firstLine}${secondLine}!`;
    bytes = bazinga64.Decoder.fromBase64(encoded).asBytes;
    expect(bytes.byteLength).toBeDefined();

    encoded = `${firstLine}\\${secondLine}!`;
    bytes = bazinga64.Decoder.fromBase64(encoded).asBytes;
    expect(bytes.byteLength).toBeDefined();
  });

  it('decodes very long strings.', async () => {
    const encoded = fixtures.files['yaoqi-lai-21901-unsplash_800.jpg'];
    const bytes = bazinga64.Decoder.fromBase64(encoded).asBytes;
    expect(bytes instanceof Uint8Array).toBe(true);
    expect(bytes.byteLength).toBeGreaterThan(0);
  });
});
