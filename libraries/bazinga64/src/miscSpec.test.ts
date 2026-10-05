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

import * as bazinga64 from './index';

describe('Test Vectors from RFC 4648', () => {
  it('handles empty strings', () => {
    const text = '';
    const expected = '';
    const encoded = bazinga64.Encoder.toBase64(text).asString;
    const decoded = bazinga64.Decoder.fromBase64(encoded).asString;
    expect(encoded).toBe(expected);
    expect(decoded).toBe(text);
  });

  it('handles "f"', () => {
    const text = 'f';
    const expected = 'Zg==';
    const encoded = bazinga64.Encoder.toBase64(text).asString;
    const decoded = bazinga64.Decoder.fromBase64(encoded).asString;
    expect(encoded).toBe(expected);
    expect(decoded).toBe(text);
  });

  it('handles "fo"', () => {
    const text = 'fo';
    const expected = 'Zm8=';
    const encoded = bazinga64.Encoder.toBase64(text).asString;
    const decoded = bazinga64.Decoder.fromBase64(encoded).asString;
    expect(encoded).toBe(expected);
    expect(decoded).toBe(text);
  });

  it('handles "foo"', () => {
    const text = 'foo';
    const expected = 'Zm9v';
    const encoded = bazinga64.Encoder.toBase64(text).asString;
    const decoded = bazinga64.Decoder.fromBase64(encoded).asString;
    expect(encoded).toBe(expected);
    expect(decoded).toBe(text);
  });

  it('foob', () => {
    const text = 'foob';
    const expected = 'Zm9vYg==';
    const encoded = bazinga64.Encoder.toBase64(text).asString;
    const decoded = bazinga64.Decoder.fromBase64(encoded).asString;
    expect(encoded).toBe(expected);
    expect(decoded).toBe(text);
  });

  it('handles "fooba"', () => {
    const text = 'fooba';
    const expected = 'Zm9vYmE=';
    const encoded = bazinga64.Encoder.toBase64(text).asString;
    const decoded = bazinga64.Decoder.fromBase64(encoded).asString;
    expect(encoded).toBe(expected);
    expect(decoded).toBe(text);
  });

  it('handles "foobar"', () => {
    const text = 'foobar';
    const expected = 'Zm9vYmFy';
    const encoded = bazinga64.Encoder.toBase64(text).asString;
    const decoded = bazinga64.Decoder.fromBase64(encoded).asString;
    expect(encoded).toBe(expected);
    expect(decoded).toBe(text);
  });
});

describe('Special cases', () => {
  it('handles malformed URIs', () => {
    const serialised =
      'owABAaEAWEAfHNWiDY1dv3AmX8F3SVnrKy1T8rO07mMswqDDy4FYzzS7Nw9JWSxFA1Ithb/mJubaZBvhBJgLAIV0amINi5OAAqEAoQBYIDS7Nw9JWSxFA1Ithb/mJubaZBvhBJgLAIV0amINi5OA';
    const decoded = bazinga64.Decoder.fromBase64(serialised);
    expect(decoded.asBytes).toBeDefined();
    expect(decoded.asString).toBeDefined();
  });
});
