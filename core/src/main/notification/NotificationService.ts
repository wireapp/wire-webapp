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

import {APIClient} from '@wireapp/api-client';
import {Notification, NotificationEvent} from '@wireapp/api-client/dist/commonjs/notification/';
import {CRUDEngine, error as StoreEngineError} from '@wireapp/store-engine';
import NotificationBackendRepository from './NotificationBackendRepository';
import NotificationDatabaseRepository from './NotificationDatabaseRepository';

export default class NotificationService {
  private readonly backend: NotificationBackendRepository;
  private readonly database: NotificationDatabaseRepository;

  constructor(private readonly apiClient: APIClient, private readonly storeEngine: CRUDEngine) {
    this.backend = new NotificationBackendRepository(this.apiClient);
    this.database = new NotificationDatabaseRepository(this.storeEngine);
  }

  public initializeNotificationStream(clientId: string): Promise<string> {
    return this.setLastEventDate(new Date(0))
      .then(() => this.backend.getLastNotification(clientId))
      .then(notification => this.setLastNotificationId(notification));
  }

  public hasHistory(): Promise<boolean> {
    return this.getNotificationEventList().then(notificationEvents => !!notificationEvents.length);
  }

  public getNotificationEventList(): Promise<NotificationEvent[]> {
    return this.database.getNotificationEventList();
  }

  public setLastEventDate(eventDate: Date): Promise<Date> {
    return this.database
      .getLastEventDate()
      .then(databaseLastEventDate => {
        if (eventDate > databaseLastEventDate) {
          return this.database.updateLastEventDate(eventDate);
        }
        return databaseLastEventDate;
      })
      .catch(error => {
        if (
          error instanceof StoreEngineError.RecordNotFoundError ||
          error.constructor.name === StoreEngineError.RecordNotFoundError.constructor.name
        ) {
          return this.database.createLastEventDate(eventDate);
        }
        throw error;
      });
  }

  public setLastNotificationId(lastNotification: Notification): Promise<string> {
    return this.database
      .getLastNotificationId()
      .then(() => this.database.updateLastNotificationId(lastNotification))
      .catch(() => this.database.createLastNotificationId(lastNotification));
  }
}
