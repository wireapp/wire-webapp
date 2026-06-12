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

import * as _sodium from 'libsodium-wrappers-sumo';

import * as bazinga64 from './index';

let sodium: typeof _sodium;

describe('decode Base64', () => {
  beforeAll(async () => {
    await _sodium.ready;
    sodium = _sodium;
  });

  it('is compliant with libsodium on short sequences', () => {
    const encoded = 'SGVsbG8=';

    const decodedWithBazinga64 = bazinga64.Decoder.fromBase64(encoded).asBytes;
    const decodedWithSodium = sodium.from_base64(encoded, sodium.base64_variants.ORIGINAL);

    expect(decodedWithBazinga64).toEqual(decodedWithSodium);
  });

  it('is compliant with libsodium on long sequences', () => {
    const encoded =
      'pQABARn//wKhAFgg5fwzzahXsFp99ChcRC0/0qIr4vLCujkcRSOkziiTz8gDoQChAFggaK10DY60iH38gbXc9GoOrv+SqQ0p3AEsR0WjHQLkV5kE9g==';

    const decodedWithBazinga64 = bazinga64.Decoder.fromBase64(encoded).asBytes;
    const decodedWithSodium = sodium.from_base64(encoded, sodium.base64_variants.ORIGINAL);

    expect(decodedWithBazinga64).toEqual(decodedWithSodium);
  });
});
