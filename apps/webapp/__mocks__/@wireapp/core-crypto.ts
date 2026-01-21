/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

export interface CommitBundle {}
export enum PublicGroupStateEncryptionType {
  Plaintext = 1,
  JweEncrypted = 2,
}
export enum RatchetTreeType {
  Full = 1,
  Delta = 2,
  ByRef = 3,
}
export enum Ciphersuite {
  MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519 = 1,
  MLS_128_DHKEMP256_AES128GCM_SHA256_P256 = 2,
  MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519 = 3,
  MLS_256_DHKEMX448_AES256GCM_SHA512_Ed448 = 4,
  MLS_256_DHKEMP521_AES256GCM_SHA512_P521 = 5,
  MLS_256_DHKEMX448_CHACHA20POLY1305_SHA512_Ed448 = 6,
  MLS_256_DHKEMP384_AES256GCM_SHA384_P384 = 7,
  MLS_128_X25519KYBER768DRAFT00_AES128GCM_SHA256_Ed25519 = 61489,
}
export enum CredentialType {
  Basic = 1,
  X509 = 2,
}
export enum DeviceStatus {
  Valid = 1,
  Expired = 2,
  Revoked = 3,
}
export enum E2eiConversationState {
  /**
   * All clients have a valid E2EI certificate
   */
  Verified = 1,
  /**
   * Some clients are either still Basic or their certificate is expired
   */
  Degraded = 2,
  /**
   * All clients are still Basic. If all client have expired certificates, Degraded is returned.
   */
  NotEnabled = 3,
}
