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

import {DatabaseKeys} from '@wireapp/core/lib/notification/NotificationDatabaseRepository';
import {container} from 'tsyringe';

import {APIClient} from '../service/APIClientSingleton';
import {StorageSchemata, StorageService} from '../storage/';

export class NotificationService {
  private readonly AMPLIFY_STORE_NAME: string;

  constructor(
    private readonly storageService = container.resolve(StorageService),
    private readonly apiClient = container.resolve(APIClient),
  ) {
    this.AMPLIFY_STORE_NAME = StorageSchemata.OBJECT_STORE.AMPLIFY;
  }

  // TODO: Will be handled through different endpoint
  async getServerTime(): Promise<string> {
    // Info: We use "100" as size limit because it's the minimum value accepted by the backend's notification stream
    const notificationList = await this.apiClient.api.notification.getNotifications(undefined, 100, undefined);
    return notificationList.time;
  }

  /**
   * Save last event date to persistent storage.
   * @param eventDate Event date (in ISO 8601) to be stored
   * @returns Resolves with the primary key of the stored record
   */
  saveLastEventDateToDb(eventDate: string): Promise<string> {
    return this.storageService.save(this.AMPLIFY_STORE_NAME, DatabaseKeys.PRIMARY_KEY_LAST_EVENT, {
      value: eventDate,
    });
  }
}
