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
import {BackendEvent, CONVERSATION_EVENT, ConversationEvent, USER_EVENT} from '@wireapp/api-client/dist/commonjs/event';
import {Notification} from '@wireapp/api-client/dist/commonjs/notification/';
import {CRUDEngine, error as StoreEngineError} from '@wireapp/store-engine';
import {EventEmitter} from 'events';
import logdown = require('logdown');

import {PayloadBundle, PayloadBundleType} from '../conversation';
import {AssetContent} from '../conversation/content';
import {ConversationMapper} from '../conversation/ConversationMapper';
import {CryptographyService} from '../cryptography';
import {UserMapper} from '../user/UserMapper';
import {NotificationBackendRepository} from './NotificationBackendRepository';
import {NotificationDatabaseRepository} from './NotificationDatabaseRepository';

export type NotificationHandler = (notification: Notification) => Promise<void>;

export class NotificationService extends EventEmitter {
  private readonly apiClient: APIClient;
  private readonly cryptographyService: CryptographyService;
  private readonly backend: NotificationBackendRepository;
  private readonly database: NotificationDatabaseRepository;
  private readonly storeEngine: CRUDEngine;
  private readonly logger = logdown('@wireapp/core/notification/NotificationService', {
    logger: console,
    markdown: false,
  });

  constructor(apiClient: APIClient, cryptographyService: CryptographyService) {
    super();
    this.apiClient = apiClient;
    this.cryptographyService = cryptographyService;
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
  public async initializeNotificationStream(): Promise<string> {
    const clientId = this.apiClient.clientId;
    await this.setLastEventDate(new Date(0));
    const latestNotification = await this.backend.getLastNotification(clientId);
    return this.setLastNotificationId(latestNotification);
  }

  public async hasHistory(): Promise<boolean> {
    const notificationEvents = await this.getNotificationEventList();
    return !!notificationEvents.length;
  }

  public getNotificationEventList(): Promise<BackendEvent[]> {
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

  public async handleNotificationStream(notificationHandler: NotificationHandler): Promise<void> {
    const notifications = await this.getAllNotifications();
    for (const notification of notifications) {
      await notificationHandler(notification).catch(error => this.logger.error(error));
    }
  }

  public readonly handleNotification: NotificationHandler = async notification => {
    for (const event of notification.payload) {
      let data;

      try {
        data = await this.handleEvent(event);
        if (!notification.transient) {
          await this.setLastNotificationId(notification);
        }
      } catch (error) {
        this.emit('error', error);
        continue;
      }

      if (data) {
        switch (data.type) {
          case PayloadBundleType.ASSET_IMAGE:
          case PayloadBundleType.CALL:
          case PayloadBundleType.CLEARED:
          case PayloadBundleType.CLIENT_ACTION:
          case PayloadBundleType.CLIENT_ADD:
          case PayloadBundleType.CLIENT_REMOVE:
          case PayloadBundleType.CONFIRMATION:
          case PayloadBundleType.CONNECTION_REQUEST:
          case PayloadBundleType.LOCATION:
          case PayloadBundleType.MESSAGE_DELETE:
          case PayloadBundleType.MESSAGE_EDIT:
          case PayloadBundleType.MESSAGE_HIDE:
          case PayloadBundleType.PING:
          case PayloadBundleType.REACTION:
          case PayloadBundleType.TEXT:
            this.emit(data.type, data);
            break;
          case PayloadBundleType.ASSET: {
            const assetContent = data.content as AssetContent;
            const isMetaData = !!assetContent && !!assetContent.original && !assetContent.uploaded;
            const isAbort = !!assetContent.abortReason || (!assetContent.original && !assetContent.uploaded);

            if (isMetaData) {
              data.type = PayloadBundleType.ASSET_META;
              this.emit(PayloadBundleType.ASSET_META, data);
            } else if (isAbort) {
              data.type = PayloadBundleType.ASSET_ABORT;
              this.emit(PayloadBundleType.ASSET_ABORT, data);
            } else {
              this.emit(PayloadBundleType.ASSET, data);
            }
            break;
          }
          case PayloadBundleType.TIMER_UPDATE:
          case PayloadBundleType.CONVERSATION_RENAME:
          case PayloadBundleType.MEMBER_JOIN:
          case PayloadBundleType.TYPING:
            this.emit(data.type, event);
            break;
        }
      } else {
        const {type, conversation, from} = event as ConversationEvent;
        const conversationText = conversation ? ` in conversation "${conversation}"` : '';
        const fromText = from ? ` from user "${from}".` : '';

        this.logger.log(`Received unsupported event "${type}"${conversationText}${fromText}`, {event});
      }
    }
  };

  private async handleEvent(event: BackendEvent): Promise<PayloadBundle | void> {
    this.logger.log(`Handling event of type "${event.type}"`, event);
    switch (event.type) {
      // Encrypted events
      case CONVERSATION_EVENT.OTR_MESSAGE_ADD: {
        return this.cryptographyService.decodeGenericMessage(event);
      }
      // Meta events
      case CONVERSATION_EVENT.MEMBER_JOIN:
      case CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE:
      case CONVERSATION_EVENT.RENAME:
      case CONVERSATION_EVENT.TYPING: {
        const {conversation, from} = event;
        const metaEvent = {...event, from, conversation};
        return ConversationMapper.mapConversationEvent(metaEvent);
      }
      // User events
      case USER_EVENT.CONNECTION:
      case USER_EVENT.CLIENT_ADD:
      case USER_EVENT.CLIENT_REMOVE: {
        return UserMapper.mapUserEvent(event, this.apiClient.context!.userId);
      }
    }
  }
}
