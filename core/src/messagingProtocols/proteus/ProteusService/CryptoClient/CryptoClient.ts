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

import {PreKey} from '@wireapp/api-client/lib/auth';

import type {CRUDEngine} from '@wireapp/store-engine';

import type {CoreCryptoWrapper} from './CoreCryptoWrapper/CoreCryptoWrapper';
import type {CryptoboxWrapper} from './CryptoboxWrapper';

import {SecretCrypto} from '../../../mls/types';

export enum CryptoClientType {
  CORE_CRYPTO,
  CRYPTOBOX,
}

export type CryptoClientDef =
  | [CryptoClientType.CRYPTOBOX, CryptoboxWrapper]
  | [CryptoClientType.CORE_CRYPTO, CoreCryptoWrapper];

type WrapConfig = {
  nbPrekeys: number;
  onNewPrekeys: (prekeys: PreKey[]) => void;
};

type InitConfig = WrapConfig & {
  storeEngine: CRUDEngine;
  systemCrypto?: SecretCrypto;
  coreCryptoWasmFilePath?: string;
};

export async function buildCryptoClient(
  clientType: CryptoClientType,
  {storeEngine, nbPrekeys, systemCrypto, coreCryptoWasmFilePath, onNewPrekeys}: InitConfig,
): Promise<CryptoClientDef> {
  if (clientType === CryptoClientType.CORE_CRYPTO) {
    const {buildClient} = await import('./CoreCryptoWrapper');
    const client = await buildClient(storeEngine, coreCryptoWasmFilePath ?? '', {
      systemCrypto,
      nbPrekeys,
      onNewPrekeys,
    });
    return [CryptoClientType.CORE_CRYPTO, client];
  }

  const {buildClient} = await import('./CryptoboxWrapper');
  const client = await buildClient(storeEngine, {nbPrekeys, onNewPrekeys});
  return [CryptoClientType.CRYPTOBOX, client];
}
