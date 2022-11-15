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

import {CONVERSATION_EVENT, USER_EVENT} from '@wireapp/api-client/lib/event/';
import {PayloadBundleSource} from '@wireapp/core/lib/conversation';
import {HandledEventPayload} from '@wireapp/core/lib/notification';
import {amplify} from 'amplify';
import ko from 'knockout';
import {container} from 'tsyringe';

import {Account, ConnectionState, ProcessedEventPayload} from '@wireapp/core';
import {Asset as ProtobufAsset, GenericMessage} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {getLogger, Logger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {ClientEvent} from './Client';
import type {EventService} from './EventService';
import {EventSource} from './EventSource';
import {EVENT_TYPE} from './EventType';
import {EventTypeHandling} from './EventTypeHandling';
import {EventValidation} from './EventValidation';
import {validateEvent} from './EventValidator';
import {NOTIFICATION_HANDLING_STATE} from './NotificationHandlingState';
import type {NotificationService} from './NotificationService';

import {AssetTransferState} from '../assets/AssetTransferState';
import type {ClientEntity} from '../client/ClientEntity';
import {EventBuilder} from '../conversation/EventBuilder';
import {AssetData, CryptographyMapper} from '../cryptography/CryptographyMapper';
import {CryptographyError} from '../error/CryptographyError';
import {EventError} from '../error/EventError';
import {categoryFromEvent} from '../message/MessageCategorization';
import type {EventRecord} from '../storage';
import type {ServerTimeHandler} from '../time/serverTimeHandler';
import {EventName} from '../tracking/EventName';
import {UserState} from '../user/UserState';
import {Warnings} from '../view_model/WarningsContainer';

export class EventRepository {
  logger: Logger;
  currentClient: ko.Observable<ClientEntity> | undefined;
  notificationHandlingState: ko.Observable<NOTIFICATION_HANDLING_STATE>;
  previousHandlingState: NOTIFICATION_HANDLING_STATE | undefined;
  notificationsHandled: number;
  notificationsTotal: number;
  lastEventDate: ko.Observable<string | undefined>;
  eventProcessMiddlewares: Function[];

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

    this.currentClient = undefined;

    this.notificationHandlingState = ko.observable(NOTIFICATION_HANDLING_STATE.STREAM);
    this.notificationHandlingState.subscribe(handling_state => {
      amplify.publish(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, handling_state);
    });
    this.notificationsHandled = 0;
    this.notificationsTotal = 0;

    this.lastEventDate = ko.observable();

    this.eventProcessMiddlewares = [];
  }

  /**
   * Will set a middleware to run before the EventRepository actually processes the event.
   * Middleware is just a function with the following signature (Event) => Promise<Event>.
   *
   * @param middlewares middlewares to run when a new event is about to be processed
   */
  setEventProcessMiddlewares(middlewares: Function[]) {
    this.eventProcessMiddlewares = middlewares;
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

  private readonly handleIncomingEvent = async (payload: HandledEventPayload, source: PayloadBundleSource) => {
    try {
      await this.handleEvent({...payload, event: payload.event as EventRecord}, source);
    } catch (error) {
      if (source === EventSource.NOTIFICATION_STREAM) {
        this.logger.warn(`Failed to handle event of type "${event.type}": ${error.message}`, error);
      } else {
        throw error;
      }
    }
  };

  /**
   * connects to the websocket with the given account
   *
   * @param account the account to connect to
   * @param onNotificationStreamProgress callback when a notification for the notification stream has been processed
   * @returns Resolves when the notification stream has fully been processed
   */
  async connectWebSocket(
    account: Account,
    onNotificationStreamProgress: (progress: {done: number; total: number}) => void,
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

  private getIsoDateFromEvent(event: EventRecord, defaultValue = false): string | void {
    const {client, connection, time: eventDate, type: eventType} = event;

    if (eventDate) {
      return eventDate;
    }

    const isTypeUserClientAdd = eventType === USER_EVENT.CLIENT_ADD;
    if (isTypeUserClientAdd) {
      return client.time;
    }

    const isTypeUserConnection = eventType === USER_EVENT.CONNECTION;
    if (isTypeUserConnection) {
      return connection.lastUpdate;
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

  /**
   * Inject event into a conversation.
   * @note Don't add unable to decrypt to self conversation
   *
   * @param event Event payload to be injected
   * @param source Source of injection
   * @returns Resolves when the event has been processed
   */
  async injectEvent(event: EventRecord, source: EventSource = EventSource.INJECTED): Promise<EventRecord | undefined> {
    if (!event) {
      throw new EventError(EventError.TYPE.NO_EVENT, EventError.MESSAGE.NO_EVENT);
    }

    const isHandlingWebSocket = this.notificationHandlingState() === NOTIFICATION_HANDLING_STATE.WEB_SOCKET;
    if (!isHandlingWebSocket) {
      source = EventRepository.SOURCE.INJECTED;
    }

    const {conversation: conversationId, id = 'ID not specified', type} = event;
    const inSelfConversation = conversationId === this.userState.self().id;
    if (!inSelfConversation) {
      this.logger.info(`Injected event ID '${id}' of type '${type}' with source '${source}'`, event);
      return this.handleEvent({event}, source);
    }
    return event;
  }

  /**
   * Distribute the given event.
   *
   * @param event Mapped event to be distributed
   * @param source Source of notification
   */
  private async distributeEvent(event: EventRecord, source: EventSource): Promise<EventRecord> {
    const {conversation: conversationId, from: userId, type} = event;

    const hasIds = conversationId && userId;
    const logMessage = hasIds
      ? `Distributed '${type}' event for conversation '${conversationId}' from user '${userId}'`
      : `Distributed '${type}' event`;
    this.logger.info(logMessage, event);

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
  private handleEvent(
    {event, decryptedData, decryptionError}: Omit<ProcessedEventPayload, 'event'> & {event: EventRecord},
    source: EventSource,
  ): Promise<EventRecord | undefined> {
    const logObject = {eventJson: JSON.stringify(event), eventObject: event};
    const validationResult = validateEvent(
      event as {time: string; type: CONVERSATION_EVENT | USER_EVENT},
      source,
      this.lastEventDate(),
    );
    switch (validationResult) {
      default: {
        return Promise.resolve(event as EventRecord);
      }
      case EventValidation.OUTDATED_TIMESTAMP: {
        this.logger.info(`Ignored outdated event type: '${event.type}'`, logObject);
        return Promise.resolve(event as EventRecord);
      }
      case EventValidation.VALID:
        return this.processEvent(event as EventRecord, source, decryptedData, decryptionError);
    }
  }

  /**
   * Decrypts, saves and distributes an event received from the backend.
   *
   * @param event Backend event extracted from notification stream
   * @param source Source of event
   * @returns Resolves with the saved record or `true` if the event was skipped
   */
  private async processEvent(
    event: EventRecord,
    source: EventSource,
    decryptedData?: GenericMessage,
    decryptionError?: HandledEventPayload['decryptionError'],
  ): Promise<EventRecord | undefined> {
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
      event = EventBuilder.buildUnableToDecrypt(event, decryptionError);
    }
    if (decryptedData) {
      event = await new CryptographyMapper().mapGenericMessage(decryptedData, event);
    }
    for (const eventProcessMiddleware of this.eventProcessMiddlewares) {
      event = await eventProcessMiddleware(event);
    }

    const shouldSaveEvent = EventTypeHandling.STORE.includes(event.type as CONVERSATION_EVENT);
    if (shouldSaveEvent) {
      const savedEvent = await this.handleEventSaving(event);
      event = savedEvent ?? event;
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
  private handleEventDistribution(event: EventRecord, source: EventSource): Promise<EventRecord> {
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

  /**
   * Handle a mapped event, check for malicious ID use and save it.
   *
   * @param event Backend event extracted from notification stream
   * @returns Resolves with the saved event
   */
  private handleEventSaving(event: EventRecord): Promise<EventRecord | undefined> {
    const conversationId = event.conversation;
    const mappedData = event.data || {};

    // first check if a message that should be replaced exists in DB
    const findEventToReplacePromise = mappedData.replacing_message_id
      ? this.eventService.loadEvent(conversationId, mappedData.replacing_message_id)
      : Promise.resolve();

    return (findEventToReplacePromise as Promise<EventRecord>).then((eventToReplace: EventRecord) => {
      const hasLinkPreview = mappedData.previews && mappedData.previews.length;
      const isReplacementWithoutOriginal = !eventToReplace && mappedData.replacing_message_id;
      if (isReplacementWithoutOriginal && !hasLinkPreview) {
        // the only valid case of a replacement with no original message is when an edited message gets a link preview
        this.throwValidationError(event, 'Edit event without original event');
      }

      const handleEvent = (newEvent: EventRecord) => {
        // check for duplicates (same id)
        const loadEventPromise = newEvent.id
          ? this.eventService.loadEvent(conversationId, newEvent.id)
          : Promise.resolve(undefined);

        return loadEventPromise.then((storedEvent?: EventRecord) => {
          return storedEvent
            ? this.handleDuplicatedEvent(storedEvent, newEvent)
            : this.eventService.saveEvent(newEvent);
        });
      };

      return eventToReplace ? this.handleEventReplacement(eventToReplace, event) : handleEvent(event);
    });
  }

  private handleEventReplacement(originalEvent: EventRecord, newEvent: EventRecord): Promise<EventRecord> {
    const newData = newEvent.data || {};
    if (originalEvent.data.from !== newData.from) {
      const logMessage = `ID previously used by user '${newEvent.from}'`;
      const errorMessage = 'ID reused by other user';
      this.throwValidationError(newEvent, errorMessage, logMessage);
    }
    const primaryKeyUpdate = {primary_key: originalEvent.primary_key};
    const isLinkPreviewEdit = newData.previews && !!newData.previews.length;

    const commonUpdates = EventRepository.getCommonMessageUpdates(originalEvent, newEvent);

    const specificUpdates = isLinkPreviewEdit
      ? this.getUpdatesForLinkPreview(originalEvent, newEvent)
      : EventRepository.getUpdatesForEditMessage(originalEvent, newEvent);

    const updates = {...specificUpdates, ...commonUpdates};

    const identifiedUpdates = {...primaryKeyUpdate, ...updates};
    return this.eventService.replaceEvent(identifiedUpdates);
  }

  private handleDuplicatedEvent(originalEvent: EventRecord, newEvent: EventRecord) {
    switch (newEvent.type) {
      case ClientEvent.CONVERSATION.ASSET_ADD:
        return this.handleAssetUpdate(originalEvent, newEvent);

      case ClientEvent.CONVERSATION.MESSAGE_ADD:
        return this.handleLinkPreviewUpdate(originalEvent, newEvent);

      default:
        this.throwValidationError(newEvent, `Forbidden type '${newEvent.type}' for duplicate events`);
    }
  }

  private async handleAssetUpdate(
    originalEvent: EventRecord<AssetData>,
    newEvent: EventRecord<AssetData>,
  ): Promise<EventRecord> {
    const newEventData = newEvent.data;
    // the preview status is not sent by the client so we fake a 'preview' status in order to cleanly handle it in the switch statement
    const ASSET_PREVIEW = 'preview';
    const isPreviewEvent = !newEventData.status && !!newEventData.preview_key;
    const previewStatus = isPreviewEvent ? ASSET_PREVIEW : newEventData.status;

    switch (previewStatus) {
      case ASSET_PREVIEW:
      case AssetTransferState.UPLOADED: {
        const updatedData = {...originalEvent.data, ...newEventData};
        const updatedEvent = {...originalEvent, data: updatedData};
        return this.eventService.replaceEvent(updatedEvent);
      }

      case AssetTransferState.UPLOAD_FAILED: {
        // case of both failed or canceled upload
        const fromOther = newEvent.from !== this.userState.self().id;
        const sameSender = newEvent.from === originalEvent.from;
        const selfCancel = !fromOther && newEvent.data.reason === ProtobufAsset.NotUploaded.CANCELLED;
        // we want to delete the event in the case of an error from the remote client or a cancel on the user's own client
        const shouldDeleteEvent = (fromOther || selfCancel) && sameSender;
        if (shouldDeleteEvent) {
          await this.eventService.deleteEvent(newEvent.conversation, newEvent.id);
          return newEvent;
        }
        return this.eventService.updateEventAsUploadFailed(originalEvent.primary_key, newEvent.data.reason);
      }

      default: {
        this.throwValidationError(newEvent, `Unhandled asset status update '${newEvent.data.status}'`);
      }
    }
  }

  private handleLinkPreviewUpdate(originalEvent: EventRecord, newEvent: EventRecord): Promise<EventRecord> {
    const newEventData = newEvent.data;
    const originalData = originalEvent.data;
    if (originalEvent.from !== newEvent.from) {
      const logMessage = `ID previously used by user '${newEvent.from}'`;
      const errorMessage = 'ID reused by other user';
      return this.throwValidationError(newEvent, errorMessage, logMessage);
    }

    const containsLinkPreview = newEventData.previews && !!newEventData.previews.length;
    if (!containsLinkPreview) {
      const errorMessage = 'Link preview event does not contain previews';
      return this.throwValidationError(newEvent, errorMessage);
    }

    const textContentMatches = newEventData.content === originalData.content;
    if (!textContentMatches) {
      const errorMessage = 'ID of link preview reused';
      const logMessage = 'Text content for link preview not matching';
      return this.throwValidationError(newEvent, errorMessage, logMessage);
    }

    const bothAreMessageAddType = newEvent.type === originalEvent.type;
    if (!bothAreMessageAddType) {
      return this.throwValidationError(newEvent, 'ID reused by same user');
    }

    const updates = this.getUpdatesForLinkPreview(originalEvent, newEvent);
    const identifiedUpdates = {primary_key: originalEvent.primary_key, ...updates};
    return this.eventService.replaceEvent(identifiedUpdates);
  }

  private static getCommonMessageUpdates(originalEvent: EventRecord, newEvent: EventRecord) {
    return {
      ...newEvent,
      data: {...newEvent.data, expects_read_confirmation: originalEvent.data.expects_read_confirmation},
      edited_time: newEvent.time,
      read_receipts: !newEvent.read_receipts ? originalEvent.read_receipts : newEvent.read_receipts,
      status: !newEvent.status || newEvent.status < originalEvent.status ? originalEvent.status : newEvent.status,
      time: originalEvent.time,
      version: 1,
    };
  }

  private static getUpdatesForEditMessage(
    originalEvent: EventRecord,
    newEvent: EventRecord,
  ): EventRecord & {reactions: {}} {
    // Remove reactions, so that likes (hearts) don't stay when a message's text gets edited
    return {...newEvent, reactions: {}};
  }

  private getUpdatesForLinkPreview(originalEvent: EventRecord, newEvent: EventRecord): EventRecord {
    const newData = newEvent.data;
    const originalData = originalEvent.data;
    const updatingLinkPreview = !!originalData.previews.length;
    if (updatingLinkPreview) {
      this.throwValidationError(newEvent, 'ID of link preview reused');
    }

    const textContentMatches = !newData.previews.length || newData.content === originalData.content;
    if (!textContentMatches) {
      const logMessage = 'Text content for link preview not matching';
      const errorMessage = 'ID of link preview reused';
      this.throwValidationError(newEvent, errorMessage, logMessage);
    }

    return {
      ...newEvent,
      category: categoryFromEvent(newEvent),
      ephemeral_expires: originalEvent.ephemeral_expires,
      ephemeral_started: originalEvent.ephemeral_started,
      ephemeral_time: originalEvent.ephemeral_time,
      server_time: newEvent.time,
      time: originalEvent.time,
      version: originalEvent.version,
    };
  }

  private throwValidationError(event: EventRecord, errorMessage: string, logMessage?: string): never {
    const baseLogMessage = `Ignored '${event.type}' (${event.id || 'no ID'}) in '${event.conversation}' from '${
      event.from
    }':'`;
    const baseErrorMessage = 'Event validation failed:';
    this.logger.warn(`${baseLogMessage} ${logMessage || errorMessage}`, event);
    throw new EventError(EventError.TYPE.VALIDATION_FAILED, `${baseErrorMessage} ${errorMessage}`);
  }
}
