/*! @wireapp/cbor v2.1.5 */
var CBOR =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

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

/**
 * @class Types
 * @throws Error
 */
class Types {
  constructor() {
    throw new Error("Can't create instance of singleton");
  }

  /** @type {number} */
  static get ARRAY() {
    return 1;
  }

  /** @type {number} */
  static get BOOL() {
    return 2;
  }

  /** @type {number} */
  static get BREAK() {
    return 3;
  }

  /** @type {number} */
  static get BYTES() {
    return 4;
  }

  /** @type {number} */
  static get FLOAT16() {
    return 5;
  }

  /** @type {number} */
  static get FLOAT32() {
    return 6;
  }

  /** @type {number} */
  static get FLOAT64() {
    return 7;
  }

  /** @type {number} */
  static get UINT8() {
    return 8;
  }

  /** @type {number} */
  static get UINT16() {
    return 9;
  }

  /** @type {number} */
  static get UINT32() {
    return 10;
  }

  /** @type {number} */
  static get UINT64() {
    return 11;
  }

  /** @type {number} */
  static get INT8() {
    return 12;
  }

  /** @type {number} */
  static get INT16() {
    return 13;
  }

  /** @type {number} */
  static get INT32() {
    return 14;
  }

  /** @type {number} */
  static get INT64() {
    return 15;
  }

  /** @type {number} */
  static get NULL() {
    return 16;
  }

  /** @type {number} */
  static get OBJECT() {
    return 17;
  }

  /** @type {number} */
  static get TAGGED() {
    return 18;
  }

  /** @type {number} */
  static get TEXT() {
    return 19;
  }

  /** @type {number} */
  static get UNDEFINED() {
    return 20;
  }

  /**
   * @param {!Types} type
   * @returns {number}
   * @throws TypeError
   */
  static major(type) {
    switch (type) {
      case this.ARRAY:
        return 4;
      case this.BOOL:
        return 7;
      case this.BREAK:
        return 7;
      case this.BYTES:
        return 2;
      case this.FLOAT16:
        return 7;
      case this.FLOAT32:
        return 7;
      case this.FLOAT64:
        return 7;
      case this.UINT8:
        return 0;
      case this.UINT16:
        return 0;
      case this.UINT32:
        return 0;
      case this.UINT64:
        return 0;
      case this.INT8:
        return 1;
      case this.INT16:
        return 1;
      case this.INT32:
        return 1;
      case this.INT64:
        return 1;
      case this.NULL:
        return 7;
      case this.OBJECT:
        return 5;
      case this.TAGGED:
        return 6;
      case this.TEXT:
        return 3;
      case this.UNDEFINED:
        return 7;
      default:
        throw new TypeError('Invalid CBOR type');
    }
  }
}

module.exports = Types;


/***/ }),
/* 1 */
/***/ (function(module, exports) {

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

/**
 * @class BaseError
 * @extends Error
 * @param {string} message
 * @returns {string}
 */
module.exports = (function() {
  const BaseError = function(message) {
    this.name = this.constructor.name;
    this.message = message;
    this.stack = new Error().stack;
  };

  BaseError.prototype = new Error();
  BaseError.prototype.constructor = BaseError;

  return BaseError;
})();


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

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

const BaseError = __webpack_require__(1);

/**
 * @class DecodeError
 * @param {string} message
 * @param {*} [extra]
 */
class DecodeError extends BaseError {
  constructor(message, extra) {
    super(message);
    this.extra = extra;
  }

  /** @type {string} */
  static get INVALID_TYPE() {
    return 'Invalid type';
  }

  /** @type {string} */
  static get UNEXPECTED_EOF() {
    return 'Unexpected end-of-buffer';
  }

  /** @type {string} */
  static get UNEXPECTED_TYPE() {
    return 'Unexpected type';
  }

  /** @type {string} */
  static get INT_OVERFLOW() {
    return 'Integer overflow';
  }

  /** @type {string} */
  static get TOO_LONG() {
    return 'Field too long';
  }

  /** @type {string} */
  static get TOO_NESTED() {
    return 'Object nested too deep';
  }
}

module.exports = DecodeError;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

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

module.exports = {
  BaseError: __webpack_require__(1),
  DecodeError: __webpack_require__(2),
  Decoder: __webpack_require__(4),
  Encoder: __webpack_require__(5),
  Types: __webpack_require__(0),
};


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

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

const DecodeError = __webpack_require__(2);
const Types = __webpack_require__(0);

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


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

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

const Types = __webpack_require__(0);

/**
 * @class Encoder
 * @returns {Encoder} `this`
 */
class Encoder {
  constructor() {
    this.buffer = new ArrayBuffer(4);
    this.view = new DataView(this.buffer);
    return this;
  }

  /** @returns {ArrayBuffer} */
  get_buffer() {
    return this.buffer.slice(0, this.view.byteOffset);
  }

  /**
   * @param {!number} need_nbytes
   * @returns {number}
   * @private
   */
  _new_buffer_length(need_nbytes) {
    return ~~Math.max(this.buffer.byteLength * 1.5, this.buffer.byteLength + need_nbytes);
  }

  /**
   * @param {!number} need_nbytes
   * @returns {void}
   * @private
   */
  _grow_buffer(need_nbytes) {
    const new_len = this._new_buffer_length(need_nbytes);
    const new_buf = new ArrayBuffer(new_len);
    new Uint8Array(new_buf).set(new Uint8Array(this.buffer));
    this.buffer = new_buf;
    this.view = new DataView(this.buffer, this.view.byteOffset);
  }

  /**
   * @param {!number} bytes
   * @returns {void}
   * @private
   */
  _ensure(bytes) {
    if (!(this.view.byteLength < bytes)) {
      return;
    }
    return this._grow_buffer(bytes);
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
   * @callback closureCallback
   */

  /**
   * @param {!number} bytes
   * @param {!closureCallback} closure
   * @returns {void}
   * @private
   */
  _write(bytes, closure) {
    this._ensure(bytes);
    closure();
    return this._advance(bytes);
  }

  /**
   * @param {Types} type
   * @param {!number} len
   * @returns {void}
   * @private
   * @throws RangeError
   */
  _write_type_and_len(type, len) {
    const major = Types.major(type) << 5;

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

  /**
   * @param {!number} value
   * @returns {void}
   * @private
   */
  _u8(value) {
    return this._write(1, () => this.view.setUint8(0, value));
  }

  /**
   * @param {!number} value
   * @returns {void}
   * @private
   */
  _u16(value) {
    return this._write(2, () => this.view.setUint16(0, value));
  }

  /**
   * @param {!number} value
   * @returns {void}
   * @private
   */
  _u32(value) {
    return this._write(4, () => this.view.setUint32(0, value));
  }

  /**
   * @param {!number} value
   * @returns {void}
   * @private
   */
  _u64(value) {
    const low = value % Math.pow(2, 32);
    const high = (value - low) / Math.pow(2, 32);
    const w64 = () => {
      this.view.setUint32(0, high);
      return this.view.setUint32(4, low);
    };
    return this._write(8, w64);
  }

  /**
   * @param {!number} value
   * @returns {void}
   * @private
   */
  _f32(value) {
    return this._write(4, () => this.view.setFloat32(0, value));
  }

  /**
   * @param {!number} value
   * @returns {void}
   * @private
   */
  _f64(value) {
    return this._write(8, () => this.view.setFloat64(0, value));
  }

  /**
   * @param {!Uint8Array} value
   * @returns {void}
   * @private
   */
  _bytes(value) {
    const nbytes = value.byteLength;

    this._ensure(nbytes);
    new Uint8Array(this.buffer, this.view.byteOffset).set(value);
    return this._advance(nbytes);
  }

  /*
   * public API
   */

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  u8(value) {
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

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  u16(value) {
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

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  u32(value) {
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

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  u64(value) {
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

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  i8(value) {
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

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  i16(value) {
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

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  i32(value) {
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

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  i64(value) {
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

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   */
  f32(value) {
    this._u8(0xe0 | 26);
    this._f32(value);
    return this;
  }

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   */
  f64(value) {
    this._u8(0xe0 | 27);
    this._f64(value);
    return this;
  }

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   */
  bool(value) {
    this._u8(0xe0 | (value ? 21 : 20));
    return this;
  }

  /**
   * @param {!(ArrayBuffer|Uint8Array)} value
   * @returns {Encoder} `this`
   */
  bytes(value) {
    this._write_type_and_len(Types.BYTES, value.byteLength);
    this._bytes(value);

    return this;
  }

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   */
  text(value) {
    // http://ecmanaut.blogspot.de/2006/07/encoding-decoding-utf8-in-javascript.html
    const utf8 = unescape(encodeURIComponent(value));

    this._write_type_and_len(Types.TEXT, utf8.length);
    this._bytes(new Uint8Array(utf8.split('').map(char => char.charCodeAt(0))));

    return this;
  }

  /** @returns {Encoder} `this` */
  null() {
    this._u8(0xe0 | 22);
    return this;
  }

  /** @returns {Encoder} `this` */
  undefined() {
    this._u8(0xe0 | 23);
    return this;
  }

  /**
   * @param {!number} len
   * @returns {Encoder} `this`
   */
  array(len) {
    this._write_type_and_len(Types.ARRAY, len);
    return this;
  }

  /** @returns {Encoder} `this` */
  array_begin() {
    this._u8(0x9f);
    return this;
  }

  /** @returns {Encoder} `this` */
  array_end() {
    this._u8(0xff);
    return this;
  }

  /**
   * @param {!number} len
   * @returns {Encoder} `this`
   */
  object(len) {
    this._write_type_and_len(Types.OBJECT, len);
    return this;
  }

  /** @returns {Encoder} `this` */
  object_begin() {
    this._u8(0xbf);
    return this;
  }

  /** @returns {Encoder} `this` */
  object_end() {
    this._u8(0xff);
    return this;
  }
}

module.exports = Encoder;


/***/ })
/******/ ]);
//# sourceMappingURL=cbor.js.map