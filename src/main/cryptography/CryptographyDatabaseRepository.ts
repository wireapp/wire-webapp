/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine/index';
import {RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/index';
import {store as CryptoboxStore} from '@wireapp/cryptobox';
import {MetaClient} from './CryptographyService';

export enum DatabaseStores {
  AMPLIFY = 'amplify',
  CLIENTS = 'clients',
  KEYS = 'keys',
  SESSIONS = 'sessions',
  PRE_KEYS = 'prekeys',
}

class CryptographyDatabaseRepository {
  public static readonly STORES = DatabaseStores;

  constructor(private storeEngine: CRUDEngine) {}

  public loadClient(identity: string): Promise<RegisteredClient> {
    return this.storeEngine.read<RegisteredClient>(CryptographyDatabaseRepository.STORES.CLIENTS, identity);
  }

  public deleteClient(identity: CryptoboxStore.CRUDStoreKeys): Promise<string> {
    return this.storeEngine.delete(CryptographyDatabaseRepository.STORES.CLIENTS, identity);
  }

  public saveClient(identity: CryptoboxStore.CRUDStoreKeys, client: MetaClient): Promise<string> {
    return this.storeEngine.create(CryptographyDatabaseRepository.STORES.CLIENTS, identity, client);
  }

  public deleteStores(): Promise<boolean[]> {
    return Promise.all([
      this.storeEngine.deleteAll(CryptographyDatabaseRepository.STORES.AMPLIFY),
      this.storeEngine.deleteAll(CryptographyDatabaseRepository.STORES.CLIENTS),
      this.storeEngine.deleteAll(CryptographyDatabaseRepository.STORES.KEYS),
      this.storeEngine.deleteAll(CryptographyDatabaseRepository.STORES.SESSIONS),
      this.storeEngine.deleteAll(CryptographyDatabaseRepository.STORES.PRE_KEYS),
    ]);
  }

  public purgeDb(): Promise<void> {
    return this.storeEngine.purge();
  }
}

export default CryptographyDatabaseRepository;
