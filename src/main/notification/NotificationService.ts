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
import APIClient = require('@wireapp/api-client');
import {Notification} from '@wireapp/api-client/dist/commonjs/notification/index';
import {RecordNotFoundError} from '@wireapp/store-engine/dist/commonjs/engine/error/index';
import NotificationDatabaseRepository from './NotificationDatabaseRepository';
import NotificationBackendRepository from './NotificationBackendRepository';

export default class NotificationService {
  private backend: NotificationBackendRepository;
  private database: NotificationDatabaseRepository;

  constructor(private apiClient: APIClient, private storeEngine: CRUDEngine) {
    this.backend = new NotificationBackendRepository(this.apiClient);
    this.database = new NotificationDatabaseRepository(this.storeEngine);
  }

  public initializeNotificationStream(clientId: string): Promise<string> {
    return this.setLastEventDate(new Date(0))
      .then(() => this.backend.getLastNotification(clientId))
      .then(notification => this.setLastNotificationId(notification));
  }

  private setLastEventDate(eventDate: Date): Promise<Date> {
    return this.database
      .getLastEventDate()
      .then(databaseLastEventDate => {
        if (eventDate > databaseLastEventDate) {
          return this.database.updateLastEventDate(eventDate);
        }
        return databaseLastEventDate;
      })
      .catch(error => {
        if (error instanceof RecordNotFoundError || error.constructor.name === 'RecordNotFoundError') {
          return this.database.createLastEventDate(eventDate);
        }
        throw error;
      });
  }

  private setLastNotificationId(lastNotification: Notification): Promise<string> {
    return this.database
      .getLastNotificationId()
      .then(() => this.database.updateLastNotificationId(lastNotification))
      .catch(error => this.database.createLastNotificationId(lastNotification));
  }
}
