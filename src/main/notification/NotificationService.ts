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
import * as Events from '@wireapp/api-client/dist/commonjs/event';
import {Notification} from '@wireapp/api-client/dist/commonjs/notification/';
import {CRUDEngine, error as StoreEngineError} from '@wireapp/store-engine';
import {EventEmitter} from 'events';

import logdown = require('logdown');
import {PayloadBundle, PayloadBundleSource, PayloadBundleType} from '../conversation';
import {AssetContent} from '../conversation/content';
import {ConversationMapper} from '../conversation/ConversationMapper';
import * as Messages from '../conversation/message/Message';
import {CoreError, NotificationError} from '../CoreError';
import {CryptographyService} from '../cryptography';
import {UserMapper} from '../user/UserMapper';
import {NotificationBackendRepository} from './NotificationBackendRepository';
import {NotificationDatabaseRepository} from './NotificationDatabaseRepository';

enum TOPIC {
  NOTIFICATION_ERROR = 'NotificationService.TOPIC.NOTIFICATION_ERROR',
}

export type NotificationHandler = (notification: Notification, source: PayloadBundleSource) => Promise<void>;

export declare interface NotificationService {
  on(event: PayloadBundleType.ASSET, listener: (payload: Messages.FileAssetMessage) => void): this;
  on(event: PayloadBundleType.ASSET_ABORT, listener: (payload: Messages.FileAssetAbortMessage) => void): this;
  on(event: PayloadBundleType.ASSET_IMAGE, listener: (payload: Messages.ImageAssetMessage) => void): this;
  on(event: PayloadBundleType.ASSET_META, listener: (payload: Messages.FileAssetMetaDataMessage) => void): this;
  on(event: PayloadBundleType.CALL, listener: (payload: Messages.CallMessage) => void): this;
  on(event: PayloadBundleType.CLIENT_ACTION, listener: (payload: Messages.ResetSessionMessage) => void): this;
  on(event: PayloadBundleType.CLIENT_ADD, listener: (payload: Events.UserClientAddEvent) => void): this;
  on(event: PayloadBundleType.CLIENT_REMOVE, listener: (payload: Events.UserClientRemoveEvent) => void): this;
  on(event: PayloadBundleType.CONFIRMATION, listener: (payload: Messages.ConfirmationMessage) => void): this;
  on(event: PayloadBundleType.CONNECTION_REQUEST, listener: (payload: Events.UserConnectionEvent) => void): this;
  on(event: PayloadBundleType.CONVERSATION_CLEAR, listener: (payload: Messages.ClearConversationMessage) => void): this;
  on(event: PayloadBundleType.CONVERSATION_RENAME, listener: (payload: Events.ConversationRenameEvent) => void): this;
  on(event: PayloadBundleType.LOCATION, listener: (payload: Messages.LocationMessage) => void): this;
  on(event: PayloadBundleType.MEMBER_JOIN, listener: (payload: Events.TeamMemberJoinEvent) => void): this;
  on(event: PayloadBundleType.MESSAGE_DELETE, listener: (payload: Messages.DeleteMessage) => void): this;
  on(event: PayloadBundleType.MESSAGE_EDIT, listener: (payload: Messages.EditedTextMessage) => void): this;
  on(event: PayloadBundleType.MESSAGE_HIDE, listener: (payload: Messages.HideMessage) => void): this;
  on(event: PayloadBundleType.PING, listener: (payload: Messages.PingMessage) => void): this;
  on(event: PayloadBundleType.REACTION, listener: (payload: Messages.ReactionMessage) => void): this;
  on(event: PayloadBundleType.TEXT, listener: (payload: Messages.TextMessage) => void): this;
  on(
    event: PayloadBundleType.TIMER_UPDATE,
    listener: (payload: Events.ConversationMessageTimerUpdateEvent) => void,
  ): this;
  on(event: PayloadBundleType.TYPING, listener: (payload: Events.ConversationTypingEvent) => void): this;
  on(event: PayloadBundleType.UNKNOWN, listener: (payload: any) => void): this;
  on(event: TOPIC.NOTIFICATION_ERROR, listener: (payload: NotificationError) => void): this;
}

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
  public static get TOPIC(): typeof TOPIC {
    return TOPIC;
  }

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

  public getNotificationEventList(): Promise<Events.BackendEvent[]> {
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
      await notificationHandler(notification, PayloadBundleSource.NOTIFICATION_STREAM).catch(error =>
        this.logger.error(error),
      );
    }
  }

  public readonly handleNotification: NotificationHandler = async (
    notification: Notification,
    source: PayloadBundleSource,
  ): Promise<void> => {
    for (const event of notification.payload) {
      let data: PayloadBundle | void;

      try {
        this.logger.log(`Handling event of type "${event.type}" for notification with ID "${notification.id}"`, event);
        data = await this.handleEvent(event, source);
        if (!notification.transient) {
          await this.setLastNotificationId(notification);
        }
      } catch (error) {
        this.logger.error(`There was an error with notification ID "${notification.id}": ${error.message}`, error);
        const notificationError: NotificationError = {error, notification, type: CoreError.NOTIFICATION_ERROR};
        this.emit(NotificationService.TOPIC.NOTIFICATION_ERROR, notificationError);
        continue;
      }

      if (data) {
        switch (data.type) {
          case PayloadBundleType.ASSET_IMAGE:
          case PayloadBundleType.CALL:
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
          case PayloadBundleType.CONVERSATION_CLEAR:
          case PayloadBundleType.MEMBER_JOIN:
          case PayloadBundleType.TYPING:
            this.emit(data.type, event);
            break;
        }
      } else {
        const {type, conversation, from} = event as Events.ConversationEvent;
        const conversationText = conversation ? ` in conversation "${conversation}"` : '';
        const fromText = from ? ` from user "${from}".` : '';

        this.logger.log(`Received unsupported event "${type}"${conversationText}${fromText}`, {event});
      }
    }
  };

  private async handleEvent(event: Events.BackendEvent, source: PayloadBundleSource): Promise<PayloadBundle | void> {
    switch (event.type) {
      // Encrypted events
      case Events.CONVERSATION_EVENT.OTR_MESSAGE_ADD: {
        return this.cryptographyService.decodeGenericMessage(event, source);
      }
      // Meta events
      case Events.CONVERSATION_EVENT.MEMBER_JOIN:
      case Events.CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE:
      case Events.CONVERSATION_EVENT.RENAME:
      case Events.CONVERSATION_EVENT.TYPING: {
        const {conversation, from} = event;
        const metaEvent = {...event, from, conversation};
        return ConversationMapper.mapConversationEvent(metaEvent, source);
      }
      // User events
      case Events.USER_EVENT.CONNECTION:
      case Events.USER_EVENT.CLIENT_ADD:
      case Events.USER_EVENT.CLIENT_REMOVE: {
        return UserMapper.mapUserEvent(event, this.apiClient.context!.userId, source);
      }
    }
  }
}
