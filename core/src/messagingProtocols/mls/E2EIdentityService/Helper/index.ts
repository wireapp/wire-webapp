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

import {Ciphersuite} from '@wireapp/core-crypto';

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
const ciphersuiteSignatureAlgorithmMap: Record<Ciphersuite, MLSPublicKeyAlgorithmKeys> = {
  [Ciphersuite.MLS_128_DHKEMP256_AES128GCM_SHA256_P256]: MLSPublicKeyAlgorithmKeys.ECDSA_SECP256R1_SHA256,
  [Ciphersuite.MLS_256_DHKEMP384_AES256GCM_SHA384_P384]: MLSPublicKeyAlgorithmKeys.ECDSA_SECP384R1_SHA384,
  [Ciphersuite.MLS_256_DHKEMP521_AES256GCM_SHA512_P521]: MLSPublicKeyAlgorithmKeys.ECDSA_SECP521R1_SHA512,
  [Ciphersuite.MLS_256_DHKEMX448_AES256GCM_SHA512_Ed448]: MLSPublicKeyAlgorithmKeys.ED448,
  [Ciphersuite.MLS_256_DHKEMX448_CHACHA20POLY1305_SHA512_Ed448]: MLSPublicKeyAlgorithmKeys.ED448,
  [Ciphersuite.MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519]: MLSPublicKeyAlgorithmKeys.ED25519,
  [Ciphersuite.MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519]: MLSPublicKeyAlgorithmKeys.ED25519,
};

export const getSignatureAlgorithmForCiphersuite = (ciphersuite: Ciphersuite): MLSPublicKeyAlgorithmKeys => {
  return ciphersuiteSignatureAlgorithmMap[ciphersuite];
};

export const isMLSDevice = ({mls_public_keys}: RegisteredClient, ciphersuite: Ciphersuite) => {
  const signatureAlogrithm = getSignatureAlgorithmForCiphersuite(ciphersuite);
  const signature = mls_public_keys[signatureAlogrithm];
  return typeof signature === 'string' && signature.length > 0;
};

export enum MLSDeviceStatus {
  REGISTERED = 'registered',
  FRESH = 'fresh',
  MISMATCH = 'mismatch',
}
export const getMLSDeviceStatus = (
  {mls_public_keys}: RegisteredClient,
  ciphersuite: Ciphersuite,
  existingClientSignature: string,
): MLSDeviceStatus => {
  const signatureAlogrithm = getSignatureAlgorithmForCiphersuite(ciphersuite);
  const signature = mls_public_keys[signatureAlogrithm];

  if (!signature || !existingClientSignature) {
    return MLSDeviceStatus.FRESH;
  }
  if (signature !== existingClientSignature) {
    return MLSDeviceStatus.MISMATCH;
  }
  return MLSDeviceStatus.REGISTERED;
};

export const isResponseStatusValid = (status: string | undefined) => status && status === 'valid';
