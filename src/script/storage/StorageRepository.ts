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

import {Logger, getLogger} from 'Util/Logger';
import {container} from 'tsyringe';

import {StorageSchemata} from '../storage/StorageSchemata';
import {StorageService} from './StorageService';
import {StorageError} from '../error/StorageError';

type AmplifyRecord = {key: string; value: string};

export class StorageRepository {
  private readonly AMPLIFY_STORE_NAME: string;
  private readonly logger: Logger;

  static get CONFIG() {
    return {
      CRYPTOGRAPHY_TABLES: [
        StorageSchemata.OBJECT_STORE.AMPLIFY,
        StorageSchemata.OBJECT_STORE.CLIENTS,
        StorageSchemata.OBJECT_STORE.KEYS,
        StorageSchemata.OBJECT_STORE.SESSIONS,
        StorageSchemata.OBJECT_STORE.PRE_KEYS,
      ],
    };
  }

  constructor(public readonly storageService = container.resolve(StorageService)) {
    this.logger = getLogger('StorageRepository');
    this.AMPLIFY_STORE_NAME = StorageSchemata.OBJECT_STORE.AMPLIFY;
  }

  clearStores(): Promise<void> {
    return this.storageService
      .clearStores()
      .then(() => this.logger.info(`Cleared database '${this.storageService.dbName}'`));
  }

  deleteCryptographyStores(): Promise<void> {
    return this.storageService.deleteStores(StorageRepository.CONFIG.CRYPTOGRAPHY_TABLES);
  }

  deleteDatabase(): Promise<boolean> {
    this.logger.warn(`Deleting database '${this.storageService.dbName}'`);
    return this.storageService.deleteDatabase();
  }

  getValue(primaryKey: string): Promise<string | AmplifyRecord> {
    return this.storageService.load<AmplifyRecord>(this.AMPLIFY_STORE_NAME, primaryKey).then(record => {
      if (record?.value) {
        return record.value;
      }
      throw new StorageError(StorageError.TYPE.NOT_FOUND, StorageError.MESSAGE.NOT_FOUND);
    });
  }

  async saveValue<T>(primaryKey: string, value: T): Promise<string> {
    await this.storageService.save(this.AMPLIFY_STORE_NAME, primaryKey, {value});
    return primaryKey;
  }

  terminate(reason: string): void {
    this.storageService.terminate(reason);
  }
}
