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

import {BackendEvent, CONVERSATION_EVENT} from '@wireapp/api-client/lib/event';
import {Notification} from '@wireapp/api-client/lib/notification/';
import {AbortHandler} from '@wireapp/api-client/lib/tcp';
import logdown from 'logdown';

import {EventEmitter} from 'events';

import {APIClient} from '@wireapp/api-client';
import {GenericMessage} from '@wireapp/protocol-messaging';
import {CRUDEngine, error as StoreEngineError} from '@wireapp/store-engine';

import {NotificationBackendRepository} from './NotificationBackendRepository';
import {NotificationDatabaseRepository} from './NotificationDatabaseRepository';
import {NotificationSource} from './Notifications.types';

import {CoreError, NotificationError} from '../CoreError';
import {DecryptionError} from '../errors/DecryptionError';
import {MLSService} from '../messagingProtocols/mls';
import {ProteusService} from '../messagingProtocols/proteus';

export type HandledEventPayload = {
  event: BackendEvent;
  decryptedData?: GenericMessage;
  decryptionError?: DecryptionError;
};

enum TOPIC {
  NOTIFICATION_ERROR = 'NotificationService.TOPIC.NOTIFICATION_ERROR',
}

export type NotificationHandler = (
  notification: Notification,
  source: NotificationSource,
  progress: {done: number; total: number},
) => Promise<void>;

export interface NotificationService {
  on(event: TOPIC.NOTIFICATION_ERROR, listener: (payload: NotificationError) => void): this;
}

export class NotificationService extends EventEmitter {
  private readonly apiClient: APIClient;
  private readonly backend: NotificationBackendRepository;
  private readonly database: NotificationDatabaseRepository;
  private readonly logger = logdown('@wireapp/core/NotificationService', {
    logger: console,
    markdown: false,
  });
  public static readonly TOPIC = TOPIC;

  constructor(
    apiClient: APIClient,
    private readonly mlsService: MLSService,
    private readonly proteusService: ProteusService,
    storeEngine: CRUDEngine,
  ) {
    super();
    this.apiClient = apiClient;
    this.backend = new NotificationBackendRepository(this.apiClient);
    this.database = new NotificationDatabaseRepository(storeEngine);
  }

  private async getAllNotifications(since: string) {
    const clientId = this.apiClient.clientId;
    return this.backend.getAllNotifications(clientId, since);
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
      if (
        error instanceof StoreEngineError.RecordNotFoundError ||
        (error as Error).constructor.name === StoreEngineError.RecordNotFoundError.name
      ) {
        return this.database.createLastEventDate(eventDate);
      }
      throw error;
    }

    if (databaseLastEventDate && eventDate > databaseLastEventDate) {
      return this.database.updateLastEventDate(eventDate);
    }

    return databaseLastEventDate;
  }

  private async setLastNotificationId(lastNotification: Notification): Promise<string> {
    return this.database.updateLastNotificationId(lastNotification);
  }

  public async processNotificationStream(
    notificationHandler: NotificationHandler,
    onMissedNotifications: (notificationId: string) => void,
    abortHandler: AbortHandler,
  ): Promise<{total: number; error: number; success: number}> {
    const lastNotificationId = await this.database.getLastNotificationId();
    const {notifications, missedNotification} = await this.getAllNotifications(lastNotificationId);
    if (missedNotification) {
      onMissedNotifications(missedNotification);
    }

    const results = {total: notifications.length, error: 0, success: 0};
    const logMessage =
      notifications.length > 0
        ? `Start processing ${notifications.length} notifications since notification id ${lastNotificationId}`
        : `No notification to process from the stream`;
    this.logger.log(logMessage);
    for (const [index, notification] of notifications.entries()) {
      if (abortHandler.isAborted()) {
        /* Stop handling notifications if the websocket has been disconnected.
         * Upon reconnecting we are going to restart handling the notification stream for where we left of
         */
        this.logger.warn(`Stop processing notifications as connection to websocket was closed`);
        return results;
      }
      try {
        await notificationHandler(notification, NotificationSource.NOTIFICATION_STREAM, {
          done: index + 1,
          total: notifications.length,
        });
        results.success++;
      } catch (error) {
        const message = error instanceof Error ? error.message : error;
        this.logger.error(`Error while processing notification ${notification.id}: ${message}`, error);
        results.error++;
      }
    }
    return results;
  }

  /**
   * Checks if an event should be ignored.
   * An event that has a date prior to that last event that we have parsed should be ignored
   *
   * @param event
   * @param source
   * @param lastEventDate?
   */
  private isOutdatedEvent(event: {time: string}, source: NotificationSource, lastEventDate?: Date) {
    const isFromNotificationStream = source === NotificationSource.NOTIFICATION_STREAM;
    const shouldCheckEventDate = !!event.time && isFromNotificationStream && lastEventDate;

    if (shouldCheckEventDate) {
      /** This check prevents duplicated "You joined" system messages. */
      const isOutdated = lastEventDate.getTime() >= new Date(event.time).getTime();
      return isOutdated;
    }
    return false;
  }

  public async *handleNotification(
    notification: Notification,
    source: NotificationSource,
    dryRun: boolean = false,
  ): AsyncGenerator<HandledEventPayload> {
    for (const event of notification.payload) {
      this.logger.log(`Handling event of type "${event.type}" for notification with ID "${notification.id}"`, event);
      let lastEventDate: Date | undefined = undefined;
      try {
        lastEventDate = await this.database.getLastEventDate();
      } catch {}
      if ('time' in event && this.isOutdatedEvent(event, source, lastEventDate)) {
        this.logger.info(`Ignored outdated event type: '${event.type}'`);
        continue;
      }
      try {
        const data = await this.handleEvent(event, source, dryRun);
        if (typeof data !== 'undefined') {
          yield data;
        }
      } catch (error) {
        this.logger.error(
          `There was an error with notification ID "${notification.id}": ${(error as Error).message}`,
          error,
        );
        const notificationError: NotificationError = {
          error: error as Error,
          notification,
          type: CoreError.NOTIFICATION_ERROR,
        };
        this.emit(NotificationService.TOPIC.NOTIFICATION_ERROR, notificationError);
      }
    }
    if (!dryRun && !notification.transient) {
      // keep track of the last handled notification for next time we fetch the notification stream
      await this.setLastNotificationId(notification);
    }
  }

  /**
   * Will process one event
   * @param event The backend event to process
   * @param source The source of the event (websocket or notication stream)
   * @param dryRun Will not try to decrypt if true
   * @return the decrypted payload and the raw event. Returns `undefined` when the payload is a coreCrypto-only system message
   */
  private async handleEvent(
    event: BackendEvent,
    source: NotificationSource,
    dryRun: boolean = false,
  ): Promise<HandledEventPayload | undefined> {
    // Handle MLS Events
    const mlsResult = await this.mlsService.handleEvent({event, source, dryRun});
    if (mlsResult) {
      return mlsResult;
    }

    const proteusResult = await this.proteusService.handleEvent({
      event,
      source,
      dryRun,
    });
    if (proteusResult) {
      return proteusResult;
    }

    // Fallback to other events
    switch (event.type) {
      // Meta events
      case CONVERSATION_EVENT.MEMBER_JOIN:
        // As of today (07/07/2022) the backend sends `WELCOME` message to the user's own conversation (not the actual conversation that the welcome should be part of)
        // So in order to map conversation Ids and groupId together, we need to first fetch the conversation and get the groupId linked to it.
        const conversation = await this.apiClient.api.conversation.getConversation(
          event.qualified_conversation ?? {id: event.conversation, domain: ''},
        );
        if (!conversation) {
          throw new Error('no conv');
        }
    }
    return {event};
  }
}
