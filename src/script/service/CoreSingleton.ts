/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {ClientType} from '@wireapp/api-client/lib/client/';
import {container, singleton} from 'tsyringe';

import {Account} from '@wireapp/core';

import {isTemporaryClientAndNonPersistent, supportsCoreCryptoProteus, supportsMLS} from 'Util/util';

import {APIClient} from './APIClientSingleton';
import {createStorageEngine, DatabaseTypes} from './StoreEngineProvider';

import {Config} from '../Config';

declare global {
  interface Window {
    systemCrypto?:
      | {
          encrypt: (value: Uint8Array) => Promise<Uint8Array>;
          decrypt: (payload: Uint8Array) => Promise<Uint8Array>;
          version: undefined;
        }
      | {
          encrypt: (value: string) => Promise<Uint8Array>;
          decrypt: (payload: Uint8Array) => Promise<string>;
          version: 1;
        };
  }
}

@singleton()
export class Core extends Account {
  constructor(apiClient = container.resolve(APIClient)) {
    super(apiClient, {
      createStore: (storeName, context) => {
        const dbType = isTemporaryClientAndNonPersistent(context.clientType === ClientType.PERMANENT)
          ? DatabaseTypes.ENCRYPTED
          : DatabaseTypes.PERMANENT;

        return createStorageEngine(storeName, dbType);
      },
      cryptoProtocolConfig: {
        coreCrypoWasmFilePath: '/min/core-crypto.wasm',
        mls: supportsMLS()
          ? {
              keyingMaterialUpdateThreshold: Config.getConfig().FEATURE.MLS_CONFIG_KEYING_MATERIAL_UPDATE_THRESHOLD,
              useE2EI: Config.getConfig().FEATURE.ENABLE_E2EI,
            }
          : undefined,

        proteus: supportsCoreCryptoProteus(),
        /*
         * When in an electron context, the window.systemCrypto will be populated by the renderer process.
         * We then give those crypto primitives to the core that will use them when encrypting MLS secrets.
         * When in a browser context, then this systemCrypto will be undefined and the core will then use it's internal encryption system
         */
        systemCrypto: window.systemCrypto,

        useCoreCrypto: Config.getConfig().FEATURE.USE_CORE_CRYPTO,
      },
      nbPrekeys: 100,
    });
  }
  get storage() {
    return this['storeEngine'];
  }
}
