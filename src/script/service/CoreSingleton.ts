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

import {container, singleton} from 'tsyringe';

import {Account} from '@wireapp/core';

import {supportsMLS} from 'Util/util';

import {APIClient} from './APIClientSingleton';
import {createStorageEngine, DatabaseTypes} from './StoreEngineProvider';
import {SystemCrypto, wrapSystemCrypto} from './utils/systemCryptoWrapper';

import {Config} from '../Config';

declare global {
  interface Window {
    systemCrypto?: SystemCrypto;
  }
}

@singleton()
export class Core extends Account {
  public key?: Uint8Array;

  constructor(apiClient = container.resolve(APIClient)) {
    const enableCoreCrypto = supportsMLS() || Config.getConfig().FEATURE.USE_CORE_CRYPTO;
    super(apiClient, {
      createStore: async (storeName, key) => {
        this.key = key;
        return createStorageEngine(storeName, DatabaseTypes.PERMANENT, {
          key: Config.getConfig().FEATURE.ENABLE_ENCRYPTION_AT_REST ? key : undefined,
        });
      },

      /*
       * When in an electron context, the window.systemCrypto will be populated by the renderer process.
       * We then give those crypto primitives to the key generator that will use them to encrypt secrets.
       * When in a browser context, then this systemCrypto will be undefined and the key generator will then use it's internal encryption system
       */
      systemCrypto: window.systemCrypto ? wrapSystemCrypto(window.systemCrypto) : undefined,
      coreCryptoConfig: enableCoreCrypto
        ? {
            wasmFilePath: '/min/core-crypto.wasm',
            mls: supportsMLS()
              ? {
                  keyingMaterialUpdateThreshold: Config.getConfig().FEATURE.MLS_CONFIG_KEYING_MATERIAL_UPDATE_THRESHOLD,
                  cipherSuite: Config.getConfig().FEATURE.MLS_CONFIG_DEFAULT_CIPHERSUITE,
                  useE2EI: Config.getConfig().FEATURE.ENABLE_E2EI,
                }
              : undefined,
          }
        : undefined,

      nbPrekeys: 100,
    });
  }
  get storage() {
    return this['storeEngine'];
  }
}
