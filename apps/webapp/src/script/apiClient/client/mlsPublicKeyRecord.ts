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

export enum MLSPublicKeyAlgorithmKeys {
  ECDSA_SECP256R1_SHA256 = 'ecdsa_secp256r1_sha256',
  ECDSA_SECP384R1_SHA384 = 'ecdsa_secp384r1_sha384',
  ECDSA_SECP521R1_SHA512 = 'ecdsa_secp521r1_sha512',
  ED448 = 'ed448',
  ED25519 = 'ed25519',
}
export type MLSPublicKeyRecord = Partial<Record<MLSPublicKeyAlgorithmKeys, string>>;
