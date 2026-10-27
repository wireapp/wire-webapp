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
export enum CipherSuite {
  Mls128Dhkemx25519Aes128gcmSha256Ed25519 = 1,
  Mls128Dhkemp256Aes128gcmSha256P256 = 2,
  Mls128Dhkemx25519Chacha20poly1305Sha256Ed25519 = 3,
  Mls256Dhkemx448Aes256gcmSha512Ed448 = 4,
  Mls256Dhkemp521Aes256gcmSha512P521 = 5,
  Mls256Dhkemx448Chacha20poly1305Sha512Ed448 = 6,
  Mls256Dhkemp384Aes256gcmSha384P384 = 7,
  Mls128Mlkem768x25519Aes128gcmSha256Ed25519 = 61441,
  Mls128Mlkem768x25519Aes256gcmSha384Ed25519 = 61442,
  Mls128Mlkem768p256Aes128gcmSha256P256 = 61443,
  Mls128Mlkem768p256Aes256gcmSha384P256 = 61444,
  Mls192Mlkem1024p384Aes256gcmSha384P384 = 61445,
  Mls128Mlkem768Aes256gcmSha384Ed25519 = 61446,
  Mls128Mlkem768Aes256gcmSha384P256 = 61447,
  Mls192Mlkem1024Aes256gcmSha384P384 = 61448,
  Mls128Mlkem768x25519Chacha20poly1305Sha384Mldsa44 = 61449,
  Mls192Mlkem768Aes256gcmSha384Mldsa65 = 61450,
  Mls256Mlkem1024Aes256gcmSha384Mldsa87 = 61451,
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
export enum HttpMethod {
  Get = 0,
  Post = 1,
  Put = 2,
  Delete = 3,
  Patch = 4,
  Head = 5,
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
