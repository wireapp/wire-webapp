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

/* eslint sort-keys: "off" */

import ArrayUtil from './util/ArrayUtil';
import CipherKey from './derived/CipherKey';
import CipherMessage from './message/CipherMessage';
import DecodeError from './errors/DecodeError';
import DecryptError from './errors/DecryptError';
import DerivedSecrets from './derived/DerivedSecrets';
import Envelope from './message/Envelope';
import IdentityKey from './keys/IdentityKey';
import IdentityKeyPair from './keys/IdentityKeyPair';
import InputError from './errors/InputError';
import KeyDerivationUtil from './util/KeyDerivationUtil';
import KeyPair from './keys/KeyPair';
import MacKey from './derived/MacKey';
import MemoryUtil from './util/MemoryUtil';
import Message from './message/Message';
import PreKey from './keys/PreKey';
import PreKeyAuth from './keys/PreKeyAuth';
import PreKeyBundle from './keys/PreKeyBundle';
import PreKeyMessage from './message/PreKeyMessage';
import PreKeyStore from './session/PreKeyStore';
import ProteusError from './errors/ProteusError';
import PublicKey from './keys/PublicKey';
import SecretKey from './keys/SecretKey';
import Session from './session/Session';
import SessionTag from './message/SessionTag';

export = {
  derived: {
    CipherKey,
    DerivedSecrets,
    MacKey,
  },

  errors: {
    DecodeError,
    DecryptError,
    InputError,
    ProteusError,
  },

  keys: {
    IdentityKey,
    IdentityKeyPair,
    KeyPair,
    PreKey,
    PreKeyAuth,
    PreKeyBundle,
    PublicKey,
    SecretKey,
  },

  message: {
    CipherMessage,
    Envelope,
    Message,
    PreKeyMessage,
    SessionTag,
  },

  session: {
    PreKeyStore,
    Session,
  },

  util: {
    ArrayUtil,
    KeyDerivationUtil,
    MemoryUtil,
  },
};
