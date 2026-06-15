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

import {
  CipherSuite,
  ClientId,
  CoreCrypto,
  CoreCryptoContext,
  Credential,
  CredentialRef,
  CredentialType,
  DeviceId,
  Uuid,
} from '@wireapp/core-crypto/browser';
import {Converter} from 'bazinga64';

export const createCoreCryptoClientId = (userId: string, deviceId: string, domain: string): ClientId => {
  return new ClientId(new Uuid(userId), DeviceId.fromHexString(deviceId), domain);
};

export const coreCryptoClientIdToString = (clientId: ClientId): string => {
  const {userId, deviceId, domain} = clientId.deserialize();
  return `${userId.toString()}:${deviceId.toHexString()}@${domain}`;
};

export const toNumberEpoch = (epoch: bigint): number => Number(epoch);

export const bytesToBase64 = (bytes: Uint8Array): string => {
  return btoa(Converter.arrayBufferViewToBaselineString(bytes));
};

export const getOrCreateBasicCredential = async ({
  cipherSuite,
  client,
  context,
  coreCrypto,
}: {
  cipherSuite: CipherSuite;
  client: ClientId;
  context: CoreCryptoContext;
  coreCrypto: CoreCrypto;
}): Promise<CredentialRef> => {
  const existingCredentials = await coreCrypto.findCredentials({
    cipherSuite,
    clientId: client,
    credentialType: CredentialType.Basic,
  });

  const existingCredential = existingCredentials[0];
  if (existingCredential !== undefined) {
    return existingCredential;
  }

  return context.addCredential(Credential.basic(cipherSuite, client));
};
