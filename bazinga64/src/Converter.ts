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

import {UnsupportedInputError} from './UnsupportedInputError';

export class Converter {
  public static arrayBufferViewToStringUTF8(arrayBufferView: Uint8Array): string {
    try {
      const string = this.arrayBufferViewToString(arrayBufferView);
      return string;
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
    return Array.from({length: chunkCount}, (_, index) =>
      String.fromCharCode.apply(null, array.slice(index * chunkSize, (index + 1) * chunkSize)),
    ).join('');
  }

  public static jsonToArrayBufferView(objectSource: Record<number, number>): Uint8Array {
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
        return new Uint8Array(data as ArrayBuffer);
      case 'Array':
      case 'Buffer':
        return this.numberArrayToArrayBufferView(data as number[] | Buffer);
      case 'Number':
        return this.stringToArrayBufferViewUTF8(data.toString());
      case 'String':
        return this.stringToArrayBufferViewUTF8(data as string);
      case 'Uint8Array':
        return data as Uint8Array;
      default:
        throw new UnsupportedInputError(
          `${data.constructor.name} is unsupported.` +
            ` Please provide a type of 'ArrayBuffer', 'Array', 'Buffer', 'Number', 'String' or 'Uint8Array'.`,
        );
    }
  }

  public static toString(data: number[] | number | string | Uint8Array): string {
    switch (data.constructor.name) {
      case 'Array':
        const arrayBufferView = this.numberArrayToArrayBufferView(data as number[]);
        return this.arrayBufferViewToStringUTF8(arrayBufferView);
      case 'Number':
        return data.toString();
      case 'String':
        return data as string;
      case 'Uint8Array':
        return this.arrayBufferViewToStringUTF8(data as Uint8Array);
      default:
        throw new UnsupportedInputError(
          `${data.constructor.name} is unsupported.` + ` Please provide a 'String', 'Uint8Array' or 'Array'.`,
        );
    }
  }

  // https://coolaj86.com/articles/unicode-string-to-a-utf-8-typed-array-buffer-in-javascript/
  public static stringToArrayBufferViewUTF8(data: string): Uint8Array {
    const escapedString = encodeURIComponent(data);

    const binaryString = escapedString.replace(/%([0-9A-F]{2})/g, (_, position) => {
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
      const code = match.charCodeAt(0).toString(16).toUpperCase();

      if (code.length < 2) {
        return `0${code}`;
      }

      return `%${code}`;
    });

    return decodeURIComponent(escapedString);
  }
}
