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

import {BackendEvent} from '@wireapp/api-client/lib/event';
import {Notification} from '@wireapp/api-client/lib/notification/';

import {APIClient} from '@wireapp/api-client';
import {LogFactory, TypedEventEmitter} from '@wireapp/commons';
import {GenericMessage} from '@wireapp/protocol-messaging';
import {CRUDEngine, error as StoreEngineError} from '@wireapp/store-engine';

import {NotificationBackendRepository} from './NotificationBackendRepository';
import {NotificationDatabaseRepository} from './NotificationDatabaseRepository';
import {NotificationSource} from './Notifications.types';

import {ConversationService} from '../conversation';
import {CoreError, NotificationError} from '../CoreError';
import {DecryptionError} from '../errors/DecryptionError';

export type HandledEventPayload = {
  /** the raw event received from backend */
  event: BackendEvent;
  /** the decrypted data in case the event was an encrypted event */
  decryptedData?: GenericMessage;
  /** in case decryption went wrong, this will contain information about the decryption error */
  decryptionError?: DecryptionError;
};

/**
 * The result of handling an event
 * - unhandled: The event was not handled by the particular service
 * - ignored: The event was handled, but it got marked as ignored for whatever reason, it will not be emitted
 * - handled: The event was handled and its payload will be emitted
 */
export type HandledEventResult =
  | {status: 'unhandled'}
  | {status: 'ignored'}
  | {status: 'handled'; payload: HandledEventPayload | null};

enum TOPIC {
  NOTIFICATION_ERROR = 'NotificationService.TOPIC.NOTIFICATION_ERROR',
}

export type NotificationHandler = (
  notification: Notification,
  source: NotificationSource,
  progress: {done: number; total: number},
) => Promise<void>;

type Events = {
  [TOPIC.NOTIFICATION_ERROR]: NotificationError;
};

export class NotificationService extends TypedEventEmitter<Events> {
  private readonly apiClient: APIClient;
  private readonly backend: NotificationBackendRepository;
  private readonly database: NotificationDatabaseRepository;
  private readonly logger = LogFactory.getLogger('@wireapp/core/NotificationService');
  public static readonly TOPIC = TOPIC;

  constructor(
    apiClient: APIClient,
    storeEngine: CRUDEngine,
    private readonly conversationService: ConversationService,
  ) {
    super();
    this.apiClient = apiClient;
    this.backend = new NotificationBackendRepository(this.apiClient);
    this.database = new NotificationDatabaseRepository(storeEngine);
  }

  private async getAllNotifications(since: string, abortController?: AbortController) {
    const clientId = this.apiClient.clientId;
    return this.backend.getAllNotifications(clientId, since, abortController);
  }

  /**
   * Should only be called with a completely new client.
   *
   * @deprecated This method is used to handle legacy notifications from the backend.
   * It can be removed when all clients are capable of handling consumable notifications.
   */
  public async legacyInitializeNotificationStream(clientId: string): Promise<string> {
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

  /**
   * Processes the notification stream and calls the provided handler for each notification.
   * If there are missed notifications, it will call the onMissedNotifications callback with the missed notification ID.
   *
   * @param notificationHandler - The handler to process each notification.
   * @param onMissedNotifications - Callback to handle missed notifications.
   * @returns An object containing the total number of notifications processed, number of errors, and successes.
   *
   * @deprecated When all client are migrated to the consumable/async notification stream, this method must be removed.
   */
  public async legacyProcessNotificationStream(
    notificationHandler: NotificationHandler,
    onMissedNotifications: (notificationId: string) => void,
    abortHandler?: AbortController,
  ): Promise<{total: number; error: number; success: number}> {
    const lastNotificationId = await this.database.getLastNotificationId();
    const {notifications, missedNotification} = await this.getAllNotifications(lastNotificationId, abortHandler);
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
      if (abortHandler?.signal.aborted) {
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
  ): AsyncGenerator<HandledEventPayload> {
    for (const event of notification.payload) {
      this.logger.debug(`Handling event of type "${event.type}"`, event);
      let lastEventDate: Date | undefined = undefined;
      try {
        lastEventDate = await this.database.getLastEventDate();
      } catch {
        // Ignore database errors when fetching last event date
      }
      if ('time' in event && this.isOutdatedEvent(event, source, lastEventDate)) {
        this.logger.info(`Ignored outdated event type: '${event.type}'`);
        continue;
      }
      try {
        const handledEventResult = await this.handleEvent(event);
        if (handledEventResult.status === 'handled' && handledEventResult.payload) {
          yield handledEventResult.payload;
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
    if (!notification.transient) {
      // keep track of the last handled notification for next time we fetch the notification stream
      await this.setLastNotificationId(notification);
    }
  }

  /**
   * Will process one event
   * @param event The backend event to process
   * @return event handling status and if event was handled, the payload
   */
  private async handleEvent(event: BackendEvent): Promise<HandledEventResult> {
    const conversationEventResult = await this.conversationService.handleEvent(event);
    if (conversationEventResult.status !== 'unhandled') {
      return conversationEventResult;
    }

    return {status: 'handled', payload: {event}};
  }
}
