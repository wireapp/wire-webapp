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

export class Converter {
  public static arrayBufferViewToStringUTF8(arrayBufferView: Uint8Array): string {
    try {
      return this.arrayBufferViewToString(arrayBufferView);
    } catch (error) {
      if (typeof window === 'object' && 'TextDecoder' in window) {
        return new TextDecoder('utf-8').decode(arrayBufferView);
      }
      return Converter.arrayBufferViewToBaselineString(arrayBufferView);
    }
  }

  public static arrayBufferViewToBaselineString(arrayBufferView: Uint8Array): string {
    // https://stackoverflow.com/questions/22747068/is-there-a-max-number-of-arguments-javascript-functions-can-accept/22747272#22747272
    const chunkSize = 32000;
    const array = Array.from(arrayBufferView);
    const chunkCount = Math.ceil(array.length / chunkSize);
    return Array.from({length: chunkCount}, (value, index) =>
      String.fromCharCode.apply(null, array.slice(index * chunkSize, (index + 1) * chunkSize))
    ).join('');
  }

  public static jsonToArrayBufferView(objectSource: {[key: number]: number}): Uint8Array {
    const length = Object.keys(objectSource).length;
    const arrayBufferView = new Uint8Array(length);

    for (const key in objectSource) {
      if (objectSource.hasOwnProperty(key)) {
        arrayBufferView[parseInt(key, 10)] = objectSource[key];
      }
    }

    return arrayBufferView;
  }

  public static numberArrayToArrayBufferView(array: number[] | Buffer): Uint8Array {
    const arrayBuffer = new ArrayBuffer(array.length);
    const arrayBufferView = new Uint8Array(arrayBuffer);

    for (let i = 0; i < arrayBufferView.length; i++) {
      arrayBufferView[i] = array[i];
    }

    return arrayBufferView;
  }

  public static stringToArrayBufferViewUTF16(data: string): Uint16Array {
    const arrayBuffer = new ArrayBuffer(data.length * 2);
    const arrayBufferView = new Uint16Array(arrayBuffer);

    for (let i = 0, strLen = data.length; i < strLen; i++) {
      arrayBufferView[i] = data.charCodeAt(i);
    }

    return arrayBufferView;
  }

  public static toArrayBufferView(data: number | string | number[] | Buffer | ArrayBuffer | Uint8Array): Uint8Array {
    switch (data.constructor.name) {
      case 'ArrayBuffer':
        return new Uint8Array(<ArrayBuffer>data);
      case 'Array':
      case 'Buffer':
        return this.numberArrayToArrayBufferView(<number[] | Buffer>data);
      case 'Number':
        return this.stringToArrayBufferViewUTF8(data.toString());
      case 'String':
        return this.stringToArrayBufferViewUTF8(<string>data);
      case 'Uint8Array':
        return <Uint8Array>data;
      default:
        throw new UnsupportedInputError(
          `${data.constructor.name} is unsupported.` +
            ` Please provide a type of 'ArrayBuffer', 'Array', 'Buffer', 'Number', 'String' or 'Uint8Array'.`
        );
    }
  }

  public static toString(data: number[] | number | string | Uint8Array): string {
    switch (data.constructor.name) {
      case 'Array':
        const arrayBufferView = this.numberArrayToArrayBufferView(<number[]>data);
        return this.arrayBufferViewToStringUTF8(arrayBufferView);
      case 'Number':
        return data.toString();
      case 'String':
        return <string>data;
      case 'Uint8Array':
        return this.arrayBufferViewToStringUTF8(<Uint8Array>data);
      default:
        throw new UnsupportedInputError(
          `${data.constructor.name} is unsupported.` + ` Please provide a 'String', 'Uint8Array' or 'Array'.`
        );
    }
  }

  // https://coolaj86.com/articles/unicode-string-to-a-utf-8-typed-array-buffer-in-javascript/
  public static stringToArrayBufferViewUTF8(data: string): Uint8Array {
    const escapedString = encodeURIComponent(data);

    const binaryString = escapedString.replace(/%([0-9A-F]{2})/g, (match, position) => {
      const code = parseInt(`0x${position}`, 16);
      return String.fromCharCode(code);
    });

    const arrayBufferView = new Uint8Array(binaryString.length);

    binaryString.split('').forEach((character: string, index: number) => {
      arrayBufferView[index] = character.charCodeAt(0);
    });

    return arrayBufferView;
  }

  private static arrayBufferViewToString(arrayBufferView: Uint8Array): string {
    const binaryString = Converter.arrayBufferViewToBaselineString(arrayBufferView);

    const escapedString = binaryString.replace(/(.)/g, (match: string) => {
      const code = match
        .charCodeAt(0)
        .toString(16)
        .toUpperCase();

      if (code.length < 2) {
        return `0${code}`;
      }

      return `%${code}`;
    });

    return decodeURIComponent(escapedString);
  }
}

export class DecodedData implements IData {
  constructor(public asBytes: Uint8Array, public asString: string) {}
}

export class Decoder {
  public static fromBase64(data: string): DecodedData {
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

export class EncodedData implements IData {
  constructor(public asBytes: Uint8Array, public asString: string) {}
}

export class Encoder {
  public static toBase64(data: string | number | number[] | ArrayBuffer | Buffer | Uint8Array): EncodedData {
    const decoded = Converter.toArrayBufferView(data);
    const asString = Encoder.fromByteArray(decoded);
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

export class UnsupportedInputError extends Error {
  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, UnsupportedInputError.prototype);
    this.name = this.constructor.name;
    this.message = message;
    this.stack = new Error().stack;
  }
}

export interface IData {
  asBytes: Uint8Array;
  asString: string;
}
