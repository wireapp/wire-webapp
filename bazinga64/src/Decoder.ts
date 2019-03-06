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

import {Converter} from './Converter';
import {DecodedData} from './DecodedData';

class Decoder {
  public static fromBase64(data: string | number[]): DecodedData {
    /**
     * RFC 2045: The encoded output stream must be represented in lines of no more than 76 characters each.
     * All line breaks or other characters not found in the Base64 alphabet must be ignored by decoding software.
     * @see https://www.ietf.org/rfc/rfc2045.txt
     */
    const nonBase64Alphabet = new RegExp('[^-A-Za-z0-9+/=]|=[^=]|={3,}$', 'igm');
    const encoded = Converter.toString(data).replace(nonBase64Alphabet, '');
    const asBytes = Decoder.toByteArray(encoded);
    const asString = Converter.arrayBufferViewToStringUTF8(asBytes);

    return new DecodedData(asBytes, asString);
  }

  private static toByteArray(encoded: string): Uint8Array {
    if (encoded.length % 4 !== 0) {
      throw new Error('Invalid string. Length must be a multiple of 4.');
    }

    if (typeof window === 'object') {
      const decoded = window.atob(encoded);

      const rawLength = decoded.length;
      const arrayBufferView = new Uint8Array(new ArrayBuffer(rawLength));

      for (let i = 0, len = arrayBufferView.length; i < len; i++) {
        arrayBufferView[i] = decoded.charCodeAt(i);
      }

      return arrayBufferView;
    } else {
      const buffer = Buffer.from(encoded, 'base64');
      return Converter.numberArrayToArrayBufferView(buffer);
    }
  }
}

export {Decoder};
