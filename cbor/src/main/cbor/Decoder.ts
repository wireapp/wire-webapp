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

import {DecodeError} from './DecodeError';
import {Type} from './Type';

export interface DecoderConfig {
  max_array_length: number;
  max_bytes_length: number;
  max_nesting: number;
  max_object_size: number;
  max_text_length: number;
}

const BYTES_IN_MEGABYTE = 0x100000;

const DEFAULT_CONFIG: DecoderConfig = {
  max_array_length: 1000,
  max_bytes_length: 5 * BYTES_IN_MEGABYTE,
  max_nesting: 16,
  max_object_size: 1000,
  max_text_length: 5 * BYTES_IN_MEGABYTE,
};

class Decoder {
  private view: DataView;

  constructor(private readonly buffer: ArrayBuffer, private readonly config = DEFAULT_CONFIG) {
    this.view = new DataView(this.buffer);
  }

  private static _check_overflow(int: number, overflow: number): number {
    if (int > overflow) {
      throw new DecodeError(DecodeError.INT_OVERFLOW);
    }
    return int;
  }

  private _advance(bytes: number): void {
    this.view = new DataView(this.buffer, this.view.byteOffset + bytes);
  }

  private get _available(): number {
    return this.view.byteLength;
  }

  private _read<T>(bytes: number, closure: () => T): T {
    if (this._available < bytes) {
      throw new DecodeError(DecodeError.UNEXPECTED_EOF);
    }

    const value = closure();
    this._advance(bytes);

    return value;
  }

  /*
   * reader-like interface for @buffer
   */

  private _u8(): number {
    return this._read(1, () => this.view.getUint8(0));
  }

  private _u16(): number {
    return this._read(2, () => this.view.getUint16(0));
  }

  private _u32(): number {
    return this._read(4, () => this.view.getUint32(0));
  }

  private _u64(): number {
    const r64 = () => this.view.getUint32(0) * Math.pow(2, 32) + this.view.getUint32(4);
    return this._read(8, r64);
  }

  private _f32(): number {
    return this._read(4, () => this.view.getFloat32(0));
  }

  private _f64(): number {
    return this._read(8, () => this.view.getFloat64(0));
  }

  private _read_length(minor: number): number {
    if (0 <= minor && minor <= 23) {
      return minor;
    }

    switch (minor) {
      case 24:
        return this._u8();
      case 25:
        return this._u16();
      case 26:
        return this._u32();
      case 27:
        return Decoder._check_overflow(this._u64(), Number.MAX_SAFE_INTEGER);
    }

    throw new DecodeError(DecodeError.UNEXPECTED_TYPE);
  }

  private _bytes(minor: number, max_len: number): ArrayBuffer {
    const len = this._read_length(minor);
    if (len > max_len) {
      throw new DecodeError(DecodeError.TOO_LONG);
    }

    const callback = () => this.buffer.slice(this.view.byteOffset, this.view.byteOffset + len);

    return this._read(len, callback);
  }

  private _read_type_info(): [Type, number] {
    const type = this._u8();

    const major = (type & 0xe0) >> 5;
    const minor = type & 0x1f;

    switch (major) {
      case 0: {
        if (0 <= minor && minor <= 24) {
          return [Type.UINT8, minor];
        } else {
          switch (minor) {
            case 25:
              return [Type.UINT16, minor];
            case 26:
              return [Type.UINT32, minor];
            case 27:
              return [Type.UINT64, minor];
            default:
              throw new DecodeError(DecodeError.INVALID_TYPE);
          }
        }
      }
      case 1: {
        if (0 <= minor && minor <= 24) {
          return [Type.INT8, minor];
        } else {
          switch (minor) {
            case 25:
              return [Type.INT16, minor];
            case 26:
              return [Type.INT32, minor];
            case 27:
              return [Type.INT64, minor];
            default:
              throw new DecodeError(DecodeError.INVALID_TYPE);
          }
        }
      }
      case 2:
        return [Type.BYTES, minor];
      case 3:
        return [Type.TEXT, minor];
      case 4:
        return [Type.ARRAY, minor];
      case 5:
        return [Type.OBJECT, minor];

      case 7:
        switch (minor) {
          case 20:
          case 21:
            return [Type.BOOL, minor];
          case 22:
            return [Type.NULL, minor];
          case 23:
            return [Type.UNDEFINED, minor];
          case 25:
            return [Type.FLOAT16, minor];
          case 26:
            return [Type.FLOAT32, minor];
          case 27:
            return [Type.FLOAT64, minor];
          case 31:
            return [Type.BREAK, minor];
        }
        break;
    }

    throw new DecodeError(DecodeError.INVALID_TYPE);
  }

  private _type_info_with_assert(expected: number | number[]): [Type, number] {
    const [type, minor] = this._read_type_info();

    if (!Array.isArray(expected)) {
      expected = [expected];
    }

    const hasExpectedType = expected.some(expectedType => type === expectedType);
    if (!hasExpectedType) {
      throw new DecodeError(DecodeError.UNEXPECTED_TYPE, [type, minor]);
    }

    return [type, minor];
  }

  private _read_unsigned(type: Type, minor: number): number {
    switch (type) {
      case Type.UINT8:
        return minor <= 23 ? minor : this._u8();

      case Type.UINT16:
        return this._u16();

      case Type.UINT32:
        return this._u32();

      case Type.UINT64:
        return this._u64();
    }

    throw new DecodeError(DecodeError.UNEXPECTED_TYPE, [type, minor]);
  }

  private _read_signed(overflow: number, type: Type, minor: number): number {
    switch (type) {
      case Type.INT8:
        if (minor <= 23) {
          return -1 - minor;
        }
        return -1 - Decoder._check_overflow(this._u8(), overflow);

      case Type.INT16:
        return -1 - Decoder._check_overflow(this._u16(), overflow);

      case Type.INT32:
        return -1 - Decoder._check_overflow(this._u32(), overflow);

      case Type.INT64:
        return -1 - Decoder._check_overflow(this._u64(), overflow);

      case Type.UINT8:
      case Type.UINT16:
      case Type.UINT32:
      case Type.UINT64:
        return Decoder._check_overflow(this._read_unsigned(type, minor), overflow);
    }

    throw new DecodeError(DecodeError.UNEXPECTED_TYPE, [type, minor]);
  }

  private _skip_until_break(type: Type): void {
    for (;;) {
      const [t, minor] = this._read_type_info();
      if (t === Type.BREAK) {
        return;
      }

      if (t !== type || minor === 31) {
        throw new DecodeError(DecodeError.UNEXPECTED_TYPE);
      }

      const len = this._read_length(minor);
      this._advance(len);
    }
  }

  private _skip_value(level: number): boolean {
    if (level === 0) {
      throw new DecodeError(DecodeError.TOO_NESTED);
    }

    const [type, minor] = this._read_type_info();

    let len;
    switch (type) {
      case Type.UINT8:
      case Type.UINT16:
      case Type.UINT32:
      case Type.UINT64:
      case Type.INT8:
      case Type.INT16:
      case Type.INT32:
      case Type.INT64:
        this._read_length(minor);
        return true;

      case Type.BOOL:
      case Type.NULL:
      case Type.UNDEFINED:
        return true;

      case Type.BREAK:
        return false;

      case Type.FLOAT16:
        this._advance(2);
        return true;

      case Type.FLOAT32:
        this._advance(4);
        return true;

      case Type.FLOAT64:
        this._advance(8);
        return true;

      case Type.BYTES:
      case Type.TEXT:
        if (minor === 31) {
          this._skip_until_break(type);
          return true;
        }
        len = this._read_length(minor);
        this._advance(len);
        return true;

      case Type.ARRAY:
      case Type.OBJECT:
        if (minor === 31) {
          while (this._skip_value(level - 1)) {
            // do nothing
          }
          return true;
        }
        len = this._read_length(minor);
        while (len--) {
          this._skip_value(level - 1);
        }
        return true;
      default:
        return false;
    }
  }

  public u8(): number {
    const [type, minor] = this._type_info_with_assert([Type.UINT8]);
    return this._read_unsigned(type, minor);
  }

  public u16(): number {
    const [type, minor] = this._type_info_with_assert([Type.UINT8, Type.UINT16]);
    return this._read_unsigned(type, minor);
  }

  public u32(): number {
    const [type, minor] = this._type_info_with_assert([Type.UINT8, Type.UINT16, Type.UINT32]);
    return this._read_unsigned(type, minor);
  }

  public u64(): number {
    const [type, minor] = this._type_info_with_assert([Type.UINT8, Type.UINT16, Type.UINT32, Type.UINT64]);
    return this._read_unsigned(type, minor);
  }

  public i8(): number {
    const [type, minor] = this._type_info_with_assert([Type.INT8, Type.UINT8]);
    return this._read_signed(127, type, minor);
  }

  public i16(): number {
    const [type, minor] = this._type_info_with_assert([Type.INT8, Type.INT16, Type.UINT8, Type.UINT16]);
    return this._read_signed(32767, type, minor);
  }

  public i32(): number {
    const [type, minor] = this._type_info_with_assert([
      Type.INT8,
      Type.INT16,
      Type.INT32,
      Type.UINT8,
      Type.UINT16,
      Type.UINT32,
    ]);
    return this._read_signed(2147483647, type, minor);
  }

  public i64(): number {
    const [type, minor] = this._type_info_with_assert([
      Type.INT8,
      Type.INT16,
      Type.INT32,
      Type.INT64,
      Type.UINT8,
      Type.UINT16,
      Type.UINT32,
      Type.UINT64,
    ]);

    return this._read_signed(Number.MAX_SAFE_INTEGER, type, minor);
  }

  public unsigned(): number {
    return this.u64();
  }

  public int(): number {
    return this.i64();
  }

  public f16(): number {
    this._type_info_with_assert(Type.FLOAT16);

    const half = this._u16();
    const exp = (half >> 10) & 0x1f;
    const mant = half & 0x3ff;

    const ldexp = (significand: number, exponent: number) => significand * Math.pow(2, exponent);

    let val;
    switch (exp) {
      case 0:
        val = ldexp(mant, -24);
        break;
      case 31:
        val = mant === 0 ? Number.POSITIVE_INFINITY : Number.NaN;
        break;
      default:
        val = ldexp(mant + 1024, exp - 25);
        break;
    }

    return half & 0x8000 ? -val : val;
  }

  public f32(): number {
    this._type_info_with_assert(Type.FLOAT32);
    return this._f32();
  }

  public f64(): number {
    this._type_info_with_assert(Type.FLOAT64);
    return this._f64();
  }

  public bool(): boolean {
    const minor = this._type_info_with_assert(Type.BOOL)[1];

    switch (minor) {
      case 20:
        return false;
      case 21:
        return true;
      default:
        throw new DecodeError(DecodeError.UNEXPECTED_TYPE);
    }
  }

  public bytes(): ArrayBuffer {
    const minor = this._type_info_with_assert(Type.BYTES)[1];

    if (minor === 31) {
      // XXX: handle indefinite encoding
      throw new DecodeError(DecodeError.UNEXPECTED_TYPE);
    }

    return this._bytes(minor, this.config.max_bytes_length);
  }

  public text(): string {
    const minor = this._type_info_with_assert(Type.TEXT)[1];

    if (minor === 31) {
      // XXX: handle indefinite encoding
      throw new DecodeError(DecodeError.UNEXPECTED_TYPE);
    }

    const array = new Uint8Array(this._bytes(minor, this.config.max_text_length));
    const utf8 = array.reduce((previousValue, char) => previousValue + String.fromCharCode(char), '');

    // http://ecmanaut.blogspot.de/2006/07/encoding-decoding-utf8-in-javascript.html
    return decodeURIComponent(escape(utf8));
  }

  public optional<T>(closure: () => T): T | null | undefined {
    try {
      return closure();
    } catch (error) {
      if (error instanceof DecodeError && error.extra) {
        const type = error.extra[0];
        if (type === Type.NULL) {
          return null;
        } else if (type === Type.UNDEFINED) {
          return undefined;
        }
      }
      throw error;
    }
  }

  public array(): number {
    const minor = this._type_info_with_assert(Type.ARRAY)[1];

    if (minor === 31) {
      // XXX: handle indefinite encoding
      throw new DecodeError(DecodeError.UNEXPECTED_TYPE);
    }

    const len = this._read_length(minor);
    if (len > this.config.max_array_length) {
      throw new DecodeError(DecodeError.TOO_LONG);
    }

    return len;
  }

  public object(): number {
    const minor = this._type_info_with_assert(Type.OBJECT)[1];

    if (minor === 31) {
      // XXX: handle indefinite encoding
      throw new DecodeError(DecodeError.UNEXPECTED_TYPE);
    }

    const len = this._read_length(minor);
    if (len > this.config.max_object_size) {
      throw new DecodeError(DecodeError.TOO_LONG);
    }

    return len;
  }

  public skip(): boolean {
    return this._skip_value(this.config.max_nesting);
  }
}

export {Decoder};
