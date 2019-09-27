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

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
    this.storeEngine = apiClient.config.store;
    this.backend = new NotificationBackendRepository(this.apiClient);
    this.database = new NotificationDatabaseRepository(this.storeEngine);
  }

  public async getAllNotifications(): Promise<Notification[]> {
    const clientId = this.apiClient.clientId;
    const lastNotificationId = await this.database.getLastNotificationId();
    return this.backend.getAllNotifications(clientId, lastNotificationId);
  }

  /** Should only be called with a completely new client. */
  public async initializeNotificationStream(clientId: string): Promise<string> {
    await this.setLastEventDate(new Date(0));
    const latestNotificationId = await this.backend.getLastNotification(clientId);
    return this.setLastNotificationId(latestNotificationId);
  }

  public async hasHistory(): Promise<boolean> {
    const notificationEvents = await this.getNotificationEventList();
    return !!notificationEvents.length;
  }

  public getNotificationEventList(): Promise<NotificationPayload[]> {
    return this.database.getNotificationEventList();
  }

  public async setLastEventDate(eventDate: Date): Promise<Date> {
    let databaseLastEventDate: Date | undefined;

    try {
      databaseLastEventDate = await this.database.getLastEventDate();
    } catch (error) {
      if (error instanceof StoreEngineError.RecordNotFoundError) {
        return this.database.createLastEventDate(eventDate);
      }
      throw error;
    }

    if (databaseLastEventDate && eventDate > databaseLastEventDate) {
      return this.database.updateLastEventDate(eventDate);
    }

    return databaseLastEventDate;
  }

  public async setLastNotificationId(lastNotification: Notification): Promise<string> {
    return this.database.updateLastNotificationId(lastNotification);
  }
}
