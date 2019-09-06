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
import {Notification, NotificationPayload} from '@wireapp/api-client/dist/commonjs/notification/';
import {CRUDEngine, error as StoreEngineError} from '@wireapp/store-engine';
import {NotificationBackendRepository} from './NotificationBackendRepository';
import {NotificationDatabaseRepository} from './NotificationDatabaseRepository';

export class NotificationService {
  private readonly apiClient: APIClient;
  private readonly backend: NotificationBackendRepository;
  private readonly database: NotificationDatabaseRepository;
  private readonly storeEngine: CRUDEngine;

  constructor(apiClient: APIClient, storeEngine: CRUDEngine) {
    this.apiClient = apiClient;
    this.storeEngine = storeEngine;
    this.backend = new NotificationBackendRepository(this.apiClient);
    this.database = new NotificationDatabaseRepository(this.storeEngine);
  }

  public async initializeNotificationStream(clientId: string): Promise<string> {
    await this.setLastEventDate(new Date(0));
    const notification = await this.backend.getLastNotification(clientId);
    return this.setLastNotificationId(notification);
  }

  public async hasHistory(): Promise<boolean> {
    const notificationEvents = await this.getNotificationEventList();
    return !!notificationEvents.length;
  }

  public getNotificationEventList(): Promise<NotificationPayload[]> {
    return this.database.getNotificationEventList();
  }

  public async setLastEventDate(eventDate: Date): Promise<Date> {
    try {
      const databaseLastEventDate = await this.database.getLastEventDate();
      if (eventDate > databaseLastEventDate) {
        return this.database.updateLastEventDate(eventDate);
      }
      return databaseLastEventDate;
    } catch (error) {
      if (
        error instanceof StoreEngineError.RecordNotFoundError ||
        error.constructor.name === StoreEngineError.RecordNotFoundError.constructor.name
      ) {
        return this.database.createLastEventDate(eventDate);
      }
      throw error;
    }
  }

  public async setLastNotificationId(lastNotification: Notification): Promise<string> {
    try {
      await this.database.getLastNotificationId();
      return this.database.updateLastNotificationId(lastNotification);
    } catch (error) {
      return this.database.createLastNotificationId(lastNotification);
    }
  }
}
