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

import {Type} from './Type';

export class Encoder {
  private buffer: ArrayBuffer;
  private view: DataView;

  constructor() {
    this.buffer = new ArrayBuffer(4);
    this.view = new DataView(this.buffer);
  }

  public get_buffer(): ArrayBuffer {
    return this.buffer.slice(0, this.view.byteOffset);
  }

  private _new_buffer_length(need_nbytes: number): number {
    return ~~Math.max(this.buffer.byteLength * 1.5, this.buffer.byteLength + need_nbytes);
  }

  private _grow_buffer(need_nbytes: number): void {
    const new_len = this._new_buffer_length(need_nbytes);
    const new_buf = new ArrayBuffer(new_len);
    new Uint8Array(new_buf).set(new Uint8Array(this.buffer));
    this.buffer = new_buf;
    this.view = new DataView(this.buffer, this.view.byteOffset);
  }

  private _ensure(bytes: number): void {
    if (!(this.view.byteLength < bytes)) {
      return;
    }
    return this._grow_buffer(bytes);
  }

  private _advance(bytes: number): void {
    this.view = new DataView(this.buffer, this.view.byteOffset + bytes);
  }

  private _write<T>(bytes: number, callback: () => T): void {
    this._ensure(bytes);
    callback();
    return this._advance(bytes);
  }

  private _write_type_and_len(type: Type, len: number): void {
    const major = Type.major(type) << 5;

    if (0 <= len && len <= 23) {
      return this._u8(major | len);
    } else if (24 <= len && len <= 255) {
      this._u8(major | 24);
      return this._u8(len);
    } else if (0x100 <= len && len <= 0xffff) {
      this._u8(major | 25);
      return this._u16(len);
    } else if (0x10000 <= len && len <= 0xffffffff) {
      this._u8(major | 26);
      return this._u32(len);
    } else if (len <= Number.MAX_SAFE_INTEGER) {
      this._u8(major | 27);
      return this._u64(len);
    }
    throw new RangeError('Invalid size for CBOR object');
  }

  /*
   * writer-like interface over our ArrayBuffer
   */

  private _u8(value: number): void {
    return this._write(1, () => this.view.setUint8(0, value));
  }

  private _u16(value: number): void {
    return this._write(2, () => this.view.setUint16(0, value));
  }

  private _u32(value: number): void {
    return this._write(4, () => this.view.setUint32(0, value));
  }

  private _u64(value: number): void {
    const low = value % Math.pow(2, 32);
    const high = (value - low) / Math.pow(2, 32);
    const w64 = () => {
      this.view.setUint32(0, high);
      return this.view.setUint32(4, low);
    };
    return this._write(8, w64);
  }

  private _f32(value: number): void {
    return this._write(4, () => this.view.setFloat32(0, value));
  }

  private _f64(value: number): void {
    return this._write(8, () => this.view.setFloat64(0, value));
  }

  private _bytes(value: ArrayBuffer | Uint8Array): void {
    const nbytes = value.byteLength;

    this._ensure(nbytes);

    new Uint8Array(this.buffer, this.view.byteOffset).set(<Uint8Array>value);

    return this._advance(nbytes);
  }

  public u8(value: number): Encoder {
    if (0 <= value && value <= 23) {
      this._u8(value);
    } else if (24 <= value && value <= 255) {
      this._u8(24);
      this._u8(value);
    } else {
      throw new RangeError('Invalid u8');
    }

    return this;
  }

  public u16(value: number): Encoder {
    if (0 <= value && value <= 23) {
      this._u8(value);
    } else if (24 <= value && value <= 255) {
      this._u8(24);
      this._u8(value);
    } else if (0x100 <= value && value <= 0xffff) {
      this._u8(25);
      this._u16(value);
    } else {
      throw new RangeError('Invalid u16');
    }

    return this;
  }

  public u32(value: number): Encoder {
    if (0 <= value && value <= 23) {
      this._u8(value);
    } else if (24 <= value && value <= 255) {
      this._u8(24);
      this._u8(value);
    } else if (0x100 <= value && value <= 0xffff) {
      this._u8(25);
      this._u16(value);
    } else if (0x10000 <= value && value <= 0xffffffff) {
      this._u8(26);
      this._u32(value);
    } else {
      throw new RangeError('Invalid u32');
    }

    return this;
  }

  public u64(value: number): Encoder {
    if (0 <= value && value <= 23) {
      this._u8(value);
    } else if (24 <= value && value <= 255) {
      this._u8(24);
      this._u8(value);
    } else if (0x100 <= value && value <= 0xffff) {
      this._u8(25);
      this._u16(value);
    } else if (0x10000 <= value && value <= 0xffffffff) {
      this._u8(26);
      this._u32(value);
    } else if (value <= Number.MAX_SAFE_INTEGER) {
      this._u8(27);
      this._u64(value);
    } else {
      throw new RangeError('Invalid unsigned integer');
    }

    return this;
  }

  public i8(value: number): Encoder {
    if (value >= 0) {
      this._u8(value);
      return this;
    }

    value = -1 - value;
    if (0 <= value && value <= 23) {
      this._u8(0x20 | value);
    } else if (24 <= value && value <= 255) {
      this._u8(0x20 | 24);
      this._u8(value);
    } else {
      throw new RangeError('Invalid i8');
    }

    return this;
  }

  public i16(value: number): Encoder {
    if (value >= 0) {
      this._u16(value);
      return this;
    }

    value = -1 - value;
    if (0 <= value && value <= 23) {
      this._u8(0x20 | value);
    } else if (24 <= value && value <= 255) {
      this._u8(0x20 | 24);
      this._u8(value);
    } else if (0x100 <= value && value <= 0xffff) {
      this._u8(0x20 | 25);
      this._u16(value);
    } else {
      throw new RangeError('Invalid i16');
    }

    return this;
  }

  public i32(value: number): Encoder {
    if (value >= 0) {
      this._u32(value);
      return this;
    }

    value = -1 - value;
    if (0 <= value && value <= 23) {
      this._u8(0x20 | value);
    } else if (24 <= value && value <= 255) {
      this._u8(0x20 | 24);
      this._u8(value);
    } else if (0x100 <= value && value <= 0xffff) {
      this._u8(0x20 | 25);
      this._u16(value);
    } else if (0x10000 <= value && value <= 0xffffffff) {
      this._u8(0x20 | 26);
      this._u32(value);
    } else {
      throw new RangeError('Invalid i32');
    }

    return this;
  }

  public i64(value: number): Encoder {
    if (value >= 0) {
      this._u64(value);
      return this;
    }

    value = -1 - value;
    if (0 <= value && value <= 23) {
      this._u8(0x20 | value);
    } else if (24 <= value && value <= 255) {
      this._u8(0x20 | 24);
      this._u8(value);
    } else if (0x100 <= value && value <= 0xffff) {
      this._u8(0x20 | 25);
      this._u16(value);
    } else if (0x10000 <= value && value <= 0xffffffff) {
      this._u8(0x20 | 26);
      this._u32(value);
    } else if (value <= Number.MAX_SAFE_INTEGER) {
      this._u8(0x20 | 27);
      this._u64(value);
    } else {
      throw new RangeError('Invalid i64');
    }

    return this;
  }

  public f32(value: number): Encoder {
    this._u8(0xe0 | 26);
    this._f32(value);
    return this;
  }

  public f64(value: number): Encoder {
    this._u8(0xe0 | 27);
    this._f64(value);
    return this;
  }

  public bool(value: boolean): Encoder {
    this._u8(0xe0 | (value ? 21 : 20));
    return this;
  }

  public bytes(value: ArrayBuffer | Uint8Array): Encoder {
    this._write_type_and_len(Type.BYTES, value.byteLength);
    this._bytes(value);

    return this;
  }

  public text(value: string): Encoder {
    // http://ecmanaut.blogspot.de/2006/07/encoding-decoding-utf8-in-javascript.html
    const utf8 = unescape(encodeURIComponent(value));

    this._write_type_and_len(Type.TEXT, utf8.length);
    this._bytes(new Uint8Array(utf8.split('').map(char => char.charCodeAt(0))));

    return this;
  }

  public null(): Encoder {
    this._u8(0xe0 | 22);
    return this;
  }

  public undefined(): Encoder {
    this._u8(0xe0 | 23);
    return this;
  }

  public array(len: number): Encoder {
    this._write_type_and_len(Type.ARRAY, len);
    return this;
  }

  public array_begin(): Encoder {
    this._u8(0x9f);
    return this;
  }

  public array_end(): Encoder {
    this._u8(0xff);
    return this;
  }

  public object(len: number): Encoder {
    this._write_type_and_len(Type.OBJECT, len);
    return this;
  }

  public object_begin(): Encoder {
    this._u8(0xbf);
    return this;
  }

  public object_end(): Encoder {
    this._u8(0xff);
    return this;
  }
}
