/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {MLSPublicKeyAlgorithmKeys, RegisteredClient} from '@wireapp/api-client/lib/client';

import {CipherSuite as Ciphersuite} from '@wireapp/core-crypto';
import {result, type Result} from 'true-myth';

import {ClientIdStringType, constructFullyQualifiedClientId} from '../../../../util/fullyQualifiedClientIdUtils';

export const jsonToByteArray = (data: any): Uint8Array => {
  const encoder = new TextEncoder();
  return encoder.encode(JSON.stringify(data, null, 0));
};

type GetE2EIClientIdReturnType = {
  asString: ClientIdStringType;
  asBytes: Uint8Array;
};
export const getE2EIClientId = (clientId: string, userId: string, userDomain: string): GetE2EIClientIdReturnType => {
  const asString = constructFullyQualifiedClientId(userId, clientId, userDomain);
  const asBytes: Uint8Array = new TextEncoder().encode(asString);
  return {
    asString,
    asBytes,
  };
};

/**
 * depending on the ciphersuite used, the signature algorithm used is different. We need to keep a mapping of the ciphersuite to the signature algorithm
 */
const ciphersuiteSignatureAlgorithmMap: Partial<Record<Ciphersuite, MLSPublicKeyAlgorithmKeys>> = {
  [Ciphersuite.Mls128Dhkemp256Aes128gcmSha256P256]: MLSPublicKeyAlgorithmKeys.ECDSA_SECP256R1_SHA256,
  [Ciphersuite.Mls256Dhkemp384Aes256gcmSha384P384]: MLSPublicKeyAlgorithmKeys.ECDSA_SECP384R1_SHA384,
  [Ciphersuite.Mls256Dhkemp521Aes256gcmSha512P521]: MLSPublicKeyAlgorithmKeys.ECDSA_SECP521R1_SHA512,
  [Ciphersuite.Mls256Dhkemx448Aes256gcmSha512Ed448]: MLSPublicKeyAlgorithmKeys.ED448,
  [Ciphersuite.Mls256Dhkemx448Chacha20poly1305Sha512Ed448]: MLSPublicKeyAlgorithmKeys.ED448,
  [Ciphersuite.Mls128Dhkemx25519Aes128gcmSha256Ed25519]: MLSPublicKeyAlgorithmKeys.ED25519,
  [Ciphersuite.Mls128Dhkemx25519Chacha20poly1305Sha256Ed25519]: MLSPublicKeyAlgorithmKeys.ED25519,
};

export const getSignatureAlgorithmForCiphersuite = (
  ciphersuite: Ciphersuite,
): Result<MLSPublicKeyAlgorithmKeys, Error> => {
  const signatureAlgorithm = ciphersuiteSignatureAlgorithmMap[ciphersuite];
  return signatureAlgorithm === undefined
    ? result.err(new Error(`Unsupported MLS cipher suite: ${ciphersuite}`))
    : result.ok(signatureAlgorithm);
};

export const isMLSDevice = (
  {mls_public_keys}: RegisteredClient,
  signatureAlgorithm: MLSPublicKeyAlgorithmKeys,
): boolean => {
  const signature = mls_public_keys[signatureAlgorithm];
  return typeof signature === 'string' && signature.length > 0;
};

export enum MLSDeviceStatus {
  REGISTERED = 'registered',
  FRESH = 'fresh',
  MISMATCH = 'mismatch',
}
export const getMLSDeviceStatus = (
  {mls_public_keys}: RegisteredClient,
  signatureAlgorithm: MLSPublicKeyAlgorithmKeys,
  existingClientSignature: string,
): MLSDeviceStatus => {
  const signature = mls_public_keys[signatureAlgorithm];

  if (
    signature === undefined ||
    signature.length === 0 ||
    existingClientSignature === undefined ||
    existingClientSignature.length === 0
  ) {
    return MLSDeviceStatus.FRESH;
  }
  if (signature !== existingClientSignature) {
    return MLSDeviceStatus.MISMATCH;
  }
  return MLSDeviceStatus.REGISTERED;
};

export const isResponseStatusValid = (status: string | undefined): boolean => {
  return status !== undefined && status.length > 0 && status === 'valid';
};
