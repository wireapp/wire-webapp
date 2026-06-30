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
import {EncodedData} from './EncodedData';

export class Encoder {
  public static toBase64(data: string | number | number[] | ArrayBuffer | Buffer | Uint8Array): EncodedData {
    const decoded = Converter.toArrayBufferView(data);
    const asString = Encoder.fromByteArray(decoded);
    const asBytes = Converter.stringToArrayBufferViewUTF8(asString);

    return new EncodedData(asBytes, asString);
  }

  public static toBase64Url(data: string | number | number[] | ArrayBuffer | Buffer | Uint8Array): EncodedData {
    const base64 = Encoder.toBase64(data);
    const asString = base64.asString.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const asBytes = Converter.stringToArrayBufferViewUTF8(asString);

    return new EncodedData(asBytes, asString);
  }

  private static fromByteArray(decoded: Uint8Array): string {
    if (typeof window === 'object') {
      const decodedString = Converter.arrayBufferViewToBaselineString(decoded);
      return window.btoa(decodedString);
    }

    return Buffer.from(decoded.buffer).toString('base64');
  }
}
