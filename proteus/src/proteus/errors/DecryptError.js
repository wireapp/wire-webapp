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

const ProteusError = require('./ProteusError');

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
