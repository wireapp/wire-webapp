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
import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine/';
import {RecordNotFoundError} from '@wireapp/store-engine/dist/commonjs/engine/error/';
import * as logdown from 'logdown';
import NotificationBackendRepository from './NotificationBackendRepository';
import NotificationDatabaseRepository from './NotificationDatabaseRepository';

export default class NotificationService {
  private readonly logger: logdown.Logger;

  private readonly backend: NotificationBackendRepository;
  private readonly database: NotificationDatabaseRepository;

  constructor(private readonly apiClient: APIClient, private readonly storeEngine: CRUDEngine) {
    this.backend = new NotificationBackendRepository(this.apiClient);
    this.database = new NotificationDatabaseRepository(this.storeEngine);
    this.logger = logdown('@wireapp/core/notification/NotificationService', {
      logger: console,
      markdown: false,
    });
  }

  public initializeNotificationStream(clientId: string): Promise<string> {
    this.logger.log('initializeNotificationStream');
    return this.setLastEventDate(new Date(0))
      .then(() => this.backend.getLastNotification(clientId))
      .then(notification => this.setLastNotificationId(notification));
  }

  public hasHistory(): Promise<boolean> {
    this.logger.log('hasHistory');
    return this.getNotificationEventList().then(notificationEvents => !!notificationEvents.length);
  }

  public getNotificationEventList(): Promise<NotificationEvent[]> {
    this.logger.log('getNotificationEventList');
    return this.database.getNotificationEventList();
  }

  public setLastEventDate(eventDate: Date): Promise<Date> {
    this.logger.log('setLastEventDate');
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

  public setLastNotificationId(lastNotification: Notification): Promise<string> {
    this.logger.log('setLastNotificationId');
    return this.database
      .getLastNotificationId()
      .then(() => this.database.updateLastNotificationId(lastNotification))
      .catch(error => this.database.createLastNotificationId(lastNotification));
  }
}
