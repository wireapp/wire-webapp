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

window.z = window.z || {};
window.z.event = z.event || {};

z.event.EventRepository = class EventRepository {
  static get CONFIG() {
    return {
      E_CALL_EVENT_LIFETIME: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND * 30,
      IGNORED_ERRORS: [
        z.error.CryptographyError.TYPE.IGNORED_ASSET,
        z.error.CryptographyError.TYPE.IGNORED_PREVIEW,
        z.error.CryptographyError.TYPE.PREVIOUSLY_STORED,
        z.error.CryptographyError.TYPE.UNHANDLED_TYPE,
        z.error.EventError.TYPE.OUTDATED_E_CALL_EVENT,
        z.error.EventError.TYPE.VALIDATION_FAILED,
      ],
      NOTIFICATION_BATCHES: {
        INITIAL: 500,
        MAX: 10000,
        SUBSEQUENT: 5000,
      },
    };
  }

  static get SOURCE() {
    return {
      BACKEND_RESPONSE: 'backend_response',
      INJECTED: 'injected',
      STREAM: 'Notification Stream',
      WEB_SOCKET: 'WebSocket',
    };
  }

  /**
   * Construct a new Event Repository.
   *
   * @param {z.event.EventService} eventService - Service that handles interactions with events
   * @param {z.event.NotificationService} notificationService - Service handling the notification stream
   * @param {z.event.WebSocketService} webSocketService - Service that connects to WebSocket
   * @param {z.conversation.ConversationService} conversationService - Service to handle conversation related tasks
   * @param {z.cryptography.CryptographyRepository} cryptographyRepository - Repository for all cryptography interactions
   * @param {z.time.ServerTimeRepository} serverTimeRepository - Handles time shift between server and client
   * @param {z.user.UserRepository} userRepository - Repository for all user interactions
   */
  constructor(
    eventService,
    notificationService,
    webSocketService,
    conversationService,
    cryptographyRepository,
    serverTimeRepository,
    userRepository
  ) {
    this.eventService = eventService;
    this.notificationService = notificationService;
    this.webSocketService = webSocketService;
    this.conversationService = conversationService;
    this.cryptographyRepository = cryptographyRepository;
    this.serverTimeRepository = serverTimeRepository;
    this.userRepository = userRepository;
    this.logger = new z.util.Logger('z.event.EventRepository', z.config.LOGGER.OPTIONS);

    this.currentClient = undefined;

    this.notificationHandlingState = ko.observable(z.event.NOTIFICATION_HANDLING_STATE.STREAM);
    this.notificationHandlingState.subscribe(handling_state => {
      amplify.publish(z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, handling_state);

      const isHandlingWebSocket = handling_state === z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;
      if (isHandlingWebSocket) {
        this._handleBufferedNotifications();
        const previouslyHandlingRecovery = this.previousHandlingState === z.event.NOTIFICATION_HANDLING_STATE.RECOVERY;
        if (previouslyHandlingRecovery) {
          amplify.publish(z.event.WebApp.WARNING.DISMISS, z.viewModel.WarningsViewModel.TYPE.CONNECTIVITY_RECOVERY);
        }
      }
      this.previousHandlingState = handling_state;
    });

    this.previousHandlingState = this.notificationHandlingState();

    this.notificationsHandled = 0;
    this.notificationsLoaded = ko.observable(false);
    this.notificationsPromises = undefined;
    this.notificationsTotal = 0;
    this.notificationsQueue = ko.observableArray([]);
    this.notificationsBlocked = false;

    this.loadEvent = this.eventService.loadEvent.bind(this.eventService);

    this.notificationsQueue.subscribe(notifications => {
      if (notifications.length) {
        if (this.notificationsBlocked) {
          return;
        }

        const [notification] = notifications;
        this.notificationsBlocked = true;

        return this._handleNotification(notification)
          .catch(error => {
            const errorMessage = `We failed to handle a notification but will continue with queue: ${error.message}`;
            this.logger.warn(errorMessage, error);
          })
          .then(() => {
            this.notificationsBlocked = false;
            this.notificationsQueue.shift();
            this.notificationsHandled++;

            const isHandlingStream = this.notificationHandlingState() === z.event.NOTIFICATION_HANDLING_STATE.STREAM;
            if (isHandlingStream) {
              this._updateProgress();
            }
          });
      }

      const isHandlingWebSocket = this.notificationHandlingState() === z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;
      if (this.notificationsLoaded() && !isHandlingWebSocket) {
        this.logger.info(`Done handling '${this.notificationsTotal}' notifications from the stream`);
        this.notificationHandlingState(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
        this.notificationsLoaded(false);
        this.notificationsPromises[0](this.lastNotificationId());
      }
    });

    this.webSocketBuffer = [];

    this.lastNotificationId = ko.observable();
    this.lastEventDate = ko.observable();

    this.eventProcessMiddlewares = [];

    amplify.subscribe(z.event.WebApp.CONNECTION.ONLINE, this.recoverFromStream.bind(this));
  }

  /**
   * Will set a middleware to run before the EventRepository actually processes the event.
   * Middleware is just a function with the following signature (Event) => Promise<Event>.
   *
   * @param {Array<Function>} middlewares - middlewares to run when a new event is about to be processed
   * @returns {void} - returns nothing
   */
  setEventProcessMiddlewares(middlewares) {
    this.eventProcessMiddlewares = middlewares;
  }

  //##############################################################################
  // WebSocket handling
  //##############################################################################

  /**
   * Initiate the WebSocket connection.
   * @returns {undefined} No return value
   */
  connectWebSocket() {
    if (!this.currentClient().id) {
      throw new z.error.EventError(z.error.EventError.TYPE.NO_CLIENT_ID);
    }

    this.webSocketService.clientId = this.currentClient().id;
    this.webSocketService.connect(notification => {
      const isHandlingWebSocket = this.notificationHandlingState() === z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;
      if (isHandlingWebSocket) {
        return this.notificationsQueue.push(notification);
      }
      this._bufferWebSocketNotification(notification);
    });
  }

  /**
   * Close the WebSocket connection.
   * @param {z.event.WebSocketService.CHANGE_TRIGGER} trigger - Trigger of the disconnect
   * @returns {undefined} No return value
   */
  disconnectWebSocket(trigger) {
    this.webSocketService.reset(trigger);
  }

  /**
   * Re-connect the WebSocket connection.
   * @param {z.event.WebSocketService.CHANGE_TRIGGER} trigger - Trigger of the reconnect
   * @returns {undefined} No return value
   */
  reconnectWebSocket(trigger) {
    this.notificationHandlingState(z.event.NOTIFICATION_HANDLING_STATE.RECOVERY);
    this.webSocketService.reconnect(trigger);
  }

  /**
   * Buffer an incoming notification.
   * @param {Object} notification - Notification data
   * @returns {undefined} No return value
   */
  _bufferWebSocketNotification(notification) {
    this.webSocketBuffer.push(notification);
  }

  /**
   * Handle buffered notifications.
   * @returns {undefined} No return value
   */
  _handleBufferedNotifications() {
    this.logger.info(`Received '${this.webSocketBuffer.length}' notifications via WebSocket while handling stream`);
    if (this.webSocketBuffer.length) {
      z.util.koArrayPushAll(this.notificationsQueue, this.webSocketBuffer);
      this.webSocketBuffer.length = 0;
    }
  }

  //##############################################################################
  // Notification Stream handling
  //##############################################################################

  /**
   * Get notifications for the current client from the stream.
   *
   * @param {string} notificationId - Event ID to start from
   * @param {number} [limit=EventRepository.CONFIG.NOTIFICATION_BATCHES.MAX] - Max. number of notifications to retrieve from backend at once
   * @returns {Promise} Resolves when all new notifications from the stream have been handled
   */
  getNotifications(notificationId, limit = EventRepository.CONFIG.NOTIFICATION_BATCHES.MAX) {
    return new Promise((resolve, reject) => {
      const _gotNotifications = ({has_more: hasAdditionalNotifications, notifications, time}) => {
        if (time) {
          this.serverTimeRepository.computeTimeOffset(time);
        }

        if (notifications.length > 0) {
          notificationId = notifications[notifications.length - 1].id;

          this.logger.info(`Added '${notifications.length}' notifications to the queue`);
          z.util.koArrayPushAll(this.notificationsQueue, notifications);

          if (!this.notificationsPromises) {
            this.notificationsPromises = [resolve, reject];
          }

          this.notificationsTotal += notifications.length;

          if (hasAdditionalNotifications) {
            return this.getNotifications(notificationId, EventRepository.CONFIG.NOTIFICATION_BATCHES.SUBSEQUENT);
          }

          this.notificationsLoaded(true);
          this.logger.info(`Fetched '${this.notificationsTotal}' notifications from the backend`);
          return notificationId;
        }
        this.logger.info(`No notifications found since '${notificationId}'`);
        return reject(new z.error.EventError(z.error.EventError.TYPE.NO_NOTIFICATIONS));
      };

      return this.notificationService
        .getNotifications(this.currentClient().id, notificationId, limit)
        .then(_gotNotifications)
        .catch(errorResponse => {
          // When asking for notifications with a since set to a notification ID that does not belong to our client ID,
          // we will get a 404 AND notifications
          if (errorResponse.notifications) {
            this._missedEventsFromStream();
            return _gotNotifications(errorResponse);
          }

          const isNotFound = errorResponse.code === z.error.BackendClientError.STATUS_CODE.NOT_FOUND;
          if (isNotFound) {
            this.logger.info(`No notifications found since '${notificationId}'`, errorResponse);
            return reject(new z.error.EventError(z.error.EventError.TYPE.NO_NOTIFICATIONS));
          }

          this.logger.error(`Failed to get notifications: ${errorResponse.message}`, errorResponse);
          return reject(new z.error.EventError(z.error.EventError.TYPE.REQUEST_FAILURE));
        });
    });
  }

  /**
   * Get the last notification.
   * @returns {Promise} Resolves with the last handled notification ID
   */
  getStreamState() {
    return this.notificationService
      .getLastNotificationIdFromDb()
      .catch(error => {
        const isNoLastId = error.type === z.error.EventError.TYPE.NO_LAST_ID;
        if (!isNoLastId) {
          throw error;
        }

        this.logger.warn('Last notification ID not found in database. Resetting...');
        return this.setStreamState(this.currentClient().id).then(() => {
          this._missedEventsFromStream();
          return this.lastNotificationId();
        });
      })
      .then(notificationId => {
        this.lastNotificationId(notificationId);
        return this.notificationService.getLastEventDateFromDb();
      })
      .then(eventDate => this.lastEventDate(eventDate))
      .catch(error => {
        const isNoLastDate = error.type === z.error.EventError.TYPE.NO_LAST_DATE;
        if (!isNoLastDate) {
          throw error;
        }

        this.logger.warn('Last event date not found in database. Resetting...');
        this.lastEventDate(new Date(0).toISOString());
      })
      .then(() => ({eventDate: this.lastEventDate(), notificationId: this.lastNotificationId()}));
  }

  /**
   * Set state for notification stream.
   * @returns {Promise} Resolves when all notifications have been handled
   */
  initializeFromStream() {
    return this.getStreamState()
      .then(({notificationId}) => this._updateFromStream(notificationId))
      .catch(error => {
        this.notificationHandlingState(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);

        const isNoLastId = error.type === z.error.EventError.TYPE.NO_LAST_ID;
        if (isNoLastId) {
          this.logger.info('No notifications found for this user', error);
          return 0;
        }

        throw error;
      });
  }

  /**
   * Retrieve missed notifications from the stream after a connectivity loss.
   * @returns {Promise} Resolves when all missed notifications have been handled
   */
  recoverFromStream() {
    this.notificationHandlingState(z.event.NOTIFICATION_HANDLING_STATE.RECOVERY);
    amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.CONNECTIVITY_RECOVERY);

    return this._updateFromStream(this._getLastKnownNotificationId())
      .then(numberOfNotifications => {
        this.logger.info(`Retrieved '${numberOfNotifications}' notifications from stream after connectivity loss`);
      })
      .catch(error => {
        const isNoNotifications = error.type === z.error.EventError.TYPE.NO_NOTIFICATIONS;
        if (!isNoNotifications) {
          this.logger.error(`Failed to recover from notification stream: ${error.message}`, error);
          this.notificationHandlingState(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
          // @todo What do we do in this case?
          amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT);
        }
      });
  }

  /**
   * Get the last notification ID and set event date for a given client.
   *
   * @param {string} clientId - Client ID to retrieve last notification ID for
   * @param {boolean} [isInitialization=false] - Set initial date to 0 if not found
   * @returns {Promise} Resolves when stream state has been initialized
   */
  setStreamState(clientId, isInitialization = false) {
    return this.notificationService.getNotificationsLast(clientId).then(({id: notificationId, payload}) => {
      const [event] = payload;
      const isoDateString = this._getIsoDateFromEvent(event, isInitialization);

      if (notificationId) {
        const logMessage = isoDateString
          ? `Set starting point on notification stream to '${notificationId}' (isoDateString)`
          : `Reset starting point on notification stream to '${notificationId}'`;
        this.logger.info(logMessage);

        return Promise.all([this._updateLastEventDate(isoDateString), this._updateLastNotificationId(notificationId)]);
      }
    });
  }

  _getIsoDateFromEvent(event, defaultValue = false) {
    const {client, connection, time: eventDate, type: eventType} = event;

    if (eventDate) {
      return eventDate;
    }

    const isTypeUserClientAdd = eventType === z.event.Backend.USER.CLIENT_ADD;
    if (isTypeUserClientAdd) {
      return client.time;
    }

    const isTypeUserConnection = eventType === z.event.Backend.USER.CONNECTION;
    if (isTypeUserConnection) {
      return connection.lastUpdate;
    }

    if (defaultValue) {
      return new Date(0).toISOString();
    }
  }

  /**
   * Get the ID of the last known notification.
   * @note Notifications that have not yet been handled but are in the queue should not be fetched again on recovery
   *
   * @private
   * @returns {string} ID of last known notification
   */
  _getLastKnownNotificationId() {
    return this.notificationsQueue().length
      ? this.notificationsQueue()[this.notificationsQueue().length - 1].id
      : this.lastNotificationId();
  }

  _missedEventsFromStream() {
    this.notificationService.getMissedIdFromDb().then(notificationId => {
      const lastNotificationIdEqualsMissedId = this.lastNotificationId() === notificationId;
      if (!lastNotificationIdEqualsMissedId) {
        amplify.publish(z.event.WebApp.CONVERSATION.MISSED_EVENTS);
        this.notificationService.saveMissedIdToDb(this.lastNotificationId());
      }
    });
  }

  /**
   * Fetch all missed events from the notification stream since the given last notification ID.
   *
   * @private
   * @param {string} lastNotificationId - Last known notification ID to start update from
   * @returns {Promise} Resolves with the total number of notifications
   */
  _updateFromStream(lastNotificationId) {
    this.notificationsTotal = 0;

    return this.getNotifications(lastNotificationId, EventRepository.CONFIG.NOTIFICATION_BATCHES.INITIAL)
      .then(updatedLastNotificationId => {
        if (updatedLastNotificationId) {
          this.logger.info(`ID of last notification fetched from stream is '${updatedLastNotificationId}'`);
        }
        return this.notificationsTotal;
      })
      .catch(error => {
        this.notificationHandlingState(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);

        const isNoNotifications = error.type === z.error.EventError.TYPE.NO_NOTIFICATIONS;
        if (isNoNotifications) {
          this.logger.info('No notifications found for this user', error);
          return 0;
        }

        this.logger.error(`Failed to handle notification stream: ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Persist updated last event timestamp.
   *
   * @private
   * @param {string} eventDate - Updated last event date
   * @returns {Promise} Resolves when the last event date was stored
   */
  _updateLastEventDate(eventDate) {
    const didDateIncrease = eventDate > this.lastEventDate();
    if (didDateIncrease) {
      this.lastEventDate(eventDate);
      return this.notificationService.saveLastEventDateToDb(eventDate);
    }
  }

  /**
   * Persist updated last notification ID.
   *
   * @private
   * @param {string} notificationId - Updated last notification ID
   * @returns {Promise} Resolves when the last notification ID was stored
   */
  _updateLastNotificationId(notificationId) {
    if (notificationId) {
      this.lastNotificationId(notificationId);
      return this.notificationService.saveLastNotificationIdToDb(notificationId);
    }
  }

  _updateProgress() {
    if (this.notificationsHandled % 5 === 0 || this.notificationsHandled < 5) {
      const content = {
        handled: this.notificationsHandled,
        total: this.notificationsTotal,
      };
      const progress = (this.notificationsHandled / this.notificationsTotal) * 50 + 25;

      amplify.publish(z.event.WebApp.APP.UPDATE_PROGRESS, progress, z.string.initDecryption, content);
    }
  }

  //##############################################################################
  // Notification/Event handling
  //##############################################################################

  /**
   * Inject event into a conversation.
   * @note Don't add unable to decrypt to self conversation
   *
   * @param {Object} event - Event payload to be injected
   * @param {z.event.EventRepository.SOURCE} [source=EventRepository.SOURCE.INJECTED] - Source of injection
   * @returns {Promise<Event>} Resolves when the event has been processed
   */
  injectEvent(event, source = EventRepository.SOURCE.INJECTED) {
    if (!event) {
      throw new z.error.EventError(z.error.EventError.TYPE.NO_EVENT);
    }

    const isHandlingWebSocket = this.notificationHandlingState() === z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;
    if (!isHandlingWebSocket) {
      source = EventRepository.SOURCE.INJECTED;
    }

    const {conversation: conversationId, id = 'ID not specified', type} = event;
    const inSelfConversation = conversationId === this.userRepository.self().id;
    if (!inSelfConversation) {
      this.logger.info(`Injected event ID '${id}' of type '${type}'`, event);
      return this._handleEvent(event, source);
    }
    return Promise.resolve(event);
  }

  /**
   * Distribute the given event.
   *
   * @private
   * @param {Object} event - Mapped event to be distributed
   * @param {z.event.EventRepository.SOURCE} source - Source of notification
   * @returns {undefined} No return value
   */
  _distributeEvent(event, source) {
    const {conversation: conversationId, from: userId, type} = event;

    const hasIds = conversationId && userId;
    const logMessage = hasIds
      ? `Distributed '${type}' event for conversation '${conversationId}' from user '${userId}'`
      : `Distributed '${type}' event`;
    this.logger.info(logMessage, event);

    const [category] = type.split('.');
    switch (category) {
      case z.event.EVENT_TYPE.CALL:
        amplify.publish(z.event.WebApp.CALL.EVENT_FROM_BACKEND, event, source);
        break;
      case z.event.EVENT_TYPE.CONVERSATION:
        amplify.publish(z.event.WebApp.CONVERSATION.EVENT_FROM_BACKEND, event, source);
        break;
      case z.event.EVENT_TYPE.TEAM:
        amplify.publish(z.event.WebApp.TEAM.EVENT_FROM_BACKEND, event, source);
        break;
      case z.event.EVENT_TYPE.USER:
        amplify.publish(z.event.WebApp.USER.EVENT_FROM_BACKEND, event, source);
        break;
      default:
        amplify.publish(type, event, source);
    }
  }

  /**
   * Handle a single event from the notification stream or WebSocket.
   *
   * @private
   * @param {JSON} event - Backend event extracted from notification stream
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {Promise} Resolves with the saved record or boolean true if the event was skipped
   */
  _handleEvent(event, source) {
    return this._handleEventValidation(event, source)
      .then(validatedEvent => this.processEvent(validatedEvent, source))
      .catch(error => {
        const isIgnoredError = EventRepository.CONFIG.IGNORED_ERRORS.includes(error.type);
        if (!isIgnoredError) {
          throw error;
        }

        return event;
      });
  }

  /**
   * Decrypts, saves and distributes an event received from the backend.
   *
   * @param {JSON} event - Backend event extracted from notification stream
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {Promise} Resolves with the saved record or boolean true if the event was skipped
   */
  processEvent(event, source) {
    const isEncryptedEvent = event.type === z.event.Backend.CONVERSATION.OTR_MESSAGE_ADD;
    const mapEvent = isEncryptedEvent
      ? this.cryptographyRepository.handleEncryptedEvent(event)
      : Promise.resolve(event);

    return mapEvent
      .then(mappedEvent => {
        return this.eventProcessMiddlewares.reduce((eventPromise, middleware) => {
          // use reduce to resolve promises sequentially
          // see https://hackernoon.com/functional-javascript-resolving-promises-sequentially-7aac18c4431e
          return eventPromise.then(middleware);
        }, Promise.resolve(mappedEvent));
      })
      .then(mappedEvent => {
        const shouldSaveEvent = z.event.EventTypeHandling.STORE.includes(mappedEvent.type);
        return shouldSaveEvent ? this._handleEventSaving(mappedEvent, source) : mappedEvent;
      })
      .then(savedEvent => this._handleEventDistribution(savedEvent, source));
  }

  /**
   * Handle a saved event and distribute it.
   *
   * @private
   * @param {JSON} event - Backend event extracted from notification stream
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {JSON} The distributed event
   */
  _handleEventDistribution(event, source) {
    const eventDate = this._getIsoDateFromEvent(event);
    const isInjectedEvent = source === EventRepository.SOURCE.INJECTED;
    const canSetEventDate = !isInjectedEvent && eventDate;
    if (canSetEventDate) {
      this._updateLastEventDate(eventDate);
    }

    const isCallEvent = event.type === z.event.Client.CALL.E_CALL;
    if (isCallEvent) {
      this._validateCallEventLifetime(event);
    }

    this._distributeEvent(event, source);

    return event;
  }

  /**
   * Handle a mapped event, check for malicious ID use and save it.
   *
   * @private
   * @param {JSON} event - Backend event extracted from notification stream
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {Promise} Resolves with the saved event
   */
  _handleEventSaving(event, source) {
    const conversationId = event.conversation;
    const mappedData = event.data || {};

    // first check if a message that should be replaced exists in DB
    const findEventToReplacePromise = mappedData.replacing_message_id
      ? this.eventService.loadEvent(conversationId, mappedData.replacing_message_id)
      : Promise.resolve();

    return findEventToReplacePromise.then(eventToReplace => {
      const hasLinkPreview = mappedData.previews && mappedData.previews.length;
      const isReplacementWithoutOriginal = !eventToReplace && mappedData.replacing_message_id;
      if (isReplacementWithoutOriginal && !hasLinkPreview) {
        // the only valid case of a replacement with no original message is when an edited message gets a link preview
        this._throwValidationError(event, 'Edit event without original event');
      }

      const handleEvent = newEvent => {
        // check for duplicates (same id)
        const loadEventPromise = newEvent.id
          ? this.eventService.loadEvent(conversationId, newEvent.id)
          : Promise.resolve();

        return loadEventPromise.then(storedEvent => {
          return storedEvent
            ? this._handleDuplicatedEvent(storedEvent, newEvent)
            : this.eventService.saveEvent(newEvent);
        });
      };

      return eventToReplace ? this._handleEventReplacement(eventToReplace, event) : handleEvent(event);
    });
  }

  _handleEventReplacement(originalEvent, newEvent) {
    const newData = newEvent.data || {};
    if (originalEvent.data.from !== newData.from) {
      const logMessage = `ID previously used by user '${newEvent.from}'`;
      const errorMessage = 'ID reused by other user';
      this._throwValidationError(newEvent, errorMessage, logMessage);
    }
    const primaryKeyUpdate = {primary_key: originalEvent.primary_key};
    const isLinkPreviewEdit = newData.previews && !!newData.previews.length;

    const commonUpdates = this._getCommonMessageUpdates(originalEvent, newEvent);

    const specificUpdates = isLinkPreviewEdit
      ? this._getUpdatesForLinkPreview(originalEvent, newEvent)
      : this._getUpdatesForEditMessage(originalEvent, newEvent);

    const updates = Object.assign({}, specificUpdates, commonUpdates);

    const identifiedUpdates = Object.assign({}, primaryKeyUpdate, updates);
    return this.eventService.replaceEvent(identifiedUpdates);
  }

  _handleDuplicatedEvent(originalEvent, newEvent) {
    switch (newEvent.type) {
      case z.event.Client.CONVERSATION.ASSET_ADD:
        return this._handleAssetUpdate(originalEvent, newEvent);

      case z.event.Client.CONVERSATION.MESSAGE_ADD:
        return this._handleLinkPreviewUpdate(originalEvent, newEvent);

      default:
        this._throwValidationError(newEvent, `Forbidden type '${newEvent.type}' for duplicate events`);
    }
  }

  _handleAssetUpdate(originalEvent, newEvent) {
    const newEventData = newEvent.data;
    // the preview status is not sent by the client so we fake a 'preview' status in order to cleany handle it in the switch statement
    const ASSET_PREVIEW = 'preview';
    const isPreviewEvent = !newEventData.status && newEventData.preview_key;
    const status = isPreviewEvent ? ASSET_PREVIEW : newEventData.status;

    switch (status) {
      case ASSET_PREVIEW:
      case z.assets.AssetTransferState.UPLOADED: {
        const updatedData = Object.assign({}, originalEvent.data, newEventData);
        const updatedEvent = Object.assign({}, originalEvent, {data: updatedData});
        return this.eventService.replaceEvent(updatedEvent);
      }

      case z.assets.AssetTransferState.UPLOAD_FAILED: {
        // case of both failed or canceled upload
        const fromOther = newEvent.from !== this.userRepository.self().id;
        const selfCancel = !fromOther && newEvent.data.reason === z.assets.AssetUploadFailedReason.CANCELLED;
        // we want to delete the event in the case of an error from the remote client or a cancel on the user's own client
        const shouldDeleteEvent = fromOther || selfCancel;
        return shouldDeleteEvent
          ? this.eventService.deleteEvent(newEvent.conversation, newEvent.id).then(() => newEvent)
          : this.eventService.updateEventAsUploadFailed(originalEvent.primary_key, newEvent.data.reason);
      }

      default:
        return this._throwValidationError(newEvent, `Unhandled asset status update '${newEvent.data.status}'`);
    }
  }

  _handleLinkPreviewUpdate(originalEvent, newEvent) {
    const newEventData = newEvent.data;
    const originalData = originalEvent.data;
    if (originalEvent.from !== newEvent.from) {
      const logMessage = `ID previously used by user '${newEvent.from}'`;
      const errorMessage = 'ID reused by other user';
      this._throwValidationError(newEvent, errorMessage, logMessage);
    }

    const containsLinkPreview = newEventData.previews && !!newEventData.previews.length;
    if (!containsLinkPreview) {
      const errorMessage = 'Link preview event does not contain previews';
      this._throwValidationError(newEvent, errorMessage);
    }

    const textContentMatches = newEventData.content === originalData.content;
    if (!textContentMatches) {
      const errorMessage = 'ID of link preview reused';
      const logMessage = 'Text content for link preview not matching';
      this._throwValidationError(newEvent, errorMessage, logMessage);
    }

    const bothAreMessageAddType = newEvent.type === originalEvent.type;
    if (!bothAreMessageAddType) {
      this._throwValidationError(newEvent, 'ID reused by same user');
    }

    const updates = this._getUpdatesForLinkPreview(originalEvent, newEvent);
    const identifiedUpdates = Object.assign({}, {primary_key: originalEvent.primary_key}, updates);
    return this.eventService.replaceEvent(identifiedUpdates);
  }

  _getCommonMessageUpdates(originalEvent, newEvent) {
    return Object.assign({}, newEvent, {
      data: Object.assign({}, newEvent.data, {
        expects_read_confirmation: originalEvent.data.expects_read_confirmation,
      }),
      edited_time: newEvent.time,
      time: originalEvent.time,
      version: 1,
    });
  }

  _getUpdatesForEditMessage(originalEvent, newEvent) {
    return Object.assign({}, newEvent, {
      reactions: [],
    });
  }

  _getUpdatesForLinkPreview(originalEvent, newEvent) {
    const newData = newEvent.data;
    const originalData = originalEvent.data;
    const updatingLinkPreview = !!originalData.previews.length;
    if (updatingLinkPreview) {
      this._throwValidationError(newEvent, 'ID of link preview reused');
    }

    const textContentMatches = !newData.previews.length || newData.content === originalData.content;
    if (!textContentMatches) {
      const logMessage = 'Text content for link preview not matching';
      const errorMessage = 'ID of link preview reused';
      this._throwValidationError(newEvent, errorMessage, logMessage);
    }

    return Object.assign({}, newEvent, {
      category: z.message.MessageCategorization.categoryFromEvent(newEvent),
      ephemeral_expires: originalEvent.ephemeral_expires,
      ephemeral_started: originalEvent.ephemeral_started,
      ephemeral_time: originalEvent.ephemeral_time,
      server_time: newEvent.time,
      time: originalEvent.time,
      version: originalEvent.version,
    });
  }

  _throwValidationError(event, errorMessage, logMessage) {
    const baseLogMessage = `Ignored '${event.type}' (${event.id}) in '${event.conversation}' from '${event.from}':'`;
    const baseErrorMessage = 'Event validation failed:';
    this.logger.warn(`${baseLogMessage} ${logMessage || errorMessage}`, event);
    throw new z.error.EventError(z.error.EventError.TYPE.VALIDATION_FAILED, `${baseErrorMessage} ${errorMessage}`);
  }

  /**
   * Handle an event by validating it.
   *
   * @private
   * @param {JSON} event - Backend event extracted from notification stream
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {Promise} Resolves with the event
   */
  _handleEventValidation(event, source) {
    return Promise.resolve().then(() => {
      const {time: eventDate, type: eventType} = event;

      const isIgnoredEvent = z.event.EventTypeHandling.IGNORE.includes(eventType);
      if (isIgnoredEvent) {
        this.logger.info(`Event ignored: '${event.type}'`, {event_json: JSON.stringify(event), event_object: event});
        const errorMessage = 'Event ignored: Type ignored';
        throw new z.error.EventError(z.error.EventError.TYPE.VALIDATION_FAILED, errorMessage);
      }

      const eventFromStream = source === EventRepository.SOURCE.STREAM;
      const shouldCheckEventDate = eventFromStream && eventDate;
      if (shouldCheckEventDate) {
        const outdatedEvent = this.lastEventDate() >= new Date(eventDate).toISOString();

        if (outdatedEvent) {
          const logObject = {eventJson: JSON.stringify(event), eventObject: event};
          this.logger.info(`Event from stream skipped as outdated: '${eventType}'`, logObject);
          const errorMessage = 'Event validation failed: Outdated timestamp';
          throw new z.error.EventError(z.error.EventError.TYPE.VALIDATION_FAILED, errorMessage);
        }
      }

      return event;
    });
  }

  /**
   * Handle all events from the payload of an incoming notification.
   *
   * @private
   * @param {Array} events - Events contained in a notification
   * @param {string} id - Notification ID
   * @param {boolean} transient - Type of notification
   * @returns {Promise} Resolves with the ID of the handled notification
   */
  _handleNotification({payload: events, id, transient}) {
    const source = transient !== undefined ? EventRepository.SOURCE.WEB_SOCKET : EventRepository.SOURCE.STREAM;
    const isTransientEvent = !!transient;
    this.logger.info(`Handling notification '${id}' from '${source}' containing '${events.length}' events`, events);

    if (!events.length) {
      this.logger.warn('Notification payload does not contain any events');
      return isTransientEvent ? Promise.resolve(id) : this._updateLastNotificationId(id);
    }

    return Promise.all(events.map(event => this._handleEvent(event, source)))
      .then(() => (isTransientEvent ? id : this._updateLastNotificationId(id)))
      .catch(error => {
        this.logger.error(`Failed to handle notification '${id}' from '${source}': ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Check if call event is handled within its valid lifespan.
   *
   * @private
   * @param {Object} event - Event to validate
   * @returns {boolean} Returns true if event is handled within is lifetime, otherwise throws error
   */
  _validateCallEventLifetime(event) {
    const {content = {}, conversation: conversationId, time, type} = event;
    const forcedEventTypes = [z.calling.enum.CALL_MESSAGE_TYPE.CANCEL, z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE];

    const correctedTimestamp = this.serverTimeRepository.toServerTimestamp();
    const thresholdTimestamp = new Date(time).getTime() + EventRepository.CONFIG.E_CALL_EVENT_LIFETIME;

    const isForcedEventType = forcedEventTypes.includes(content.type);
    const eventWithinThreshold = correctedTimestamp < thresholdTimestamp;
    const stateIsWebSocket = this.notificationHandlingState() === z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    const isValidEvent = isForcedEventType || eventWithinThreshold || stateIsWebSocket;
    if (isValidEvent) {
      return true;
    }

    const eventIsoDate = new Date(time).toISOString();
    const logMessage = `Ignored outdated '${type}' event (${eventIsoDate}) in conversation '${conversationId}'`;
    const logObject = {
      eventJson: JSON.stringify(event),
      eventObject: event,
      eventTime: eventIsoDate,
      localTime: new Date(correctedTimestamp).toISOString(),
    };
    this.logger.info(logMessage, logObject);
    throw new z.error.EventError(z.error.EventError.TYPE.OUTDATED_E_CALL_EVENT);
  }
};
