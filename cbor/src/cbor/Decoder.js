/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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

/* eslint no-magic-numbers: "off" */

const DecodeError = require('./DecodeError');
const Types = require('./Types');

const DEFAULT_CONFIG = {
  max_array_length: 1000,
  max_bytes_length: 5242880,
  max_nesting: 16,
  max_object_size: 1000,
  max_text_length: 5242880,
};

/**
 * @class Decoder
 * @param {!ArrayBuffer} buffer
 * @param {Object} [config=DEFAULT_CONFIG] config
 * @returns {Decoder} `this`
 */
class Decoder {
  /**
   * @callback closureCallback
   */

  constructor(buffer, config = DEFAULT_CONFIG) {
    // buffer *must* be an ArrayBuffer

    this.buffer = buffer;
    this.config = config;
    this.view = new DataView(this.buffer);
    return this;
  }

  /**
   * @param {!number} int
   * @param {!number} overflow
   * @returns {number}
   * @private
   * @throws DecodeError
   */
  static _check_overflow(int, overflow) {
    if (int > overflow) {
      throw new DecodeError(DecodeError.INT_OVERFLOW);
    }
    return int;
  }

  /**
   * @param {!number} bytes
   * @returns {void}
   * @private
   */
  _advance(bytes) {
    this.view = new DataView(this.buffer, this.view.byteOffset + bytes);
  }

  /**
   * @returns {!number}
   * @private
   */
  _available() {
    return this.view.byteLength;
  }

  /**
   * @param {!number} bytes
   * @param {!closureCallback} closure
   * @returns {number}
   * @private
   * @throws DecodeError
   */
  _read(bytes, closure) {
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

  /**
   * @returns {number}
   * @private
   */
  _u8() {
    return this._read(1, () => this.view.getUint8(0));
  }

  /**
   * @returns {number}
   * @private
   */
  _u16() {
    return this._read(2, () => this.view.getUint16(0));
  }

  /**
   * @returns {number}
   * @private
   */
  _u32() {
    return this._read(4, () => this.view.getUint32(0));
  }

  /**
   * @returns {number}
   * @private
   */
  _u64() {
    const r64 = () => this.view.getUint32(0) * Math.pow(2, 32) + this.view.getUint32(4);
    return this._read(8, r64);
  }

  /**
   * @returns {number}
   * @private
   */
  _f32() {
    return this._read(4, () => this.view.getFloat32(0));
  }

  /**
   * @returns {number}
   * @private
   */
  _f64() {
    return this._read(8, () => this.view.getFloat64(0));
  }

  /**
   * @param {!number} minor
   * @returns {number}
   * @private
   * @throws DecodeError
   */
  _read_length(minor) {
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

  /**
   * @param {!number} minor
   * @param {!number} max_len
   * @returns {number}
   * @private
   * @throws DecodeError
   */
  _bytes(minor, max_len) {
    const len = this._read_length(minor);
    if (len > max_len) {
      throw new DecodeError(DecodeError.TOO_LONG);
    }

    return this._read(len, () => this.buffer.slice(this.view.byteOffset, this.view.byteOffset + len));
  }

  /**
   * @returns {Array<Types|number>}
   * @private
   * @throws DecodeError
   */
  _read_type_info() {
    let type = this._u8();

    const major = (type & 0xe0) >> 5;
    const minor = type & 0x1f;

    switch (major) {
      case 0:
        type =
          0 <= minor && minor <= 24
            ? Types.UINT8
            : (() => {
                switch (minor) {
                  case 25:
                    return Types.UINT16;
                  case 26:
                    return Types.UINT32;
                  case 27:
                    return Types.UINT64;
                  default:
                    throw new DecodeError(DecodeError.INVALID_TYPE);
                }
              })();
        return [type, minor];

      case 1:
        type =
          0 <= minor && minor <= 24
            ? Types.INT8
            : (() => {
                switch (minor) {
                  case 25:
                    return Types.INT16;
                  case 26:
                    return Types.INT32;
                  case 27:
                    return Types.INT64;
                  default:
                    throw new DecodeError(DecodeError.INVALID_TYPE);
                }
              })();
        return [type, minor];

      case 2:
        return [Types.BYTES, minor];
      case 3:
        return [Types.TEXT, minor];
      case 4:
        return [Types.ARRAY, minor];
      case 5:
        return [Types.OBJECT, minor];

      case 7:
        switch (minor) {
          case 20:
          case 21:
            return [Types.BOOL, minor];
          case 22:
            return [Types.NULL, minor];
          case 25:
            return [Types.FLOAT16, minor];
          case 26:
            return [Types.FLOAT32, minor];
          case 27:
            return [Types.FLOAT64, minor];
          case 31:
            return [Types.BREAK, minor];
        }
        break;
    }

    throw new DecodeError(DecodeError.INVALID_TYPE);
  }

  /**
   * @param {!(number|Array<number>)} expected
   * @returns {Array<Types|number>}
   * @private
   * @throws DecodeError
   */
  _type_info_with_assert(expected) {
    const [type, minor] = this._read_type_info();

    if (!Array.isArray(expected)) {
      expected = [expected];
    }

    if (!expected.some(error => type === error)) {
      throw new DecodeError(DecodeError.UNEXPECTED_TYPE, [type, minor]);
    }

    return [type, minor];
  }

  /**
   * @param {Types} type
   * @param {!number} minor
   * @returns {number}
   * @private
   * @throws DecodeError
   */
  _read_unsigned(type, minor) {
    switch (type) {
      case Types.UINT8:
        return minor <= 23 ? minor : this._u8();

      case Types.UINT16:
        return this._u16();

      case Types.UINT32:
        return this._u32();

      case Types.UINT64:
        return this._u64();
    }

    throw new DecodeError(DecodeError.UNEXPECTED_TYPE, [type, minor]);
  }

  /**
   * @param {!number} overflow
   * @param {*} type
   * @param {!number} minor
   * @returns {number}
   * @private
   * @throws DecodeError
   */
  _read_signed(overflow, type, minor) {
    switch (type) {
      case Types.INT8:
        if (minor <= 23) {
          return -1 - minor;
        }
        return -1 - Decoder._check_overflow(this._u8(), overflow);

      case Types.INT16:
        return -1 - Decoder._check_overflow(this._u16(), overflow);

      case Types.INT32:
        return -1 - Decoder._check_overflow(this._u32(), overflow);

      case Types.INT64:
        return -1 - Decoder._check_overflow(this._u64(), overflow);

      case Types.UINT8:
      case Types.UINT16:
      case Types.UINT32:
      case Types.UINT64:
        return Decoder._check_overflow(this._read_unsigned(type, minor), overflow);
    }

    throw new DecodeError(DecodeError.UNEXPECTED_TYPE, [type, minor]);
  }

  /*
   * public API
   */

  /** @returns {number} */
  u8() {
    return this._read_unsigned(...this._type_info_with_assert([Types.UINT8]));
  }

  /** @returns {number} */
  u16() {
    return this._read_unsigned(...this._type_info_with_assert([Types.UINT8, Types.UINT16]));
  }

  /** @returns {number} */
  u32() {
    return this._read_unsigned(...this._type_info_with_assert([Types.UINT8, Types.UINT16, Types.UINT32]));
  }

  /** @returns {number} */
  u64() {
    return this._read_unsigned(...this._type_info_with_assert([Types.UINT8, Types.UINT16, Types.UINT32, Types.UINT64]));
  }

  /** @returns {number} */
  i8() {
    return this._read_signed(127, ...this._type_info_with_assert([Types.INT8, Types.UINT8]));
  }

  /** @returns {number} */
  i16() {
    return this._read_signed(
      32767,
      ...this._type_info_with_assert([Types.INT8, Types.INT16, Types.UINT8, Types.UINT16])
    );
  }

  /** @returns {number} */
  i32() {
    return this._read_signed(
      2147483647,
      ...this._type_info_with_assert([Types.INT8, Types.INT16, Types.INT32, Types.UINT8, Types.UINT16, Types.UINT32])
    );
  }

  /** @returns {number} */
  i64() {
    return this._read_signed(
      Number.MAX_SAFE_INTEGER,
      ...this._type_info_with_assert([
        Types.INT8,
        Types.INT16,
        Types.INT32,
        Types.INT64,

        Types.UINT8,
        Types.UINT16,
        Types.UINT32,
        Types.UINT64,
      ])
    );
  }

  /** @returns {number} */
  unsigned() {
    return this.u64();
  }

  /** @returns {number} */
  int() {
    return this.i64();
  }

  /** @returns {number} */
  f16() {
    this._type_info_with_assert(Types.FLOAT16);

    const half = this._u16();
    const exp = (half >> 10) & 0x1f;
    const mant = half & 0x3ff;

    const ldexp = (significand, exponent) => significand * Math.pow(2, exponent);

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

  /** @returns {number} */
  f32() {
    this._type_info_with_assert(Types.FLOAT32);
    return this._f32();
  }

  /** @returns {number} */
  f64() {
    this._type_info_with_assert(Types.FLOAT64);
    return this._f64();
  }

  /**
   * @returns {boolean}
   * @throws DecodeError
   */
  bool() {
    const minor = this._type_info_with_assert(Types.BOOL)[1];

    switch (minor) {
      case 20:
        return false;
      case 21:
        return true;
      default:
        throw new DecodeError(DecodeError.UNEXPECTED_TYPE);
    }
  }

  /**
   * @returns {number}
   * @throws DecodeError
   */
  bytes() {
    const minor = this._type_info_with_assert(Types.BYTES)[1];

    if (minor === 31) {
      // XXX: handle indefinite encoding
      throw new DecodeError(DecodeError.UNEXPECTED_TYPE);
    }

    return this._bytes(minor, this.config.max_bytes_length);
  }

  /**
   * @returns {string}
   * @throws DecodeError
   */
  text() {
    const minor = this._type_info_with_assert(Types.TEXT)[1];

    if (minor === 31) {
      // XXX: handle indefinite encoding
      throw new DecodeError(DecodeError.UNEXPECTED_TYPE);
    }

    const buf = this._bytes(minor, this.config.max_text_length);
    const utf8 = String.fromCharCode(...new Uint8Array(buf));

    // http://ecmanaut.blogspot.de/2006/07/encoding-decoding-utf8-in-javascript.html
    return decodeURIComponent(escape(utf8));
  }

  /**
   * @param {!closureCallback} closure
   * @returns {(closureCallback|null)}
   * @throws DecodeError
   */
  optional(closure) {
    try {
      return closure();
    } catch (error) {
      if (error instanceof DecodeError && error.extra[0] === Types.NULL) {
        return null;
      }
      throw error;
    }
  }

  /**
   * @returns {number}
   * @throws DecodeError
   */
  array() {
    const minor = this._type_info_with_assert(Types.ARRAY)[1];

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

  /**
   * @returns {number}
   * @throws DecodeError
   */
  object() {
    const minor = this._type_info_with_assert(Types.OBJECT)[1];

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

  /**
   * @param {*} type
   * @returns {void}
   * @private
   * @throws DecodeError
   */
  _skip_until_break(type) {
    for (;;) {
      const [t, minor] = this._read_type_info();
      if (t === Types.BREAK) {
        return;
      }

      if (t !== type || minor === 31) {
        throw new DecodeError(DecodeError.UNEXPECTED_TYPE);
      }

      const len = this._read_length(minor);
      this._advance(len);
    }
  }

  /**
   * @param {!number} level
   * @returns {boolean}
   * @private
   * @throws DecodeError
   */
  _skip_value(level) {
    if (level === 0) {
      throw new DecodeError(DecodeError.TOO_NESTED);
    }

    const [type, minor] = this._read_type_info();
    let len;
    switch (type) {
      case Types.UINT8:
      case Types.UINT16:
      case Types.UINT32:
      case Types.UINT64:
      case Types.INT8:
      case Types.INT16:
      case Types.INT32:
      case Types.INT64:
        this._read_length(minor);
        return true;

      case Types.BOOL:
      case Types.NULL:
        return true;

      case Types.BREAK:
        return false;

      case Types.FLOAT16:
        this._advance(2);
        return true;

      case Types.FLOAT32:
        this._advance(4);
        return true;

      case Types.FLOAT64:
        this._advance(8);
        return true;

      case Types.BYTES:
      case Types.TEXT:
        if (minor === 31) {
          this._skip_until_break(type);
          return true;
        }
        len = this._read_length(minor);
        this._advance(len);
        return true;

      case Types.ARRAY:
      case Types.OBJECT:
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
    }
  }

  /** @returns {boolean} */
  skip() {
    return this._skip_value(this.config.max_nesting);
  }
}

module.exports = Decoder;
