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
  helloEncodedString,
  numberDecoded,
  numberEncoded,
} from './test/TestValues';

import * as bazinga64 from './index';

describe('toBase64', () => {
  it('encodes arrays', () => {
    const encoded = bazinga64.Encoder.toBase64(helloDecodedArray);
    expect(encoded.asString).toBe(helloEncodedString);
  });

  it('encodes array buffers', () => {
    const json = {
      '0': 163,
      '1': 0,
      '2': 1,
      '3': 1,
      '4': 25,
      '5': 255,
      '6': 255,
      '7': 2,
      '8': 162,
      '9': 0,
      '10': 161,
      '11': 0,
      '12': 88,
      '13': 64,
      '14': 196,
      '15': 95,
      '16': 69,
      '17': 14,
      '18': 12,
      '19': 131,
      '20': 100,
      '21': 96,
      '22': 49,
      '23': 219,
      '24': 187,
      '25': 190,
      '26': 173,
      '27': 191,
      '28': 94,
      '29': 227,
      '30': 97,
      '31': 5,
      '32': 253,
      '33': 72,
      '34': 27,
      '35': 111,
      '36': 114,
      '37': 86,
      '38': 4,
      '39': 67,
      '40': 190,
      '41': 250,
      '42': 229,
      '43': 205,
      '44': 186,
      '45': 93,
      '46': 223,
      '47': 96,
      '48': 247,
      '49': 64,
      '50': 65,
      '51': 101,
      '52': 58,
      '53': 43,
      '54': 111,
      '55': 234,
      '56': 7,
      '57': 182,
      '58': 10,
      '59': 143,
      '60': 80,
      '61': 157,
      '62': 143,
      '63': 12,
      '64': 165,
      '65': 155,
      '66': 253,
      '67': 117,
      '68': 220,
      '69': 65,
      '70': 176,
      '71': 226,
      '72': 80,
      '73': 71,
      '74': 167,
      '75': 69,
      '76': 101,
      '77': 37,
      '78': 1,
      '79': 161,
      '80': 0,
      '81': 88,
      '82': 32,
      '83': 223,
      '84': 96,
      '85': 247,
      '86': 64,
      '87': 65,
      '88': 101,
      '89': 58,
      '90': 43,
      '91': 111,
      '92': 234,
      '93': 7,
      '94': 182,
      '95': 10,
      '96': 143,
      '97': 80,
      '98': 157,
      '99': 143,
      '100': 12,
      '101': 165,
      '102': 155,
      '103': 253,
      '104': 117,
      '105': 220,
      '106': 65,
      '107': 176,
      '108': 226,
      '109': 80,
      '110': 71,
      '111': 167,
      '112': 69,
      '113': 101,
      '114': 37,
    };

    const arrayBufferView = bazinga64.Converter.jsonToArrayBufferView(json);
    const arrayBuffer = arrayBufferView.buffer;
    const encoded = bazinga64.Encoder.toBase64(arrayBuffer);
    const expected =
      'owABARn//wKiAKEAWEDEX0UODINkYDHbu76tv17jYQX9SBtvclYEQ7765c26Xd9g90BBZTorb+oHtgqPUJ2PDKWb/XXcQbDiUEenRWUlAaEAWCDfYPdAQWU6K2/qB7YKj1Cdjwylm/113EGw4lBHp0VlJQ==';
    expect(encoded.asString).toBe(expected);
  });

  it('encodes byte arrays', () => {
    const data = new Uint8Array(helloDecodedArray);
    const encoded = bazinga64.Encoder.toBase64(data);
    expect(encoded.asString).toBe(helloEncodedString);
  });

  it('encodes numbers', () => {
    expect(bazinga64.Encoder.toBase64(numberDecoded).asString).toBe(numberEncoded);
  });

  it('encodes strings', () => {
    const encoded = bazinga64.Encoder.toBase64(helloDecodedString);
    expect(encoded.asString).toBe(helloEncodedString);
  });

  it('encodes texts', () => {
    const text =
      'Man is distinguished, not only by his reason, but by this singular passion from other animals, which is a lust of the mind, that by a perseverance of delight in the continued and indefatigable generation of knowledge, exceeds the short vehemence of any carnal pleasure.';
    const expected =
      'TWFuIGlzIGRpc3Rpbmd1aXNoZWQsIG5vdCBvbmx5IGJ5IGhpcyByZWFzb24sIGJ1dCBieSB0aGlzIHNpbmd1bGFyIHBhc3Npb24gZnJvbSBvdGhlciBhbmltYWxzLCB3aGljaCBpcyBhIGx1c3Qgb2YgdGhlIG1pbmQsIHRoYXQgYnkgYSBwZXJzZXZlcmFuY2Ugb2YgZGVsaWdodCBpbiB0aGUgY29udGludWVkIGFuZCBpbmRlZmF0aWdhYmxlIGdlbmVyYXRpb24gb2Yga25vd2xlZGdlLCBleGNlZWRzIHRoZSBzaG9ydCB2ZWhlbWVuY2Ugb2YgYW55IGNhcm5hbCBwbGVhc3VyZS4=';
    const actual = bazinga64.Encoder.toBase64(text).asString;
    expect(actual).toBe(expected);
  });

  it('encodes texts with umlauts', () => {
    const text = 'Polyfon zwitschernd aßen Mäxchens Vögel Rüben, Joghurt und Quark';
    const expected = 'UG9seWZvbiB6d2l0c2NoZXJuZCBhw59lbiBNw6R4Y2hlbnMgVsO2Z2VsIFLDvGJlbiwgSm9naHVydCB1bmQgUXVhcms=';
    const actual = bazinga64.Encoder.toBase64(text).asString;
    expect(actual).toBe(expected);
  });

  it('encodes texts with unicode symbols', () => {
    const text = 'foo ♥ bar';
    const expected = 'Zm9vIOKZpSBiYXI=';
    const actual = bazinga64.Encoder.toBase64(text).asString;
    expect(actual).toBe(expected);
  });

  it("is consistent in it's encodings", () => {
    const array = [8, 3, 3, 7, 9, 9, 4, 2];
    const arrayBufferView = new Uint8Array(array);
    const arrayBuffer = arrayBufferView.buffer;

    const encodedString = 'CAMDBwkJBAI=';
    const encodedArray = bazinga64.Encoder.toBase64(array).asString;
    const encodedArrayBuffer = bazinga64.Encoder.toBase64(arrayBuffer).asString;
    const encodedArrayBufferView = bazinga64.Encoder.toBase64(arrayBufferView).asString;

    expect(encodedArray).toBe(encodedString);
    expect(encodedArrayBuffer).toBe(encodedString);
    expect(encodedArrayBufferView).toBe(encodedString);

    const decoded = bazinga64.Decoder.fromBase64(encodedString);
    expect(decoded.asBytes).toEqual(arrayBufferView);
  });
});
