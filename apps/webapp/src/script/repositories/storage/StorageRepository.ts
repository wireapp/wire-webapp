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

import {container} from 'tsyringe';

import {Logger, getLogger} from 'Util/Logger';

import {StorageService} from './StorageService';

export class StorageRepository {
  private readonly logger: Logger;

  constructor(public readonly storageService = container.resolve(StorageService)) {
    this.logger = getLogger('StorageRepository');
  }

  async clearStores(): Promise<void> {
    // Only used for testing purposes
    await this.storageService.clearStores();
  }

  deleteDatabase(): Promise<boolean> {
    this.logger.warn(`Deleting database '${this.storageService.dbName}'`);
    return this.storageService.deleteDatabase();
  }

  terminate(reason: string): void {
    this.storageService.terminate(reason);
  }
}
