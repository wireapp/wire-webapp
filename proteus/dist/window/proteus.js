/*! @wireapp/proteus v5.2.0 */
var Proteus =
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
/******/ 	return __webpack_require__(__webpack_require__.s = 35);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
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

const ProteusError = __webpack_require__(6);

/** @module errors */

const _extend = function(child, parent) {
  for (const key in parent) {
    if ({}.hasOwnProperty.call(parent, key)) {
      child[key] = parent[key];
    }
  }
  const ctor = function() {
    this.constructor = child;
  };
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
  child.__super__ = parent.prototype;
  return child;
};

/**
 * @class DontCallConstructor
 * @extends Error
 * @returns {DontCallConstructor} - `this`
 */
const DontCallConstructor = (function(superClass) {
  _extend(func, superClass);

  function func(_instance) {
    this._instance = _instance;
    func.__super__.constructor.call(
      this,
      `Instead of 'new {this._instance.constructor.name}', use '${this._instance.constructor.name}.new'.`
    );
  }

  return func;
})(ProteusError);

module.exports = DontCallConstructor;


/***/ }),
/* 1 */
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

const InputError = __webpack_require__(19);

/** @module util */

const TypeUtil = {
  /**
   * @param {*} classes
   * @param {*} inst
   * @returns {void}
   * @throws {errors.InputError.TypeError}
   */
  assert_is_instance(classes, inst) {
    if (!Array.isArray(classes)) {
      classes = [classes];
    }
    if (classes.some(_class => inst instanceof _class || (inst && inst.prototype instanceof _class))) {
      return;
    }
    const valid_types = classes.map(_class => `'${_class.name}'`).join(' or ');
    if (inst) {
      throw new InputError.TypeError(
        `Expected one of ${valid_types}, got '${inst.constructor.name}'.`,
        InputError.CODE.CASE_401
      );
    }
    throw new InputError.TypeError(`Expected one of ${valid_types}, got '${String(inst)}'.`, InputError.CODE.CASE_402);
  },
  /**
   * @param {*} inst
   * @returns {boolean}
   * @throws {errors.InputError.TypeError}
   */
  assert_is_integer(inst) {
    if (Number.isInteger(inst)) {
      return true;
    }
    if (inst) {
      throw new InputError.TypeError(`Expected integer, got '${inst.constructor.name}'.`, InputError.CODE.CASE_403);
    }
    throw new InputError.TypeError(`Expected integer, got '${String(inst)}'.`, InputError.CODE.CASE_404);
  },
};

module.exports = TypeUtil;


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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
  BaseError:   __webpack_require__(28),
  DecodeError: __webpack_require__(29),
  Decoder:     __webpack_require__(36),
  Encoder:     __webpack_require__(37),
  Types:       __webpack_require__(20),
};


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

const DontCallConstructor = __webpack_require__(0);

/** @module util */

const ClassUtil = {
  /**
   * @param {*} _class
   * @returns {Function}
   */
  new_instance(_class) {
    try {
      return new _class();
    } catch (error) {
      if (!(error instanceof DontCallConstructor)) {
        throw error;
      }
      return error._instance;
    }
  },
};

module.exports = ClassUtil;


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

const CBOR = __webpack_require__(2);
const ed2curve = __webpack_require__(21);
const sodium = __webpack_require__(5);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

/** @module keys */

/**
 * @class PublicKey
 * @throws {DontCallConstructor}
 */
class PublicKey {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!Uint8Array} pub_edward
   * @param {!Uint8Array} pub_curve
   * @returns {PublicKey} - `this`
   */
  static new(pub_edward, pub_curve) {
    TypeUtil.assert_is_instance(Uint8Array, pub_edward);
    TypeUtil.assert_is_instance(Uint8Array, pub_curve);

    /** @type {PublicKey} */
    const pk = ClassUtil.new_instance(PublicKey);

    /** @type {Uint8Array} */
    pk.pub_edward = pub_edward;
    /** @type {Uint8Array} */
    pk.pub_curve = pub_curve;
    return pk;
  }

  /**
   * This function can be used to verify a message signature.
   *
   * @param {!Uint8Array} signature - The signature to verify
   * @param {!string} message - The message from which the signature was computed.
   * @returns {boolean} - `true` if the signature is valid, `false` otherwise.
   */
  verify(signature, message) {
    TypeUtil.assert_is_instance(Uint8Array, signature);
    return sodium.crypto_sign_verify_detached(signature, message, this.pub_edward);
  }

  /** @returns {string} */
  fingerprint() {
    return sodium.to_hex(this.pub_edward);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(1);
    encoder.u8(0);
    return encoder.bytes(this.pub_edward);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {PublicKey}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    const self = ClassUtil.new_instance(PublicKey);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.pub_edward = new Uint8Array(decoder.bytes());
          break;
        default:
          decoder.skip();
      }
    }

    TypeUtil.assert_is_instance(Uint8Array, self.pub_edward);

    self.pub_curve = ed2curve.convertPublicKey(self.pub_edward);
    return self;
  }
}

module.exports = PublicKey;


/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = sodium;

/***/ }),
/* 6 */
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

/** @module errors */

/**
 * @class ProteusError
 * @param {!string} message
 * @param {string} [code]
 * @extends Error
 * @returns {ProteusError} - `this`
 */
const ProteusError = (function() {
  const func = function(message, code = 1) {
    this.code = code;
    this.message = message;
    this.name = this.constructor.name;
    this.stack = new Error().stack;
  };

  func.prototype = new Error();
  func.prototype.constructor = func;
  func.prototype.CODE = {
    CASE_100: 100,
    CASE_101: 101,
    CASE_102: 102,
    CASE_103: 103,
    CASE_104: 104,
  };

  return func;
})();

module.exports = ProteusError;


/***/ }),
/* 7 */
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

const CBOR = __webpack_require__(2);
const ed2curve = __webpack_require__(21);
const sodium = __webpack_require__(5);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

const PublicKey = __webpack_require__(4);
const SecretKey = __webpack_require__(22);

/** @module keys */

/**
 * Construct an ephemeral key pair.
 * @class KeyPair
 * @throws {DontCallConstructor}
 */
class KeyPair {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /** @returns {KeyPair} - `this` */
  static new() {
    const ed25519_key_pair = sodium.crypto_sign_keypair();

    const kp = ClassUtil.new_instance(KeyPair);
    kp.secret_key = KeyPair.prototype._construct_private_key(ed25519_key_pair);
    kp.public_key = KeyPair.prototype._construct_public_key(ed25519_key_pair);

    return kp;
  }

  /**
   * @description Ed25519 keys can be converted to Curve25519 keys, so that the same key pair can be
   * used both for authenticated encryption (crypto_box) and for signatures (crypto_sign).
   * @param {!Uint8Array} ed25519_key_pair - Key pair based on Edwards-curve (Ed25519)
   * @returns {keys.SecretKey} - Constructed private key
   * @private
   * @see https://download.libsodium.org/doc/advanced/ed25519-curve25519.html
   */
  _construct_private_key(ed25519_key_pair) {
    const sk_ed25519 = ed25519_key_pair.privateKey;
    const sk_curve25519 = ed2curve.convertSecretKey(sk_ed25519);
    return SecretKey.new(sk_ed25519, sk_curve25519);
  }

  /**
   * @typedef {Object} libsodium_keypair
   * @param {!Uint8Array} publicKey
   * @param {!Uint8Array} privateKey
   * @param {!string} keyType
   */
  /**
   * @param {!libsodium_keypair} ed25519_key_pair - Key pair based on Edwards-curve (Ed25519)
   * @private
   * @returns {keys.PublicKey} - Constructed public key
   */
  _construct_public_key(ed25519_key_pair) {
    const pk_ed25519 = ed25519_key_pair.publicKey;
    const pk_curve25519 = ed2curve.convertPublicKey(pk_ed25519);
    return PublicKey.new(pk_ed25519, pk_curve25519);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(2);

    encoder.u8(0);
    this.secret_key.encode(encoder);

    encoder.u8(1);
    return this.public_key.encode(encoder);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {KeyPair}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    const self = ClassUtil.new_instance(KeyPair);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.secret_key = SecretKey.decode(decoder);
          break;
        case 1:
          self.public_key = PublicKey.decode(decoder);
          break;
        default:
          decoder.skip();
      }
    }

    TypeUtil.assert_is_instance(SecretKey, self.secret_key);
    TypeUtil.assert_is_instance(PublicKey, self.public_key);

    return self;
  }
}

module.exports = KeyPair;


/***/ }),
/* 8 */
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

const CBOR = __webpack_require__(2);
const sodium = __webpack_require__(5);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

const PublicKey = __webpack_require__(4);

/** @module keys */

/**
 * Construct a long-term identity key pair.
 * @classdesc Every client has a long-term identity key pair.
 * Long-term identity keys are used to initialise "sessions" with other clients (triple DH).
 * @throws {DontCallConstructor}
 */
class IdentityKey {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!IdentityKey} public_key
   * @returns {IdentityKey} - `this`
   */
  static new(public_key) {
    TypeUtil.assert_is_instance(PublicKey, public_key);

    const key = ClassUtil.new_instance(IdentityKey);
    key.public_key = public_key;
    return key;
  }

  /** @returns {string} */
  fingerprint() {
    return this.public_key.fingerprint();
  }

  /** @returns {string} */
  toString() {
    return sodium.to_hex(this.public_key);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(1);
    encoder.u8(0);
    return this.public_key.encode(encoder);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {IdentityKey}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    let public_key = null;

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          public_key = PublicKey.decode(decoder);
          break;
        default:
          decoder.skip();
      }
    }

    return IdentityKey.new(public_key);
  }
}

module.exports = IdentityKey;


/***/ }),
/* 9 */
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

const CBOR = __webpack_require__(2);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

const PublicKey = __webpack_require__(4);

const Message = __webpack_require__(13);
const SessionTag = __webpack_require__(25);

/** @module message */

/**
 * @extends Message
 * @throws {DontCallConstructor}
 */
class CipherMessage extends Message {
  constructor() {
    super();
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!message.SessionTag} session_tag
   * @param {!number} counter
   * @param {!number} prev_counter
   * @param {!keys.PublicKey} ratchet_key
   * @param {!Uint8Array} cipher_text
   * @returns {CipherMessage} - `this`
   */
  static new(session_tag, counter, prev_counter, ratchet_key, cipher_text) {
    TypeUtil.assert_is_instance(SessionTag, session_tag);
    TypeUtil.assert_is_integer(counter);
    TypeUtil.assert_is_integer(prev_counter);
    TypeUtil.assert_is_instance(PublicKey, ratchet_key);
    TypeUtil.assert_is_instance(Uint8Array, cipher_text);

    const cm = ClassUtil.new_instance(CipherMessage);

    cm.session_tag = session_tag;
    cm.counter = counter;
    cm.prev_counter = prev_counter;
    cm.ratchet_key = ratchet_key;
    cm.cipher_text = cipher_text;

    Object.freeze(cm);
    return cm;
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(5);
    encoder.u8(0);
    this.session_tag.encode(encoder);
    encoder.u8(1);
    encoder.u32(this.counter);
    encoder.u8(2);
    encoder.u32(this.prev_counter);
    encoder.u8(3);
    this.ratchet_key.encode(encoder);
    encoder.u8(4);
    return encoder.bytes(this.cipher_text);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {CipherMessage}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    let session_tag = null;
    let counter = null;
    let prev_counter = null;
    let ratchet_key = null;
    let cipher_text = null;

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          session_tag = SessionTag.decode(decoder);
          break;
        case 1:
          counter = decoder.u32();
          break;
        case 2:
          prev_counter = decoder.u32();
          break;
        case 3:
          ratchet_key = PublicKey.decode(decoder);
          break;
        case 4:
          cipher_text = new Uint8Array(decoder.bytes());
          break;
        default:
          decoder.skip();
      }
    }

    return CipherMessage.new(session_tag, counter, prev_counter, ratchet_key, cipher_text);
  }
}

module.exports = CipherMessage;


/***/ }),
/* 10 */
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

const ProteusError = __webpack_require__(6);

/** @module errors */

/**
 * @extends ProteusError
 * @param {string} [message]
 * @param {string} [code]
 * @returns {string}
 */
class DecodeError extends ProteusError {
  constructor(message = 'Unknown decoding error', code = 3) {
    super(message, code);
  }

  static get CODE() {
    return {
      CASE_300: 300,
      CASE_301: 301,
      CASE_302: 302,
      CASE_303: 303,
    };
  }
}

/**
 * @extends DecodeError
 * @param {string} [message]
 * @param {string} [code]
 * @returns {string}
 */
class InvalidType extends DecodeError {
  constructor(message = 'Invalid type', code) {
    super(message, code);
  }
}

/**
 * @extends DecodeError
 * @param {string} [message]
 * @param {string} [code]
 * @returns {string}
 */
class InvalidArrayLen extends DecodeError {
  constructor(message = 'Invalid array length', code) {
    super(message, code);
  }
}

/**
 * @extends DecodeError
 * @param {string} [message]
 * @param {string} [code]
 * @returns {string}
 */
class LocalIdentityChanged extends DecodeError {
  constructor(message = 'Local identity changed', code) {
    super(message, code);
  }
}

Object.assign(DecodeError, {
  InvalidArrayLen,
  InvalidType,
  LocalIdentityChanged,
});

module.exports = ProteusError.DecodeError = DecodeError;


/***/ }),
/* 11 */
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

const ProteusError = __webpack_require__(6);

/** @module errors */

/**
 * @extends ProteusError
 * @param {string} [message]
 * @param {string} [code]
 */
class DecryptError extends ProteusError {
  constructor(message = 'Unknown decryption error', code = 2) {
    super(message, code);
  }

  static get CODE() {
    return {
      CASE_200: 200,
      CASE_201: 201,
      CASE_202: 202,
      CASE_203: 203,
      CASE_204: 204,
      CASE_205: 205,
      CASE_206: 206,
      CASE_207: 207,
      CASE_208: 208,
      CASE_209: 209,
      CASE_210: 210,
      CASE_211: 211,
      CASE_212: 212,
    };
  }
}

/**
 * @extends DecryptError
 * @param {string} [message]
 * @param {string} [code]
 */
class RemoteIdentityChanged extends DecryptError {
  constructor(message = 'Remote identity changed', code) {
    super(message, code);
  }
}

/**
 * @extends DecryptError
 * @param {string} [message]
 * @param {string} [code]
 */
class InvalidSignature extends DecryptError {
  constructor(message = 'Invalid signature', code) {
    super(message, code);
  }
}

/**
 * @extends DecryptError
 * @param {string} [message]
 * @param {string} [code]
 */
class InvalidMessage extends DecryptError {
  constructor(message = 'Invalid message', code) {
    super(message, code);
  }
}

/**
 * @extends DecryptError
 * @param {string} [message]
 * @param {string} [code]
 */
class DuplicateMessage extends DecryptError {
  constructor(message = 'Duplicate message', code) {
    super(message, code);
  }
}

/**
 * @extends DecryptError
 * @param {string} [message]
 * @param {string} [code]
 */
class TooDistantFuture extends DecryptError {
  constructor(message = 'Message is from too distant in the future', code) {
    super(message, code);
  }
}

/**
 * @extends DecryptError
 * @param {string} [message]
 * @param {string} [code]
 */
class OutdatedMessage extends DecryptError {
  constructor(message = 'Outdated message', code) {
    super(message, code);
  }
}

/**
 * @extends DecryptError
 * @param {string} [message]
 * @param {string} [code]
 */
class PrekeyNotFound extends DecryptError {
  constructor(message = 'Pre-key not found', code) {
    super(message, code);
  }
}

Object.assign(DecryptError, {
  DuplicateMessage,
  InvalidMessage,
  InvalidSignature,
  OutdatedMessage,
  PrekeyNotFound,
  RemoteIdentityChanged,
  TooDistantFuture,
});

module.exports = ProteusError.DecryptError = DecryptError;


/***/ }),
/* 12 */
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

const CBOR = __webpack_require__(2);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

const IdentityKey = __webpack_require__(8);
const KeyPair = __webpack_require__(7);
const SecretKey = __webpack_require__(22);

/** @module keys */

/**
 * @class IdentityKeyPair
 * @throws {DontCallConstructor}
 */
class IdentityKeyPair {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /** @returns {IdentityKeyPair} - `this` */
  static new() {
    const key_pair = KeyPair.new();

    /** @type {IdentityKeyPair} */
    const ikp = ClassUtil.new_instance(IdentityKeyPair);
    ikp.version = 1;
    ikp.secret_key = key_pair.secret_key;
    ikp.public_key = IdentityKey.new(key_pair.public_key);

    return ikp;
  }

  /** @returns {ArrayBuffer} */
  serialise() {
    const encoder = new CBOR.Encoder();
    this.encode(encoder);
    return encoder.get_buffer();
  }

  /**
   * @param {!ArrayBuffer} buf
   * @returns {IdentityKeyPair}
   */
  static deserialise(buf) {
    TypeUtil.assert_is_instance(ArrayBuffer, buf);

    const decoder = new CBOR.Decoder(buf);
    return IdentityKeyPair.decode(decoder);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(3);
    encoder.u8(0);
    encoder.u8(this.version);
    encoder.u8(1);
    this.secret_key.encode(encoder);
    encoder.u8(2);
    return this.public_key.encode(encoder);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {IdentityKeyPair}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    const self = ClassUtil.new_instance(IdentityKeyPair);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.version = decoder.u8();
          break;
        case 1:
          self.secret_key = SecretKey.decode(decoder);
          break;
        case 2:
          self.public_key = IdentityKey.decode(decoder);
          break;
        default:
          decoder.skip();
      }
    }

    TypeUtil.assert_is_integer(self.version);
    TypeUtil.assert_is_instance(SecretKey, self.secret_key);
    TypeUtil.assert_is_instance(IdentityKey, self.public_key);

    return self;
  }
}

module.exports = IdentityKeyPair;


/***/ }),
/* 13 */
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

const CBOR = __webpack_require__(2);

const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

const DecodeError = __webpack_require__(10);

/** @module message */

/**
 * @class Message
 * @throws {DontCallConstructor}
 */
class Message {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /** @returns {ArrayBuffer} */
  serialise() {
    const encoder = new CBOR.Encoder();
    if (this instanceof CipherMessage) {
      encoder.u8(1);
    } else if (this instanceof PreKeyMessage) {
      encoder.u8(2);
    } else {
      throw new TypeError('Unexpected message type', 9);
    }

    this.encode(encoder);
    return encoder.get_buffer();
  }

  /**
   * @param {!ArrayBuffer} buf
   * @returns {message.CipherMessage|message.PreKeyMessage}
   */
  static deserialise(buf) {
    TypeUtil.assert_is_instance(ArrayBuffer, buf);

    const decoder = new CBOR.Decoder(buf);

    switch (decoder.u8()) {
      case 1:
        return CipherMessage.decode(decoder);
      case 2:
        return PreKeyMessage.decode(decoder);
      default:
        throw new DecodeError.InvalidType('Unrecognised message type', DecodeError.CODE.CASE_302);
    }
  }
}

module.exports = Message;

// these require lines have to come after the Message definition because otherwise
// it creates a circular dependency with the message subtypes
const CipherMessage = __webpack_require__(9);
const PreKeyMessage = __webpack_require__(14);


/***/ }),
/* 14 */
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

const CBOR = __webpack_require__(2);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

const IdentityKey = __webpack_require__(8);
const PublicKey = __webpack_require__(4);

const CipherMessage = __webpack_require__(9);
const Message = __webpack_require__(13);

/** @module message */

/**
 * @extends Message
 * @throws {DontCallConstructor}
 */
class PreKeyMessage extends Message {
  constructor() {
    super();
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!number} prekey_id
   * @param {!keys.PublicKey} base_key
   * @param {!keys.IdentityKey} identity_key
   * @param {!message.CipherMessage} message
   * @returns {PreKeyMessage}
   */
  static new(prekey_id, base_key, identity_key, message) {
    TypeUtil.assert_is_integer(prekey_id);
    TypeUtil.assert_is_instance(PublicKey, base_key);
    TypeUtil.assert_is_instance(IdentityKey, identity_key);
    TypeUtil.assert_is_instance(CipherMessage, message);

    const pkm = ClassUtil.new_instance(PreKeyMessage);

    pkm.prekey_id = prekey_id;
    pkm.base_key = base_key;
    pkm.identity_key = identity_key;
    pkm.message = message;

    Object.freeze(pkm);
    return pkm;
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(4);
    encoder.u8(0);
    encoder.u16(this.prekey_id);
    encoder.u8(1);
    this.base_key.encode(encoder);
    encoder.u8(2);
    this.identity_key.encode(encoder);
    encoder.u8(3);
    return this.message.encode(encoder);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {PreKeyMessage}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    let prekey_id = null;
    let base_key = null;
    let identity_key = null;
    let message = null;

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          prekey_id = decoder.u16();
          break;
        case 1:
          base_key = PublicKey.decode(decoder);
          break;
        case 2:
          identity_key = IdentityKey.decode(decoder);
          break;
        case 3:
          message = CipherMessage.decode(decoder);
          break;
        default:
          decoder.skip();
      }
    }

    // checks for missing variables happens in constructor
    return PreKeyMessage.new(prekey_id, base_key, identity_key, message);
  }
}

module.exports = PreKeyMessage;


/***/ }),
/* 15 */
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

const CBOR = __webpack_require__(2);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

const MacKey = __webpack_require__(16);
const Message = __webpack_require__(13);

/** @module message */

/**
 * @class Envelope
 * @throws {DontCallConstructor}
 */
class Envelope {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!derived.MacKey} mac_key MacKey generated by derived secrets
   * @param {!message.Message} message
   * @returns {Envelope}
   */
  static new(mac_key, message) {
    TypeUtil.assert_is_instance(MacKey, mac_key);
    TypeUtil.assert_is_instance(Message, message);

    const serialized_message = new Uint8Array(message.serialise());

    const env = ClassUtil.new_instance(Envelope);

    env.version = 1;
    env.mac = mac_key.sign(serialized_message);
    env.message = message;
    env._message_enc = serialized_message;

    Object.freeze(env);
    return env;
  }

  /**
   * @param {!derived.MacKey} mac_key The remote party's MacKey
   * @returns {boolean}
   */
  verify(mac_key) {
    TypeUtil.assert_is_instance(MacKey, mac_key);
    return mac_key.verify(this.mac, this._message_enc);
  }

  /** @returns {ArrayBuffer} - The serialized message envelope */
  serialise() {
    const encoder = new CBOR.Encoder();
    this.encode(encoder);
    return encoder.get_buffer();
  }

  /**
   * @param {!ArrayBuffer} buf
   * @returns {Envelope}
   */
  static deserialise(buf) {
    TypeUtil.assert_is_instance(ArrayBuffer, buf);

    const decoder = new CBOR.Decoder(buf);
    return Envelope.decode(decoder);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(3);
    encoder.u8(0);
    encoder.u8(this.version);

    encoder.u8(1);
    encoder.object(1);
    encoder.u8(0);
    encoder.bytes(this.mac);

    encoder.u8(2);
    return encoder.bytes(this._message_enc);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {Envelope}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    const env = ClassUtil.new_instance(Envelope);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0: {
          env.version = decoder.u8();
          break;
        }
        case 1: {
          const nprops_mac = decoder.object();
          for (let subindex = 0; subindex <= nprops_mac - 1; subindex++) {
            switch (decoder.u8()) {
              case 0:
                env.mac = new Uint8Array(decoder.bytes());
                break;
              default:
                decoder.skip();
            }
          }
          break;
        }
        case 2: {
          env._message_enc = new Uint8Array(decoder.bytes());
          break;
        }
        default: {
          decoder.skip();
        }
      }
    }

    TypeUtil.assert_is_integer(env.version);
    TypeUtil.assert_is_instance(Uint8Array, env.mac);

    env.message = Message.deserialise(env._message_enc.buffer);

    Object.freeze(env);
    return env;
  }
}

module.exports = Envelope;


/***/ }),
/* 16 */
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

const CBOR = __webpack_require__(2);
const sodium = __webpack_require__(5);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

/** @module derived */

/**
 * @class MacKey
 * @throws {DontCallConstructor}
 */
class MacKey {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!Uint8Array} key - Mac Key in byte array format generated by derived secrets
   * @returns {MacKey} - `this`
   */
  static new(key) {
    TypeUtil.assert_is_instance(Uint8Array, key);

    const mk = ClassUtil.new_instance(MacKey);
    /** @type {Uint8Array} */
    mk.key = key;
    return mk;
  }

  /**
   * Hash-based message authentication code
   * @param {!(string|Uint8Array)} msg
   * @returns {Uint8Array}
   */
  sign(msg) {
    return sodium.crypto_auth_hmacsha256(msg, this.key);
  }

  /**
   * Verifies the signature of a given message by resigning it.
   * @param {!Uint8Array} signature Mac signature (HMAC) which needs to get verified
   * @param {!Uint8Array} msg Unsigned message
   * @returns {boolean}
   */
  verify(signature, msg) {
    return sodium.crypto_auth_hmacsha256_verify(signature, msg, this.key);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(1);
    encoder.u8(0);
    return encoder.bytes(this.key);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {MacKey}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    let key_bytes = null;

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          key_bytes = new Uint8Array(decoder.bytes());
          break;
        default:
          decoder.skip();
      }
    }

    return MacKey.new(key_bytes);
  }
}

module.exports = MacKey;


/***/ }),
/* 17 */
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

const sodium = __webpack_require__(5);

/** @module util */

const MemoryUtil = {
  /**
   * @param {!(Uint8Array|ArrayBuffer|Object)} object
   * @returns {void}
   */
  zeroize(object) {
    if (object instanceof Uint8Array) {
      sodium.memzero(object);
    } else if (object instanceof ArrayBuffer) {
      sodium.memzero(new Uint8Array(object));
    } else if (typeof object === 'object') {
      Object.keys(object)
        .map(key => object[key])
        .forEach(val => this.zeroize(val));
    }
  },
};

module.exports = MemoryUtil;


/***/ }),
/* 18 */
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

const CBOR = __webpack_require__(2);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

const DerivedSecrets = __webpack_require__(26);
const MacKey = __webpack_require__(16);
const MessageKeys = __webpack_require__(34);

/** @module session */

/**
 * @class ChainKey
 * @throws {DontCallConstructor}
 */
class ChainKey {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!derived.MacKey} key - Mac Key generated by derived secrets
   * @param {!number} counter
   * @returns {ChainKey}
   */
  static from_mac_key(key, counter) {
    TypeUtil.assert_is_instance(MacKey, key);
    TypeUtil.assert_is_integer(counter);

    const ck = ClassUtil.new_instance(ChainKey);
    ck.key = key;
    ck.idx = counter;
    return ck;
  }

  /** @returns {ChainKey} */
  next() {
    const ck = ClassUtil.new_instance(ChainKey);
    ck.key = MacKey.new(this.key.sign('1'));
    ck.idx = this.idx + 1;
    return ck;
  }

  /** @returns {session.MessageKeys} */
  message_keys() {
    const base = this.key.sign('0');
    const derived_secrets = DerivedSecrets.kdf_without_salt(base, 'hash_ratchet');
    return MessageKeys.new(derived_secrets.cipher_key, derived_secrets.mac_key, this.idx);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(2);
    encoder.u8(0);
    this.key.encode(encoder);
    encoder.u8(1);
    return encoder.u32(this.idx);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {ChainKey}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    const self = ClassUtil.new_instance(ChainKey);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.key = MacKey.decode(decoder);
          break;
        case 1:
          self.idx = decoder.u32();
          break;
        default:
          decoder.skip();
      }
    }

    TypeUtil.assert_is_instance(MacKey, self.key);
    TypeUtil.assert_is_integer(self.idx);

    return self;
  }
}

module.exports = ChainKey;


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

const ProteusError = __webpack_require__(6);

/** @module errors */

/**
 * @extends ProteusError
 * @param {string} [message]
 * @param {string} [code]
 * @returns {string}
 */
class InputError extends ProteusError {
  constructor(message = 'Invalid input', code = 4) {
    super(message, code);
  }

  static get CODE() {
    return {
      CASE_400: 400,
      CASE_401: 401,
      CASE_402: 402,
      CASE_403: 403,
      CASE_404: 404,
    };
  }
}

/**
 * @extends InputError
 * @param {string} [message]
 * @param {string} [code]
 * @returns {string}
 */
class RangeError extends InputError {
  constructor(message = 'Invalid type', code) {
    super(message, code);
  }
}

/**
 * @extends InputError
 * @param {string} [message]
 * @param {string} [code]
 * @returns {string}
 */
class TypeError extends InputError {
  constructor(message = 'Invalid array length', code) {
    super(message, code);
  }
}

Object.assign(InputError, {
  RangeError,
  TypeError,
});

module.exports = ProteusError.InputError = InputError;


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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
 * @class Types
 * @throws Error
 */
class Types {
  constructor() {
    throw new Error('Can\'t create instance of singleton');
  }

  /** @type {number} */
  static get ARRAY() { return 1; }

  /** @type {number} */
  static get BOOL() { return 2; }

  /** @type {number} */
  static get BREAK() { return 3; }

  /** @type {number} */
  static get BYTES() {return 4; }

  /** @type {number} */
  static get FLOAT16() { return 5; }

  /** @type {number} */
  static get FLOAT32() { return 6; }

  /** @type {number} */
  static get FLOAT64() { return 7; }

  /** @type {number} */
  static get UINT8() { return 8; }

  /** @type {number} */
  static get UINT16() { return 9; }

  /** @type {number} */
  static get UINT32() { return 10; }

  /** @type {number} */
  static get UINT64() { return 11; }

  /** @type {number} */
  static get INT8() { return 12; }

  /** @type {number} */
  static get INT16() { return 13; }

  /** @type {number} */
  static get INT32() { return 14; }

  /** @type {number} */
  static get INT64() { return 15; }

  /** @type {number} */
  static get NULL() { return 16; }

  /** @type {number} */
  static get OBJECT() { return 17; }

  /** @type {number} */
  static get TAGGED() { return 18; }

  /** @type {number} */
  static get TEXT() { return 19; }

  /** @type {number} */
  static get UNDEFINED() { return 20; }

  /**
   * @param {!Types} t
   * @returns {number}
   * @throws TypeError
   */
  static major(t) {
    switch (t) {
      case this.ARRAY: return 4;
      case this.BOOL: return 7;
      case this.BREAK: return 7;
      case this.BYTES: return 2;
      case this.FLOAT16: return 7;
      case this.FLOAT32: return 7;
      case this.FLOAT64: return 7;
      case this.UINT8: return 0;
      case this.UINT16: return 0;
      case this.UINT32: return 0;
      case this.UINT64: return 0;
      case this.INT8: return 1;
      case this.INT16: return 1;
      case this.INT32: return 1;
      case this.INT64: return 1;
      case this.NULL: return 7;
      case this.OBJECT: return 5;
      case this.TAGGED: return 6;
      case this.TEXT: return 3;
      case this.UNDEFINED: return 7;
      default: throw new TypeError('Invalid CBOR type');
    }
  }
}

module.exports = Types;


/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

/*
 * ed2curve: convert Ed25519 signing key pair into Curve25519
 * key pair suitable for Diffie-Hellman key exchange.
 *
 * Written by Dmitry Chestnykh in 2014. Public domain.
 */
/* jshint newcap: false */
(function(root, f) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) module.exports = f(__webpack_require__(38));
  else root.ed2curve = f(root.nacl);
}(this, function(nacl) {
  'use strict';
  if (!nacl) throw new Error('tweetnacl not loaded');

  // -- Operations copied from TweetNaCl.js. --

  var gf = function(init) {
    var i, r = new Float64Array(16);
    if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
    return r;
  };

  var gf0 = gf(),
      gf1 = gf([1]),
      D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
      I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);



  function car25519(o) {
    var c;
    var i;
    for (i = 0; i < 16; i++) {
      o[i] += 65536;
      c = Math.floor(o[i] / 65536);
      o[(i+1)*(i<15?1:0)] += c - 1 + 37 * (c-1) * (i===15?1:0);
      o[i] -= (c * 65536);
    }
  }

  function sel25519(p, q, b) {
    var t, c = ~(b-1);
    for (var i = 0; i < 16; i++) {
      t = c & (p[i] ^ q[i]);
      p[i] ^= t;
      q[i] ^= t;
    }
  }

  function unpack25519(o, n) {
    var i;
    for (i = 0; i < 16; i++) o[i] = n[2*i] + (n[2*i+1] << 8);
    o[15] &= 0x7fff;
  }

  // addition
  function A(o, a, b) {
    var i;
    for (i = 0; i < 16; i++) o[i] = (a[i] + b[i])|0;
  }

  // subtraction
  function Z(o, a, b) {
    var i;
    for (i = 0; i < 16; i++) o[i] = (a[i] - b[i])|0;
  }

  // multiplication
  function M(o, a, b) {
    var i, j, t = new Float64Array(31);
    for (i = 0; i < 31; i++) t[i] = 0;
    for (i = 0; i < 16; i++) {
      for (j = 0; j < 16; j++) {
        t[i+j] += a[i] * b[j];
      }
    }
    for (i = 0; i < 15; i++) {
      t[i] += 38 * t[i+16];
    }
    for (i = 0; i < 16; i++) o[i] = t[i];
    car25519(o);
    car25519(o);
  }

  // squaring
  function S(o, a) {
    M(o, a, a);
  }

  // inversion
  function inv25519(o, i) {
    var c = gf();
    var a;
    for (a = 0; a < 16; a++) c[a] = i[a];
    for (a = 253; a >= 0; a--) {
      S(c, c);
      if(a !== 2 && a !== 4) M(c, c, i);
    }
    for (a = 0; a < 16; a++) o[a] = c[a];
  }

  function pack25519(o, n) {
    var i, j, b;
    var m = gf(), t = gf();
    for (i = 0; i < 16; i++) t[i] = n[i];
    car25519(t);
    car25519(t);
    car25519(t);
    for (j = 0; j < 2; j++) {
      m[0] = t[0] - 0xffed;
      for (i = 1; i < 15; i++) {
        m[i] = t[i] - 0xffff - ((m[i-1]>>16) & 1);
        m[i-1] &= 0xffff;
      }
      m[15] = t[15] - 0x7fff - ((m[14]>>16) & 1);
      b = (m[15]>>16) & 1;
      m[14] &= 0xffff;
      sel25519(t, m, 1-b);
    }
    for (i = 0; i < 16; i++) {
      o[2*i] = t[i] & 0xff;
      o[2*i+1] = t[i] >> 8;
    }
  }


  function par25519(a) {
    var d = new Uint8Array(32);
    pack25519(d, a);
    return d[0] & 1;
  }



  function vn(x, xi, y, yi, n) {
    var i, d = 0;
    for (i = 0; i < n; i++) d |= x[xi + i] ^ y[yi + i];
    return (1 & ((d - 1) >>> 8)) - 1;
  }


  function crypto_verify_32(x, xi, y, yi) {
    return vn(x, xi, y, yi, 32);
  }

  function neq25519(a, b) {
    var c = new Uint8Array(32), d = new Uint8Array(32);
    pack25519(c, a);
    pack25519(d, b);
    return crypto_verify_32(c, 0, d, 0);
  }


  function pow2523(o, i) {
    var c = gf();
    var a;
    for (a = 0; a < 16; a++) c[a] = i[a];
    for (a = 250; a >= 0; a--) {
      S(c, c);
      if (a !== 1) M(c, c, i);
    }
    for (a = 0; a < 16; a++) o[a] = c[a];
  }

  function set25519(r, a) {
    var i;
    for (i = 0; i < 16; i++) r[i] = a[i] | 0;
  }

  function unpackneg(r, p) {
    var t = gf(), chk = gf(), num = gf(),
      den = gf(), den2 = gf(), den4 = gf(),
      den6 = gf();

    set25519(r[2], gf1);
    unpack25519(r[1], p);
    S(num, r[1]);
    M(den, num, D);
    Z(num, num, r[2]);
    A(den, r[2], den);

    S(den2, den);
    S(den4, den2);
    M(den6, den4, den2);
    M(t, den6, num);
    M(t, t, den);

    pow2523(t, t);
    M(t, t, num);
    M(t, t, den);
    M(t, t, den);
    M(r[0], t, den);

    S(chk, r[0]);
    M(chk, chk, den);
    if (neq25519(chk, num)) M(r[0], r[0], I);

    S(chk, r[0]);
    M(chk, chk, den);
    if (neq25519(chk, num)) return -1;

    if (par25519(r[0]) === (p[31] >> 7)) Z(r[0], gf0, r[0]);

    M(r[3], r[0], r[1]);
    return 0;
  }

  // ----

  // Converts Ed25519 public key to Curve25519 public key.
  // montgomeryX = (edwardsY + 1)*inverse(1 - edwardsY) mod p
  function convertPublicKey(pk) {
    var z = new Uint8Array(32),
      q = [gf(), gf(), gf(), gf()],
      a = gf(), b = gf();

    if (unpackneg(q, pk)) return null; // reject invalid key

    var y = q[1];

    A(a, gf1, y);
    Z(b, gf1, y);
    inv25519(b, b);
    M(a, a, b);

    pack25519(z, a);
    return z;
  }

  // Converts Ed25519 secret key to Curve25519 secret key.
  function convertSecretKey(sk) {
    var d = new Uint8Array(64), o = new Uint8Array(32), i;
    nacl.lowlevel.crypto_hash(d, sk, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;
    for (i = 0; i < 32; i++) o[i] = d[i];
    for (i = 0; i < 64; i++) d[i] = 0;
    return o;
  }

  function convertKeyPair(edKeyPair) {
    var publicKey = convertPublicKey(edKeyPair.publicKey);
    if (!publicKey) return null;
    return {
      publicKey: publicKey,
      secretKey: convertSecretKey(edKeyPair.secretKey)
    };
  }

  return {
    convertPublicKey: convertPublicKey,
    convertSecretKey: convertSecretKey,
    convertKeyPair: convertKeyPair,
  };

}));


/***/ }),
/* 22 */
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

const CBOR = __webpack_require__(2);
const ed2curve = __webpack_require__(21);
const sodium = __webpack_require__(5);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const PublicKey = __webpack_require__(4);
const TypeUtil = __webpack_require__(1);

/** @module keys */

/**
 * @class SecretKey
 * @throws {DontCallConstructor}
 */
class SecretKey {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!Uint8Array} sec_edward
   * @param {!Uint8Array} sec_curve
   * @returns {SecretKey} - `this`
   */
  static new(sec_edward, sec_curve) {
    TypeUtil.assert_is_instance(Uint8Array, sec_edward);
    TypeUtil.assert_is_instance(Uint8Array, sec_curve);

    const sk = ClassUtil.new_instance(SecretKey);

    /** @type {Uint8Array} */
    sk.sec_edward = sec_edward;
    /** @type {Uint8Array} */
    sk.sec_curve = sec_curve;
    return sk;
  }

  /**
   * This function can be used to compute a message signature.
   * @param {!string} message - Message to be signed
   * @returns {Uint8Array} - A message signature
   */
  sign(message) {
    return sodium.crypto_sign_detached(message, this.sec_edward);
  }

  /**
   * This function can be used to compute a shared secret given a user's secret key and another
   * user's public key.
   * @param {!keys.PublicKey} public_key - Another user's public key
   * @returns {Uint8Array} - Array buffer view of the computed shared secret
   */
  shared_secret(public_key) {
    TypeUtil.assert_is_instance(PublicKey, public_key);

    return sodium.crypto_scalarmult(this.sec_curve, public_key.pub_curve);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(1);
    encoder.u8(0);
    return encoder.bytes(this.sec_edward);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {SecretKey}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    const self = ClassUtil.new_instance(SecretKey);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.sec_edward = new Uint8Array(decoder.bytes());
          break;
        default:
          decoder.skip();
      }
    }

    TypeUtil.assert_is_instance(Uint8Array, self.sec_edward);

    self.sec_curve = ed2curve.convertSecretKey(self.sec_edward);
    return self;
  }
}

module.exports = SecretKey;


/***/ }),
/* 23 */
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

const CBOR = __webpack_require__(2);
const sodium = __webpack_require__(5);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

const IdentityKey = __webpack_require__(8);
const IdentityKeyPair = __webpack_require__(12);
const PreKey = __webpack_require__(24);
const PreKeyAuth = __webpack_require__(30);
const PublicKey = __webpack_require__(4);

/** @module keys */

/**
 * @class PreKeyBundle
 * @throws {DontCallConstructor}
 */
class PreKeyBundle {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!keys.IdentityKey} public_identity_key
   * @param {!keys.PreKey} prekey
   * @returns {PreKeyBundle} - `this`
   */
  static new(public_identity_key, prekey) {
    TypeUtil.assert_is_instance(IdentityKey, public_identity_key);
    TypeUtil.assert_is_instance(PreKey, prekey);

    /** @type {keys.PreyKeyBundle} */
    const bundle = ClassUtil.new_instance(PreKeyBundle);

    bundle.version = 1;
    bundle.prekey_id = prekey.key_id;
    bundle.public_key = prekey.key_pair.public_key;
    bundle.identity_key = public_identity_key;
    bundle.signature = null;

    return bundle;
  }

  /**
   * @param {!keys.IdentityKeyPair} identity_pair
   * @param {!keys.PreKey} prekey
   * @returns {PreKeyBundle}
   */
  static signed(identity_pair, prekey) {
    TypeUtil.assert_is_instance(IdentityKeyPair, identity_pair);
    TypeUtil.assert_is_instance(PreKey, prekey);

    /** @type {keys.PublicKey} */
    const ratchet_key = prekey.key_pair.public_key;
    /** @type {Uint8Array} */
    const signature = identity_pair.secret_key.sign(ratchet_key.pub_edward);

    /** @type {keys.PreyKeyBundle} */
    const bundle = ClassUtil.new_instance(PreKeyBundle);

    bundle.version = 1;
    bundle.prekey_id = prekey.key_id;
    bundle.public_key = ratchet_key;
    bundle.identity_key = identity_pair.public_key;
    bundle.signature = signature;

    return bundle;
  }

  /** @returns {keys.PreKeyAuth} */
  verify() {
    if (!this.signature) {
      return PreKeyAuth.UNKNOWN;
    }

    if (this.identity_key.public_key.verify(this.signature, this.public_key.pub_edward)) {
      return PreKeyAuth.VALID;
    }
    return PreKeyAuth.INVALID;
  }

  /** @returns {ArrayBuffer} */
  serialise() {
    const encoder = new CBOR.Encoder();
    this.encode(encoder);
    return encoder.get_buffer();
  }

  /**
   * @typedef {Object} type_serialised_json
   * @property {number} id
   * @property {string} key
   */
  /** @returns {type_serialised_json} */
  serialised_json() {
    return {
      id: this.prekey_id,
      key: sodium.to_base64(new Uint8Array(this.serialise()), true),
    };
  }

  /**
   * @param {!ArrayBuffer} buf
   * @returns {PreKeyBundle}
   */
  static deserialise(buf) {
    TypeUtil.assert_is_instance(ArrayBuffer, buf);
    return PreKeyBundle.decode(new CBOR.Decoder(buf));
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    TypeUtil.assert_is_instance(CBOR.Encoder, encoder);

    encoder.object(5);
    encoder.u8(0);
    encoder.u8(this.version);
    encoder.u8(1);
    encoder.u16(this.prekey_id);
    encoder.u8(2);
    this.public_key.encode(encoder);
    encoder.u8(3);
    this.identity_key.encode(encoder);

    encoder.u8(4);
    if (!this.signature) {
      return encoder.null();
    }
    return encoder.bytes(this.signature);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {PreKeyBundle}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    const self = ClassUtil.new_instance(PreKeyBundle);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.version = decoder.u8();
          break;
        case 1:
          self.prekey_id = decoder.u16();
          break;
        case 2:
          self.public_key = PublicKey.decode(decoder);
          break;
        case 3:
          self.identity_key = IdentityKey.decode(decoder);
          break;
        case 4:
          self.signature = decoder.optional(() => new Uint8Array(decoder.bytes()));
          break;
        default:
          decoder.skip();
      }
    }

    TypeUtil.assert_is_integer(self.version);
    TypeUtil.assert_is_integer(self.prekey_id);
    TypeUtil.assert_is_instance(PublicKey, self.public_key);
    TypeUtil.assert_is_instance(IdentityKey, self.identity_key);

    return self;
  }
}

module.exports = PreKeyBundle;


/***/ }),
/* 24 */
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

const CBOR = __webpack_require__(2);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const InputError = __webpack_require__(19);
const TypeUtil = __webpack_require__(1);

const KeyPair = __webpack_require__(7);

/** @module keys **/

/**
 * @class PreKey
 * @classdesc Pre-generated (and regularly refreshed) pre-keys.
 * A Pre-Shared Key contains the public long-term identity and ephemeral handshake keys for the initial triple DH.
 * @throws {DontCallConstructor}
 */
class PreKey {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /** @type {number} */
  static get MAX_PREKEY_ID() {
    return 0xffff;
  }

  /**
   * @param {!number} pre_key_id
   * @returns {PreKey} - `this`
   * @throws {errors.InputError.RangeError}
   */
  static new(pre_key_id) {
    this.validate_pre_key_id(pre_key_id);

    const pk = ClassUtil.new_instance(PreKey);

    pk.version = 1;
    pk.key_id = pre_key_id;
    pk.key_pair = KeyPair.new();
    return pk;
  }

  static validate_pre_key_id(pre_key_id) {
    TypeUtil.assert_is_integer(pre_key_id);

    if (pre_key_id < 0 || pre_key_id > PreKey.MAX_PREKEY_ID) {
      const message = `PreKey ID (${pre_key_id}) must be between or equal to 0 and ${PreKey.MAX_PREKEY_ID}.`;
      throw new InputError.RangeError(message, InputError.CODE.CASE_400);
    }
  }

  /** @returns {PreKey} */
  static last_resort() {
    return PreKey.new(PreKey.MAX_PREKEY_ID);
  }

  /**
   * @param {!number} start
   * @param {!number} size
   * @returns {Array<PreKey>}
   * @throws {errors.InputError.RangeError}
   */
  static generate_prekeys(start, size) {
    this.validate_pre_key_id(start);
    this.validate_pre_key_id(size);

    if (size === 0) {
      return [];
    }

    return [...Array(size).keys()].map(key => PreKey.new((start + key) % PreKey.MAX_PREKEY_ID));
  }

  /** @returns {ArrayBuffer} */
  serialise() {
    const encoder = new CBOR.Encoder();
    this.encode(encoder);
    return encoder.get_buffer();
  }

  /**
   * @param {!ArrayBuffer} buf
   * @returns {PreKey}
   */
  static deserialise(buf) {
    TypeUtil.assert_is_instance(ArrayBuffer, buf);
    return PreKey.decode(new CBOR.Decoder(buf));
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    TypeUtil.assert_is_instance(CBOR.Encoder, encoder);
    encoder.object(3);
    encoder.u8(0);
    encoder.u8(this.version);
    encoder.u8(1);
    encoder.u16(this.key_id);
    encoder.u8(2);
    return this.key_pair.encode(encoder);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {PreKey}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    const self = ClassUtil.new_instance(PreKey);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.version = decoder.u8();
          break;
        case 1:
          self.key_id = decoder.u16();
          break;
        case 2:
          self.key_pair = KeyPair.decode(decoder);
          break;
        default:
          decoder.skip();
      }
    }

    TypeUtil.assert_is_integer(self.version);
    TypeUtil.assert_is_integer(self.key_id);
    TypeUtil.assert_is_instance(KeyPair, self.key_pair);

    return self;
  }
}

module.exports = PreKey;


/***/ }),
/* 25 */
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

const CBOR = __webpack_require__(2);
const sodium = __webpack_require__(5);

const DontCallConstructor = __webpack_require__(0);

const ClassUtil = __webpack_require__(3);
const TypeUtil = __webpack_require__(1);

const DecodeError = __webpack_require__(10);
const RandomUtil = __webpack_require__(40);

/** @module message */

/**
 * @class SessionTag
 * @throws {DontCallConstructor}
 */
class SessionTag {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /** @returns {SessionTag} - `this` */
  static new() {
    const length = 16;

    const st = ClassUtil.new_instance(SessionTag);
    st.tag = RandomUtil.random_bytes(length);
    return st;
  }

  /** @returns {string} */
  toString() {
    return sodium.to_hex(this.tag);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    return encoder.bytes(this.tag);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {SessionTag}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    const length = 16;

    const bytes = new Uint8Array(decoder.bytes());
    if (bytes.byteLength !== length) {
      throw DecodeError.InvalidArrayLen(
        `Session tag should be 16 bytes, not ${bytes.byteLength} bytes.`,
        DecodeError.CODE.CASE_303
      );
    }

    const st = ClassUtil.new_instance(SessionTag);
    st.tag = new Uint8Array(bytes);
    return st;
  }
}

module.exports = SessionTag;


/***/ }),
/* 26 */
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

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const KeyDerivationUtil = __webpack_require__(43);
const MemoryUtil = __webpack_require__(17);

const CipherKey = __webpack_require__(27);
const MacKey = __webpack_require__(16);

/** @module derived */

/**
 * @class DerivedSecrets
 * @throws {DontCallConstructor}
 */
class DerivedSecrets {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!Array<number>} input
   * @param {!Uint8Array} salt
   * @param {!string} info
   * @returns {DerivedSecrets} - `this`
   */
  static kdf(input, salt, info) {
    const byte_length = 64;

    const output_key_material = KeyDerivationUtil.hkdf(salt, input, info, byte_length);

    const cipher_key = new Uint8Array(output_key_material.buffer.slice(0, 32));
    const mac_key = new Uint8Array(output_key_material.buffer.slice(32, 64));

    MemoryUtil.zeroize(output_key_material.buffer);

    const ds = ClassUtil.new_instance(DerivedSecrets);
    /** @type {derived.CipherKey} */
    ds.cipher_key = CipherKey.new(cipher_key);
    /** @type {derived.MacKey} */
    ds.mac_key = MacKey.new(mac_key);
    return ds;
  }

  /**
   * @param {!Array<number>} input - Initial key material (usually the Master Key) in byte array format
   * @param {!string} info - Key Derivation Data
   * @returns {DerivedSecrets}
   */
  static kdf_without_salt(input, info) {
    return this.kdf(input, new Uint8Array(0), info);
  }
}

module.exports = DerivedSecrets;


/***/ }),
/* 27 */
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

const CBOR = __webpack_require__(2);
const sodium = __webpack_require__(5);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

/** @module derived */

/**
 * @class CipherKey
 * @throws {DontCallConstructor}
 */
class CipherKey {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!Uint8Array} key
   * @returns {CipherKey} - `this`
   */
  static new(key) {
    TypeUtil.assert_is_instance(Uint8Array, key);

    const ck = ClassUtil.new_instance(CipherKey);
    /** @type {Uint8Array} */
    ck.key = key;
    return ck;
  }

  /**
   * @param {!(ArrayBuffer|String|Uint8Array)} plaintext - The text to encrypt
   * @param {!Uint8Array} nonce - Counter as nonce
   * @returns {Uint8Array} - Encrypted payload
   */
  encrypt(plaintext, nonce) {
    // @todo Re-validate if the ArrayBuffer check is needed (Prerequisite: Integration tests)
    if (plaintext instanceof ArrayBuffer && plaintext.byteLength !== undefined) {
      plaintext = new Uint8Array(plaintext);
    }

    return sodium.crypto_stream_chacha20_xor(plaintext, nonce, this.key, 'uint8array');
  }

  /**
   * @param {!Uint8Array} ciphertext
   * @param {!Uint8Array} nonce
   * @returns {Uint8Array}
   */
  decrypt(ciphertext, nonce) {
    return this.encrypt(ciphertext, nonce);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(1);
    encoder.u8(0);
    return encoder.bytes(this.key);
  }

  /**
   * @param {!CBOR.Encoder} decoder
   * @returns {CipherKey}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    let key_bytes = null;

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          key_bytes = new Uint8Array(decoder.bytes());
          break;
        default:
          decoder.skip();
      }
    }
    return CipherKey.new(key_bytes);
  }
}

module.exports = CipherKey;


/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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
    this.stack = (new Error).stack;
  };

  BaseError.prototype = new Error;
  BaseError.prototype.constructor = BaseError;

  return BaseError;
})();


/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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



const BaseError = __webpack_require__(28);

/**
 * @class DecodeError
 * @param {string} message
 * @param {*} [extra]
 */
class DecodeError extends BaseError {
  constructor (message, extra) {
    super(message);
    this.extra = extra;
  }

  /** @type {string} */
  static get INVALID_TYPE () { return 'Invalid type'; }

  /** @type {string} */
  static get UNEXPECTED_EOF () { return 'Unexpected end-of-buffer'; }

  /** @type {string} */
  static get UNEXPECTED_TYPE () { return 'Unexpected type'; }

  /** @type {string} */
  static get INT_OVERFLOW () { return 'Integer overflow'; }

  /** @type {string} */
  static get TOO_LONG () { return 'Field too long'; }

  /** @type {string} */
  static get TOO_NESTED () { return 'Object nested too deep'; }
}

module.exports = DecodeError;


/***/ }),
/* 30 */
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

/** @module keys */

/** @class PreKeyAuth */
class PreKeyAuth {
  /** @type {string} */
  static get INVALID() {
    return 'Invalid';
  }

  /** @type {string} */
  static get UNKNOWN() {
    return 'Unknown';
  }

  /** @type {string} */
  static get VALID() {
    return 'Valid';
  }
}

module.exports = PreKeyAuth;


/***/ }),
/* 31 */
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

/** @module session */

/** @class PreKeyStore */
function PreKeyStore() {}

/** @type {Array<number>} */
PreKeyStore.prekeys = [];

/**
 * @param {!number} prekey_id
 * @returns {void}
 * @throws {Error}
 */
PreKeyStore.prototype.get_prekey = function(prekey_id) {
  throw Error('Virtual function unimplemented');
};

/**
 * @param {!number} prekey_id
 * @returns {void}
 * @throws {Error}
 */
PreKeyStore.prototype.remove = function(prekey_id) {
  throw Error('Virtual function unimplemented');
};

module.exports = PreKeyStore;


/***/ }),
/* 32 */
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

const CBOR = __webpack_require__(2);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const MemoryUtil = __webpack_require__(17);
const TypeUtil = __webpack_require__(1);

const DecodeError = __webpack_require__(10);
const DecryptError = __webpack_require__(11);
const ProteusError = __webpack_require__(6);

const IdentityKey = __webpack_require__(8);
const IdentityKeyPair = __webpack_require__(12);
const KeyPair = __webpack_require__(7);
const PreKey = __webpack_require__(24);
const PreKeyBundle = __webpack_require__(23);
const PublicKey = __webpack_require__(4);

const CipherMessage = __webpack_require__(9);
const Envelope = __webpack_require__(15);
const PreKeyMessage = __webpack_require__(14);
const SessionTag = __webpack_require__(25);

const PreKeyStore = __webpack_require__(31);

/** @module session */

/**
 * @class Session
 * @throws {DontCallConstructor}
 */
class Session {
  constructor() {
    this.counter = 0;
    this.local_identity = null;
    this.pending_prekey = null;
    this.remote_identity = null;
    this.session_states = null;
    this.session_tag = null;
    this.version = 1;

    throw new DontCallConstructor(this);
  }

  /** @type {number} */
  static get MAX_RECV_CHAINS() {
    return 5;
  }

  /** @type {number} */
  static get MAX_SESSION_STATES() {
    return 100;
  }

  /**
   * @param {!keys.IdentityKeyPair} local_identity - Alice's Identity Key Pair
   * @param {!keys.PreKeyBundle} remote_pkbundle - Bob's Pre-Key Bundle
   * @returns {Promise<Session>}
   */
  static init_from_prekey(local_identity, remote_pkbundle) {
    return new Promise(resolve => {
      TypeUtil.assert_is_instance(IdentityKeyPair, local_identity);
      TypeUtil.assert_is_instance(PreKeyBundle, remote_pkbundle);

      const alice_base = KeyPair.new();

      const state = SessionState.init_as_alice(local_identity, alice_base, remote_pkbundle);

      const session_tag = SessionTag.new();

      const session = ClassUtil.new_instance(this);
      session.session_tag = session_tag;
      session.local_identity = local_identity;
      session.remote_identity = remote_pkbundle.identity_key;
      session.pending_prekey = [remote_pkbundle.prekey_id, alice_base.public_key];
      session.session_states = {};

      session._insert_session_state(session_tag, state);
      return resolve(session);
    });
  }

  /**
   * @param {!keys.IdentityKeyPair} our_identity
   * @param {!session.PreKeyStore} prekey_store
   * @param {!message.Envelope} envelope
   * @returns {Promise<Array<Session|string>>}
   * @throws {errors.DecryptError.InvalidMessage}
   * @throws {errors.DecryptError.PrekeyNotFound}
   */
  static init_from_message(our_identity, prekey_store, envelope) {
    return new Promise((resolve, reject) => {
      TypeUtil.assert_is_instance(IdentityKeyPair, our_identity);
      TypeUtil.assert_is_instance(PreKeyStore, prekey_store);
      TypeUtil.assert_is_instance(Envelope, envelope);

      const pkmsg = (() => {
        if (envelope.message instanceof CipherMessage) {
          throw new DecryptError.InvalidMessage(
            "Can't initialise a session from a CipherMessage.",
            DecryptError.CODE.CASE_201
          );
        } else if (envelope.message instanceof PreKeyMessage) {
          return envelope.message;
        } else {
          throw new DecryptError.InvalidMessage(
            'Unknown message format: The message is neither a "CipherMessage" nor a "PreKeyMessage".',
            DecryptError.CODE.CASE_202
          );
        }
      })();

      const session = ClassUtil.new_instance(Session);
      session.session_tag = pkmsg.message.session_tag;
      session.local_identity = our_identity;
      session.remote_identity = pkmsg.identity_key;
      session.pending_prekey = null;
      session.session_states = {};

      return session
        ._new_state(prekey_store, pkmsg)
        .then(state => {
          const plain = state.decrypt(envelope, pkmsg.message);
          session._insert_session_state(pkmsg.message.session_tag, state);

          if (pkmsg.prekey_id < PreKey.MAX_PREKEY_ID) {
            MemoryUtil.zeroize(prekey_store.prekeys[pkmsg.prekey_id]);
            return prekey_store
              .remove(pkmsg.prekey_id)
              .then(() => resolve([session, plain]))
              .catch(error => {
                reject(
                  new DecryptError.PrekeyNotFound(
                    `Could not delete PreKey: ${error.message}`,
                    DecryptError.CODE.CASE_203
                  )
                );
              });
          }
          return resolve([session, plain]);
        })
        .catch(reject);
    });
  }

  /**
   * @param {!session.PreKeyStore} pre_key_store
   * @param {!message.PreKeyMessage} pre_key_message
   * @returns {Promise<session.SessionState>}
   * @private
   * @throws {errors.ProteusError}
   */
  _new_state(pre_key_store, pre_key_message) {
    return pre_key_store.get_prekey(pre_key_message.prekey_id).then(pre_key => {
      if (pre_key) {
        return SessionState.init_as_bob(
          this.local_identity,
          pre_key.key_pair,
          pre_key_message.identity_key,
          pre_key_message.base_key
        );
      }
      throw new ProteusError('Unable to get PreKey from PreKey store.', ProteusError.prototype.CODE.CASE_101);
    });
  }

  /**
   * @param {!message.SessionTag} tag
   * @param {!session.SessionState} state
   * @returns {boolean}
   * @private
   */
  _insert_session_state(tag, state) {
    if (this.session_states.hasOwnProperty(tag)) {
      this.session_states[tag].state = state;
    } else {
      if (this.counter >= Number.MAX_SAFE_INTEGER) {
        this.session_states = {};
        this.counter = 0;
      }

      this.session_states[tag] = {
        idx: this.counter,
        state: state,
        tag: tag,
      };
      this.counter++;
    }

    if (this.session_tag.toString() !== tag.toString()) {
      this.session_tag = tag;
    }

    const obj_size = obj => Object.keys(obj).length;

    if (obj_size(this.session_states) < Session.MAX_SESSION_STATES) {
      return;
    }

    // if we get here, it means that we have more than MAX_SESSION_STATES and
    // we need to evict the oldest one.
    return this._evict_oldest_session_state();
  }

  /**
   * @returns {void}
   * @private
   */
  _evict_oldest_session_state() {
    const oldest = Object.keys(this.session_states)
      .filter(obj => obj.toString() !== this.session_tag)
      .reduce((lowest, obj, index) => {
        return this.session_states[obj].idx < this.session_states[lowest].idx ? obj.toString() : lowest;
      });

    MemoryUtil.zeroize(this.session_states[oldest]);
    delete this.session_states[oldest];
  }

  /** @returns {keys.PublicKey} */
  get_local_identity() {
    return this.local_identity.public_key;
  }

  /**
   * @param {!(String|Uint8Array)} plaintext - The plaintext which needs to be encrypted
   * @return {Promise<message.Envelope>} Encrypted message
   */
  encrypt(plaintext) {
    return new Promise((resolve, reject) => {
      const state = this.session_states[this.session_tag];

      if (!state) {
        return reject(
          new ProteusError(
            `Could not find session for tag '${(this.session_tag || '').toString()}'.`,
            ProteusError.prototype.CODE.CASE_102
          )
        );
      }

      return resolve(
        state.state.encrypt(this.local_identity.public_key, this.pending_prekey, this.session_tag, plaintext)
      );
    });
  }

  /**
   * @param {!session.PreKeyStore} prekey_store
   * @param {!message.Envelope} envelope
   * @returns {Promise<string>}
   * @throws {errors.DecryptError}
   */
  decrypt(prekey_store, envelope) {
    return new Promise(resolve => {
      TypeUtil.assert_is_instance(PreKeyStore, prekey_store);
      TypeUtil.assert_is_instance(Envelope, envelope);

      const msg = envelope.message;
      if (msg instanceof CipherMessage) {
        return resolve(this._decrypt_cipher_message(envelope, envelope.message));
      } else if (msg instanceof PreKeyMessage) {
        const actual_fingerprint = msg.identity_key.fingerprint();
        const expected_fingerprint = this.remote_identity.fingerprint();
        if (actual_fingerprint !== expected_fingerprint) {
          const message = `Fingerprints do not match: We expected '${expected_fingerprint}', but received '${actual_fingerprint}'.`;
          throw new DecryptError.RemoteIdentityChanged(message, DecryptError.CODE.CASE_204);
        }
        return resolve(this._decrypt_prekey_message(envelope, msg, prekey_store));
      }
      throw new DecryptError('Unknown message type.', DecryptError.CODE.CASE_200);
    });
  }

  /**
   * @param {!message.Envelope} envelope
   * @param {!message.Message} msg
   * @param {!session.PreKeyStore} prekey_store
   * @private
   * @returns {Promise<string>}
   * @throws {errors.DecryptError}
   */
  _decrypt_prekey_message(envelope, msg, prekey_store) {
    return Promise.resolve()
      .then(() => this._decrypt_cipher_message(envelope, msg.message))
      .catch(error => {
        if (error instanceof DecryptError.InvalidSignature || error instanceof DecryptError.InvalidMessage) {
          return this._new_state(prekey_store, msg).then(state => {
            const plaintext = state.decrypt(envelope, msg.message);

            if (msg.prekey_id !== PreKey.MAX_PREKEY_ID) {
              MemoryUtil.zeroize(prekey_store.prekeys[msg.prekey_id]);
              prekey_store.remove(msg.prekey_id);
            }

            this._insert_session_state(msg.message.session_tag, state);
            this.pending_prekey = null;

            return plaintext;
          });
        }
        throw error;
      });
  }

  /**
   * @param {!message.Envelope} envelope
   * @param {!message.Message} msg
   * @private
   * @returns {string}
   */
  _decrypt_cipher_message(envelope, msg) {
    let state = this.session_states[msg.session_tag];
    if (!state) {
      throw new DecryptError.InvalidMessage(
        `Local session not found for message session tag '${msg.session_tag}'.`,
        DecryptError.CODE.CASE_205
      );
    }

    // serialise and de-serialise for a deep clone
    // THIS IS IMPORTANT, DO NOT MUTATE THE SESSION STATE IN-PLACE
    // mutating in-place can lead to undefined behavior and undefined state in edge cases
    state = SessionState.deserialise(state.state.serialise());

    const plaintext = state.decrypt(envelope, msg);

    this.pending_prekey = null;

    this._insert_session_state(msg.session_tag, state);
    return plaintext;
  }

  /**
   * @returns {ArrayBuffer}
   */
  serialise() {
    const encoder = new CBOR.Encoder();
    this.encode(encoder);
    return encoder.get_buffer();
  }

  /**
   * @param {!keys.IdentityKeyPair} local_identity
   * @param {!ArrayBuffer} buf
   * @returns {Session}
   */
  static deserialise(local_identity, buf) {
    TypeUtil.assert_is_instance(IdentityKeyPair, local_identity);
    TypeUtil.assert_is_instance(ArrayBuffer, buf);

    const decoder = new CBOR.Decoder(buf);
    return this.decode(local_identity, decoder);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {void}
   */
  encode(encoder) {
    encoder.object(6);
    encoder.u8(0);
    encoder.u8(this.version);
    encoder.u8(1);
    this.session_tag.encode(encoder);
    encoder.u8(2);
    this.local_identity.public_key.encode(encoder);
    encoder.u8(3);
    this.remote_identity.encode(encoder);

    encoder.u8(4);
    if (this.pending_prekey) {
      encoder.object(2);
      encoder.u8(0);
      encoder.u16(this.pending_prekey[0]);
      encoder.u8(1);
      this.pending_prekey[1].encode(encoder);
    } else {
      encoder.null();
    }

    encoder.u8(5);
    encoder.object(Object.keys(this.session_states).length);

    for (const index in this.session_states) {
      const state = this.session_states[index];
      state.tag.encode(encoder);
      state.state.encode(encoder);
    }
  }

  /**
   * @param {!keys.IdentityKeyPair} local_identity
   * @param {!CBOR.Decoder} decoder
   * @returns {Session}
   */
  static decode(local_identity, decoder) {
    TypeUtil.assert_is_instance(IdentityKeyPair, local_identity);
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    const self = ClassUtil.new_instance(this);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0: {
          self.version = decoder.u8();
          break;
        }
        case 1: {
          self.session_tag = SessionTag.decode(decoder);
          break;
        }
        case 2: {
          const identity_key = IdentityKey.decode(decoder);
          if (local_identity.public_key.fingerprint() !== identity_key.fingerprint()) {
            throw new DecodeError.LocalIdentityChanged(null, DecodeError.CODE.CASE_300);
          }
          self.local_identity = local_identity;
          break;
        }
        case 3: {
          self.remote_identity = IdentityKey.decode(decoder);
          break;
        }
        case 4: {
          switch (decoder.optional(() => decoder.object())) {
            case null:
              self.pending_prekey = null;
              break;
            case 2:
              self.pending_prekey = [null, null];
              for (let key = 0; key <= 1; ++key) {
                switch (decoder.u8()) {
                  case 0:
                    self.pending_prekey[0] = decoder.u16();
                    break;
                  case 1:
                    self.pending_prekey[1] = PublicKey.decode(decoder);
                }
              }
              break;
            default:
              throw new DecodeError.InvalidType(null, DecodeError.CODE.CASE_301);
          }
          break;
        }
        case 5: {
          self.session_states = {};
          // needs simplification
          for (
            let idx = 0, ref = decoder.object() - 1, subindex = 0;
            0 <= ref ? subindex <= ref : subindex >= ref;
            idx = 0 <= ref ? ++subindex : --subindex
          ) {
            const tag = SessionTag.decode(decoder);
            self.session_states[tag] = {
              idx,
              state: SessionState.decode(decoder),
              tag: tag,
            };
          }
          break;
        }
        default: {
          decoder.skip();
        }
      }
    }

    TypeUtil.assert_is_integer(self.version);
    TypeUtil.assert_is_instance(SessionTag, self.session_tag);
    TypeUtil.assert_is_instance(IdentityKeyPair, self.local_identity);
    TypeUtil.assert_is_instance(IdentityKey, self.remote_identity);
    TypeUtil.assert_is_instance(Object, self.session_states);

    return self;
  }
}

module.exports = Session;

const SessionState = __webpack_require__(42);


/***/ }),
/* 33 */
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

const ProteusError = __webpack_require__(6);
const TypeUtil = __webpack_require__(1);

/** @module util */

/**
 * Concatenates array buffers (usually 8-bit unsigned).
 */
const ArrayUtil = {
  /**
   * @param {!(Array<number>|Uint8Array)} array
   * @returns {void}
   * @throws {errors.ProteusError}
   */
  assert_is_not_zeros(array) {
    let only_zeroes = true;
    for (const val in array) {
      if (val > 0) {
        only_zeroes = false;
        break;
      }
    }

    if (only_zeroes === true) {
      throw new ProteusError('Array consists only of zeroes.', ProteusError.prototype.CODE.CASE_100);
    }
  },

  /**
   * @param {!Array<ArrayBuffer>} buffers
   * @returns {Array<ArrayBuffer>}
   */
  concatenate_array_buffers(buffers) {
    TypeUtil.assert_is_instance(Array, buffers);

    return buffers.reduce((callback, bytes) => {
      const buf = new callback.constructor(callback.byteLength + bytes.byteLength);
      buf.set(callback, 0);
      buf.set(bytes, callback.byteLength);
      return buf;
    });
  },
};

module.exports = ArrayUtil;


/***/ }),
/* 34 */
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

const CBOR = __webpack_require__(2);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

const CipherKey = __webpack_require__(27);
const MacKey = __webpack_require__(16);

/** @module session */

/**
 * @class MessageKeys
 * @throws {DontCallConstructor}
 */
class MessageKeys {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!derived.CipherKey} cipher_key
   * @param {!derived.MacKey} mac_key
   * @param {!number} counter
   * @returns {MessageKeys} - `this`
   */
  static new(cipher_key, mac_key, counter) {
    TypeUtil.assert_is_instance(CipherKey, cipher_key);
    TypeUtil.assert_is_instance(MacKey, mac_key);
    TypeUtil.assert_is_integer(counter);

    const mk = ClassUtil.new_instance(MessageKeys);
    mk.cipher_key = cipher_key;
    mk.mac_key = mac_key;
    mk.counter = counter;
    return mk;
  }

  /**
   * @returns {Uint8Array}
   * @private
   */
  _counter_as_nonce() {
    const nonce = new ArrayBuffer(8);
    new DataView(nonce).setUint32(0, this.counter);
    return new Uint8Array(nonce);
  }

  /**
   * @param {!(string|Uint8Array)} plaintext
   * @returns {Uint8Array}
   */
  encrypt(plaintext) {
    return this.cipher_key.encrypt(plaintext, this._counter_as_nonce());
  }

  /**
   * @param {!Uint8Array} ciphertext
   * @returns {Uint8Array}
   */
  decrypt(ciphertext) {
    return this.cipher_key.decrypt(ciphertext, this._counter_as_nonce());
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(3);
    encoder.u8(0);
    this.cipher_key.encode(encoder);
    encoder.u8(1);
    this.mac_key.encode(encoder);
    encoder.u8(2);
    return encoder.u32(this.counter);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {MessageKeys}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    const self = ClassUtil.new_instance(MessageKeys);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.cipher_key = CipherKey.decode(decoder);
          break;
        case 1:
          self.mac_key = MacKey.decode(decoder);
          break;
        case 2:
          self.counter = decoder.u32();
          break;
        default:
          decoder.skip();
      }
    }

    TypeUtil.assert_is_instance(CipherKey, self.cipher_key);
    TypeUtil.assert_is_instance(MacKey, self.mac_key);
    TypeUtil.assert_is_integer(self.counter);

    return self;
  }
}

module.exports = MessageKeys;


/***/ }),
/* 35 */
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

/* eslint sort-keys: "off" */

module.exports = {
  errors: {
    ProteusError: __webpack_require__(6),
    DecodeError: __webpack_require__(10),
    DecryptError: __webpack_require__(11),
    InputError: __webpack_require__(19),
  },

  keys: {
    IdentityKey: __webpack_require__(8),
    IdentityKeyPair: __webpack_require__(12),
    KeyPair: __webpack_require__(7),
    PreKeyAuth: __webpack_require__(30),
    PreKeyBundle: __webpack_require__(23),
    PreKey: __webpack_require__(24),
    PublicKey: __webpack_require__(4),
    SecretKey: __webpack_require__(22),
  },

  message: {
    Message: __webpack_require__(13),
    CipherMessage: __webpack_require__(9),
    PreKeyMessage: __webpack_require__(14),
    Envelope: __webpack_require__(15),
  },

  session: {
    PreKeyStore: __webpack_require__(31),
    Session: __webpack_require__(32),
  },
};


/***/ }),
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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



const DecodeError = __webpack_require__(29);
const Types = __webpack_require__(20);

const DEFAULT_CONFIG = {
  max_array_length: 1000,
  max_bytes_length: 5242880,
  max_text_length: 5242880,
  max_object_size: 1000,
  max_nesting: 16,
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
   * @param {!number} x
   * @param {!number} overflow
   * @returns {number}
   * @private
   * @throws DecodeError
   */
  static _check_overflow(x, overflow) {
    if (x > overflow) {
      throw new DecodeError(DecodeError.INT_OVERFLOW);
    }
    return x;
  }

  /**
   * @param {!number} bytes
   * @returns {void}
   * @private
   */
  _advance(bytes) {
    this.view = new DataView(this.buffer, (this.view.byteOffset + bytes));
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
    const r64 = (x) => (this.view.getUint32(0) * Math.pow(2, 32)) + this.view.getUint32(4);
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
    if ((0 <= minor) && (minor <= 23)) {
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

    return this._read(len, () => this.buffer.slice(this.view.byteOffset, (this.view.byteOffset + len)));
  }

  /**
   * @returns {Array<Types|number>}
   * @private
   * @throws DecodeError
   */
  _read_type_info() {
    let type = this._u8();

    const major = (type & 0xE0) >> 5;
    const minor = type & 0x1F;

    switch (major) {
      case 0:
        type = (0 <= minor) && (minor <= 24) ? Types.UINT8 : (
          () => {
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
        type = (0 <= minor) && (minor <= 24) ? Types.INT8 : (
          () => {
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

    if (!expected.some((e) => type === e)) {
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
        return (minor <= 23) ? minor : this._u8();

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
          return (-1 - minor);
        }
        return (-1 - Decoder._check_overflow(this._u8(), overflow));

      case Types.INT16:
        return (-1 - Decoder._check_overflow(this._u16(), overflow));

      case Types.INT32:
        return (-1 - Decoder._check_overflow(this._u32(), overflow));

      case Types.INT64:
        return (-1 - Decoder._check_overflow(this._u64(), overflow));

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
    return this._read_unsigned(...this._type_info_with_assert([
      Types.UINT8,
    ]));
  }

  /** @returns {number} */
  u16() {
    return this._read_unsigned(...this._type_info_with_assert([
      Types.UINT8,
      Types.UINT16,
    ]));
  }

  /** @returns {number} */
  u32() {
    return this._read_unsigned(...this._type_info_with_assert([
      Types.UINT8,
      Types.UINT16,
      Types.UINT32,
    ]));
  }

  /** @returns {number} */
  u64() {
    return this._read_unsigned(...this._type_info_with_assert([
      Types.UINT8,
      Types.UINT16,
      Types.UINT32,
      Types.UINT64,
    ]));
  }

  /** @returns {number} */
  i8() {
    return this._read_signed(127, ...this._type_info_with_assert([
      Types.INT8,
      Types.UINT8,
    ]));
  }

  /** @returns {number} */
  i16() {
    return this._read_signed(32767, ...this._type_info_with_assert([
      Types.INT8,
      Types.INT16,

      Types.UINT8,
      Types.UINT16,
    ]));
  }

  /** @returns {number} */
  i32() {
    return this._read_signed(2147483647, ...this._type_info_with_assert([
      Types.INT8,
      Types.INT16,
      Types.INT32,

      Types.UINT8,
      Types.UINT16,
      Types.UINT32,
    ]));
  }

  /** @returns {number} */
  i64() {
    return this._read_signed(Number.MAX_SAFE_INTEGER, ...this._type_info_with_assert([
      Types.INT8,
      Types.INT16,
      Types.INT32,
      Types.INT64,

      Types.UINT8,
      Types.UINT16,
      Types.UINT32,
      Types.UINT64,
    ]));
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
    const exp = (half >> 10) & 0x1F;
    const mant = half & 0x3FF;

    const ldexp = (x, exponent) => x * Math.pow(2, exponent);

    let val;
    switch (exp) {
      case 0:
        val = ldexp(mant, -24);
        break;
      case 31:
        val = (mant === 0) ? Number.POSITIVE_INFINITY : Number.NaN;
        break;
      default:
        val = ldexp(mant + 1024, exp - 25);
        break;
    }

    return (half & 0x8000) ? -val : val;
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

    return this._bytes(minor, this.config['max_bytes_length']);
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

    const buf = this._bytes(minor, this.config['max_text_length']);
    const utf8 = String.fromCharCode(...(new Uint8Array(buf)));

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
      if (error instanceof DecodeError && (error.extra[0] === Types.NULL)) {
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
    if (len > this.config['max_array_length']) {
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
    if (len > this.config['max_object_size']) {
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

      if ((t !== type) || (minor === 31)) {
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
          this._skip_value((level - 1));
        }
        return true;
    }
  }

  /** @returns {boolean} */
  skip() {
    return this._skip_value(this.config['max_nesting']);
  }
}

module.exports = Decoder;


/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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



const Types = __webpack_require__(20);

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
    return ~~(Math.max((this.buffer.byteLength * 1.5), (this.buffer.byteLength + need_nbytes)));
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
    if (!(this.view.byteLength < bytes)) { return; }
    return this._grow_buffer(bytes);
  }

  /**
   * @param {!number} bytes
   * @returns {void}
   * @private
   */
  _advance(bytes) {
    this.view = new DataView(this.buffer, (this.view.byteOffset + bytes));
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
    const major = (Types.major(type)) << 5;

    if ((0 <= len) && (len <= 23)) {
      return this._u8(major | len);
    } else if ((24 <= len) && (len <= 255)) {
      this._u8(major | 24);
      return this._u8(len);
    } else if ((0x100 <= len) && (len <= 0xFFFF)) {
      this._u8(major | 25);
      return this._u16(len);
    } else if ((0x10000 <= len) && (len <= 0xFFFFFFFF)) {
      this._u8(major | 26);
      return this._u32(len);
    } else if (len <= Number.MAX_SAFE_INTEGER) {
      this._u8(major | 27);
      return this._u64(len);
    } else {
      throw new RangeError('Invalid size for CBOR object');
    }
  }

  /*
   * writer-like interface over our ArrayBuffer
   */

  /**
   * @param {!number} x
   * @returns {void}
   * @private
   */
  _u8(x) {
    return this._write(1, () => this.view.setUint8(0, x));
  }

  /**
   * @param {!number} x
   * @returns {void}
   * @private
   */
  _u16(x) {
    return this._write(2, () => this.view.setUint16(0, x));
  }

  /**
   * @param {!number} x
   * @returns {void}
   * @private
   */
  _u32(x) {
    return this._write(4, () => this.view.setUint32(0, x));
  }

  /**
   * @param {!number} x
   * @returns {void}
   * @private
   */
  _u64(x) {
    const low = x % Math.pow(2, 32);
    const high = (x - low) / Math.pow(2, 32);
    const w64 = () => {
      this.view.setUint32(0, high);
      return this.view.setUint32(4, low);
    };
    return this._write(8, w64);
  }

  /**
   * @param {!number} x
   * @returns {void}
   * @private
   */
  _f32(x) {
    return this._write(4, () => this.view.setFloat32(0, x));
  }

  /**
   * @param {!number} x
   * @returns {void}
   * @private
   */
  _f64(x) {
    return this._write(8, () => this.view.setFloat64(0, x));
  }

  /**
   * @param {!Uint8Array} x
   * @returns {void}
   * @private
   */
  _bytes(x) {
    const nbytes = x.byteLength;

    this._ensure(nbytes);
    new Uint8Array(this.buffer, this.view.byteOffset).set(x);
    return this._advance(nbytes);
  }

  /*
   * public API
   */

  /**
   * @param {!number} x
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  u8(x) {
    if ((0 <= x) && (x <= 23)) {
      this._u8(x);
    } else if ((24 <= x) && (x <= 255)) {
      this._u8(24);
      this._u8(x);
    } else {
      throw new RangeError('Invalid u8');
    }

    return this;
  }

  /**
   * @param {!number} x
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  u16(x) {
    if ((0 <= x) && (x <= 23)) {
      this._u8(x);
    } else if ((24 <= x) && (x <= 255)) {
      this._u8(24);
      this._u8(x);
    } else if ((0x100 <= x) && (x <= 0xFFFF)) {
      this._u8(25);
      this._u16(x);
    } else {
      throw new RangeError('Invalid u16');
    }

    return this;
  }

  /**
   * @param {!number} x
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  u32(x) {
    if ((0 <= x) && (x <= 23)) {
      this._u8(x);
    } else if ((24 <= x) && (x <= 255)) {
      this._u8(24);
      this._u8(x);
    } else if ((0x100 <= x) && (x <= 0xFFFF)) {
      this._u8(25);
      this._u16(x);
    } else if ((0x10000 <= x) && (x <= 0xFFFFFFFF)) {
      this._u8(26);
      this._u32(x);
    } else {
      throw new RangeError('Invalid u32');
    }

    return this;
  }

  /**
   * @param {!number} x
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  u64(x) {
    if ((0 <= x) && (x <= 23)) {
      this._u8(x);
    } else if ((24 <= x) && (x <= 255)) {
      this._u8(24);
      this._u8(x);
    } else if ((0x100 <= x) && (x <= 0xFFFF)) {
      this._u8(25);
      this._u16(x);
    } else if ((0x10000 <= x) && (x <= 0xFFFFFFFF)) {
      this._u8(26);
      this._u32(x);
    } else if (x <= Number.MAX_SAFE_INTEGER) {
      this._u8(27);
      this._u64(x);
    } else {
      throw new RangeError('Invalid unsigned integer');
    }

    return this;
  }

  /**
   * @param {!number} x
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  i8(x) {
    if (x >= 0) {
      this._u8(x);
      return this;
    }

    x = -1 - x;
    if ((0 <= x) && (x <= 23)) {
      this._u8(0x20 | x);
    } else if ((24 <= x) && (x <= 255)) {
      this._u8(0x20 | 24);
      this._u8(x);
    } else {
      throw new RangeError('Invalid i8');
    }

    return this;
  }

  /**
   * @param {!number} x
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  i16(x) {
    if (x >= 0) {
      this._u16(x);
      return this;
    }

    x = -1 - x;
    if ((0 <= x) && (x <= 23)) {
      this._u8(0x20 | x);
    } else if ((24 <= x) && (x <= 255)) {
      this._u8(0x20 | 24);
      this._u8(x);
    } else if ((0x100 <= x) && (x <= 0xFFFF)) {
      this._u8(0x20 | 25);
      this._u16(x);
    } else {
      throw new RangeError('Invalid i16');
    }

    return this;
  }

  /**
   * @param {!number} x
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  i32(x) {
    if (x >= 0) {
      this._u32(x);
      return this;
    }

    x = -1 - x;
    if ((0 <= x) && (x <= 23)) {
      this._u8(0x20 | x);
    } else if ((24 <= x) && (x <= 255)) {
      this._u8(0x20 | 24);
      this._u8(x);
    } else if ((0x100 <= x) && (x <= 0xFFFF)) {
      this._u8(0x20 | 25);
      this._u16(x);
    } else if ((0x10000 <= x) && (x <= 0xFFFFFFFF)) {
      this._u8(0x20 | 26);
      this._u32(x);
    } else {
      throw new RangeError('Invalid i32');
    }

    return this;
  }

  /**
   * @param {!number} x
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  i64(x) {
    if (x >= 0) {
      this._u64(x);
      return this;
    }

    x = -1 - x;
    if ((0 <= x) && (x <= 23)) {
      this._u8(0x20 | x);
    } else if ((24 <= x) && (x <= 255)) {
      this._u8(0x20 | 24);
      this._u8(x);
    } else if ((0x100 <= x) && (x <= 0xFFFF)) {
      this._u8(0x20 | 25);
      this._u16(x);
    } else if ((0x10000 <= x) && (x <= 0xFFFFFFFF)) {
      this._u8(0x20 | 26);
      this._u32(x);
    } else if (x <= Number.MAX_SAFE_INTEGER) {
      this._u8(0x20 | 27);
      this._u64(x);
    } else {
      throw new RangeError('Invalid i64');
    }

    return this;
  }

  /**
   * @param {!number} x
   * @returns {Encoder} `this`
   */
  f32(x) {
    this._u8(0xE0 | 26);
    this._f32(x);
    return this;
  }

  /**
   * @param {!number} x
   * @returns {Encoder} `this`
   */
  f64(x) {
    this._u8(0xE0 | 27);
    this._f64(x);
    return this;
  }

  /**
   * @param {!number} x
   * @returns {Encoder} `this`
   */
  bool(x) {
    this._u8(0xE0 | (x ? 21 : 20));
    return this;
  }

  /**
   * @param {!(ArrayBuffer|Uint8Array)} x
   * @returns {Encoder} `this`
   */
  bytes(x) {
    this._write_type_and_len(Types.BYTES, x.byteLength);
    this._bytes(x);

    return this;
  }

  /**
   * @param {!number} x
   * @returns {Encoder} `this`
   */
  text(x) {
    // http://ecmanaut.blogspot.de/2006/07/encoding-decoding-utf8-in-javascript.html
    const utf8 = unescape(encodeURIComponent(x));

    this._write_type_and_len(Types.TEXT, utf8.length);
    this._bytes(new Uint8Array(utf8.split('').map((c) => c.charCodeAt(0))));

    return this;
  }

  /** @returns {Encoder} `this` */
  null() {
    this._u8(0xE0 | 22);
    return this;
  }

  /** @returns {Encoder} `this` */
  undefined() {
    this._u8(0xE0 | 23);
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
    this._u8(0x9F);
    return this;
  }

  /** @returns {Encoder} `this` */
  array_end() {
    this._u8(0xFF);
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
    this._u8(0xBF);
    return this;
  }

  /** @returns {Encoder} `this` */
  object_end() {
    this._u8(0xFF);
    return this;
  }
}

module.exports = Encoder;


/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

(function(nacl) {
'use strict';

// Ported in 2014 by Dmitry Chestnykh and Devi Mandiri.
// Public domain.
//
// Implementation derived from TweetNaCl version 20140427.
// See for details: http://tweetnacl.cr.yp.to/

var gf = function(init) {
  var i, r = new Float64Array(16);
  if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
  return r;
};

//  Pluggable, initialized in high-level API below.
var randombytes = function(/* x, n */) { throw new Error('no PRNG'); };

var _0 = new Uint8Array(16);
var _9 = new Uint8Array(32); _9[0] = 9;

var gf0 = gf(),
    gf1 = gf([1]),
    _121665 = gf([0xdb41, 1]),
    D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
    D2 = gf([0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]),
    X = gf([0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]),
    Y = gf([0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]),
    I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

function ts64(x, i, h, l) {
  x[i]   = (h >> 24) & 0xff;
  x[i+1] = (h >> 16) & 0xff;
  x[i+2] = (h >>  8) & 0xff;
  x[i+3] = h & 0xff;
  x[i+4] = (l >> 24)  & 0xff;
  x[i+5] = (l >> 16)  & 0xff;
  x[i+6] = (l >>  8)  & 0xff;
  x[i+7] = l & 0xff;
}

function vn(x, xi, y, yi, n) {
  var i,d = 0;
  for (i = 0; i < n; i++) d |= x[xi+i]^y[yi+i];
  return (1 & ((d - 1) >>> 8)) - 1;
}

function crypto_verify_16(x, xi, y, yi) {
  return vn(x,xi,y,yi,16);
}

function crypto_verify_32(x, xi, y, yi) {
  return vn(x,xi,y,yi,32);
}

function core_salsa20(o, p, k, c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }
   x0 =  x0 +  j0 | 0;
   x1 =  x1 +  j1 | 0;
   x2 =  x2 +  j2 | 0;
   x3 =  x3 +  j3 | 0;
   x4 =  x4 +  j4 | 0;
   x5 =  x5 +  j5 | 0;
   x6 =  x6 +  j6 | 0;
   x7 =  x7 +  j7 | 0;
   x8 =  x8 +  j8 | 0;
   x9 =  x9 +  j9 | 0;
  x10 = x10 + j10 | 0;
  x11 = x11 + j11 | 0;
  x12 = x12 + j12 | 0;
  x13 = x13 + j13 | 0;
  x14 = x14 + j14 | 0;
  x15 = x15 + j15 | 0;

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x1 >>>  0 & 0xff;
  o[ 5] = x1 >>>  8 & 0xff;
  o[ 6] = x1 >>> 16 & 0xff;
  o[ 7] = x1 >>> 24 & 0xff;

  o[ 8] = x2 >>>  0 & 0xff;
  o[ 9] = x2 >>>  8 & 0xff;
  o[10] = x2 >>> 16 & 0xff;
  o[11] = x2 >>> 24 & 0xff;

  o[12] = x3 >>>  0 & 0xff;
  o[13] = x3 >>>  8 & 0xff;
  o[14] = x3 >>> 16 & 0xff;
  o[15] = x3 >>> 24 & 0xff;

  o[16] = x4 >>>  0 & 0xff;
  o[17] = x4 >>>  8 & 0xff;
  o[18] = x4 >>> 16 & 0xff;
  o[19] = x4 >>> 24 & 0xff;

  o[20] = x5 >>>  0 & 0xff;
  o[21] = x5 >>>  8 & 0xff;
  o[22] = x5 >>> 16 & 0xff;
  o[23] = x5 >>> 24 & 0xff;

  o[24] = x6 >>>  0 & 0xff;
  o[25] = x6 >>>  8 & 0xff;
  o[26] = x6 >>> 16 & 0xff;
  o[27] = x6 >>> 24 & 0xff;

  o[28] = x7 >>>  0 & 0xff;
  o[29] = x7 >>>  8 & 0xff;
  o[30] = x7 >>> 16 & 0xff;
  o[31] = x7 >>> 24 & 0xff;

  o[32] = x8 >>>  0 & 0xff;
  o[33] = x8 >>>  8 & 0xff;
  o[34] = x8 >>> 16 & 0xff;
  o[35] = x8 >>> 24 & 0xff;

  o[36] = x9 >>>  0 & 0xff;
  o[37] = x9 >>>  8 & 0xff;
  o[38] = x9 >>> 16 & 0xff;
  o[39] = x9 >>> 24 & 0xff;

  o[40] = x10 >>>  0 & 0xff;
  o[41] = x10 >>>  8 & 0xff;
  o[42] = x10 >>> 16 & 0xff;
  o[43] = x10 >>> 24 & 0xff;

  o[44] = x11 >>>  0 & 0xff;
  o[45] = x11 >>>  8 & 0xff;
  o[46] = x11 >>> 16 & 0xff;
  o[47] = x11 >>> 24 & 0xff;

  o[48] = x12 >>>  0 & 0xff;
  o[49] = x12 >>>  8 & 0xff;
  o[50] = x12 >>> 16 & 0xff;
  o[51] = x12 >>> 24 & 0xff;

  o[52] = x13 >>>  0 & 0xff;
  o[53] = x13 >>>  8 & 0xff;
  o[54] = x13 >>> 16 & 0xff;
  o[55] = x13 >>> 24 & 0xff;

  o[56] = x14 >>>  0 & 0xff;
  o[57] = x14 >>>  8 & 0xff;
  o[58] = x14 >>> 16 & 0xff;
  o[59] = x14 >>> 24 & 0xff;

  o[60] = x15 >>>  0 & 0xff;
  o[61] = x15 >>>  8 & 0xff;
  o[62] = x15 >>> 16 & 0xff;
  o[63] = x15 >>> 24 & 0xff;
}

function core_hsalsa20(o,p,k,c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x5 >>>  0 & 0xff;
  o[ 5] = x5 >>>  8 & 0xff;
  o[ 6] = x5 >>> 16 & 0xff;
  o[ 7] = x5 >>> 24 & 0xff;

  o[ 8] = x10 >>>  0 & 0xff;
  o[ 9] = x10 >>>  8 & 0xff;
  o[10] = x10 >>> 16 & 0xff;
  o[11] = x10 >>> 24 & 0xff;

  o[12] = x15 >>>  0 & 0xff;
  o[13] = x15 >>>  8 & 0xff;
  o[14] = x15 >>> 16 & 0xff;
  o[15] = x15 >>> 24 & 0xff;

  o[16] = x6 >>>  0 & 0xff;
  o[17] = x6 >>>  8 & 0xff;
  o[18] = x6 >>> 16 & 0xff;
  o[19] = x6 >>> 24 & 0xff;

  o[20] = x7 >>>  0 & 0xff;
  o[21] = x7 >>>  8 & 0xff;
  o[22] = x7 >>> 16 & 0xff;
  o[23] = x7 >>> 24 & 0xff;

  o[24] = x8 >>>  0 & 0xff;
  o[25] = x8 >>>  8 & 0xff;
  o[26] = x8 >>> 16 & 0xff;
  o[27] = x8 >>> 24 & 0xff;

  o[28] = x9 >>>  0 & 0xff;
  o[29] = x9 >>>  8 & 0xff;
  o[30] = x9 >>> 16 & 0xff;
  o[31] = x9 >>> 24 & 0xff;
}

function crypto_core_salsa20(out,inp,k,c) {
  core_salsa20(out,inp,k,c);
}

function crypto_core_hsalsa20(out,inp,k,c) {
  core_hsalsa20(out,inp,k,c);
}

var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
            // "expand 32-byte k"

function crypto_stream_salsa20_xor(c,cpos,m,mpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = m[mpos+i] ^ x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
    mpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = m[mpos+i] ^ x[i];
  }
  return 0;
}

function crypto_stream_salsa20(c,cpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = x[i];
  }
  return 0;
}

function crypto_stream(c,cpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20(c,cpos,d,sn,s);
}

function crypto_stream_xor(c,cpos,m,mpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20_xor(c,cpos,m,mpos,d,sn,s);
}

/*
* Port of Andrew Moon's Poly1305-donna-16. Public domain.
* https://github.com/floodyberry/poly1305-donna
*/

var poly1305 = function(key) {
  this.buffer = new Uint8Array(16);
  this.r = new Uint16Array(10);
  this.h = new Uint16Array(10);
  this.pad = new Uint16Array(8);
  this.leftover = 0;
  this.fin = 0;

  var t0, t1, t2, t3, t4, t5, t6, t7;

  t0 = key[ 0] & 0xff | (key[ 1] & 0xff) << 8; this.r[0] = ( t0                     ) & 0x1fff;
  t1 = key[ 2] & 0xff | (key[ 3] & 0xff) << 8; this.r[1] = ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
  t2 = key[ 4] & 0xff | (key[ 5] & 0xff) << 8; this.r[2] = ((t1 >>> 10) | (t2 <<  6)) & 0x1f03;
  t3 = key[ 6] & 0xff | (key[ 7] & 0xff) << 8; this.r[3] = ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
  t4 = key[ 8] & 0xff | (key[ 9] & 0xff) << 8; this.r[4] = ((t3 >>>  4) | (t4 << 12)) & 0x00ff;
  this.r[5] = ((t4 >>>  1)) & 0x1ffe;
  t5 = key[10] & 0xff | (key[11] & 0xff) << 8; this.r[6] = ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
  t6 = key[12] & 0xff | (key[13] & 0xff) << 8; this.r[7] = ((t5 >>> 11) | (t6 <<  5)) & 0x1f81;
  t7 = key[14] & 0xff | (key[15] & 0xff) << 8; this.r[8] = ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
  this.r[9] = ((t7 >>>  5)) & 0x007f;

  this.pad[0] = key[16] & 0xff | (key[17] & 0xff) << 8;
  this.pad[1] = key[18] & 0xff | (key[19] & 0xff) << 8;
  this.pad[2] = key[20] & 0xff | (key[21] & 0xff) << 8;
  this.pad[3] = key[22] & 0xff | (key[23] & 0xff) << 8;
  this.pad[4] = key[24] & 0xff | (key[25] & 0xff) << 8;
  this.pad[5] = key[26] & 0xff | (key[27] & 0xff) << 8;
  this.pad[6] = key[28] & 0xff | (key[29] & 0xff) << 8;
  this.pad[7] = key[30] & 0xff | (key[31] & 0xff) << 8;
};

poly1305.prototype.blocks = function(m, mpos, bytes) {
  var hibit = this.fin ? 0 : (1 << 11);
  var t0, t1, t2, t3, t4, t5, t6, t7, c;
  var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;

  var h0 = this.h[0],
      h1 = this.h[1],
      h2 = this.h[2],
      h3 = this.h[3],
      h4 = this.h[4],
      h5 = this.h[5],
      h6 = this.h[6],
      h7 = this.h[7],
      h8 = this.h[8],
      h9 = this.h[9];

  var r0 = this.r[0],
      r1 = this.r[1],
      r2 = this.r[2],
      r3 = this.r[3],
      r4 = this.r[4],
      r5 = this.r[5],
      r6 = this.r[6],
      r7 = this.r[7],
      r8 = this.r[8],
      r9 = this.r[9];

  while (bytes >= 16) {
    t0 = m[mpos+ 0] & 0xff | (m[mpos+ 1] & 0xff) << 8; h0 += ( t0                     ) & 0x1fff;
    t1 = m[mpos+ 2] & 0xff | (m[mpos+ 3] & 0xff) << 8; h1 += ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
    t2 = m[mpos+ 4] & 0xff | (m[mpos+ 5] & 0xff) << 8; h2 += ((t1 >>> 10) | (t2 <<  6)) & 0x1fff;
    t3 = m[mpos+ 6] & 0xff | (m[mpos+ 7] & 0xff) << 8; h3 += ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
    t4 = m[mpos+ 8] & 0xff | (m[mpos+ 9] & 0xff) << 8; h4 += ((t3 >>>  4) | (t4 << 12)) & 0x1fff;
    h5 += ((t4 >>>  1)) & 0x1fff;
    t5 = m[mpos+10] & 0xff | (m[mpos+11] & 0xff) << 8; h6 += ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
    t6 = m[mpos+12] & 0xff | (m[mpos+13] & 0xff) << 8; h7 += ((t5 >>> 11) | (t6 <<  5)) & 0x1fff;
    t7 = m[mpos+14] & 0xff | (m[mpos+15] & 0xff) << 8; h8 += ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
    h9 += ((t7 >>> 5)) | hibit;

    c = 0;

    d0 = c;
    d0 += h0 * r0;
    d0 += h1 * (5 * r9);
    d0 += h2 * (5 * r8);
    d0 += h3 * (5 * r7);
    d0 += h4 * (5 * r6);
    c = (d0 >>> 13); d0 &= 0x1fff;
    d0 += h5 * (5 * r5);
    d0 += h6 * (5 * r4);
    d0 += h7 * (5 * r3);
    d0 += h8 * (5 * r2);
    d0 += h9 * (5 * r1);
    c += (d0 >>> 13); d0 &= 0x1fff;

    d1 = c;
    d1 += h0 * r1;
    d1 += h1 * r0;
    d1 += h2 * (5 * r9);
    d1 += h3 * (5 * r8);
    d1 += h4 * (5 * r7);
    c = (d1 >>> 13); d1 &= 0x1fff;
    d1 += h5 * (5 * r6);
    d1 += h6 * (5 * r5);
    d1 += h7 * (5 * r4);
    d1 += h8 * (5 * r3);
    d1 += h9 * (5 * r2);
    c += (d1 >>> 13); d1 &= 0x1fff;

    d2 = c;
    d2 += h0 * r2;
    d2 += h1 * r1;
    d2 += h2 * r0;
    d2 += h3 * (5 * r9);
    d2 += h4 * (5 * r8);
    c = (d2 >>> 13); d2 &= 0x1fff;
    d2 += h5 * (5 * r7);
    d2 += h6 * (5 * r6);
    d2 += h7 * (5 * r5);
    d2 += h8 * (5 * r4);
    d2 += h9 * (5 * r3);
    c += (d2 >>> 13); d2 &= 0x1fff;

    d3 = c;
    d3 += h0 * r3;
    d3 += h1 * r2;
    d3 += h2 * r1;
    d3 += h3 * r0;
    d3 += h4 * (5 * r9);
    c = (d3 >>> 13); d3 &= 0x1fff;
    d3 += h5 * (5 * r8);
    d3 += h6 * (5 * r7);
    d3 += h7 * (5 * r6);
    d3 += h8 * (5 * r5);
    d3 += h9 * (5 * r4);
    c += (d3 >>> 13); d3 &= 0x1fff;

    d4 = c;
    d4 += h0 * r4;
    d4 += h1 * r3;
    d4 += h2 * r2;
    d4 += h3 * r1;
    d4 += h4 * r0;
    c = (d4 >>> 13); d4 &= 0x1fff;
    d4 += h5 * (5 * r9);
    d4 += h6 * (5 * r8);
    d4 += h7 * (5 * r7);
    d4 += h8 * (5 * r6);
    d4 += h9 * (5 * r5);
    c += (d4 >>> 13); d4 &= 0x1fff;

    d5 = c;
    d5 += h0 * r5;
    d5 += h1 * r4;
    d5 += h2 * r3;
    d5 += h3 * r2;
    d5 += h4 * r1;
    c = (d5 >>> 13); d5 &= 0x1fff;
    d5 += h5 * r0;
    d5 += h6 * (5 * r9);
    d5 += h7 * (5 * r8);
    d5 += h8 * (5 * r7);
    d5 += h9 * (5 * r6);
    c += (d5 >>> 13); d5 &= 0x1fff;

    d6 = c;
    d6 += h0 * r6;
    d6 += h1 * r5;
    d6 += h2 * r4;
    d6 += h3 * r3;
    d6 += h4 * r2;
    c = (d6 >>> 13); d6 &= 0x1fff;
    d6 += h5 * r1;
    d6 += h6 * r0;
    d6 += h7 * (5 * r9);
    d6 += h8 * (5 * r8);
    d6 += h9 * (5 * r7);
    c += (d6 >>> 13); d6 &= 0x1fff;

    d7 = c;
    d7 += h0 * r7;
    d7 += h1 * r6;
    d7 += h2 * r5;
    d7 += h3 * r4;
    d7 += h4 * r3;
    c = (d7 >>> 13); d7 &= 0x1fff;
    d7 += h5 * r2;
    d7 += h6 * r1;
    d7 += h7 * r0;
    d7 += h8 * (5 * r9);
    d7 += h9 * (5 * r8);
    c += (d7 >>> 13); d7 &= 0x1fff;

    d8 = c;
    d8 += h0 * r8;
    d8 += h1 * r7;
    d8 += h2 * r6;
    d8 += h3 * r5;
    d8 += h4 * r4;
    c = (d8 >>> 13); d8 &= 0x1fff;
    d8 += h5 * r3;
    d8 += h6 * r2;
    d8 += h7 * r1;
    d8 += h8 * r0;
    d8 += h9 * (5 * r9);
    c += (d8 >>> 13); d8 &= 0x1fff;

    d9 = c;
    d9 += h0 * r9;
    d9 += h1 * r8;
    d9 += h2 * r7;
    d9 += h3 * r6;
    d9 += h4 * r5;
    c = (d9 >>> 13); d9 &= 0x1fff;
    d9 += h5 * r4;
    d9 += h6 * r3;
    d9 += h7 * r2;
    d9 += h8 * r1;
    d9 += h9 * r0;
    c += (d9 >>> 13); d9 &= 0x1fff;

    c = (((c << 2) + c)) | 0;
    c = (c + d0) | 0;
    d0 = c & 0x1fff;
    c = (c >>> 13);
    d1 += c;

    h0 = d0;
    h1 = d1;
    h2 = d2;
    h3 = d3;
    h4 = d4;
    h5 = d5;
    h6 = d6;
    h7 = d7;
    h8 = d8;
    h9 = d9;

    mpos += 16;
    bytes -= 16;
  }
  this.h[0] = h0;
  this.h[1] = h1;
  this.h[2] = h2;
  this.h[3] = h3;
  this.h[4] = h4;
  this.h[5] = h5;
  this.h[6] = h6;
  this.h[7] = h7;
  this.h[8] = h8;
  this.h[9] = h9;
};

poly1305.prototype.finish = function(mac, macpos) {
  var g = new Uint16Array(10);
  var c, mask, f, i;

  if (this.leftover) {
    i = this.leftover;
    this.buffer[i++] = 1;
    for (; i < 16; i++) this.buffer[i] = 0;
    this.fin = 1;
    this.blocks(this.buffer, 0, 16);
  }

  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  for (i = 2; i < 10; i++) {
    this.h[i] += c;
    c = this.h[i] >>> 13;
    this.h[i] &= 0x1fff;
  }
  this.h[0] += (c * 5);
  c = this.h[0] >>> 13;
  this.h[0] &= 0x1fff;
  this.h[1] += c;
  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  this.h[2] += c;

  g[0] = this.h[0] + 5;
  c = g[0] >>> 13;
  g[0] &= 0x1fff;
  for (i = 1; i < 10; i++) {
    g[i] = this.h[i] + c;
    c = g[i] >>> 13;
    g[i] &= 0x1fff;
  }
  g[9] -= (1 << 13);

  mask = (c ^ 1) - 1;
  for (i = 0; i < 10; i++) g[i] &= mask;
  mask = ~mask;
  for (i = 0; i < 10; i++) this.h[i] = (this.h[i] & mask) | g[i];

  this.h[0] = ((this.h[0]       ) | (this.h[1] << 13)                    ) & 0xffff;
  this.h[1] = ((this.h[1] >>>  3) | (this.h[2] << 10)                    ) & 0xffff;
  this.h[2] = ((this.h[2] >>>  6) | (this.h[3] <<  7)                    ) & 0xffff;
  this.h[3] = ((this.h[3] >>>  9) | (this.h[4] <<  4)                    ) & 0xffff;
  this.h[4] = ((this.h[4] >>> 12) | (this.h[5] <<  1) | (this.h[6] << 14)) & 0xffff;
  this.h[5] = ((this.h[6] >>>  2) | (this.h[7] << 11)                    ) & 0xffff;
  this.h[6] = ((this.h[7] >>>  5) | (this.h[8] <<  8)                    ) & 0xffff;
  this.h[7] = ((this.h[8] >>>  8) | (this.h[9] <<  5)                    ) & 0xffff;

  f = this.h[0] + this.pad[0];
  this.h[0] = f & 0xffff;
  for (i = 1; i < 8; i++) {
    f = (((this.h[i] + this.pad[i]) | 0) + (f >>> 16)) | 0;
    this.h[i] = f & 0xffff;
  }

  mac[macpos+ 0] = (this.h[0] >>> 0) & 0xff;
  mac[macpos+ 1] = (this.h[0] >>> 8) & 0xff;
  mac[macpos+ 2] = (this.h[1] >>> 0) & 0xff;
  mac[macpos+ 3] = (this.h[1] >>> 8) & 0xff;
  mac[macpos+ 4] = (this.h[2] >>> 0) & 0xff;
  mac[macpos+ 5] = (this.h[2] >>> 8) & 0xff;
  mac[macpos+ 6] = (this.h[3] >>> 0) & 0xff;
  mac[macpos+ 7] = (this.h[3] >>> 8) & 0xff;
  mac[macpos+ 8] = (this.h[4] >>> 0) & 0xff;
  mac[macpos+ 9] = (this.h[4] >>> 8) & 0xff;
  mac[macpos+10] = (this.h[5] >>> 0) & 0xff;
  mac[macpos+11] = (this.h[5] >>> 8) & 0xff;
  mac[macpos+12] = (this.h[6] >>> 0) & 0xff;
  mac[macpos+13] = (this.h[6] >>> 8) & 0xff;
  mac[macpos+14] = (this.h[7] >>> 0) & 0xff;
  mac[macpos+15] = (this.h[7] >>> 8) & 0xff;
};

poly1305.prototype.update = function(m, mpos, bytes) {
  var i, want;

  if (this.leftover) {
    want = (16 - this.leftover);
    if (want > bytes)
      want = bytes;
    for (i = 0; i < want; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    bytes -= want;
    mpos += want;
    this.leftover += want;
    if (this.leftover < 16)
      return;
    this.blocks(this.buffer, 0, 16);
    this.leftover = 0;
  }

  if (bytes >= 16) {
    want = bytes - (bytes % 16);
    this.blocks(m, mpos, want);
    mpos += want;
    bytes -= want;
  }

  if (bytes) {
    for (i = 0; i < bytes; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    this.leftover += bytes;
  }
};

function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
  var s = new poly1305(k);
  s.update(m, mpos, n);
  s.finish(out, outpos);
  return 0;
}

function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
  var x = new Uint8Array(16);
  crypto_onetimeauth(x,0,m,mpos,n,k);
  return crypto_verify_16(h,hpos,x,0);
}

function crypto_secretbox(c,m,d,n,k) {
  var i;
  if (d < 32) return -1;
  crypto_stream_xor(c,0,m,0,d,n,k);
  crypto_onetimeauth(c, 16, c, 32, d - 32, c);
  for (i = 0; i < 16; i++) c[i] = 0;
  return 0;
}

function crypto_secretbox_open(m,c,d,n,k) {
  var i;
  var x = new Uint8Array(32);
  if (d < 32) return -1;
  crypto_stream(x,0,32,n,k);
  if (crypto_onetimeauth_verify(c, 16,c, 32,d - 32,x) !== 0) return -1;
  crypto_stream_xor(m,0,c,0,d,n,k);
  for (i = 0; i < 32; i++) m[i] = 0;
  return 0;
}

function set25519(r, a) {
  var i;
  for (i = 0; i < 16; i++) r[i] = a[i]|0;
}

function car25519(o) {
  var i, v, c = 1;
  for (i = 0; i < 16; i++) {
    v = o[i] + c + 65535;
    c = Math.floor(v / 65536);
    o[i] = v - c * 65536;
  }
  o[0] += c-1 + 37 * (c-1);
}

function sel25519(p, q, b) {
  var t, c = ~(b-1);
  for (var i = 0; i < 16; i++) {
    t = c & (p[i] ^ q[i]);
    p[i] ^= t;
    q[i] ^= t;
  }
}

function pack25519(o, n) {
  var i, j, b;
  var m = gf(), t = gf();
  for (i = 0; i < 16; i++) t[i] = n[i];
  car25519(t);
  car25519(t);
  car25519(t);
  for (j = 0; j < 2; j++) {
    m[0] = t[0] - 0xffed;
    for (i = 1; i < 15; i++) {
      m[i] = t[i] - 0xffff - ((m[i-1]>>16) & 1);
      m[i-1] &= 0xffff;
    }
    m[15] = t[15] - 0x7fff - ((m[14]>>16) & 1);
    b = (m[15]>>16) & 1;
    m[14] &= 0xffff;
    sel25519(t, m, 1-b);
  }
  for (i = 0; i < 16; i++) {
    o[2*i] = t[i] & 0xff;
    o[2*i+1] = t[i]>>8;
  }
}

function neq25519(a, b) {
  var c = new Uint8Array(32), d = new Uint8Array(32);
  pack25519(c, a);
  pack25519(d, b);
  return crypto_verify_32(c, 0, d, 0);
}

function par25519(a) {
  var d = new Uint8Array(32);
  pack25519(d, a);
  return d[0] & 1;
}

function unpack25519(o, n) {
  var i;
  for (i = 0; i < 16; i++) o[i] = n[2*i] + (n[2*i+1] << 8);
  o[15] &= 0x7fff;
}

function A(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
}

function Z(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
}

function M(o, a, b) {
  var v, c,
     t0 = 0,  t1 = 0,  t2 = 0,  t3 = 0,  t4 = 0,  t5 = 0,  t6 = 0,  t7 = 0,
     t8 = 0,  t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0,
    t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0,
    t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0,
    b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3],
    b4 = b[4],
    b5 = b[5],
    b6 = b[6],
    b7 = b[7],
    b8 = b[8],
    b9 = b[9],
    b10 = b[10],
    b11 = b[11],
    b12 = b[12],
    b13 = b[13],
    b14 = b[14],
    b15 = b[15];

  v = a[0];
  t0 += v * b0;
  t1 += v * b1;
  t2 += v * b2;
  t3 += v * b3;
  t4 += v * b4;
  t5 += v * b5;
  t6 += v * b6;
  t7 += v * b7;
  t8 += v * b8;
  t9 += v * b9;
  t10 += v * b10;
  t11 += v * b11;
  t12 += v * b12;
  t13 += v * b13;
  t14 += v * b14;
  t15 += v * b15;
  v = a[1];
  t1 += v * b0;
  t2 += v * b1;
  t3 += v * b2;
  t4 += v * b3;
  t5 += v * b4;
  t6 += v * b5;
  t7 += v * b6;
  t8 += v * b7;
  t9 += v * b8;
  t10 += v * b9;
  t11 += v * b10;
  t12 += v * b11;
  t13 += v * b12;
  t14 += v * b13;
  t15 += v * b14;
  t16 += v * b15;
  v = a[2];
  t2 += v * b0;
  t3 += v * b1;
  t4 += v * b2;
  t5 += v * b3;
  t6 += v * b4;
  t7 += v * b5;
  t8 += v * b6;
  t9 += v * b7;
  t10 += v * b8;
  t11 += v * b9;
  t12 += v * b10;
  t13 += v * b11;
  t14 += v * b12;
  t15 += v * b13;
  t16 += v * b14;
  t17 += v * b15;
  v = a[3];
  t3 += v * b0;
  t4 += v * b1;
  t5 += v * b2;
  t6 += v * b3;
  t7 += v * b4;
  t8 += v * b5;
  t9 += v * b6;
  t10 += v * b7;
  t11 += v * b8;
  t12 += v * b9;
  t13 += v * b10;
  t14 += v * b11;
  t15 += v * b12;
  t16 += v * b13;
  t17 += v * b14;
  t18 += v * b15;
  v = a[4];
  t4 += v * b0;
  t5 += v * b1;
  t6 += v * b2;
  t7 += v * b3;
  t8 += v * b4;
  t9 += v * b5;
  t10 += v * b6;
  t11 += v * b7;
  t12 += v * b8;
  t13 += v * b9;
  t14 += v * b10;
  t15 += v * b11;
  t16 += v * b12;
  t17 += v * b13;
  t18 += v * b14;
  t19 += v * b15;
  v = a[5];
  t5 += v * b0;
  t6 += v * b1;
  t7 += v * b2;
  t8 += v * b3;
  t9 += v * b4;
  t10 += v * b5;
  t11 += v * b6;
  t12 += v * b7;
  t13 += v * b8;
  t14 += v * b9;
  t15 += v * b10;
  t16 += v * b11;
  t17 += v * b12;
  t18 += v * b13;
  t19 += v * b14;
  t20 += v * b15;
  v = a[6];
  t6 += v * b0;
  t7 += v * b1;
  t8 += v * b2;
  t9 += v * b3;
  t10 += v * b4;
  t11 += v * b5;
  t12 += v * b6;
  t13 += v * b7;
  t14 += v * b8;
  t15 += v * b9;
  t16 += v * b10;
  t17 += v * b11;
  t18 += v * b12;
  t19 += v * b13;
  t20 += v * b14;
  t21 += v * b15;
  v = a[7];
  t7 += v * b0;
  t8 += v * b1;
  t9 += v * b2;
  t10 += v * b3;
  t11 += v * b4;
  t12 += v * b5;
  t13 += v * b6;
  t14 += v * b7;
  t15 += v * b8;
  t16 += v * b9;
  t17 += v * b10;
  t18 += v * b11;
  t19 += v * b12;
  t20 += v * b13;
  t21 += v * b14;
  t22 += v * b15;
  v = a[8];
  t8 += v * b0;
  t9 += v * b1;
  t10 += v * b2;
  t11 += v * b3;
  t12 += v * b4;
  t13 += v * b5;
  t14 += v * b6;
  t15 += v * b7;
  t16 += v * b8;
  t17 += v * b9;
  t18 += v * b10;
  t19 += v * b11;
  t20 += v * b12;
  t21 += v * b13;
  t22 += v * b14;
  t23 += v * b15;
  v = a[9];
  t9 += v * b0;
  t10 += v * b1;
  t11 += v * b2;
  t12 += v * b3;
  t13 += v * b4;
  t14 += v * b5;
  t15 += v * b6;
  t16 += v * b7;
  t17 += v * b8;
  t18 += v * b9;
  t19 += v * b10;
  t20 += v * b11;
  t21 += v * b12;
  t22 += v * b13;
  t23 += v * b14;
  t24 += v * b15;
  v = a[10];
  t10 += v * b0;
  t11 += v * b1;
  t12 += v * b2;
  t13 += v * b3;
  t14 += v * b4;
  t15 += v * b5;
  t16 += v * b6;
  t17 += v * b7;
  t18 += v * b8;
  t19 += v * b9;
  t20 += v * b10;
  t21 += v * b11;
  t22 += v * b12;
  t23 += v * b13;
  t24 += v * b14;
  t25 += v * b15;
  v = a[11];
  t11 += v * b0;
  t12 += v * b1;
  t13 += v * b2;
  t14 += v * b3;
  t15 += v * b4;
  t16 += v * b5;
  t17 += v * b6;
  t18 += v * b7;
  t19 += v * b8;
  t20 += v * b9;
  t21 += v * b10;
  t22 += v * b11;
  t23 += v * b12;
  t24 += v * b13;
  t25 += v * b14;
  t26 += v * b15;
  v = a[12];
  t12 += v * b0;
  t13 += v * b1;
  t14 += v * b2;
  t15 += v * b3;
  t16 += v * b4;
  t17 += v * b5;
  t18 += v * b6;
  t19 += v * b7;
  t20 += v * b8;
  t21 += v * b9;
  t22 += v * b10;
  t23 += v * b11;
  t24 += v * b12;
  t25 += v * b13;
  t26 += v * b14;
  t27 += v * b15;
  v = a[13];
  t13 += v * b0;
  t14 += v * b1;
  t15 += v * b2;
  t16 += v * b3;
  t17 += v * b4;
  t18 += v * b5;
  t19 += v * b6;
  t20 += v * b7;
  t21 += v * b8;
  t22 += v * b9;
  t23 += v * b10;
  t24 += v * b11;
  t25 += v * b12;
  t26 += v * b13;
  t27 += v * b14;
  t28 += v * b15;
  v = a[14];
  t14 += v * b0;
  t15 += v * b1;
  t16 += v * b2;
  t17 += v * b3;
  t18 += v * b4;
  t19 += v * b5;
  t20 += v * b6;
  t21 += v * b7;
  t22 += v * b8;
  t23 += v * b9;
  t24 += v * b10;
  t25 += v * b11;
  t26 += v * b12;
  t27 += v * b13;
  t28 += v * b14;
  t29 += v * b15;
  v = a[15];
  t15 += v * b0;
  t16 += v * b1;
  t17 += v * b2;
  t18 += v * b3;
  t19 += v * b4;
  t20 += v * b5;
  t21 += v * b6;
  t22 += v * b7;
  t23 += v * b8;
  t24 += v * b9;
  t25 += v * b10;
  t26 += v * b11;
  t27 += v * b12;
  t28 += v * b13;
  t29 += v * b14;
  t30 += v * b15;

  t0  += 38 * t16;
  t1  += 38 * t17;
  t2  += 38 * t18;
  t3  += 38 * t19;
  t4  += 38 * t20;
  t5  += 38 * t21;
  t6  += 38 * t22;
  t7  += 38 * t23;
  t8  += 38 * t24;
  t9  += 38 * t25;
  t10 += 38 * t26;
  t11 += 38 * t27;
  t12 += 38 * t28;
  t13 += 38 * t29;
  t14 += 38 * t30;
  // t15 left as is

  // first car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  // second car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  o[ 0] = t0;
  o[ 1] = t1;
  o[ 2] = t2;
  o[ 3] = t3;
  o[ 4] = t4;
  o[ 5] = t5;
  o[ 6] = t6;
  o[ 7] = t7;
  o[ 8] = t8;
  o[ 9] = t9;
  o[10] = t10;
  o[11] = t11;
  o[12] = t12;
  o[13] = t13;
  o[14] = t14;
  o[15] = t15;
}

function S(o, a) {
  M(o, a, a);
}

function inv25519(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 253; a >= 0; a--) {
    S(c, c);
    if(a !== 2 && a !== 4) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function pow2523(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 250; a >= 0; a--) {
      S(c, c);
      if(a !== 1) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function crypto_scalarmult(q, n, p) {
  var z = new Uint8Array(32);
  var x = new Float64Array(80), r, i;
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf();
  for (i = 0; i < 31; i++) z[i] = n[i];
  z[31]=(n[31]&127)|64;
  z[0]&=248;
  unpack25519(x,p);
  for (i = 0; i < 16; i++) {
    b[i]=x[i];
    d[i]=a[i]=c[i]=0;
  }
  a[0]=d[0]=1;
  for (i=254; i>=0; --i) {
    r=(z[i>>>3]>>>(i&7))&1;
    sel25519(a,b,r);
    sel25519(c,d,r);
    A(e,a,c);
    Z(a,a,c);
    A(c,b,d);
    Z(b,b,d);
    S(d,e);
    S(f,a);
    M(a,c,a);
    M(c,b,e);
    A(e,a,c);
    Z(a,a,c);
    S(b,a);
    Z(c,d,f);
    M(a,c,_121665);
    A(a,a,d);
    M(c,c,a);
    M(a,d,f);
    M(d,b,x);
    S(b,e);
    sel25519(a,b,r);
    sel25519(c,d,r);
  }
  for (i = 0; i < 16; i++) {
    x[i+16]=a[i];
    x[i+32]=c[i];
    x[i+48]=b[i];
    x[i+64]=d[i];
  }
  var x32 = x.subarray(32);
  var x16 = x.subarray(16);
  inv25519(x32,x32);
  M(x16,x16,x32);
  pack25519(q,x16);
  return 0;
}

function crypto_scalarmult_base(q, n) {
  return crypto_scalarmult(q, n, _9);
}

function crypto_box_keypair(y, x) {
  randombytes(x, 32);
  return crypto_scalarmult_base(y, x);
}

function crypto_box_beforenm(k, y, x) {
  var s = new Uint8Array(32);
  crypto_scalarmult(s, x, y);
  return crypto_core_hsalsa20(k, _0, s, sigma);
}

var crypto_box_afternm = crypto_secretbox;
var crypto_box_open_afternm = crypto_secretbox_open;

function crypto_box(c, m, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_afternm(c, m, d, n, k);
}

function crypto_box_open(m, c, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_open_afternm(m, c, d, n, k);
}

var K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];

function crypto_hashblocks_hl(hh, hl, m, n) {
  var wh = new Int32Array(16), wl = new Int32Array(16),
      bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7,
      bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7,
      th, tl, i, j, h, l, a, b, c, d;

  var ah0 = hh[0],
      ah1 = hh[1],
      ah2 = hh[2],
      ah3 = hh[3],
      ah4 = hh[4],
      ah5 = hh[5],
      ah6 = hh[6],
      ah7 = hh[7],

      al0 = hl[0],
      al1 = hl[1],
      al2 = hl[2],
      al3 = hl[3],
      al4 = hl[4],
      al5 = hl[5],
      al6 = hl[6],
      al7 = hl[7];

  var pos = 0;
  while (n >= 128) {
    for (i = 0; i < 16; i++) {
      j = 8 * i + pos;
      wh[i] = (m[j+0] << 24) | (m[j+1] << 16) | (m[j+2] << 8) | m[j+3];
      wl[i] = (m[j+4] << 24) | (m[j+5] << 16) | (m[j+6] << 8) | m[j+7];
    }
    for (i = 0; i < 80; i++) {
      bh0 = ah0;
      bh1 = ah1;
      bh2 = ah2;
      bh3 = ah3;
      bh4 = ah4;
      bh5 = ah5;
      bh6 = ah6;
      bh7 = ah7;

      bl0 = al0;
      bl1 = al1;
      bl2 = al2;
      bl3 = al3;
      bl4 = al4;
      bl5 = al5;
      bl6 = al6;
      bl7 = al7;

      // add
      h = ah7;
      l = al7;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma1
      h = ((ah4 >>> 14) | (al4 << (32-14))) ^ ((ah4 >>> 18) | (al4 << (32-18))) ^ ((al4 >>> (41-32)) | (ah4 << (32-(41-32))));
      l = ((al4 >>> 14) | (ah4 << (32-14))) ^ ((al4 >>> 18) | (ah4 << (32-18))) ^ ((ah4 >>> (41-32)) | (al4 << (32-(41-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Ch
      h = (ah4 & ah5) ^ (~ah4 & ah6);
      l = (al4 & al5) ^ (~al4 & al6);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // K
      h = K[i*2];
      l = K[i*2+1];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // w
      h = wh[i%16];
      l = wl[i%16];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      th = c & 0xffff | d << 16;
      tl = a & 0xffff | b << 16;

      // add
      h = th;
      l = tl;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma0
      h = ((ah0 >>> 28) | (al0 << (32-28))) ^ ((al0 >>> (34-32)) | (ah0 << (32-(34-32)))) ^ ((al0 >>> (39-32)) | (ah0 << (32-(39-32))));
      l = ((al0 >>> 28) | (ah0 << (32-28))) ^ ((ah0 >>> (34-32)) | (al0 << (32-(34-32)))) ^ ((ah0 >>> (39-32)) | (al0 << (32-(39-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Maj
      h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2);
      l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh7 = (c & 0xffff) | (d << 16);
      bl7 = (a & 0xffff) | (b << 16);

      // add
      h = bh3;
      l = bl3;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      h = th;
      l = tl;

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh3 = (c & 0xffff) | (d << 16);
      bl3 = (a & 0xffff) | (b << 16);

      ah1 = bh0;
      ah2 = bh1;
      ah3 = bh2;
      ah4 = bh3;
      ah5 = bh4;
      ah6 = bh5;
      ah7 = bh6;
      ah0 = bh7;

      al1 = bl0;
      al2 = bl1;
      al3 = bl2;
      al4 = bl3;
      al5 = bl4;
      al6 = bl5;
      al7 = bl6;
      al0 = bl7;

      if (i%16 === 15) {
        for (j = 0; j < 16; j++) {
          // add
          h = wh[j];
          l = wl[j];

          a = l & 0xffff; b = l >>> 16;
          c = h & 0xffff; d = h >>> 16;

          h = wh[(j+9)%16];
          l = wl[(j+9)%16];

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma0
          th = wh[(j+1)%16];
          tl = wl[(j+1)%16];
          h = ((th >>> 1) | (tl << (32-1))) ^ ((th >>> 8) | (tl << (32-8))) ^ (th >>> 7);
          l = ((tl >>> 1) | (th << (32-1))) ^ ((tl >>> 8) | (th << (32-8))) ^ ((tl >>> 7) | (th << (32-7)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma1
          th = wh[(j+14)%16];
          tl = wl[(j+14)%16];
          h = ((th >>> 19) | (tl << (32-19))) ^ ((tl >>> (61-32)) | (th << (32-(61-32)))) ^ (th >>> 6);
          l = ((tl >>> 19) | (th << (32-19))) ^ ((th >>> (61-32)) | (tl << (32-(61-32)))) ^ ((tl >>> 6) | (th << (32-6)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;

          wh[j] = (c & 0xffff) | (d << 16);
          wl[j] = (a & 0xffff) | (b << 16);
        }
      }
    }

    // add
    h = ah0;
    l = al0;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[0];
    l = hl[0];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[0] = ah0 = (c & 0xffff) | (d << 16);
    hl[0] = al0 = (a & 0xffff) | (b << 16);

    h = ah1;
    l = al1;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[1];
    l = hl[1];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[1] = ah1 = (c & 0xffff) | (d << 16);
    hl[1] = al1 = (a & 0xffff) | (b << 16);

    h = ah2;
    l = al2;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[2];
    l = hl[2];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[2] = ah2 = (c & 0xffff) | (d << 16);
    hl[2] = al2 = (a & 0xffff) | (b << 16);

    h = ah3;
    l = al3;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[3];
    l = hl[3];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[3] = ah3 = (c & 0xffff) | (d << 16);
    hl[3] = al3 = (a & 0xffff) | (b << 16);

    h = ah4;
    l = al4;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[4];
    l = hl[4];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[4] = ah4 = (c & 0xffff) | (d << 16);
    hl[4] = al4 = (a & 0xffff) | (b << 16);

    h = ah5;
    l = al5;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[5];
    l = hl[5];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[5] = ah5 = (c & 0xffff) | (d << 16);
    hl[5] = al5 = (a & 0xffff) | (b << 16);

    h = ah6;
    l = al6;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[6];
    l = hl[6];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[6] = ah6 = (c & 0xffff) | (d << 16);
    hl[6] = al6 = (a & 0xffff) | (b << 16);

    h = ah7;
    l = al7;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[7];
    l = hl[7];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[7] = ah7 = (c & 0xffff) | (d << 16);
    hl[7] = al7 = (a & 0xffff) | (b << 16);

    pos += 128;
    n -= 128;
  }

  return n;
}

function crypto_hash(out, m, n) {
  var hh = new Int32Array(8),
      hl = new Int32Array(8),
      x = new Uint8Array(256),
      i, b = n;

  hh[0] = 0x6a09e667;
  hh[1] = 0xbb67ae85;
  hh[2] = 0x3c6ef372;
  hh[3] = 0xa54ff53a;
  hh[4] = 0x510e527f;
  hh[5] = 0x9b05688c;
  hh[6] = 0x1f83d9ab;
  hh[7] = 0x5be0cd19;

  hl[0] = 0xf3bcc908;
  hl[1] = 0x84caa73b;
  hl[2] = 0xfe94f82b;
  hl[3] = 0x5f1d36f1;
  hl[4] = 0xade682d1;
  hl[5] = 0x2b3e6c1f;
  hl[6] = 0xfb41bd6b;
  hl[7] = 0x137e2179;

  crypto_hashblocks_hl(hh, hl, m, n);
  n %= 128;

  for (i = 0; i < n; i++) x[i] = m[b-n+i];
  x[n] = 128;

  n = 256-128*(n<112?1:0);
  x[n-9] = 0;
  ts64(x, n-8,  (b / 0x20000000) | 0, b << 3);
  crypto_hashblocks_hl(hh, hl, x, n);

  for (i = 0; i < 8; i++) ts64(out, 8*i, hh[i], hl[i]);

  return 0;
}

function add(p, q) {
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf(),
      g = gf(), h = gf(), t = gf();

  Z(a, p[1], p[0]);
  Z(t, q[1], q[0]);
  M(a, a, t);
  A(b, p[0], p[1]);
  A(t, q[0], q[1]);
  M(b, b, t);
  M(c, p[3], q[3]);
  M(c, c, D2);
  M(d, p[2], q[2]);
  A(d, d, d);
  Z(e, b, a);
  Z(f, d, c);
  A(g, d, c);
  A(h, b, a);

  M(p[0], e, f);
  M(p[1], h, g);
  M(p[2], g, f);
  M(p[3], e, h);
}

function cswap(p, q, b) {
  var i;
  for (i = 0; i < 4; i++) {
    sel25519(p[i], q[i], b);
  }
}

function pack(r, p) {
  var tx = gf(), ty = gf(), zi = gf();
  inv25519(zi, p[2]);
  M(tx, p[0], zi);
  M(ty, p[1], zi);
  pack25519(r, ty);
  r[31] ^= par25519(tx) << 7;
}

function scalarmult(p, q, s) {
  var b, i;
  set25519(p[0], gf0);
  set25519(p[1], gf1);
  set25519(p[2], gf1);
  set25519(p[3], gf0);
  for (i = 255; i >= 0; --i) {
    b = (s[(i/8)|0] >> (i&7)) & 1;
    cswap(p, q, b);
    add(q, p);
    add(p, p);
    cswap(p, q, b);
  }
}

function scalarbase(p, s) {
  var q = [gf(), gf(), gf(), gf()];
  set25519(q[0], X);
  set25519(q[1], Y);
  set25519(q[2], gf1);
  M(q[3], X, Y);
  scalarmult(p, q, s);
}

function crypto_sign_keypair(pk, sk, seeded) {
  var d = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()];
  var i;

  if (!seeded) randombytes(sk, 32);
  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  scalarbase(p, d);
  pack(pk, p);

  for (i = 0; i < 32; i++) sk[i+32] = pk[i];
  return 0;
}

var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);

function modL(r, x) {
  var carry, i, j, k;
  for (i = 63; i >= 32; --i) {
    carry = 0;
    for (j = i - 32, k = i - 12; j < k; ++j) {
      x[j] += carry - 16 * x[i] * L[j - (i - 32)];
      carry = (x[j] + 128) >> 8;
      x[j] -= carry * 256;
    }
    x[j] += carry;
    x[i] = 0;
  }
  carry = 0;
  for (j = 0; j < 32; j++) {
    x[j] += carry - (x[31] >> 4) * L[j];
    carry = x[j] >> 8;
    x[j] &= 255;
  }
  for (j = 0; j < 32; j++) x[j] -= carry * L[j];
  for (i = 0; i < 32; i++) {
    x[i+1] += x[i] >> 8;
    r[i] = x[i] & 255;
  }
}

function reduce(r) {
  var x = new Float64Array(64), i;
  for (i = 0; i < 64; i++) x[i] = r[i];
  for (i = 0; i < 64; i++) r[i] = 0;
  modL(r, x);
}

// Note: difference from C - smlen returned, not passed as argument.
function crypto_sign(sm, m, n, sk) {
  var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
  var i, j, x = new Float64Array(64);
  var p = [gf(), gf(), gf(), gf()];

  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  var smlen = n + 64;
  for (i = 0; i < n; i++) sm[64 + i] = m[i];
  for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];

  crypto_hash(r, sm.subarray(32), n+32);
  reduce(r);
  scalarbase(p, r);
  pack(sm, p);

  for (i = 32; i < 64; i++) sm[i] = sk[i];
  crypto_hash(h, sm, n + 64);
  reduce(h);

  for (i = 0; i < 64; i++) x[i] = 0;
  for (i = 0; i < 32; i++) x[i] = r[i];
  for (i = 0; i < 32; i++) {
    for (j = 0; j < 32; j++) {
      x[i+j] += h[i] * d[j];
    }
  }

  modL(sm.subarray(32), x);
  return smlen;
}

function unpackneg(r, p) {
  var t = gf(), chk = gf(), num = gf(),
      den = gf(), den2 = gf(), den4 = gf(),
      den6 = gf();

  set25519(r[2], gf1);
  unpack25519(r[1], p);
  S(num, r[1]);
  M(den, num, D);
  Z(num, num, r[2]);
  A(den, r[2], den);

  S(den2, den);
  S(den4, den2);
  M(den6, den4, den2);
  M(t, den6, num);
  M(t, t, den);

  pow2523(t, t);
  M(t, t, num);
  M(t, t, den);
  M(t, t, den);
  M(r[0], t, den);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) M(r[0], r[0], I);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) return -1;

  if (par25519(r[0]) === (p[31]>>7)) Z(r[0], gf0, r[0]);

  M(r[3], r[0], r[1]);
  return 0;
}

function crypto_sign_open(m, sm, n, pk) {
  var i, mlen;
  var t = new Uint8Array(32), h = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()],
      q = [gf(), gf(), gf(), gf()];

  mlen = -1;
  if (n < 64) return -1;

  if (unpackneg(q, pk)) return -1;

  for (i = 0; i < n; i++) m[i] = sm[i];
  for (i = 0; i < 32; i++) m[i+32] = pk[i];
  crypto_hash(h, m, n);
  reduce(h);
  scalarmult(p, q, h);

  scalarbase(q, sm.subarray(32));
  add(p, q);
  pack(t, p);

  n -= 64;
  if (crypto_verify_32(sm, 0, t, 0)) {
    for (i = 0; i < n; i++) m[i] = 0;
    return -1;
  }

  for (i = 0; i < n; i++) m[i] = sm[i + 64];
  mlen = n;
  return mlen;
}

var crypto_secretbox_KEYBYTES = 32,
    crypto_secretbox_NONCEBYTES = 24,
    crypto_secretbox_ZEROBYTES = 32,
    crypto_secretbox_BOXZEROBYTES = 16,
    crypto_scalarmult_BYTES = 32,
    crypto_scalarmult_SCALARBYTES = 32,
    crypto_box_PUBLICKEYBYTES = 32,
    crypto_box_SECRETKEYBYTES = 32,
    crypto_box_BEFORENMBYTES = 32,
    crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES,
    crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES,
    crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES,
    crypto_sign_BYTES = 64,
    crypto_sign_PUBLICKEYBYTES = 32,
    crypto_sign_SECRETKEYBYTES = 64,
    crypto_sign_SEEDBYTES = 32,
    crypto_hash_BYTES = 64;

nacl.lowlevel = {
  crypto_core_hsalsa20: crypto_core_hsalsa20,
  crypto_stream_xor: crypto_stream_xor,
  crypto_stream: crypto_stream,
  crypto_stream_salsa20_xor: crypto_stream_salsa20_xor,
  crypto_stream_salsa20: crypto_stream_salsa20,
  crypto_onetimeauth: crypto_onetimeauth,
  crypto_onetimeauth_verify: crypto_onetimeauth_verify,
  crypto_verify_16: crypto_verify_16,
  crypto_verify_32: crypto_verify_32,
  crypto_secretbox: crypto_secretbox,
  crypto_secretbox_open: crypto_secretbox_open,
  crypto_scalarmult: crypto_scalarmult,
  crypto_scalarmult_base: crypto_scalarmult_base,
  crypto_box_beforenm: crypto_box_beforenm,
  crypto_box_afternm: crypto_box_afternm,
  crypto_box: crypto_box,
  crypto_box_open: crypto_box_open,
  crypto_box_keypair: crypto_box_keypair,
  crypto_hash: crypto_hash,
  crypto_sign: crypto_sign,
  crypto_sign_keypair: crypto_sign_keypair,
  crypto_sign_open: crypto_sign_open,

  crypto_secretbox_KEYBYTES: crypto_secretbox_KEYBYTES,
  crypto_secretbox_NONCEBYTES: crypto_secretbox_NONCEBYTES,
  crypto_secretbox_ZEROBYTES: crypto_secretbox_ZEROBYTES,
  crypto_secretbox_BOXZEROBYTES: crypto_secretbox_BOXZEROBYTES,
  crypto_scalarmult_BYTES: crypto_scalarmult_BYTES,
  crypto_scalarmult_SCALARBYTES: crypto_scalarmult_SCALARBYTES,
  crypto_box_PUBLICKEYBYTES: crypto_box_PUBLICKEYBYTES,
  crypto_box_SECRETKEYBYTES: crypto_box_SECRETKEYBYTES,
  crypto_box_BEFORENMBYTES: crypto_box_BEFORENMBYTES,
  crypto_box_NONCEBYTES: crypto_box_NONCEBYTES,
  crypto_box_ZEROBYTES: crypto_box_ZEROBYTES,
  crypto_box_BOXZEROBYTES: crypto_box_BOXZEROBYTES,
  crypto_sign_BYTES: crypto_sign_BYTES,
  crypto_sign_PUBLICKEYBYTES: crypto_sign_PUBLICKEYBYTES,
  crypto_sign_SECRETKEYBYTES: crypto_sign_SECRETKEYBYTES,
  crypto_sign_SEEDBYTES: crypto_sign_SEEDBYTES,
  crypto_hash_BYTES: crypto_hash_BYTES
};

/* High-level API */

function checkLengths(k, n) {
  if (k.length !== crypto_secretbox_KEYBYTES) throw new Error('bad key size');
  if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error('bad nonce size');
}

function checkBoxLengths(pk, sk) {
  if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error('bad public key size');
  if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error('bad secret key size');
}

function checkArrayTypes() {
  var t, i;
  for (i = 0; i < arguments.length; i++) {
     if ((t = Object.prototype.toString.call(arguments[i])) !== '[object Uint8Array]')
       throw new TypeError('unexpected type ' + t + ', use Uint8Array');
  }
}

function cleanup(arr) {
  for (var i = 0; i < arr.length; i++) arr[i] = 0;
}

// TODO: Completely remove this in v0.15.
if (!nacl.util) {
  nacl.util = {};
  nacl.util.decodeUTF8 = nacl.util.encodeUTF8 = nacl.util.encodeBase64 = nacl.util.decodeBase64 = function() {
    throw new Error('nacl.util moved into separate package: https://github.com/dchest/tweetnacl-util-js');
  };
}

nacl.randomBytes = function(n) {
  var b = new Uint8Array(n);
  randombytes(b, n);
  return b;
};

nacl.secretbox = function(msg, nonce, key) {
  checkArrayTypes(msg, nonce, key);
  checkLengths(key, nonce);
  var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
  var c = new Uint8Array(m.length);
  for (var i = 0; i < msg.length; i++) m[i+crypto_secretbox_ZEROBYTES] = msg[i];
  crypto_secretbox(c, m, m.length, nonce, key);
  return c.subarray(crypto_secretbox_BOXZEROBYTES);
};

nacl.secretbox.open = function(box, nonce, key) {
  checkArrayTypes(box, nonce, key);
  checkLengths(key, nonce);
  var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
  var m = new Uint8Array(c.length);
  for (var i = 0; i < box.length; i++) c[i+crypto_secretbox_BOXZEROBYTES] = box[i];
  if (c.length < 32) return false;
  if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return false;
  return m.subarray(crypto_secretbox_ZEROBYTES);
};

nacl.secretbox.keyLength = crypto_secretbox_KEYBYTES;
nacl.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
nacl.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;

nacl.scalarMult = function(n, p) {
  checkArrayTypes(n, p);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  if (p.length !== crypto_scalarmult_BYTES) throw new Error('bad p size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult(q, n, p);
  return q;
};

nacl.scalarMult.base = function(n) {
  checkArrayTypes(n);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult_base(q, n);
  return q;
};

nacl.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
nacl.scalarMult.groupElementLength = crypto_scalarmult_BYTES;

nacl.box = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox(msg, nonce, k);
};

nacl.box.before = function(publicKey, secretKey) {
  checkArrayTypes(publicKey, secretKey);
  checkBoxLengths(publicKey, secretKey);
  var k = new Uint8Array(crypto_box_BEFORENMBYTES);
  crypto_box_beforenm(k, publicKey, secretKey);
  return k;
};

nacl.box.after = nacl.secretbox;

nacl.box.open = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox.open(msg, nonce, k);
};

nacl.box.open.after = nacl.secretbox.open;

nacl.box.keyPair = function() {
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
  crypto_box_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.box.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_box_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  crypto_scalarmult_base(pk, secretKey);
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
nacl.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
nacl.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
nacl.box.nonceLength = crypto_box_NONCEBYTES;
nacl.box.overheadLength = nacl.secretbox.overheadLength;

nacl.sign = function(msg, secretKey) {
  checkArrayTypes(msg, secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var signedMsg = new Uint8Array(crypto_sign_BYTES+msg.length);
  crypto_sign(signedMsg, msg, msg.length, secretKey);
  return signedMsg;
};

nacl.sign.open = function(signedMsg, publicKey) {
  if (arguments.length !== 2)
    throw new Error('nacl.sign.open accepts 2 arguments; did you mean to use nacl.sign.detached.verify?');
  checkArrayTypes(signedMsg, publicKey);
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var tmp = new Uint8Array(signedMsg.length);
  var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
  if (mlen < 0) return null;
  var m = new Uint8Array(mlen);
  for (var i = 0; i < m.length; i++) m[i] = tmp[i];
  return m;
};

nacl.sign.detached = function(msg, secretKey) {
  var signedMsg = nacl.sign(msg, secretKey);
  var sig = new Uint8Array(crypto_sign_BYTES);
  for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
  return sig;
};

nacl.sign.detached.verify = function(msg, sig, publicKey) {
  checkArrayTypes(msg, sig, publicKey);
  if (sig.length !== crypto_sign_BYTES)
    throw new Error('bad signature size');
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
  var m = new Uint8Array(crypto_sign_BYTES + msg.length);
  var i;
  for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
  for (i = 0; i < msg.length; i++) sm[i+crypto_sign_BYTES] = msg[i];
  return (crypto_sign_open(m, sm, sm.length, publicKey) >= 0);
};

nacl.sign.keyPair = function() {
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  crypto_sign_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32+i];
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.sign.keyPair.fromSeed = function(seed) {
  checkArrayTypes(seed);
  if (seed.length !== crypto_sign_SEEDBYTES)
    throw new Error('bad seed size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  for (var i = 0; i < 32; i++) sk[i] = seed[i];
  crypto_sign_keypair(pk, sk, true);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
nacl.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
nacl.sign.seedLength = crypto_sign_SEEDBYTES;
nacl.sign.signatureLength = crypto_sign_BYTES;

nacl.hash = function(msg) {
  checkArrayTypes(msg);
  var h = new Uint8Array(crypto_hash_BYTES);
  crypto_hash(h, msg, msg.length);
  return h;
};

nacl.hash.hashLength = crypto_hash_BYTES;

nacl.verify = function(x, y) {
  checkArrayTypes(x, y);
  // Zero length arguments are considered not equal.
  if (x.length === 0 || y.length === 0) return false;
  if (x.length !== y.length) return false;
  return (vn(x, 0, y, 0, x.length) === 0) ? true : false;
};

nacl.setPRNG = function(fn) {
  randombytes = fn;
};

(function() {
  // Initialize PRNG if environment provides CSPRNG.
  // If not, methods calling randombytes will throw.
  var crypto = typeof self !== 'undefined' ? (self.crypto || self.msCrypto) : null;
  if (crypto && crypto.getRandomValues) {
    // Browsers.
    var QUOTA = 65536;
    nacl.setPRNG(function(x, n) {
      var i, v = new Uint8Array(n);
      for (i = 0; i < n; i += QUOTA) {
        crypto.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
      }
      for (i = 0; i < n; i++) x[i] = v[i];
      cleanup(v);
    });
  } else if (true) {
    // Node.js.
    crypto = __webpack_require__(39);
    if (crypto && crypto.randomBytes) {
      nacl.setPRNG(function(x, n) {
        var i, v = crypto.randomBytes(n);
        for (i = 0; i < n; i++) x[i] = v[i];
        cleanup(v);
      });
    }
  }
})();

})(typeof module !== 'undefined' && module.exports ? module.exports : (self.nacl = self.nacl || {}));


/***/ }),
/* 39 */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),
/* 40 */
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

/** @module util */

let crypto = typeof window !== 'undefined' && (window.crypto || window.msCrypto);
let random_bytes;

if (crypto) {
  // browser
  random_bytes = len => {
    const buffer = new ArrayBuffer(len);
    const buffer_view = new Uint8Array(buffer);
    return crypto.getRandomValues(buffer_view);
  };
} else {
  // node
  crypto = __webpack_require__(41);
  random_bytes = len => {
    return new Uint8Array(crypto.randomBytes(len));
  };
}

module.exports = {random_bytes};


/***/ }),
/* 41 */
/***/ (function(module, exports) {



/***/ }),
/* 42 */
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

const CBOR = __webpack_require__(2);

const ArrayUtil = __webpack_require__(33);
const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const MemoryUtil = __webpack_require__(17);
const TypeUtil = __webpack_require__(1);

const DecryptError = __webpack_require__(11);

const DerivedSecrets = __webpack_require__(26);

const IdentityKey = __webpack_require__(8);
const IdentityKeyPair = __webpack_require__(12);
const KeyPair = __webpack_require__(7);
const PreKeyBundle = __webpack_require__(23);
const PublicKey = __webpack_require__(4);

const CipherMessage = __webpack_require__(9);
const Envelope = __webpack_require__(15);
const PreKeyMessage = __webpack_require__(14);
const SessionTag = __webpack_require__(25);

const ChainKey = __webpack_require__(18);
const RecvChain = __webpack_require__(44);
const RootKey = __webpack_require__(45);
const SendChain = __webpack_require__(46);
const Session = __webpack_require__(32);

/** @module session */

/** @class SessionState */
class SessionState {
  constructor() {
    this.recv_chains = null;
    this.send_chain = null;
    this.root_key = null;
    this.prev_counter = null;

    throw new DontCallConstructor(this);
  }

  /**
   * @param {!keys.IdentityKeyPair} alice_identity_pair
   * @param {!keys.PublicKey} alice_base
   * @param {!keys.PreKeyBundle} bob_pkbundle
   * @returns {SessionState}
   */
  static init_as_alice(alice_identity_pair, alice_base, bob_pkbundle) {
    TypeUtil.assert_is_instance(IdentityKeyPair, alice_identity_pair);
    TypeUtil.assert_is_instance(KeyPair, alice_base);
    TypeUtil.assert_is_instance(PreKeyBundle, bob_pkbundle);

    const master_key = ArrayUtil.concatenate_array_buffers([
      alice_identity_pair.secret_key.shared_secret(bob_pkbundle.public_key),
      alice_base.secret_key.shared_secret(bob_pkbundle.identity_key.public_key),
      alice_base.secret_key.shared_secret(bob_pkbundle.public_key),
    ]);

    const derived_secrets = DerivedSecrets.kdf_without_salt(master_key, 'handshake');
    MemoryUtil.zeroize(master_key);

    const rootkey = RootKey.from_cipher_key(derived_secrets.cipher_key);
    const chainkey = ChainKey.from_mac_key(derived_secrets.mac_key, 0);

    const recv_chains = [RecvChain.new(chainkey, bob_pkbundle.public_key)];

    const send_ratchet = KeyPair.new();
    const [rok, chk] = rootkey.dh_ratchet(send_ratchet, bob_pkbundle.public_key);
    const send_chain = SendChain.new(chk, send_ratchet);

    const state = ClassUtil.new_instance(SessionState);
    state.recv_chains = recv_chains;
    state.send_chain = send_chain;
    state.root_key = rok;
    state.prev_counter = 0;
    return state;
  }

  /**
   * @param {!keys.IdentityKeyPair} bob_ident
   * @param {!keys.KeyPair} bob_prekey
   * @param {!keys.IdentityKey} alice_ident
   * @param {!keys.PublicKey} alice_base
   * @returns {SessionState}
   */
  static init_as_bob(bob_ident, bob_prekey, alice_ident, alice_base) {
    TypeUtil.assert_is_instance(IdentityKeyPair, bob_ident);
    TypeUtil.assert_is_instance(KeyPair, bob_prekey);
    TypeUtil.assert_is_instance(IdentityKey, alice_ident);
    TypeUtil.assert_is_instance(PublicKey, alice_base);

    const master_key = ArrayUtil.concatenate_array_buffers([
      bob_prekey.secret_key.shared_secret(alice_ident.public_key),
      bob_ident.secret_key.shared_secret(alice_base),
      bob_prekey.secret_key.shared_secret(alice_base),
    ]);

    const derived_secrets = DerivedSecrets.kdf_without_salt(master_key, 'handshake');
    MemoryUtil.zeroize(master_key);

    const rootkey = RootKey.from_cipher_key(derived_secrets.cipher_key);
    const chainkey = ChainKey.from_mac_key(derived_secrets.mac_key, 0);
    const send_chain = SendChain.new(chainkey, bob_prekey);

    const state = ClassUtil.new_instance(SessionState);
    state.recv_chains = [];
    state.send_chain = send_chain;
    state.root_key = rootkey;
    state.prev_counter = 0;
    return state;
  }

  /**
   * @param {!keys.KeyPair} ratchet_key
   * @returns {void}
   */
  ratchet(ratchet_key) {
    const new_ratchet = KeyPair.new();

    const [recv_root_key, recv_chain_key] = this.root_key.dh_ratchet(this.send_chain.ratchet_key, ratchet_key);

    const [send_root_key, send_chain_key] = recv_root_key.dh_ratchet(new_ratchet, ratchet_key);

    const recv_chain = RecvChain.new(recv_chain_key, ratchet_key);
    const send_chain = SendChain.new(send_chain_key, new_ratchet);

    this.root_key = send_root_key;
    this.prev_counter = this.send_chain.chain_key.idx;
    this.send_chain = send_chain;

    this.recv_chains.unshift(recv_chain);

    if (this.recv_chains.length > Session.MAX_RECV_CHAINS) {
      for (let index = Session.MAX_RECV_CHAINS; index < this.recv_chains.length; index++) {
        MemoryUtil.zeroize(this.recv_chains[index]);
      }

      this.recv_chains = this.recv_chains.slice(0, Session.MAX_RECV_CHAINS);
    }
  }

  /**
   * @param {!keys.IdentityKey} identity_key - Public identity key of the local identity key pair
   * @param {!Array<number>} pending - Pending pre-key
   * @param {!message.SessionTag} tag - Session tag
   * @param {!(string|Uint8Array)} plaintext - The plaintext to encrypt
   * @returns {message.Envelope}
   */
  encrypt(identity_key, pending, tag, plaintext) {
    if (pending) {
      TypeUtil.assert_is_integer(pending[0]);
      TypeUtil.assert_is_instance(PublicKey, pending[1]);
    }
    TypeUtil.assert_is_instance(IdentityKey, identity_key);
    TypeUtil.assert_is_instance(SessionTag, tag);

    const msgkeys = this.send_chain.chain_key.message_keys();

    let message = CipherMessage.new(
      tag,
      this.send_chain.chain_key.idx,
      this.prev_counter,
      this.send_chain.ratchet_key.public_key,
      msgkeys.encrypt(plaintext)
    );

    if (pending) {
      message = PreKeyMessage.new(pending[0], pending[1], identity_key, message);
    }

    const env = Envelope.new(msgkeys.mac_key, message);
    this.send_chain.chain_key = this.send_chain.chain_key.next();
    return env;
  }

  /**
   * @param {!message.Envelope} envelope
   * @param {!message.CipherMessage} msg
   * @returns {Uint8Array}
   */
  decrypt(envelope, msg) {
    TypeUtil.assert_is_instance(Envelope, envelope);
    TypeUtil.assert_is_instance(CipherMessage, msg);

    let idx = this.recv_chains.findIndex(chain => chain.ratchet_key.fingerprint() === msg.ratchet_key.fingerprint());

    if (idx === -1) {
      this.ratchet(msg.ratchet_key);
      idx = 0;
    }

    const rc = this.recv_chains[idx];
    if (msg.counter < rc.chain_key.idx) {
      return rc.try_message_keys(envelope, msg);
    } else if (msg.counter == rc.chain_key.idx) {
      const mks = rc.chain_key.message_keys();

      if (!envelope.verify(mks.mac_key)) {
        throw new DecryptError.InvalidSignature(
          `Envelope verification failed for message with counters in sync at '${msg.counter}'`,
          DecryptError.CODE.CASE_206
        );
      }

      const plain = mks.decrypt(msg.cipher_text);
      rc.chain_key = rc.chain_key.next();
      return plain;
    } else if (msg.counter > rc.chain_key.idx) {
      const [chk, mk, mks] = rc.stage_message_keys(msg);

      if (!envelope.verify(mk.mac_key)) {
        throw new DecryptError.InvalidSignature(
          `Envelope verification failed for message with counter ahead. Message index is '${
            msg.counter
          }' while receive chain index is '${rc.chain_key.idx}'.`,
          DecryptError.CODE.CASE_207
        );
      }

      const plain = mk.decrypt(msg.cipher_text);

      rc.chain_key = chk.next();
      rc.commit_message_keys(mks);

      return plain;
    }
  }

  /** @returns {ArrayBuffer} */
  serialise() {
    const encoder = new CBOR.Encoder();
    this.encode(encoder);
    return encoder.get_buffer();
  }

  static deserialise(buf) {
    TypeUtil.assert_is_instance(ArrayBuffer, buf);
    return SessionState.decode(new CBOR.Decoder(buf));
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(4);
    encoder.u8(0);
    encoder.array(this.recv_chains.length);
    this.recv_chains.map(rch => rch.encode(encoder));
    encoder.u8(1);
    this.send_chain.encode(encoder);
    encoder.u8(2);
    this.root_key.encode(encoder);
    encoder.u8(3);
    return encoder.u32(this.prev_counter);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {SessionState}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    const self = ClassUtil.new_instance(SessionState);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0: {
          self.recv_chains = [];
          let len = decoder.array();
          while (len--) {
            self.recv_chains.push(RecvChain.decode(decoder));
          }
          break;
        }
        case 1: {
          self.send_chain = SendChain.decode(decoder);
          break;
        }
        case 2: {
          self.root_key = RootKey.decode(decoder);
          break;
        }
        case 3: {
          self.prev_counter = decoder.u32();
          break;
        }
        default: {
          decoder.skip();
        }
      }
    }

    TypeUtil.assert_is_instance(Array, self.recv_chains);
    TypeUtil.assert_is_instance(SendChain, self.send_chain);
    TypeUtil.assert_is_instance(RootKey, self.root_key);
    TypeUtil.assert_is_integer(self.prev_counter);

    return self;
  }
}

module.exports = SessionState;


/***/ }),
/* 43 */
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

const sodium = __webpack_require__(5);

const ArrayUtil = __webpack_require__(33);
const MemoryUtil = __webpack_require__(17);
const TypeUtil = __webpack_require__(1);

/** @module util */

const KeyDerivationUtil = {
  /**
   * HMAC-based Key Derivation Function
   *
   * @param {!(Uint8Array|string)} salt
   * @param {!(Uint8Array|string)} input - Initial Keying Material (IKM)
   * @param {!(Uint8Array|string)} info - Key Derivation Data (Info)
   * @param {!number} length - Length of the derived key in bytes (L)
   * @returns {Uint8Array} - Output Keying Material (OKM)
   */
  hkdf(salt, input, info, length) {
    const convert_type = value => {
      if (typeof value === 'string') {
        return sodium.from_string(value);
      }
      TypeUtil.assert_is_instance(Uint8Array, value);
      return value;
    };

    salt = convert_type(salt);
    input = convert_type(input);
    info = convert_type(info);

    TypeUtil.assert_is_integer(length);

    const HASH_LEN = 32;

    /**
     * @param {*} received_salt
     * @returns {Uint8Array}
     */
    const salt_to_key = received_salt => {
      const keybytes = sodium.crypto_auth_hmacsha256_KEYBYTES;
      if (received_salt.length > keybytes) {
        return sodium.crypto_hash_sha256(received_salt);
      }

      const key = new Uint8Array(keybytes);
      key.set(received_salt);
      return key;
    };

    /**
     * @param {*} received_salt
     * @param {*} received_input
     * @returns {*}
     */
    const extract = (received_salt, received_input) => {
      return sodium.crypto_auth_hmacsha256(received_input, salt_to_key(received_salt));
    };

    /**
     * @param {*} tag
     * @param {*} received_info
     * @param {!number} received_length
     * @returns {Uint8Array}
     */
    const expand = (tag, received_info, received_length) => {
      const num_blocks = Math.ceil(received_length / HASH_LEN);
      let hmac = new Uint8Array(0);
      let result = new Uint8Array(0);

      for (let index = 0; index <= num_blocks - 1; index++) {
        const buf = ArrayUtil.concatenate_array_buffers([hmac, received_info, new Uint8Array([index + 1])]);
        hmac = sodium.crypto_auth_hmacsha256(buf, tag);
        result = ArrayUtil.concatenate_array_buffers([result, hmac]);
      }

      return new Uint8Array(result.buffer.slice(0, received_length));
    };

    const key = extract(salt, input);

    MemoryUtil.zeroize(input);
    MemoryUtil.zeroize(salt);

    return expand(key, info, length);
  },
};

module.exports = KeyDerivationUtil;


/***/ }),
/* 44 */
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

const CBOR = __webpack_require__(2);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

const PublicKey = __webpack_require__(4);

const DecryptError = __webpack_require__(11);
const ProteusError = __webpack_require__(6);

const CipherMessage = __webpack_require__(9);
const Envelope = __webpack_require__(15);

const ChainKey = __webpack_require__(18);
const MessageKeys = __webpack_require__(34);

/** @module session */

/**
 * @class RecvChain
 * @throws {DontCallConstructor}
 */
class RecvChain {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!session.ChainKey} chain_key
   * @param {!keys.PublicKey} public_key
   * @returns {message.PreKeyMessage}
   */
  static new(chain_key, public_key) {
    TypeUtil.assert_is_instance(ChainKey, chain_key);
    TypeUtil.assert_is_instance(PublicKey, public_key);

    const rc = ClassUtil.new_instance(RecvChain);
    rc.chain_key = chain_key;
    rc.ratchet_key = public_key;
    rc.message_keys = [];
    return rc;
  }

  /**
   * @param {!message.Envelope} envelope
   * @param {!message.CipherMessage} msg
   * @returns {Uint8Array}
   */
  try_message_keys(envelope, msg) {
    TypeUtil.assert_is_instance(Envelope, envelope);
    TypeUtil.assert_is_instance(CipherMessage, msg);

    if (this.message_keys[0] && this.message_keys[0].counter > msg.counter) {
      const message = `Message too old. Counter for oldest staged chain key is '${
        this.message_keys[0].counter
      }' while message counter is '${msg.counter}'.`;
      throw new DecryptError.OutdatedMessage(message, DecryptError.CODE.CASE_208);
    }

    const idx = this.message_keys.findIndex(mk => {
      return mk.counter === msg.counter;
    });

    if (idx === -1) {
      throw new DecryptError.DuplicateMessage(null, DecryptError.CODE.CASE_209);
    }

    const mk = this.message_keys.splice(idx, 1)[0];
    if (!envelope.verify(mk.mac_key)) {
      const message = `Envelope verification failed for message with counter behind. Message index is '${
        msg.counter
      }' while receive chain index is '${this.chain_key.idx}'.`;
      throw new DecryptError.InvalidSignature(message, DecryptError.CODE.CASE_210);
    }

    return mk.decrypt(msg.cipher_text);
  }

  /**
   * @param {!message.CipherMessage} msg
   * @returns {Array<session.ChainKey>|session.MessageKeys}
   */
  stage_message_keys(msg) {
    TypeUtil.assert_is_instance(CipherMessage, msg);

    const num = msg.counter - this.chain_key.idx;
    if (num > RecvChain.MAX_COUNTER_GAP) {
      if (this.chain_key.idx === 0) {
        throw new DecryptError.TooDistantFuture(
          'Skipped too many message at the beginning of a receive chain.',
          DecryptError.CODE.CASE_211
        );
      }
      throw new DecryptError.TooDistantFuture(
        `Skipped too many message within a used receive chain. Receive chain counter is '${this.chain_key.idx}'`,
        DecryptError.CODE.CASE_212
      );
    }

    const keys = [];
    let chk = this.chain_key;

    for (let index = 0; index <= num - 1; index++) {
      keys.push(chk.message_keys());
      chk = chk.next();
    }

    const mk = chk.message_keys();
    return [chk, mk, keys];
  }

  /**
   * @param {!Array<session.MessageKeys>} keys
   * @returns {void}
   */
  commit_message_keys(keys) {
    TypeUtil.assert_is_instance(Array, keys);
    keys.map(key => TypeUtil.assert_is_instance(MessageKeys, key));

    if (keys.length > RecvChain.MAX_COUNTER_GAP) {
      throw new ProteusError(
        `Number of message keys (${keys.length}) exceed message chain counter gap (${RecvChain.MAX_COUNTER_GAP}).`,
        ProteusError.prototype.CODE.CASE_103
      );
    }

    const excess = this.message_keys.length + keys.length - RecvChain.MAX_COUNTER_GAP;

    for (let index = 0; index <= excess - 1; index++) {
      this.message_keys.shift();
    }

    keys.map(key => this.message_keys.push(key));

    if (keys.length > RecvChain.MAX_COUNTER_GAP) {
      throw new ProteusError(
        `Skipped message keys which exceed the message chain counter gap (${RecvChain.MAX_COUNTER_GAP}).`,
        ProteusError.prototype.CODE.CASE_104
      );
    }
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {Array<CBOR.Encoder>}
   */
  encode(encoder) {
    encoder.object(3);
    encoder.u8(0);
    this.chain_key.encode(encoder);
    encoder.u8(1);
    this.ratchet_key.encode(encoder);

    encoder.u8(2);
    encoder.array(this.message_keys.length);
    return this.message_keys.map(key => key.encode(encoder));
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {RecvChain}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    const self = ClassUtil.new_instance(RecvChain);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0: {
          self.chain_key = ChainKey.decode(decoder);
          break;
        }
        case 1: {
          self.ratchet_key = PublicKey.decode(decoder);
          break;
        }
        case 2: {
          self.message_keys = [];

          let len = decoder.array();
          while (len--) {
            self.message_keys.push(MessageKeys.decode(decoder));
          }
          break;
        }
        default: {
          decoder.skip();
        }
      }
    }

    TypeUtil.assert_is_instance(ChainKey, self.chain_key);
    TypeUtil.assert_is_instance(PublicKey, self.ratchet_key);
    TypeUtil.assert_is_instance(Array, self.message_keys);

    return self;
  }
}

/** @type {number} */
RecvChain.MAX_COUNTER_GAP = 1000;

module.exports = RecvChain;


/***/ }),
/* 45 */
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

const CBOR = __webpack_require__(2);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

const ChainKey = __webpack_require__(18);
const CipherKey = __webpack_require__(27);
const DerivedSecrets = __webpack_require__(26);
const KeyPair = __webpack_require__(7);
const PublicKey = __webpack_require__(4);

/** @module session */

/**
 * @class RootKey
 * @throws {DontCallConstructor}
 */
class RootKey {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!derived.CipherKey} cipher_key - Cipher key generated by derived secrets
   * @returns {RootKey}
   */
  static from_cipher_key(cipher_key) {
    TypeUtil.assert_is_instance(CipherKey, cipher_key);

    const rk = ClassUtil.new_instance(RootKey);
    rk.key = cipher_key;
    return rk;
  }

  /**
   * @param {!keys.KeyPair} ours - Our key pair
   * @param {!keys.PublicKey} theirs - Their public key
   * @returns {Array<RootKey|session.ChainKey>}
   */
  dh_ratchet(ours, theirs) {
    TypeUtil.assert_is_instance(KeyPair, ours);
    TypeUtil.assert_is_instance(PublicKey, theirs);

    const secret = ours.secret_key.shared_secret(theirs);
    const derived_secrets = DerivedSecrets.kdf(secret, this.key.key, 'dh_ratchet');

    return [RootKey.from_cipher_key(derived_secrets.cipher_key), ChainKey.from_mac_key(derived_secrets.mac_key, 0)];
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(1);
    encoder.u8(0);
    return this.key.encode(encoder);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {RootKey}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    let cipher_key = null;

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          cipher_key = CipherKey.decode(decoder);
          break;
        default:
          decoder.skip();
      }
    }
    return RootKey.from_cipher_key(cipher_key);
  }
}

module.exports = RootKey;


/***/ }),
/* 46 */
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

const CBOR = __webpack_require__(2);

const ClassUtil = __webpack_require__(3);
const DontCallConstructor = __webpack_require__(0);
const TypeUtil = __webpack_require__(1);

const ChainKey = __webpack_require__(18);
const KeyPair = __webpack_require__(7);

/** @module session */

/**
 * @class SendChain
 * @throws {DontCallConstructor}
 */
class SendChain {
  constructor() {
    throw new DontCallConstructor(this);
  }

  static new(chain_key, keypair) {
    TypeUtil.assert_is_instance(ChainKey, chain_key);
    TypeUtil.assert_is_instance(KeyPair, keypair);

    const sc = ClassUtil.new_instance(SendChain);
    sc.chain_key = chain_key;
    sc.ratchet_key = keypair;
    return sc;
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(2);
    encoder.u8(0);
    this.chain_key.encode(encoder);
    encoder.u8(1);
    return this.ratchet_key.encode(encoder);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {SendChain}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);
    const self = ClassUtil.new_instance(SendChain);
    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.chain_key = ChainKey.decode(decoder);
          break;
        case 1:
          self.ratchet_key = KeyPair.decode(decoder);
          break;
        default:
          decoder.skip();
      }
    }
    TypeUtil.assert_is_instance(ChainKey, self.chain_key);
    TypeUtil.assert_is_instance(KeyPair, self.ratchet_key);
    return self;
  }
}

module.exports = SendChain;


/***/ })
/******/ ]);
//# sourceMappingURL=proteus.js.map