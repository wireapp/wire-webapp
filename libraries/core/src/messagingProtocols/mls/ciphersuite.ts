/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {CipherSuite} from '@wireapp/core-crypto/browser';

export type Ciphersuite = CipherSuite;

type CiphersuiteCompat = Record<number, string> & {
  MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519: CipherSuite;
  MLS_128_DHKEMP256_AES128GCM_SHA256_P256: CipherSuite;
  MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519: CipherSuite;
  MLS_256_DHKEMX448_AES256GCM_SHA512_Ed448: CipherSuite;
  MLS_256_DHKEMP521_AES256GCM_SHA512_P521: CipherSuite;
  MLS_256_DHKEMX448_CHACHA20POLY1305_SHA512_Ed448: CipherSuite;
  MLS_256_DHKEMP384_AES256GCM_SHA384_P384: CipherSuite;
};

export const Ciphersuite: CiphersuiteCompat = {
  MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519: CipherSuite.Mls128Dhkemx25519Aes128gcmSha256Ed25519,
  MLS_128_DHKEMP256_AES128GCM_SHA256_P256: CipherSuite.Mls128Dhkemp256Aes128gcmSha256P256,
  MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519:
    CipherSuite.Mls128Dhkemx25519Chacha20poly1305Sha256Ed25519,
  MLS_256_DHKEMX448_AES256GCM_SHA512_Ed448: CipherSuite.Mls256Dhkemx448Aes256gcmSha512Ed448,
  MLS_256_DHKEMP521_AES256GCM_SHA512_P521: CipherSuite.Mls256Dhkemp521Aes256gcmSha512P521,
  MLS_256_DHKEMX448_CHACHA20POLY1305_SHA512_Ed448: CipherSuite.Mls256Dhkemx448Chacha20poly1305Sha512Ed448,
  MLS_256_DHKEMP384_AES256GCM_SHA384_P384: CipherSuite.Mls256Dhkemp384Aes256gcmSha384P384,
  [CipherSuite.Mls128Dhkemx25519Aes128gcmSha256Ed25519]: 'MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519',
  [CipherSuite.Mls128Dhkemp256Aes128gcmSha256P256]: 'MLS_128_DHKEMP256_AES128GCM_SHA256_P256',
  [CipherSuite.Mls128Dhkemx25519Chacha20poly1305Sha256Ed25519]:
    'MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519',
  [CipherSuite.Mls256Dhkemx448Aes256gcmSha512Ed448]: 'MLS_256_DHKEMX448_AES256GCM_SHA512_Ed448',
  [CipherSuite.Mls256Dhkemp521Aes256gcmSha512P521]: 'MLS_256_DHKEMP521_AES256GCM_SHA512_P521',
  [CipherSuite.Mls256Dhkemx448Chacha20poly1305Sha512Ed448]: 'MLS_256_DHKEMX448_CHACHA20POLY1305_SHA512_Ed448',
  [CipherSuite.Mls256Dhkemp384Aes256gcmSha384P384]: 'MLS_256_DHKEMP384_AES256GCM_SHA384_P384',
} as const;
