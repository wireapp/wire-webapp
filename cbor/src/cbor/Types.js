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
