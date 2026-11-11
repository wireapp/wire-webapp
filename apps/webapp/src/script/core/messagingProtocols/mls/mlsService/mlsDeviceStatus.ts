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
