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

'use strict';

window.z = window.z || {};
window.z.event = z.event || {};

z.event.EventRepository = class EventRepository {
  static get CONFIG() {
    return {
      E_CALL_EVENT_LIFETIME: 30 * 1000, // 30 seconds
      IGNORED_ERRORS: [
        z.cryptography.CryptographyError.TYPE.IGNORED_ASSET,
        z.cryptography.CryptographyError.TYPE.IGNORED_PREVIEW,
        z.cryptography.CryptographyError.TYPE.PREVIOUSLY_STORED,
        z.cryptography.CryptographyError.TYPE.UNHANDLED_TYPE,
        z.event.EventError.TYPE.OUTDATED_E_CALL_EVENT,
        z.event.EventError.TYPE.VALIDATION_FAILED,
      ],
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
   * @param {z.event.NotificationService} notificationService - Service handling the notification stream
   * @param {z.event.WebSocketService} webSocketService - Service that connects to WebSocket
   * @param {z.conversation.ConversationService} conversationService - Service to handle conversation related tasks
   * @param {z.cryptography.CryptographyRepository} cryptographyRepository - Repository for all cryptography interactions
   * @param {z.user.UserRepository} userRepository - Repository for all user and connection interactions
   */
  constructor(notificationService, webSocketService, conversationService, cryptographyRepository, userRepository) {
    this.notificationService = notificationService;
    this.webSocketService = webSocketService;
    this.conversationService = conversationService;
    this.cryptographyRepository = cryptographyRepository;
    this.userRepository = userRepository;
    this.logger = new z.util.Logger('z.event.EventRepository', z.config.LOGGER.OPTIONS);

    this.currentClient = undefined;
    this.timeOffset = 0;

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

    this.notificationsQueue.subscribe(notifications => {
      if (notifications.length) {
        if (this.notificationsBlocked) {
          return;
        }

        const [notification] = this.notificationsQueue();
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

    this.lastNotificationId = ko.observable(undefined);
    this.lastEventDate = ko.observable();

    amplify.subscribe(z.event.WebApp.CONNECTION.ONLINE, this.recoverFromStream.bind(this));
    amplify.subscribe(z.event.WebApp.EVENT.INJECT, this.injectEvent.bind(this));
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
      throw new z.event.EventError(z.event.EventError.TYPE.NO_CLIENT_ID);
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
      z.util.ko_array_push_all(this.notificationsQueue, this.webSocketBuffer);
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
   * @param {number} [limit=10000] - Max. number of notifications to retrieve from backend at once
   * @returns {Promise} Resolves when all new notifications from the stream have been handled
   */
  getNotifications(notificationId, limit = 10000) {
    return new Promise((resolve, reject) => {
      const _gotNotifications = ({has_more: hasAdditionalNotifications, notifications, time}) => {
        if (time) {
          this._updateBaselineClock(time);
        }

        if (notifications.length > 0) {
          notificationId = notifications[notifications.length - 1].id;

          this.logger.info(`Added '${notifications.length}' notifications to the queue`);
          z.util.ko_array_push_all(this.notificationsQueue, notifications);

          if (!this.notificationsPromises) {
            this.notificationsPromises = [resolve, reject];
          }

          this.notificationsTotal += notifications.length;

          if (hasAdditionalNotifications) {
            return this.getNotifications(notificationId, 5000);
          }

          this.notificationsLoaded(true);
          this.logger.info(`Fetched '${this.notificationsTotal}' notifications from the backend`);
          return notificationId;
        }
        this.logger.info(`No notifications found since '${notificationId}'`);
        return reject(new z.event.EventError(z.event.EventError.TYPE.NO_NOTIFICATIONS));
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

          const isNotFound = errorResponse.code === z.service.BackendClientError.STATUS_CODE.NOT_FOUND;
          if (isNotFound) {
            this.logger.info(`No notifications found since '${notificationId}'`, errorResponse);
            return reject(new z.event.EventError(z.event.EventError.TYPE.NO_NOTIFICATIONS));
          }

          this.logger.error(`Failed to get notifications: ${errorResponse.message}`, errorResponse);
          return reject(new z.event.EventError(z.event.EventError.TYPE.REQUEST_FAILURE));
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
        const isNoLastId = error.type === z.event.EventError.TYPE.NO_LAST_ID;
        if (!isNoLastId) {
          throw error;
        }

        this.logger.warn('Last notification ID not found in database. Resetting...');
        return this._getLastNotificationId(this.currentClient().id).then(() => {
          this._missedEventsFromStream();
          return this.lastNotificationId();
        });
      })
      .then(notificationId => {
        this.lastNotificationId(notificationId);
        return this.notificationService.getLastEventDateFromDb();
      })
      .catch(error => {
        const isNoLastDate = error.type === z.event.EventError.TYPE.NO_LAST_DATE;
        if (!isNoLastDate) {
          throw error;
        }

        this.logger.warn('Last event date not found in database. Resetting...');
        return this._updateLastEventDate(new Date(0).toISOString());
      })
      .then(eventDate => {
        this.lastEventDate(eventDate);
        return {
          eventDate: this.lastEventDate(),
          notificationId: this.lastNotificationId(),
        };
      });
  }

  /**
   * Initialize from notification stream.
   * @returns {Promise} Resolves when all notifications have been handled
   */
  initializeFromStream() {
    return this.getStreamState()
      .then(({notificationId}) => this._updateFromStream(notificationId))
      .catch(error => {
        this.notificationHandlingState(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);

        const isNoLastId = error.type === z.event.EventError.TYPE.NO_LAST_ID;
        if (isNoLastId) {
          this.logger.info('No notifications found for this user', error);
          return 0;
        }

        throw error;
      });
  }

  /**
   * Get the last notification ID and set event date for a given client.
   * @param {string} clientId - Client ID to retrieve last notification ID for
   * @returns {Promise} Resolves with the last known notification ID matching the given client ID
   */
  initializeStreamState(clientId) {
    this._updateLastEventDate(new Date(0).toISOString());
    return this._getLastNotificationId(clientId);
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
        const isNoNotifications = error.type === z.event.EventError.TYPE.NO_NOTIFICATIONS;
        if (!isNoNotifications) {
          this.logger.error(`Failed to recover from notification stream: ${error.message}`, error);
          this.notificationHandlingState(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
          // @todo What do we do in this case?
          amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT);
        }
      });
  }

  /**
   * Get the ID of the last known notification.
   * @note Notifications that have not yet been handled but are in the queue should not be fetched again on recovery
   *
   * @private
   * @returns {string} ID of last known notification
   */
  _getLastKnownNotificationId() {
    if (this.notificationsQueue().length) {
      return this.notificationsQueue()[this.notificationsQueue().length - 1].id;
    }
    return this.lastNotificationId();
  }

  /**
   * Get the last notification ID for a given client.
   * @param {string} clientId - Client ID to retrieve last notification ID for
   * @returns {Promise} Resolves with the last known notification ID matching the local client
   */
  _getLastNotificationId(clientId) {
    return this.notificationService.getNotificationsLast(clientId).then(({id: notificationId}) => {
      if (notificationId) {
        this._updateLastNotificationId(notificationId);
        this.logger.info(`Set starting point on notification stream to '${this.lastNotificationId()}'`);
        return this.lastNotificationId();
      }
    });
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

    return this.getNotifications(lastNotificationId, 500)
      .then(updatedLastNotificationId => {
        if (updatedLastNotificationId) {
          this.logger.info(`ID of last notification fetched from stream is '${updatedLastNotificationId}'`);
        }
        return this.notificationsTotal;
      })
      .catch(error => {
        this.notificationHandlingState(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);

        const isNoNotifications = error.type === z.event.EventError.TYPE.NO_NOTIFICATIONS;
        if (isNoNotifications) {
          this.logger.info('No notifications found for this user', error);
          return 0;
        }

        this.logger.error(`Failed to handle notification stream: ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Update local time offset.
   *
   * @private
   * @param {string} backendTime - Time as reported by backend
   * @returns {undefined} No return value
   */
  _updateBaselineClock(backendTime) {
    const updatedTimeOffset = new Date() - new Date(backendTime);

    if (_.isNumber(updatedTimeOffset)) {
      this.timeOffset = updatedTimeOffset;
      amplify.publish(z.event.WebApp.EVENT.UPDATE_TIME_OFFSET, this.timeOffset);
      this.logger.info(`Current backend time is '${backendTime}'. Time offset updated to '${this.timeOffset}' ms`);
    }
  }

  /**
   * Persist updated last event timestamp.
   *
   * @private
   * @param {string} eventDate - Updated last event date
   * @returns {undefined} No return value
   */
  _updateLastEventDate(eventDate) {
    if (eventDate > this.lastEventDate()) {
      this.lastEventDate(eventDate);
      this.notificationService.saveLastEventDateToDb(eventDate);
    }
  }

  /**
   * Persist updated last notification ID.
   *
   * @private
   * @param {string} notificationId - Updated last notification ID
   * @returns {undefined} No return value
   */
  _updateLastNotificationId(notificationId) {
    if (notificationId) {
      this.lastNotificationId(notificationId);
      this.notificationService.saveLastNotificationIdToDb(notificationId);
    }
  }

  _updateProgress() {
    if (this.notificationsHandled % 5 === 0 || this.notificationsHandled < 5) {
      const content = {
        handled: this.notificationsHandled,
        total: this.notificationsTotal,
      };
      const progress = this.notificationsHandled / this.notificationsTotal * 50 + 25;

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
   * @returns {undefined} No return value
   */
  injectEvent(event, source = EventRepository.SOURCE.INJECTED) {
    if (!event) {
      throw new z.event.EventError(z.event.EventError.TYPE.NO_EVENT);
    }

    const isHandlingWebSocket = this.notificationHandlingState() === z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;
    if (!isHandlingWebSocket) {
      source = EventRepository.SOURCE.INJECTED;
    }

    const {conversation: conversationId, id = 'ID not specified', type} = event;
    const inSelfConversation = conversationId === this.userRepository.self().id;
    if (!inSelfConversation) {
      this.logger.info(`Injected event ID '${id}' of type '${type}'`, event);
      this._handleEvent(event, source);
    }
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

    if (conversationId && userId) {
      this.logger.info(`Distributed '${type}' event for conversation '${conversationId}' from user '${userId}'`, event);
    } else {
      this.logger.info(`Distributed '${type}' event`, event);
    }

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
      .then(validatedEvent => {
        const decryptEvent = validatedEvent.type === z.event.Backend.CONVERSATION.OTR_MESSAGE_ADD;
        return decryptEvent ? this.cryptographyRepository.handleEncryptedEvent(event) : event;
      })
      .then(mappedEvent => {
        const saveEvent = z.event.EventTypeHandling.STORE.includes(mappedEvent.type);
        return saveEvent ? this._handleEventSaving(mappedEvent, source) : mappedEvent;
      })
      .then(savedEvent => this._handleEventDistribution(savedEvent, source))
      .catch(error => {
        const isIgnoredError = EventRepository.CONFIG.IGNORED_ERRORS.includes(error.type);
        if (!isIgnoredError) {
          throw error;
        }

        return true;
      });
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
    const {time: eventDate, type: eventType} = event;

    const isInjectedEvent = source === EventRepository.SOURCE.INJECTED;
    if (!isInjectedEvent) {
      this._updateLastEventDate(eventDate);
    }

    const isCallEvent = eventType === z.event.Client.CALL.E_CALL;
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
    const {conversation: conversationId, id: eventId} = event;

    return this.conversationService.load_event_from_db(conversationId, eventId).then(storedEvent => {
      if (storedEvent) {
        const {data: mappedData, from: mappedFrom, type: mappedType, time: mappedTime} = event;
        const {data: storedData, from: storedFrom, type: storedType, time: storedTime} = storedEvent;

        const logMessage = `Ignored '${mappedType}' (${eventId}) in '${conversationId}' from '${mappedFrom}':'`;

        const fromDifferentUsers = storedFrom !== mappedFrom;
        if (fromDifferentUsers) {
          this.logger.warn(`${logMessage} ID previously used by user '${storedFrom}'`, event);
          const errorMessage = 'Event validation failed: ID reused by other user';
          throw new z.event.EventError(z.event.EventError.TYPE.VALIDATION_FAILED, errorMessage);
        }

        const mappedIsMessageAdd = mappedType === z.event.Client.CONVERSATION.MESSAGE_ADD;
        const storedISMessageAdd = storedType === z.event.Client.CONVERSATION.MESSAGE_ADD;
        const userReusedId = !mappedIsMessageAdd || !storedISMessageAdd || !mappedData.previews.length;
        if (userReusedId) {
          this.logger.warn(`${logMessage} ID previously used by same user`, event);
          const errorMessage = 'Event validation failed: ID reused by same user';
          throw new z.event.EventError(z.event.EventError.TYPE.VALIDATION_FAILED, errorMessage);
        }

        const updatingLinkPreview = !!storedData.previews.length;
        if (updatingLinkPreview) {
          this.logger.warn(`${logMessage} ID of link preview  reused`, event);
          const errorMessage = 'Event validation failed: ID of link preview reused';
          throw new z.event.EventError(z.event.EventError.TYPE.VALIDATION_FAILED, errorMessage);
        }

        const textContentMatches = mappedData.content === storedData.content;
        if (!textContentMatches) {
          this.logger.warn(`${logMessage} Text content for link preview not matching`, event);
          const errorMessage = 'Event validation failed: ID of link preview reused';
          throw new z.event.EventError(z.event.EventError.TYPE.VALIDATION_FAILED, errorMessage);
        }

        // Only valid case for a duplicate message ID: First update to a text message matching the previous text content with a link preview
        event.server_time = mappedTime;
        event.time = storedTime;
      }

      return this.conversationService.save_event(event);
    });
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
      const isIgnoredEvent = z.event.EventTypeHandling.IGNORE.includes(event.type);
      if (isIgnoredEvent) {
        this.logger.info(`Event ignored: '${event.type}'`, {event_json: JSON.stringify(event), event_object: event});
        const errorMessage = 'Event validation failed: Type ignored';
        throw new z.event.EventError(z.event.EventError.TYPE.VALIDATION_FAILED, errorMessage);
      }

      const eventFromStream = source === EventRepository.SOURCE.STREAM;
      if (eventFromStream && event.time) {
        const outdatedEvent = this.lastEventDate() >= new Date(event.time).toISOString();

        if (outdatedEvent) {
          const logObject = {eventJson: JSON.stringify(event), eventObject: event};
          this.logger.info(`Event from stream skipped as outdated: '${event.type}'`, logObject);
          const errorMessage = 'Event validation failed: Outdated timestamp';
          throw new z.event.EventError(z.event.EventError.TYPE.VALIDATION_FAILED, errorMessage);
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
      if (!isTransientEvent) {
        this._updateLastNotificationId(id);
      }
      return Promise.resolve(id);
    }

    return Promise.all(events.map(event => this._handleEvent(event, source)))
      .then(() => {
        if (!isTransientEvent) {
          this._updateLastNotificationId(id);
        }
        return id;
      })
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

    const correctedTimestamp = Date.now() - this.timeOffset;
    const thresholdTimestamp = new Date(time).getTime() + EventRepository.CONFIG.E_CALL_EVENT_LIFETIME;

    const isForcedEventType = forcedEventTypes.includes(content.type);
    const eventWithinThreshold = correctedTimestamp < thresholdTimestamp;
    const stateIsWebSocket = this.notificationHandlingState() === z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    const isValidEvent = isForcedEventType || eventWithinThreshold || stateIsWebSocket;
    if (isValidEvent) {
      return true;
    }

    const message = `Ignored outdated '${type}' event in conversation '${conversationId}'`;
    const logObject = {eventJson: JSON.stringify(event), eventObject: event};
    this.logger.info(`${message} - Event: '${thresholdTimestamp}', Local: '${correctedTimestamp}'`, logObject);
    throw new z.event.EventError(z.event.EventError.TYPE.OUTDATED_E_CALL_EVENT);
  }
};
