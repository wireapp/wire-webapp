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

declare module 'qrcode-reader' {
  import {EventEmitter} from 'events';

  interface QRCode {
    result: string;
    points: Array<{x: number; y: number}>;
  }

  interface DecodeCallback {
    (err: Error | null, result: QRCode | null): void;
  }

  class QrCode extends EventEmitter {
    callback: DecodeCallback | null;

    constructor();

    decode(imageData: {width: number; height: number; data: Buffer | Uint8ClampedArray}): void;

    decode(image: any, callback?: DecodeCallback): void;
  }

  export = QrCode;
}
