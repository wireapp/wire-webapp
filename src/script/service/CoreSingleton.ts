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

import {Account} from '@wireapp/core';
import {ClientType} from '@wireapp/api-client/src/client/';
import {container, singleton} from 'tsyringe';
import {APIClient} from './APIClientSingleton';
import {createStorageEngine, DatabaseTypes} from './StoreEngineProvider';
import {isTemporaryClientAndNonPersistent, supportsMLS} from 'Util/util';
import {Config} from '../Config';

declare global {
  interface Window {
    systemCrypto?: {
      decrypt: (value: Uint8Array) => Promise<Uint8Array>;
      encrypt: (encrypted: Uint8Array) => Promise<Uint8Array>;
    };
  }
}

@singleton()
export class Core extends Account<Uint8Array> {
  constructor(apiClient = container.resolve(APIClient)) {
    super(apiClient, {
      createStore: (storeName, context) => {
        const dbType = isTemporaryClientAndNonPersistent(context.clientType === ClientType.PERMANENT)
          ? DatabaseTypes.ENCRYPTED
          : DatabaseTypes.PERMANENT;

        return createStorageEngine(storeName, dbType);
      },
      mlsConfig: supportsMLS
        ? {
            coreCrypoWasmFilePath: '/min/core-crypto.wasm',
            keyingMaterialUpdateThreshold: Config.getConfig().FEATURE.MLS_CONFIG_KEYING_MATERIAL_UPDATE_THRESHOLD,
            /*
             * When in an electron context, the window.systemCrypto will be populated by the renderer process.
             * We then give those crypto primitives to the core that will use them when encrypting MLS secrets.
             * When in a browser context, then this systemCrypto will be undefined and the core will then use it's internal encryption system
             */
            systemCrypto: window.systemCrypto,
          }
        : undefined,
      nbPrekeys: 100,
    });
  }
  get storage() {
    return this['storeEngine'];
  }
}
