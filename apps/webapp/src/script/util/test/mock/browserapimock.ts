/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {TextDecoder, TextEncoder} from 'node:util';

function BrowserTextEncoder() {
  const textEncoder = new TextEncoder();

  return {
    get encoding() {
      return textEncoder.encoding;
    },
    encode(input?: string) {
      return Uint8Array.from(textEncoder.encode(input));
    },
    encodeInto(source: string, destination: Uint8Array) {
      return textEncoder.encodeInto(source, destination);
    },
  };
}

const textEncodingProperties = {
  TextDecoder: {
    configurable: true,
    value: TextDecoder,
    writable: true,
  },
  TextEncoder: {
    configurable: true,
    value: BrowserTextEncoder,
    writable: true,
  },
};

Object.defineProperties(globalThis, textEncodingProperties);
Object.defineProperties(window, textEncodingProperties);

window.z = {userPermission: {}};

window.URL.createObjectURL = jest.fn();
window.URL.revokeObjectURL = jest.fn();
window.scrollTo = jest.fn();

Object.defineProperty(document, 'elementFromPoint', {
  writable: true,
  value: jest.fn().mockReturnValue(null),
});
