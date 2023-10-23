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

import {
  CONVERSATION_EVENT,
  USER_EVENT,
  ConversationOtrMessageAddEvent,
  ConversationMLSMessageAddEvent,
} from '@wireapp/api-client/lib/event';
import {NotificationSource, HandledEventPayload} from '@wireapp/core/lib/notification';
import {amplify} from 'amplify';
import ko from 'knockout';
import {container} from 'tsyringe';

import {Account, ConnectionState, ProcessedEventPayload} from '@wireapp/core';
import {WebAppEvents} from '@wireapp/webapp-events';

import {getLogger, Logger} from 'Util/Logger';
import {queue} from 'Util/PromiseQueue';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {ClientEvent} from './Client';
import {EventMiddleware, EventProcessor, IncomingEvent} from './EventProcessor';
import type {EventService} from './EventService';
import {EventSource} from './EventSource';
import {EVENT_TYPE} from './EventType';
import {EventValidation} from './EventValidation';
import {validateEvent} from './EventValidator';
import {NOTIFICATION_HANDLING_STATE} from './NotificationHandlingState';
import type {NotificationService} from './NotificationService';

import {ClientConversationEvent, EventBuilder} from '../conversation/EventBuilder';
import {CryptographyMapper} from '../cryptography/CryptographyMapper';
import {CryptographyError} from '../error/CryptographyError';
import {EventError} from '../error/EventError';
import type {ServerTimeHandler} from '../time/serverTimeHandler';
import {EventName} from '../tracking/EventName';
import {UserState} from '../user/UserState';
import {Warnings} from '../view_model/WarningsContainer';

export class EventRepository {
  logger: Logger;
  notificationHandlingState = ko.observable(NOTIFICATION_HANDLING_STATE.STREAM);
  private readonly lastEventDate: ko.Observable<string | undefined> = ko.observable();
  private eventProcessMiddlewares: EventMiddleware[] = [];
  /** event processors are classes that are able to react and process an incoming event */
  private eventProcessors: EventProcessor[] = [];

  static get CONFIG() {
    return {
      E_CALL_EVENT_LIFETIME: TIME_IN_MILLIS.SECOND * 30,
      IGNORED_ERRORS: [
        CryptographyError.TYPE.IGNORED_ASSET,
        CryptographyError.TYPE.IGNORED_PREVIEW,
        CryptographyError.TYPE.PREVIOUSLY_STORED,
        CryptographyError.TYPE.UNHANDLED_TYPE,
        EventError.TYPE.OUTDATED_E_CALL_EVENT,
        EventError.TYPE.VALIDATION_FAILED,
      ],
      NOTIFICATION_BATCHES: {
        INITIAL: 500,
        MAX: 10000,
        SUBSEQUENT: 5000,
      },
    };
  }

  // TODO: Will be replaced with "EventSource"
  static get SOURCE() {
    return {
      BACKEND_RESPONSE: EventSource.BACKEND_RESPONSE,
      INJECTED: EventSource.INJECTED,
      STREAM: EventSource.NOTIFICATION_STREAM,
      WEB_SOCKET: EventSource.WEBSOCKET,
    };
  }

  constructor(
    readonly eventService: EventService,
    readonly notificationService: NotificationService,
    private readonly serverTimeHandler: ServerTimeHandler,
    private readonly userState = container.resolve(UserState),
  ) {
    this.logger = getLogger('EventRepository');

    this.notificationHandlingState.subscribe(handling_state => {
      amplify.publish(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, handling_state);
    });
  }

  /**
   * Will register a pipeline that transforms an event before it is being processed by the EventProcessors.
   * Those middleware are run sequentially one after the other. Thus the order at which they are defined matters.
   * When one middleware fails the entire even handling process will stop and no further middleware will be executed.
   */
  setEventProcessMiddlewares(middlewares: EventMiddleware[]) {
    this.eventProcessMiddlewares = middlewares;
  }

  /**
   * EventProcessors are classes that are able to react and process an incoming event.
   * They will all be executed in parallel. If one processor fails the other ones are not impacted
   * @param processors
   */
  setEventProcessors(processors: EventProcessor[]) {
    this.eventProcessors = processors;
  }

  //##############################################################################
  // WebSocket handling
  //##############################################################################

  private readonly updateConnectivitityStatus = (state: ConnectionState) => {
    this.logger.log('Websocket connection state changed to', state);
    switch (state) {
      case ConnectionState.CONNECTING: {
        Warnings.hideWarning(Warnings.TYPE.NO_INTERNET);
        Warnings.showWarning(Warnings.TYPE.CONNECTIVITY_RECONNECT);
        return;
      }
      case ConnectionState.PROCESSING_NOTIFICATIONS: {
        this.notificationHandlingState(NOTIFICATION_HANDLING_STATE.STREAM);
        Warnings.hideWarning(Warnings.TYPE.NO_INTERNET);
        Warnings.hideWarning(Warnings.TYPE.CONNECTIVITY_RECONNECT);
        Warnings.showWarning(Warnings.TYPE.CONNECTIVITY_RECOVERY);
        return;
      }
      case ConnectionState.CLOSED: {
        Warnings.showWarning(Warnings.TYPE.NO_INTERNET);
        return;
      }
      case ConnectionState.LIVE: {
        this.notificationHandlingState(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
        amplify.publish(WebAppEvents.CONNECTION.ONLINE);
        Warnings.hideWarning(Warnings.TYPE.NO_INTERNET);
        Warnings.hideWarning(Warnings.TYPE.CONNECTIVITY_RECONNECT);
        Warnings.hideWarning(Warnings.TYPE.CONNECTIVITY_RECOVERY);
      }
    }
  };

  /**
   * this function will process any incoming event. It is being queued in case 2 events arrive at the same time.
   * Processing events should happen sequentially (thus the queue)
   */
  private readonly handleIncomingEvent = queue(async (payload: HandledEventPayload, source: NotificationSource) => {
    try {
      await this.handleEvent(payload, source);
    } catch (error) {
      if (source === EventSource.NOTIFICATION_STREAM) {
        this.logger.warn(`Failed to handle event of type "${event.type}": ${error.message}`, error);
      } else {
        throw error;
      }
    }
  });

  /**
   * connects to the websocket with the given account
   *
   * @param account the account to connect to
   * @param onNotificationStreamProgress callback when a notification for the notification stream has been processed
   * @param dryRun when set will not decrypt and not store the last notification ID. This is useful if you only want to subscribe to unencrypted backend events
   * @returns Resolves when the notification stream has fully been processed
   */
  async connectWebSocket(
    account: Account,
    onNotificationStreamProgress: (progress: {done: number; total: number}) => void,
    dryRun = false,
  ): Promise<void> {
    await this.handleTimeDrift();
    const connect = () => {
      // We make sure there is only be a single active connection to the WebSocket.
      this.disconnectWebSocket?.();
      return new Promise<void>(async resolve => {
        this.disconnectWebSocket = account.listen({
          onConnectionStateChanged: connectionState => {
            this.updateConnectivitityStatus(connectionState);
            if (connectionState === ConnectionState.LIVE) {
              resolve();
            }
          },
          onEvent: this.handleIncomingEvent,
          onMissedNotifications: this.triggerMissedSystemEventMessageRendering,
          onNotificationStreamProgress: onNotificationStreamProgress,
          dryRun,
        });
      });
    };

    window.addEventListener('online', () => {
      this.logger.info('Internet connection regained. Re-establishing WebSocket connection...');
      connect();
    });

    window.addEventListener('offline', () => {
      this.logger.warn('Internet connection lost');
      this.disconnectWebSocket();
      Warnings.showWarning(Warnings.TYPE.NO_INTERNET);
    });
    return connect();
  }

  /**
   * Close the WebSocket connection. (will be set only once the connectWebSocket is called)
   */
  disconnectWebSocket: () => void = () => {};

  //##############################################################################
  // Notification Stream handling
  //##############################################################################
  private async handleTimeDrift() {
    try {
      const time = await this.notificationService.getServerTime();
      this.serverTimeHandler.computeTimeOffset(time);
    } catch (errorResponse) {
      if (errorResponse.response?.time) {
        this.serverTimeHandler.computeTimeOffset(errorResponse.response?.time);
      }
    }
  }

  private getIsoDateFromEvent(event: IncomingEvent, defaultValue = false): string | void {
    if ('time' in event && event.time) {
      return event.time;
    }

    if (event.type === USER_EVENT.CLIENT_ADD) {
      return event.client.time;
    }

    if (event.type === USER_EVENT.CONNECTION) {
      return event.connection.last_update;
    }

    if (defaultValue) {
      return new Date(0).toISOString();
    }
  }

  private readonly triggerMissedSystemEventMessageRendering = async (missedNotificationId: string) => {
    const notificationId = await this.notificationService.getMissedIdFromDb();
    const shouldUpdatePersistedId = missedNotificationId !== notificationId;
    if (shouldUpdatePersistedId) {
      amplify.publish(WebAppEvents.CONVERSATION.MISSED_EVENTS);
      this.notificationService.saveMissedIdToDb(missedNotificationId);
    }
  };

  /**
   * Persist updated last event timestamp.
   *
   * @param eventDate Updated last event date
   * @returns Resolves when the last event date was stored
   */
  private updateLastEventDate(eventDate: string): Promise<string> | void {
    const didDateIncrease = eventDate > this.lastEventDate();
    if (didDateIncrease) {
      this.lastEventDate(eventDate);
      return this.notificationService.saveLastEventDateToDb(eventDate);
    }
  }

  //##############################################################################
  // Notification/Event handling
  //##############################################################################

  async injectEvents(events: (ClientConversationEvent | IncomingEvent)[], source: EventSource = EventSource.INJECTED) {
    for (const event of events) {
      await this.injectEvent(event, source);
    }
  }

  /**
   * Inject event into a conversation.
   * @note Don't add unable to decrypt to self conversation
   *
   * @param event Event payload to be injected
   * @param source Source of injection
   * @returns Resolves when the event has been processed
   */
  async injectEvent(event: ClientConversationEvent | IncomingEvent, source: EventSource = EventSource.INJECTED) {
    if (!event) {
      throw new EventError(EventError.TYPE.NO_EVENT, EventError.MESSAGE.NO_EVENT);
    }

    const isHandlingWebSocket = this.notificationHandlingState() === NOTIFICATION_HANDLING_STATE.WEB_SOCKET;
    if (!isHandlingWebSocket) {
      source = EventRepository.SOURCE.INJECTED;
    }

    const conversationId = 'conversation' in event && event.conversation;
    const inSelfConversation = conversationId === this.userState.self().id;
    if (!inSelfConversation) {
      return this.processEvent(event, source);
    }
    return undefined;
  }

  /**
   * Distribute the given event.
   *
   * @param event Mapped event to be distributed
   * @param source Source of notification
   */
  private async distributeEvent(event: IncomingEvent, source: EventSource) {
    await Promise.all(this.eventProcessors.map(processor => processor.processEvent(event, source)));

    const {type} = event;
    const [category] = type.split('.');
    switch (category) {
      case EVENT_TYPE.CALL:
        amplify.publish(WebAppEvents.CALL.EVENT_FROM_BACKEND, event, source);
        break;
      case EVENT_TYPE.CONVERSATION:
        amplify.publish(WebAppEvents.CONVERSATION.EVENT_FROM_BACKEND, event, source);
        break;
      case EVENT_TYPE.FEATURE_CONFIG:
      case EVENT_TYPE.TEAM:
        amplify.publish(WebAppEvents.TEAM.EVENT_FROM_BACKEND, event, source);
        break;
      case EVENT_TYPE.USER:
        amplify.publish(WebAppEvents.USER.EVENT_FROM_BACKEND, event, source);
        break;
      default:
        amplify.publish(type, event, source);
    }
    // Wait for the event handlers to have finished their async tasks
    await new Promise(res => setTimeout(res, 0));
    return event;
  }

  /**
   * Handle a single event from the notification stream or WebSocket.
   *
   * @param event Event coming from backend
   * @param source Source of event
   * @returns Resolves with the saved record or the plain event if the event was skipped
   */
  private async handleEvent({event, decryptedData, decryptionError}: ProcessedEventPayload, source: EventSource) {
    const validationResult = validateEvent(
      event as {time: string; type: CONVERSATION_EVENT | USER_EVENT},
      source,
      this.lastEventDate(),
    );
    switch (validationResult) {
      default: {
        return event;
      }
      case EventValidation.OUTDATED_TIMESTAMP: {
        this.logger.warn(`Ignored outdated event type: '${event.type}'`);
        return event;
      }
      case EventValidation.VALID:
        let eventToProcess: IncomingEvent | undefined = event;
        if (event.type === CONVERSATION_EVENT.OTR_MESSAGE_ADD || event.type === CONVERSATION_EVENT.MLS_MESSAGE_ADD) {
          eventToProcess = await this.mapEncryptedEvent(event, {decryptedData, decryptionError});
        }
        if (!eventToProcess) {
          return event;
        }

        return this.processEvent(eventToProcess, source);
    }
  }

  private async mapEncryptedEvent(
    event: ConversationOtrMessageAddEvent | ConversationMLSMessageAddEvent,
    {decryptedData, decryptionError}: Pick<HandledEventPayload, 'decryptedData' | 'decryptionError'>,
  ): Promise<IncomingEvent | undefined> {
    if (decryptionError) {
      this.logger.warn(`Decryption Error: (${decryptionError.code}) ${decryptionError.message}`, decryptionError);
      const ignoredCodes = [
        208, // Outated event decyption error (see https://github.com/wireapp/wire-web-core/blob/5c8c56097eadfa55e79856cd6745087f0fd12e24/packages/proteus/README.md#decryption-errors)
        209, // Duplicate event decryption error (see https://github.com/wireapp/wire-web-core/blob/5c8c56097eadfa55e79856cd6745087f0fd12e24/packages/proteus/README.md#decryption-errors)
      ];
      if (decryptionError.code && ignoredCodes.includes(decryptionError.code)) {
        return undefined;
      }
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.E2EE.FAILED_MESSAGE_DECRYPTION, {
        cause: decryptionError.code,
      });
      return EventBuilder.buildUnableToDecrypt(event, decryptionError);
    }
    if (decryptedData) {
      return await new CryptographyMapper().mapGenericMessage(decryptedData, event);
    }
    return undefined;
  }

  /**
   * Decrypts, saves and distributes an event received from the backend.
   *
   * @param event Backend event extracted from notification stream
   * @param source Source of event
   * @returns Resolves with the saved record or `true` if the event was skipped
   */
  private async processEvent(event: IncomingEvent | ClientConversationEvent, source: EventSource) {
    for (const eventProcessMiddleware of this.eventProcessMiddlewares) {
      event = await eventProcessMiddleware.processEvent(event);
    }

    return this.handleEventDistribution(event, source);
  }

  /**
   * Handle a saved event and distribute it.
   *
   * @param event Backend event extracted from notification stream
   * @param source Source of event
   * @returns The distributed event
   */
  private handleEventDistribution(event: IncomingEvent, source: EventSource) {
    const eventDate = this.getIsoDateFromEvent(event);
    const isInjectedEvent = source === EventRepository.SOURCE.INJECTED;
    const canSetEventDate = !isInjectedEvent && eventDate;
    if (canSetEventDate) {
      /*
       * HOTFIX: The "conversation.voice-channel-deactivate" event is the ONLY event which we inject with a source set to WebSocket.
       * This is wrong but changing it will break our current conversation archive functionality (WEBAPP-6435).
       * That's why we need to explicitly list the "conversation.voice-channel-deactivate" here because injected events should NEVER
       * modify the last event timestamp which we use to query the backend's notification stream.
       */
      if (event.type !== ClientEvent.CONVERSATION.VOICE_CHANNEL_DEACTIVATE) {
        this.updateLastEventDate(eventDate as string);
      }
    }
    return this.distributeEvent(event, source);
  }
}
