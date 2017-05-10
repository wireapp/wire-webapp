/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
      UNKNOWN_DECRYPTION_ERROR_CODE: 999,
    };
  }

  static get NOTIFICATION_SOURCE() {
    return {
      STREAM: 'Notification Stream',
      WEB_SOCKET: 'WebSocket',
    };
  }

  /**
   * Construct a new Event Repository.
   *
   * @param {z.event.WebSocketService} web_socket_service - Service that connects to WebSocket
   * @param {z.event.NotificationService} notification_service - Service handling the notification stream
   * @param {z.cryptography.CryptographyRepository} cryptography_repository - Repository for all cryptography interactions
   * @param {z.user.UserRepository} user_repository - Repository for all user and connection interactions
   * @param {z.conversation.ConversationService} conversation_service - Service to handle conversation related tasks
   */
  constructor(web_socket_service, notification_service, cryptography_repository, user_repository, conversation_service) {
    this.web_socket_service = web_socket_service;
    this.notification_service = notification_service;
    this.cryptography_repository = cryptography_repository;
    this.user_repository = user_repository;
    this.conversation_service = conversation_service;
    this.logger = new z.util.Logger('z.event.EventRepository', z.config.LOGGER.OPTIONS);

    this.current_client = undefined;
    this.clock_drift = 0;

    this.notification_handling_state = ko.observable(z.event.NOTIFICATION_HANDLING_STATE.STREAM);
    this.notification_handling_state.subscribe((handling_state) => {
      amplify.publish(z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, handling_state);

      if (handling_state === z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET) {
        this._handle_buffered_notifications();
        if (this.previous_handling_state === z.event.NOTIFICATION_HANDLING_STATE.RECOVERY) {
          amplify.publish(z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.CONNECTIVITY_RECOVERY);
        }
      }
      this.previous_handling_state = handling_state;
    });

    this.previous_handling_state = this.notification_handling_state();

    this.notifications_handled = 0;
    this.notifications_loaded = ko.observable(false);
    this.notifications_promises = undefined;
    this.notifications_total = 0;
    this.notifications_queue = ko.observableArray([]);
    this.notifications_blocked = false;

    this.notifications_queue.subscribe((notifications) => {
      if (notifications.length) {
        if (!this.notifications_blocked) {

          const notification = this.notifications_queue()[0];
          this.notifications_blocked = true;

          return this._handle_notification(notification)
            .catch((error) => {
              this.logger.warn(`We failed to handle a notification but will continue with queue: ${error.message}`, error);
            })
            .then(() => {
              this.notifications_blocked = false;
              this.notifications_queue.shift();
              this.notifications_handled++;

              if ((this.notifications_handled % 5) === 0) {
                const progress = this.notifications_handled / this.notifications_total * 70 + 25;
                amplify.publish(z.event.WebApp.APP.UPDATE_PROGRESS, progress, z.string.init_events_progress, [this.notifications_handled, this.notifications_total]);
              }
            });
        }
      } else if (this.notifications_loaded() && this.notification_handling_state() !== z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET) {
        this.logger.info(`Done handling '${this.notifications_total}' notifications from the stream`);
        this.notification_handling_state(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
        this._find_ongoing_calls();
        this.notifications_loaded(false);
        this.notifications_promises[0](this.last_notification_id());
      }
    });

    this.web_socket_buffer = [];

    this.last_notification_id = ko.observable(undefined);

    amplify.subscribe(z.event.WebApp.CONNECTION.ONLINE, this.recover_from_notification_stream.bind(this));
    amplify.subscribe(z.event.WebApp.EVENT.INJECT, this.inject_event.bind(this));
  }


  //##############################################################################
  // WebSocket handling
  //##############################################################################

  /**
   * Initiate the WebSocket connection.
   * @returns {undefined} No return value
   */
  connect_web_socket() {
    if (!this.current_client().id) {
      throw new z.event.EventError(z.event.EventError.TYPE.NO_CLIENT_ID);
    }

    this.web_socket_service.client_id = this.current_client().id;
    this.web_socket_service.connect((notification) => {
      if (this.notification_handling_state() === z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET) {
        return this.notifications_queue.push(notification);
      }
      this._buffer_web_socket_notification(notification);
    });
  }

  /**
   * Close the WebSocket connection.
   * @param {z.event.WebSocketService.CHANGE_TRIGGER} trigger - Trigger of the disconnect
   * @returns {undefined} No return value
   */
  disconnect_web_socket(trigger) {
    this.web_socket_service.reset(trigger);
  }

  /**
   * Re-connect the WebSocket connection.
   * @param {z.event.WebSocketService.CHANGE_TRIGGER} trigger - Trigger of the reconnect
   * @returns {undefined} No return value
   */
  reconnect_web_socket(trigger) {
    this.notification_handling_state(z.event.NOTIFICATION_HANDLING_STATE.RECOVERY);
    this.web_socket_service.reconnect(trigger);
  }

  /**
   * Buffer an incoming notification.
   * @param {Object} notification - Notification data
   * @returns {undefined} No return value
   */
  _buffer_web_socket_notification(notification) {
    this.web_socket_buffer.push(notification);
  }

  /**
   * Handle buffered notifications.
   * @returns {undefined} No return value
   */
  _handle_buffered_notifications() {
    this.logger.info(`Received '${this.web_socket_buffer.length}' notifications via WebSocket while handling stream`);
    if (this.web_socket_buffer.length) {
      z.util.ko_array_push_all(this.notifications_queue, this.web_socket_buffer);
      this.web_socket_buffer.length = 0;
    }
  }


  //##############################################################################
  // Notification Stream handling
  //##############################################################################

  /**
   * Get notifications for the current client from the stream.
   *
   * @param {string} notification_id - Event ID to start from
   * @param {number} [limit=10000] - Max. number of notifications to retrieve from backend at once
   * @returns {Promise} Resolves when all new notifications from the stream have been handled
   */
  get_notifications(notification_id, limit = 10000) {
    return new Promise((resolve, reject) => {
      const _got_notifications = ({has_more, notifications, time}) => {
        if (time) {
          this._update_baseline_clock(time);
        }

        if (notifications.length > 0) {
          notification_id = notifications[notifications.length - 1].id;

          this.logger.info(`Added '${notifications.length}' notifications to the queue`);
          z.util.ko_array_push_all(this.notifications_queue, notifications);

          if (!this.notifications_promises) {
            this.notifications_promises = [resolve, reject];
          }

          this.notifications_total += notifications.length;

          if (has_more) {
            return this.get_notifications(notification_id, 5000);
          }

          this.notifications_loaded(true);
          this.logger.info(`Fetched '${this.notifications_total}' notifications from the backend`);
          return notification_id;
        }
        this.logger.info(`No notifications found since '${notification_id}'`);
        return reject(new z.event.EventError(z.event.EventError.TYPE.NO_NOTIFICATIONS));
      };

      return this.notification_service.get_notifications(this.current_client().id, notification_id, limit)
      .then(_got_notifications)
      .catch((error_response) => {
        // When asking for notifications with a since set to a notification ID that does not belong to our client ID,
        //   we will get a 404 AND notifications
        if (error_response.notifications) {
          amplify.publish(z.event.WebApp.CONVERSATION.MISSED_EVENTS);
          return _got_notifications(error_response);
        }

        if (error_response.code === z.service.BackendClientError.STATUS_CODE.NOT_FOUND) {
          this.logger.info(`No notifications found since '${notification_id}'`, error_response);
          return reject(new z.event.EventError(z.event.EventError.TYPE.NO_NOTIFICATIONS));
        }

        this.logger.error(`Failed to get notifications: ${error_response.message}`, error_response);
        return reject(new z.event.EventError(z.event.EventError.TYPE.REQUEST_FAILURE));
      });
    });
  }

  /**
   * Get the last notification.
   * @returns {Promise} Resolves with the last handled notification ID
   */
  get_last_notification_id_from_db() {
    return this.notification_service.get_last_notification_id_from_db()
    .then((last_notification_id) => {
      this.last_notification_id(last_notification_id);
      return this.last_notification_id();
    });
  }

  /**
   * Get the last notification ID for a given client.
   * @param {string} client_id - Client ID to retrieve last notification ID for
   * @returns {Promise} Resolves with the last known notification ID matching the local client
   */
  initialize_last_notification_id(client_id) {
    return this.notification_service.get_notifications_last(client_id)
    .then((response) => {
      this._update_last_notification_id(response.id);
      this.logger.info(`Set starting point on notification stream to '${this.last_notification_id()}'`);
    });
  }

  /**
   * Initialize from notification stream.
   * @returns {Promise} Resolves when all notifications have been handled
   */
  initialize_from_notification_stream() {
    return this.get_last_notification_id_from_db()
      .then((last_notification_id) => {
        return this._update_from_notification_stream(last_notification_id);
      })
      .catch((error) => {
        this.notification_handling_state(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
        if (error.type === z.event.EventError.TYPE.NO_LAST_ID) {
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
  recover_from_notification_stream() {
    this.notification_handling_state(z.event.NOTIFICATION_HANDLING_STATE.RECOVERY);
    amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.CONNECTIVITY_RECOVERY);

    return this._update_from_notification_stream(this._get_last_known_notification_id())
      .then((number_of_notifications) => {
        this.logger.info(`Retrieved '${number_of_notifications}' notifications from stream after connectivity loss`);
      })
      .catch((error) => {
        if (error.type !== z.event.EventError.TYPE.NO_NOTIFICATIONS) {
          this.logger.error(`Failed to recover from notification stream: ${error.message}`, error);
          this.notification_handling_state(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
          // @todo What do we do in this case?
          amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.CONNECTIVITY_RECONNECT);
        }
      });
  }

  /**
   * Check for conversations with ongoing calls.
   * @private
   * @returns {undefined} No return value
   */
  _find_ongoing_calls() {
    this.logger.info('Checking for ongoing calls');
    this.conversation_service.load_events_with_types([z.event.Backend.CONVERSATION.VOICE_CHANNEL_ACTIVATE, z.event.Backend.CONVERSATION.VOICE_CHANNEL_DEACTIVATE])
    .then(function(events) {
      const filtered_conversations = {};

      for (const {conversation: conversation_id, protocol_version, type} of events) {
        if (type === z.event.Backend.CONVERSATION.VOICE_CHANNEL_ACTIVATE) {
          if (protocol_version !== z.calling.enum.PROTOCOL.VERSION_3) {
            filtered_conversations[conversation_id] = null;
          }
        } else if (type === z.event.Backend.CONVERSATION.VOICE_CHANNEL_DEACTIVATE) {
          if (protocol_version !== z.calling.enum.PROTOCOL.VERSION_3) {
            delete filtered_conversations[conversation_id];
          }
        }
      }

      return Object.keys(filtered_conversations);
    })
    .then((conversation_ids) => {
      this.logger.info(`Identified '${conversation_ids.length}' conversations that possibly have an ongoing call`, conversation_ids);
      conversation_ids.map((conversation_id) => amplify.publish(z.event.WebApp.CALL.STATE.CHECK, conversation_id));
    })
    .catch((error) => {
      this.logger.error('Could not check for active calls', error);
    });
  }

  /**
   * Get the ID of the last known notification.
   * @note Notifications that have not yet been handled but are in the queue should not be fetched again on recovery
   *
   * @private
   * @returns {string} ID of last known notification
   */
  _get_last_known_notification_id() {
    if (this.notifications_queue().length) {
      return this.notifications_queue()[this.notifications_queue().length - 1].id;
    }
    return this.last_notification_id();
  }

  /**
   * Fetch all missed events from the notification stream since the given last notification ID.
   *
   * @private
   * @param {string} last_notification_id - Last known notification ID to start update from
   * @returns {Promise} Resolves with the total number of notifications
   */
  _update_from_notification_stream(last_notification_id) {
    this.notifications_total = 0;

    return this.get_notifications(last_notification_id, 500)
      .then((updated_last_notification_id) => {
        if (updated_last_notification_id) {
          this.logger.info(`ID of last notification fetched from stream is '${updated_last_notification_id}'`);
        }
        return this.notifications_total;
      })
      .catch((error) => {
        this.notification_handling_state(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
        if (error.type === z.event.EventError.TYPE.NO_NOTIFICATIONS) {
          this._find_ongoing_calls();
          this.logger.info('No notifications found for this user', error);
          return 0;
        }
        this.logger.error(`Failed to handle notification stream: ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Update local clock drift.
   *
   * @private
   * @param {string} backend_time - Time as reported by backend
   * @returns {undefined} No return value
   */
  _update_baseline_clock(backend_time) {
    this.clock_drift = new Date() - new Date(backend_time);
    this.logger.info(`Clock drift set to '${this.clock_drift}' ms`);
  }

  /**
   * Persist updated last notification ID.
   *
   * @private
   * @param {string} last_notification_id - Updated last notification ID
   * @returns {undefined} No return value
   */
  _update_last_notification_id(last_notification_id) {
    if (last_notification_id) {
      this.last_notification_id(last_notification_id);
      this.notification_service.save_last_notification_id_to_db(last_notification_id);
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
   * @returns {undefined} No return value
   */
  inject_event(event) {
    if (event.conversation !== this.user_repository.self().id) {
      this.logger.info(`Injected event ID '${event.id}' of type '${event.type}'`, event);
      this._handle_event(event);
    }
  }

  /**
   * Distribute the given event.
   *
   * @private
   * @param {Object} event - Mapped event to be distributed
   * @returns {undefined} No return value
   */
  _distribute_event(event) {
    if (event.conversation) {
      this.logger.info(`Distributed '${event.type}' event for conversation '${event.conversation}'`, event);
    } else {
      this.logger.info(`Distributed '${event.type}' event`, event);
    }

    switch (event.type.split('.')[0]) {
      case 'call':
        amplify.publish(z.event.WebApp.CALL.EVENT_FROM_BACKEND, event);
        break;
      case 'conversation':
        amplify.publish(z.event.WebApp.CONVERSATION.EVENT_FROM_BACKEND, event);
        break;
      default:
        amplify.publish(event.type, event);
    }
  }

  /**
   * Handle a single event from the notification stream or WebSocket.
   *
   * @private
   * @param {JSON} event - Backend event extracted from notification stream
   * @returns {Promise} Resolves with the saved record or boolean true if the event was skipped
   */
  _handle_event(event) {
    const {type: event_type} = event;
    if (z.event.EventTypeHandling.IGNORE.includes(event_type)) {
      this.logger.info(`Event ignored: '${event_type}'`, {event_json: JSON.stringify(event), event_object: event});
      return Promise.resolve(true);
    }

    return Promise.resolve()
    .then(() => {
      if (z.event.EventTypeHandling.DECRYPT.includes(event_type)) {
        return this.cryptography_repository.decrypt_event(event)
        .catch((decryption_error) => {
          // Get error information
          const error_code = decryption_error.code || EventRepository.CONFIG.UNKNOWN_DECRYPTION_ERROR_CODE;
          const {data: event_data, from: remote_user_id} = event;
          const remote_client_id = event_data.sender;
          const session_id = this.cryptography_repository._construct_session_id(remote_user_id, remote_client_id);

          // Handle error
          if (decryption_error instanceof Proteus.errors.DecryptError.DuplicateMessage || decryption_error instanceof Proteus.errors.DecryptError.OutdatedMessage) {
            // We don't need to show duplicate message errors to the user
            throw new z.cryptography.CryptographyError(z.cryptography.CryptographyError.TYPE.UNHANDLED_TYPE);
          }
          if (decryption_error instanceof z.cryptography.CryptographyError && decryption_error.type === z.cryptography.CryptographyError.TYPE.PREVIOUSLY_STORED) {
            throw new z.cryptography.CryptographyError(z.cryptography.CryptographyError.TYPE.UNHANDLED_TYPE);
          }

          if (decryption_error instanceof Proteus.errors.DecryptError.InvalidMessage || decryption_error instanceof Proteus.errors.DecryptError.InvalidSignature) {
            // Session is broken, let's see what's really causing it...
            this.logger.error(`Session '${session_id}' with user '${remote_user_id}' (client '${remote_client_id}') is broken or out of sync. Reset the session and decryption is likely to work again. Error: ${decryption_error.message}`, decryption_error);
          } else if (decryption_error instanceof Proteus.errors.DecryptError.RemoteIdentityChanged) {
            // Remote identity changed
            this.logger.error(`Remote identity of client '${remote_client_id}' from user '${remote_user_id}' changed: ${decryption_error.message}`, decryption_error);
          }

          this.logger.warn(`Could not decrypt an event from client ID '${remote_client_id}' of user ID '${remote_user_id}' in session ID '${session_id}'.\nError Code: '${error_code}'\nError Message: ${decryption_error.message}`, decryption_error);
          this._report_decrypt_error(decryption_error, event);

          return z.conversation.EventBuilder.build_unable_to_decrypt(event, decryption_error, error_code);
        })
        .then((message) => {
          if (message instanceof z.proto.GenericMessage) {
            return this.cryptography_repository.cryptography_mapper.map_generic_message(message, event);
          }
          return message;
        });
      }
      return event;
    })
    .then((mapped_event) => {
      if (z.event.EventTypeHandling.STORE.includes(mapped_event.type)) {
        return this.conversation_service.save_event(mapped_event);
      }
      return mapped_event;
    })
    .then((saved_event) => {
      if (event_type === z.event.Client.CALL.E_CALL) {
        this._validate_call_event_lifetime(event);
      }
      this._distribute_event(saved_event);
      return saved_event;
    })
    .catch(function(error) {
      const ignored_errors = [
        z.cryptography.CryptographyError.TYPE.IGNORED_ASSET,
        z.cryptography.CryptographyError.TYPE.IGNORED_PREVIEW,
        z.cryptography.CryptographyError.TYPE.PREVIOUSLY_STORED,
        z.cryptography.CryptographyError.TYPE.UNHANDLED_TYPE,
        z.event.EventError.TYPE.OUTDATED_E_CALL_EVENT,
      ];

      if (!ignored_errors.includes(error.type)) {
        throw error;
      }
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
  _handle_notification({payload: events, id, transient}) {
    const source = transient !== null ? EventRepository.NOTIFICATION_SOURCE.WEB_SOCKET : EventRepository.NOTIFICATION_SOURCE.STREAM;
    const is_transient_event = transient === true;

    this.logger.info(`Handling notification '${id}' from '${source}' containing '${events.length}' events`, events);

    if (!events.length) {
      this.logger.warn('Notification payload does not contain any events');
      if (!is_transient_event) {
        this._update_last_notification_id(id);
      }
      return Promise.resolve(id);
    }

    return Promise.all(events.map((event) => this._handle_event(event)))
    .then(() => {
      if (!is_transient_event) {
        this._update_last_notification_id(id);
      }
      return id;
    })
    .catch((error) => {
      this.logger.error(`Failed to handle notification '${id}' from '${source}': ${error.message}`, error);
      throw error;
    });
  }

  /**
   * Report decryption error to Localytics and stack traces to Raygun.
   *
   * @private
   * @param {Error} decryption_error - Error from event decryption
   * @param {Object} event_data - Event data
   * @param {string} user_id - Remote user ID
   * @param {string} event_type - Event type
   * @returns {undefined} No return value
   */
  _report_decrypt_error(decryption_error, {data: event_data, from: user_id, type: event_type}) {
    const session_id = this.cryptography_repository._construct_session_id(user_id, event_data.sender);

    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.E2EE.CANNOT_DECRYPT_MESSAGE, {cause: decryption_error.code || decryption_error.message});

    const custom_data = {
      client_local_class: this.current_client().class,
      client_local_type: this.current_client().type,
      cryptobox_version: cryptobox.version,
      error_code: decryption_error.code,
      event_type: event_type,
      session_id: session_id,
    };

    const raygun_error = new Error(`Decryption failed: ${decryption_error.code || decryption_error.message}`);
    raygun_error.stack = decryption_error.stack;
    Raygun.send(raygun_error, custom_data);
  }

  /**
   * Check if call event is handled within its valid lifespan.
   *
   * @private
   * @param {Object} event - Event to validate
   * @returns {boolean} Returns true if event is handled within is lifetime, otherwise throws error
   */
  _validate_call_event_lifetime(event) {
    if (this.notification_handling_state() === z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET) return true;
    if (event.content.type === z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL) return true;

    const corrected_timestamp = Date.now() - this.clock_drift;
    const event_timestamp = new Date(event.time).getTime();
    if (corrected_timestamp > (event_timestamp + EventRepository.CONFIG.E_CALL_EVENT_LIFETIME)) {
      this.logger.info(`Ignored outdated '${event.type}' event in conversation '${event.conversation}' - Event: '${event_timestamp}', Local: '${corrected_timestamp}'`, {event_json: JSON.stringify(event), event_object: event});
      throw new z.event.EventError(z.event.EventError.TYPE.OUTDATED_E_CALL_EVENT);
    }
    return true;
  }
};
