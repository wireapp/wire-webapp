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

import {ProteusError} from './ProteusError';

class DecryptError extends ProteusError {
  static CODE = {
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
    CASE_213: 213, // REMOTE_ENCRYPTION_FAILURE: Created by the receiver when getting a decryption failure symbol (💣)
  };

  constructor(message = 'Unknown decryption error', code = 2) {
    super(message, code);
    Object.setPrototypeOf(this, DecryptError.prototype);
  }
}

namespace DecryptError {
  export class DuplicateMessage extends DecryptError {
    constructor(message = 'Duplicate message', code: number = DecryptError.CODE.CASE_209) {
      super(message, code);
      Object.setPrototypeOf(this, DuplicateMessage.prototype);
    }
  }

  export class InvalidMessage extends DecryptError {
    constructor(message = 'Invalid message', code: number) {
      super(message, code);
      Object.setPrototypeOf(this, InvalidMessage.prototype);
    }
  }

  export class InvalidSignature extends DecryptError {
    constructor(message = 'Invalid signature', code: number) {
      super(message, code);
      Object.setPrototypeOf(this, InvalidSignature.prototype);
    }
  }

  export class OutdatedMessage extends DecryptError {
    constructor(message = 'Outdated message', code: number = DecryptError.CODE.CASE_208) {
      super(message, code);
      Object.setPrototypeOf(this, OutdatedMessage.prototype);
    }
  }

  export class PrekeyNotFound extends DecryptError {
    constructor(message = 'Pre-key not found', code: number) {
      super(message, code);
      Object.setPrototypeOf(this, PrekeyNotFound.prototype);
    }
  }

  export class RemoteIdentityChanged extends DecryptError {
    constructor(message = 'Remote identity changed', code: number) {
      super(message, code);
      Object.setPrototypeOf(this, RemoteIdentityChanged.prototype);
    }
  }

  export class RemoteEncryptionError extends DecryptError {
    constructor(message = 'Sending client failed to encrypt the message', code: number = DecryptError.CODE.CASE_213) {
      super(message, code);
      Object.setPrototypeOf(this, RemoteEncryptionError.prototype);
    }
  }

  export class TooDistantFuture extends DecryptError {
    constructor(message = 'Message is from too distant in the future', code: number) {
      super(message, code);
      Object.setPrototypeOf(this, TooDistantFuture.prototype);
    }
  }
}

export {DecryptError};
