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
window.z.calling = z.calling || {};

z.calling.CallingRepository = class CallingRepository {
  static get CONFIG() {
    return {
      DATA_CHANNEL_MESSAGE_TYPES: [
        z.calling.enum.CALL_MESSAGE_TYPE.HANGUP,
        z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC,
      ],
      DEFAULT_CONFIG_TTL: 60 * 60, // 60 minutes in seconds
      MESSAGE_LOG_LENGTH: 250,
      PROTOCOL_VERSION: '3.0',
    };
  }

  /**
   * Extended check for calling support of browser.
   * @returns {boolean} True if calling is supported
   */
  static get supports_calling() {
    return z.util.Environment.browser.supports.calling;
  }

  /**
   * Extended check for screen sharing support of browser.
   * @returns {boolean} True if screen sharing is supported
   */
  static get supports_screen_sharing() {
    return z.util.Environment.browser.supports.screen_sharing;
  }

  /**
   * Construct a new Calling repository.
   *
   * @param {CallingService} calling_service -  Backend REST API calling service implementation
   * @param {ClientRepository} client_repository - Repository for client interactions
   * @param {ConversationRepository} conversation_repository -  Repository for conversation interactions
   * @param {MediaRepository} media_repository -  Repository for media interactions
   * @param {UserRepository} user_repository -  Repository for all user and connection interactions
   */
  constructor(calling_service, client_repository, conversation_repository, media_repository, user_repository) {
    this.get_config = this.get_config.bind(this);

    this.calling_service = calling_service;
    this.client_repository = client_repository;
    this.conversation_repository = conversation_repository;
    this.media_repository = media_repository;
    this.user_repository = user_repository;
    this.logger = new z.util.Logger('z.calling.CallingRepository', z.config.LOGGER.OPTIONS);

    this.self_user_id = ko.pureComputed(() => {
      if (this.user_repository.self()) {
        return this.user_repository.self().id;
      }
    });

    this.calling_config = undefined;
    this.calling_config_timeout = undefined;

    // Telemetry
    this.telemetry = new z.telemetry.calling.CallTelemetry();
    this.message_log = [];

    // Media Handler
    this.media_devices_handler = this.media_repository.devices_handler;
    this.media_stream_handler = this.media_repository.stream_handler;
    this.media_element_handler = this.media_repository.element_handler;
    this.remote_media_streams = this.media_repository.stream_handler.remote_media_streams;
    this.self_stream_state = this.media_repository.stream_handler.self_stream_state;

    this.self_state = this.media_stream_handler.self_stream_state;

    this.calls = ko.observableArray([]);
    this.joined_call = ko.pureComputed(() => {
      for (const call_et of this.calls()) {
        if (call_et.self_client_joined()) {
          return call_et;
        }
      }
    });


    this.flow_status = undefined;
    this.debug_enabled = false;

    this.share_call_states();
    this.subscribe_to_events();
  }
  /**
   * Share call states with MediaRepository.
   * @returns {undefined} No return value
   */
  share_call_states() {
    this.media_repository.stream_handler.calls = this.calls;
    this.media_repository.stream_handler.joined_call = this.joined_call;
  }

  /**
   * Subscribe to amplify topics.
   * @returns {undefined} No return value
   */
  subscribe_to_events() {
    amplify.subscribe(z.event.WebApp.CALL.EVENT_FROM_BACKEND, this.on_call_event.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.MEDIA.TOGGLE, this.toggle_media.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.STATE.DELETE, this.delete_call.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.STATE.JOIN, this.join_call.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.STATE.LEAVE, this.leave_call.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.STATE.REJECT, this.reject_call.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.STATE.PARTICIPANT_LEFT, this.participant_left.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.STATE.TOGGLE, this.toggle_state.bind(this));
    amplify.subscribe(z.event.WebApp.DEBUG.UPDATE_LAST_CALL_STATUS, this.store_flow_status.bind(this));
    amplify.subscribe(z.event.WebApp.LIFECYCLE.LOADED, this.get_config);
    amplify.subscribe(z.util.Logger.prototype.LOG_ON_DEBUG, this.set_debug_state.bind(this));
  }


  //##############################################################################
  // Inbound call events
  //##############################################################################

  /**
   * Handle incoming calling events from backend.
   *
   * @param {Object} event - Event payload
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  on_call_event(event, source) {
    const {content: event_content, time: event_date, type: event_type} = event;
    const is_call = event_type === z.event.Client.CALL.E_CALL;

    if (is_call) {
      const is_supported_version = event_content.version === z.calling.entities.CallMessage.CONFIG.VERSION;
      if (!is_supported_version) {
        throw new z.calling.CallError(z.calling.CallError.TYPE.UNSUPPORTED_VERSION);
      }

      const call_message_et = z.calling.CallMessageMapper.map_event(event);
      this._log_message(false, call_message_et, event_date);

      this._validate_message_type(call_message_et)
        .then((conversation_et) => {
          const injected_event = source === z.event.EventRepository.SOURCE.INJECTED;
          if (!injected_event) {
            conversation_et.update_server_timestamp(call_message_et.time);
          }
        })
        .then(() => {
          if (z.calling.CallingRepository.supports_calling) {
            return this._on_call_event_in_supported_browsers(call_message_et, source);
          }
          this._on_call_event_in_unsupported_browsers(call_message_et, source);
        });
    }
  }

  /**
   * Call event handling for browsers supporting calling.
   *
   * @private
   * @param {CallMessage} call_message_et - Mapped incoming call message entity
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _on_call_event_in_supported_browsers(call_message_et, source) {
    const message_type = call_message_et.type;

    switch (message_type) {
      case z.calling.enum.CALL_MESSAGE_TYPE.CANCEL:
        this._on_cancel(call_message_et, source);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK:
        this._on_group_check(call_message_et, source);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE:
        this._on_group_leave(call_message_et);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP:
        this._on_group_setup(call_message_et);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START:
        this._on_group_start(call_message_et, source);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.HANGUP:
        this._on_hangup(call_message_et);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC:
        this._on_prop_sync(call_message_et);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.REJECT:
        this._on_reject(call_message_et);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.SETUP:
        this._on_setup(call_message_et, source);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.UPDATE:
        this._on_update(call_message_et);
        break;
      default:
        this.logger.warn(`Call event of unknown type '${message_type}' was ignored`, call_message_et);
    }
  }

  /**
   * Call event handling for browsers not supporting calling.
   *
   * @private
   * @param {CallMessage} call_message_et - Mapped incoming call message entity
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _on_call_event_in_unsupported_browsers(call_message_et, source) {
    const {conversation_id, response, type, user_id} = call_message_et;

    if (!response) {
      switch (type) {
        case z.calling.enum.CALL_MESSAGE_TYPE.SETUP: {
          this.inject_activate_event(call_message_et, source);
          this.user_repository.get_user_by_id(user_id)
            .then((user_et) => {
              amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL, {
                call_id: conversation_id,
                first_name: user_et.name(),
              });
            });
          break;
        }

        case z.calling.enum.CALL_MESSAGE_TYPE.CANCEL: {
          amplify.publish(z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL);
          break;
        }

        default: {
          break;
        }
      }
    }
  }

  /**
   * Call cancel message handling.
   *
   * @private
   * @param {CallMessage} call_message_et - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.CANCEL
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _on_cancel(call_message_et, source) {
    const {client_id, conversation_id, response, user_id} = call_message_et;

    if (!response) {
      this.get_call_by_id(conversation_id)
        .then((call_et) => call_et.verify_session_id(call_message_et))
        .then((call_et) => call_et.delete_participant(user_id, client_id, z.calling.enum.TERMINATION_REASON.OTHER_USER))
        .then((call_et) => call_et.deactivate_call(call_message_et, z.calling.enum.TERMINATION_REASON.OTHER_USER))
        .catch((error) => {
          if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
            this.inject_deactivate_event(call_message_et, source);
            throw error;
          }
        });
    }
  }

  /**
   * call group check message handling.
   *
   * @private
   * @param {CallMessage} call_message_et - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _on_group_check(call_message_et, source) {
    this.get_call_by_id(call_message_et.conversation_id)
      .then((call_et) => call_et.schedule_group_check())
      .catch((error) => this._validate_incoming_call(call_message_et, source, error));
  }

  /**
   * call group leave message handling.
   *
   * @private
   * @param {CallMessage} call_message_et - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE
   * @param {z.calling.enum.TERMINATION_REASON} [termination_reason=z.calling.enum.TERMINATION_REASON.OTHER_USER] - Reason for participant to leave
   * @returns {undefined} No return value
   */
  _on_group_leave(call_message_et, termination_reason = z.calling.enum.TERMINATION_REASON.OTHER_USER) {
    const {conversation_id, client_id, user_id} = call_message_et;

    this.get_call_by_id(conversation_id)
      .then((call_et) => {
        const is_outgoing = call_et.state() === z.calling.enum.CALL_STATE.OUTGOING;
        if (is_outgoing) {
          throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_SENDER, 'Remote user tried to leave outgoing call');
        }

        const is_self_user = user_id === this.self_user_id();
        if (is_self_user) {
          call_et.self_user_joined(false);
          return call_et;
        }

        return call_et.delete_participant(user_id, client_id, termination_reason);
      })
      .then((call_et) => call_et.participant_left(call_message_et, termination_reason))
      .catch(this._throw_message_error);
  }

  /**
   * call group setup message handling.
   *
   * @private
   * @param {CallMessage} call_message_et - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP
   * @returns {undefined} No return value
   */
  _on_group_setup(call_message_et) {
    const {conversation_id, response, user_id} = call_message_et;

    this.get_call_by_id(conversation_id)
      .then((call_et) => {
        // @todo Grant message for ongoing call

        this._validate_message_destination(call_et, call_message_et);
        call_et.set_remote_version(call_message_et);
        call_et.add_or_update_participant(user_id, response !== true, call_message_et);
      })
      .catch(this._throw_message_error);
  }

  /**
   * call group start message handling.
   *
   * @private
   * @param {CallMessage} call_message_et - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _on_group_start(call_message_et, source) {
    const {conversation_id, user_id} = call_message_et;

    this.get_call_by_id(conversation_id)
      .then((call_et) => {
        // @todo Grant message for ongoing call

        const is_self_user = user_id === this.self_user_id();
        if (is_self_user && !call_et.self_client_joined()) {
          call_et.self_user_joined(true);
          call_et.was_connected = true;
          return call_et.state(z.calling.enum.CALL_STATE.REJECTED);
        }

        if (call_et.state() === z.calling.enum.CALL_STATE.OUTGOING) {
          call_et.state(z.calling.enum.CALL_STATE.CONNECTING);
        }

        // Add the correct participant, start negotiating
        call_et.add_or_update_participant(user_id, call_et.self_client_joined(), call_message_et);
      })
      .catch((error) => this._validate_incoming_call(call_message_et, source, error));
  }

  /**
   * call hangup message handling.
   *
   * @private
   * @param {CallMessage} call_message_et - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.HANGUP
   * @param {z.calling.enum.TERMINATION_REASON} termination_reason - Reason for the participant to hangup
   * @returns {undefined} No return value
   */
  _on_hangup(call_message_et, termination_reason = z.calling.enum.TERMINATION_REASON.OTHER_USER) {
    const {conversation_id, client_id, response, user_id} = call_message_et;

    if (!response) {
      this.get_call_by_id(conversation_id)
        .then((call_et) => call_et.verify_session_id(call_message_et))
        .then((call_et) => this._confirm_call_message(call_et, call_message_et))
        .then((call_et) => call_et.delete_participant(user_id, client_id, termination_reason))
        .then((call_et) => {
          if (!call_et.is_group) {
            call_et.deactivate_call(call_message_et, termination_reason);
          }
        })
        .catch(this._throw_message_error);
    }
  }

  /**
   * call prop-sync message handling.
   *
   * @private
   * @param {CallMessage} call_message_et - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @returns {undefined} No return value
   */
  _on_prop_sync(call_message_et) {
    const {conversation_id, user_id} = call_message_et;

    this.get_call_by_id(conversation_id)
      .then((call_et) => call_et.verify_session_id(call_message_et))
      .then((call_et) => this._confirm_call_message(call_et, call_message_et))
      .then((call_et) => call_et.add_or_update_participant(user_id, false, call_message_et))
      .catch(this._throw_message_error);
  }

  /**
   * call reject message handling.
   *
   * @private
   * @param {CallMessage} call_message_et - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.REJECT
   * @returns {undefined} No return value
   */
  _on_reject(call_message_et) {
    const {conversation_id, user_id} = call_message_et;

    this.get_call_by_id(conversation_id)
      .then((call_et) => {
        const is_self_user = user_id !== this.self_user_id();
        if (!is_self_user) {
          throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_SENDER, 'Call rejected by wrong user');
        }

        if (!call_et.self_client_joined()) {
          this.logger.info(`Rejecting call in conversation '${conversation_id}'`, call_et);
          call_et.state(z.calling.enum.CALL_STATE.REJECTED);
          this.media_stream_handler.reset_media_stream();
        }
      })
      .catch(this._throw_message_error);
  }

  /**
   * call setup message handling.
   *
   * @private
   * @param {CallMessage} call_message_et - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _on_setup(call_message_et, source) {
    const {conversation_id, response, user_id} = call_message_et;

    this.get_call_by_id(conversation_id)
      .then((call_et) => {
        call_et.set_remote_version(call_message_et);

        if (response && user_id === this.self_user_id()) {
          this.logger.info(`Incoming call in conversation '${call_et.conversation_et.display_name()}' accepted on other device`);
          return this.delete_call(conversation_id);
        }

        return call_et.add_or_update_participant(user_id, response !== true, call_message_et)
          .then(() => {
            if (response) {
              call_et.state(z.calling.enum.CALL_STATE.CONNECTING);
            }
          });
      })
      .catch((error) => this._validate_incoming_call(call_message_et, source, error));
  }

  /**
   * call setup message handling.
   *
   * @private
   * @param {CallMessage} call_message_et - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @returns {undefined} No return value
   */
  _on_update(call_message_et) {
    const {conversation_id, user_id} = call_message_et;

    this.get_call_by_id(conversation_id)
      .then((call_et) => {
        this._validate_message_destination(call_et, call_message_et);
        return call_et.verify_session_id(call_message_et);
      })
      .then((call_et) => call_et.add_or_update_participant(user_id, false, call_message_et))
      .catch(this._throw_message_error);
  }

  /**
   * Throw error is not expected types.
   *
   * @private
   * @param {z.calling.CallError|Error} error - Error thrown during call message handling
   * @returns {undefined} No return value
   */
  _throw_message_error(error) {
    const expected_error_types = [
      z.calling.CallError.TYPE.MISTARGETED_MESSAGE,
      z.calling.CallError.TYPE.NOT_FOUND,
    ];

    if (!expected_error_types.includes(error.type)) {
      throw error;
    }
  }

  /**
   * Verify validity of incoming call.
   *
   * @param {CallMessage} call_message_et - call message to validate
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @param {z.calling.CallError|Error} error - Error thrown during call message handling
   * @returns {undefined} No return value
   */
  _validate_incoming_call(call_message_et, source, error) {
    this._throw_message_error(error);

    const {conversation_id, response, type, user_id} = call_message_et;

    const is_group_check = type === z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK;
    const is_self_user = user_id === this.self_user_id();
    const valid_message = response === is_group_check;

    if (!is_self_user && valid_message) {
      const event_from_stream = source === z.event.EventRepository.SOURCE.STREAM;
      const silent_call = is_group_check || event_from_stream;
      const promises = [this._create_incoming_call(call_message_et, source, silent_call)];

      if (!event_from_stream) {
        promises.push(this.conversation_repository.grant_message(conversation_id, z.ViewModel.MODAL_CONSENT_TYPE.INCOMING_CALL, [user_id]));
      }

      Promise.all(promises)
        .then(([call_et, granted_call]) => {
          if (granted_call) {
            const media_type = call_et.is_remote_video_send() ? z.media.MediaType.AUDIO_VIDEO : z.media.MediaType.AUDIO;
            this.join_call(conversation_id, media_type);
          }
        })
        .catch((_error) => {
          if (_error.type !== z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
            throw _error;
          }

          this.reject_call(conversation_id);
        });
    }
  }

  /**
   * Validate that content of call message is targeted at local client.
   * @param {Call} call_et - Call the message belongs to
   * @param {CallMessage} call_message_et - call message to validate
   * @returns {undefined} Resolves if the message is valid
   */
  _validate_message_destination(call_et, call_message_et) {
    if (call_et.is_group) {
      const {dest_client_id, dest_user_id, type} = call_message_et;

      if (dest_user_id !== this.self_user_id() || dest_client_id !== this.client_repository.current_client().id) {
        this.logger.log(`Ignored non-targeted call '${type}' message intended for client '${dest_client_id}' of user '${dest_user_id}'`);
        throw new z.calling.CallError(z.calling.CallError.TYPE.MISTARGETED_MESSAGE);
      }
    }
  }

  /**
   * Validate that type of call message matches conversation type.
   * @param {CallMessage} call_message_et - call message to validate
   * @returns {Promise} Resolves if the message is valid
   */
  _validate_message_type(call_message_et) {
    const {conversation_id, type} = call_message_et;

    return this.conversation_repository.get_conversation_by_id(conversation_id)
      .then((conversation_et) => {
        if (conversation_et.is_one2one()) {
          const group_message_types = [
            z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK,
            z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE,
            z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP,
            z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START,
          ];

          if (group_message_types.includes(type)) {
            throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_CONVERSATION_TYPE);
          }
        } else if (conversation_et.is_group()) {
          const one2one_message_types = [
            z.calling.enum.CALL_MESSAGE_TYPE.SETUP,
          ];

          if (one2one_message_types.includes(type)) {
            throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_CONVERSATION_TYPE);
          }
        } else {
          throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_CONVERSATION_TYPE);
        }

        return conversation_et;
      });
  }


  //##############################################################################
  // Outbound call events
  //##############################################################################

  /**
   * Send an call event.
   *
   * @param {z.entity.Conversation} conversation_et - Conversation to send message in
   * @param {CallMessage} call_message_et - call message entity
   * @returns {Promise} Resolves when the event has been sent
   */
  send_call_message(conversation_et, call_message_et) {
    if (!_.isObject(call_message_et)) {
      throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_PAYLOAD_FORMAT);
    }

    const {conversation_id, remote_user_id, type} = call_message_et;

    return this.get_call_by_id(conversation_id || conversation_et.id)
      .then((call_et) => {
        if (!CallingRepository.CONFIG.DATA_CHANNEL_MESSAGE_TYPES.includes(type)) {
          throw new z.calling.CallError(z.calling.CallError.TYPE.NO_DATA_CHANNEL);
        }

        return call_et.get_participant_by_id(remote_user_id);
      })
      .then(({flow_et}) => flow_et.send_message(call_message_et))
      .catch((error) => {
        const expected_error_types = [
          z.calling.CallError.TYPE.NO_DATA_CHANNEL,
          z.calling.CallError.TYPE.NOT_FOUND,
        ];

        if (!expected_error_types.includes(error.type)) {
          throw error;
        }

        return this._limit_message_recipients(call_message_et)
          .then(({precondition_option, recipients}) => {
            if (type === z.calling.enum.CALL_MESSAGE_TYPE.HANGUP) {
              call_message_et.type = z.calling.enum.CALL_MESSAGE_TYPE.CANCEL;
            }

            return this.conversation_repository.send_e_call(conversation_et, call_message_et, recipients, precondition_option);
          });
      })
      .then(() => this._log_message(true, call_message_et));
  }

  /**
   *
   * @private
   * @param {Call} call_et - Call entity
   * @param {CallMessage} incoming_call_message_et - Incoming call message
   * @returns {Promise} Resolves with the call
   */
  _confirm_call_message(call_et, incoming_call_message_et) {
    const {response} = incoming_call_message_et;

    if (response) {
      return Promise.resolve(call_et);
    }

    return call_et.confirm_message(incoming_call_message_et).then(() => call_et);
  }

  /**
   * Limit the message recipients for a call message.
   *
   * @private
   * @param {CallMessage} call_message_et - Call message to target at clients
   * @returns {Promise} Resolves with the client user map and precondition option
   */
  _limit_message_recipients(call_message_et) {
    const {remote_client_id, remote_user, remote_user_id, response, type} = call_message_et;
    let recipients_promise;

    if (type === z.calling.enum.CALL_MESSAGE_TYPE.REJECT) {
      recipients_promise = Promise.resolve({self_user_et: this.user_repository.self()});
    } else if (remote_user) {
      recipients_promise = Promise.resolve({remote_user_et: remote_user, self_user_et: this.user_repository.self()});
    } else {
      recipients_promise = this.user_repository.get_user_by_id(remote_user_id)
        .then((remote_user_et) => ({remote_user_et: remote_user_et, self_user_et: this.user_repository.self()}));
    }

    return recipients_promise
      .then(({remote_user_et, self_user_et}) => {
        let precondition_option, recipients;

        switch (type) {
          case z.calling.enum.CALL_MESSAGE_TYPE.CANCEL: {
            if (response === true) {
              // Send to remote client that initiated call
              precondition_option = true;
              recipients = {
                [remote_user_et.id]: [`${remote_client_id}`],
              };
            } else {
              // Send to all clients of remote user
              precondition_option = [remote_user_et.id];
              recipients = {
                [remote_user_et.id]: remote_user_et.devices().map((device) => device.id),
              };
            }
            break;
          }

          case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP:
          case z.calling.enum.CALL_MESSAGE_TYPE.HANGUP:
          case z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC:
          case z.calling.enum.CALL_MESSAGE_TYPE.UPDATE: {
            // Send to remote client that call is connected with
            if (remote_client_id) {
              precondition_option = true;
              recipients = {
                [remote_user_et.id]: [`${remote_client_id}`],
              };
            }
            break;
          }

          case z.calling.enum.CALL_MESSAGE_TYPE.REJECT: {
            // Send to all clients of self user
            precondition_option = [self_user_et.id];
            recipients = {
              [self_user_et.id]: self_user_et.devices().map((device) => device.id),
            };
            break;
          }

          case z.calling.enum.CALL_MESSAGE_TYPE.SETUP: {
            if (response === true) {
              // Send to remote client that initiated call and all clients of self user
              precondition_option = [self_user_et.id];
              recipients = {
                [remote_user_et.id]: [`${remote_client_id}`],
                [self_user_et.id]: self_user_et.devices().map((device) => device.id),
              };
            } else {
              // Send to all clients of remote user
              precondition_option = [remote_user_et.id];
              recipients = {
                [remote_user_et.id]: remote_user_et.devices().map((device) => device.id),
              };
            }
            break;
          }

          default: {
            break;
          }
        }

        return {precondition_option: precondition_option, recipients: recipients};
      });
  }


  //##############################################################################
  // Call actions
  //##############################################################################

  /**
   * Delete an call.
   * @param {string} conversation_id - ID of conversation to delete call from
   * @returns {undefined} No return value
   */
  delete_call(conversation_id) {
    this.get_call_by_id(conversation_id)
      .then((call_et) => {
        this.logger.info(`Deleting call in conversation '${conversation_id}'`, call_et);

        call_et.delete_call();
        this.calls.remove((call) => call.id === conversation_id);
        this.media_stream_handler.reset_media_stream();
      })
      .catch((error) => {
        if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * Join a call.
   *
   * @param {string} conversation_id - ID of conversation to join call in
   * @param {z.media.MediaType} media_type - Media type for this call
   * @returns {undefined} No return value
   */
  join_call(conversation_id, media_type) {
    this.get_call_by_id(conversation_id)
      .then((call_et) => ({call_et: call_et, call_state: call_et.state()}))
      .catch((error) => {
        if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
          throw error;
        }

        return {call_state: z.calling.enum.CALL_STATE.OUTGOING};
      })
      .then(({call_et, call_state}) => {
        return this._check_calling_support(conversation_id, call_state)
          .then(() => this._check_concurrent_joined_call(conversation_id, call_state))
          .then(() => {
            if (call_et) {
              return call_et;
            }

            const video_send = media_type === z.media.MediaType.AUDIO_VIDEO;
            const prop_sync_payload = z.calling.CallMessageBuilder.create_payload_prop_sync(this.self_state, video_send, false, {conversation_id: conversation_id});
            return this._create_outgoing_call(z.calling.CallMessageBuilder.build_prop_sync(false, undefined, prop_sync_payload));
          });
      })
      .then((call_et) => {
        this.logger.info(`Joining call in conversation '${conversation_id}'`, call_et);

        call_et.initiate_telemetry(media_type);
        if (this.media_stream_handler.local_media_stream()) {
          return call_et;
        }

        return this.media_stream_handler.initiate_media_stream(conversation_id, media_type)
          .then(() => call_et);
      })
      .then((call_et) => {
        call_et.timings.time_step(z.telemetry.calling.CallSetupSteps.STREAM_RECEIVED);
        call_et.join_call();
      })
      .catch((error) => {
        if (error.type !== z.calling.CallError.TYPE.NOT_SUPPORTED) {
          this.delete_call(conversation_id);
          if (!(error instanceof z.media.MediaError)) {
            throw error;
          }
        }
      });
  }

  /**
   * User action to leave an call.
   *
   * @param {string} conversation_id - ID of conversation to leave call in
   * @param {z.calling.enum.TERMINATION_REASON} termination_reason - Reason for call termination
   * @returns {undefined} No return value
   */
  leave_call(conversation_id, termination_reason) {
    this.get_call_by_id(conversation_id)
      .then((call_et) => {
        this.logger.info(`Leaving call in conversation '${conversation_id}' triggered by '${termination_reason}'`, call_et);

        if (call_et.state() !== z.calling.enum.CALL_STATE.ONGOING) {
          termination_reason = undefined;
        }

        this.media_stream_handler.release_media_stream();
        call_et.leave_call(termination_reason);
      })
      .catch((error) => {
        if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * Remove a participant from an call if he was removed from the group.
   *
   * @param {string} conversation_id - ID of conversation for which the user should be removed from the call
   * @param {string} user_id - ID of user to be removed
   * @returns {undefined} No return value
   */
  participant_left(conversation_id, user_id) {
    const additional_payload = z.calling.CallMessageBuilder.create_payload(conversation_id, this.self_user_id(), user_id);
    const call_message_et = z.calling.CallMessageBuilder.build_group_leave(false, this.session_id, additional_payload);

    this._on_group_leave(call_message_et, z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE);
  }

  /**
   * User action to reject incoming call.
   * @param {string} conversation_id - ID of conversation to ignore call in
   * @returns {undefined} No return value
   */
  reject_call(conversation_id) {
    this.get_call_by_id(conversation_id)
      .then((call_et) => {
        this.logger.info(`Rejecting call in conversation '${conversation_id}'`, call_et);

        call_et.reject_call();
      })
      .catch((error) => {
        if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * User action to toggle one of the media stats of an call.
   *
   * @param {string} conversation_id - ID of conversation with call
   * @param {z.media.MediaType} media_type - MediaType of requested change
   * @returns {undefined} No return value
   */
  toggle_media(conversation_id, media_type) {
    this.get_call_by_id(conversation_id)
      .then((call_et) => call_et.toggle_media(media_type))
      .then(() => {
        switch (media_type) {
          case z.media.MediaType.AUDIO:
            return this.media_stream_handler.toggle_audio_send();
          case z.media.MediaType.SCREEN:
            return this.media_stream_handler.toggle_screen_send();
          case z.media.MediaType.VIDEO:
            return this.media_stream_handler.toggle_video_send();
          default:
            throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
        }
      })
      .catch((error) => {
        if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * User action to toggle the call state.
   *
   * @param {z.media.MediaType} media_type - Media type of call
   * @param {Conversation} [conversation_et=this.conversation_repository.active_conversation()] - Conversation for which state will be toggled
   * @returns {undefined} No return value
   */
  toggle_state(media_type, conversation_et = this.conversation_repository.active_conversation()) {
    if (conversation_et) {
      if (conversation_et.id === this._self_client_on_a_call()) {
        return this.leave_call(conversation_et.id);
      }

      const is_video_call = media_type === z.media.MediaType.AUDIO_VIDEO;
      if (conversation_et.is_group() && is_video_call) {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CALL_NO_VIDEO_IN_GROUP);
      } else {
        this.join_call(conversation_et.id, media_type);
      }
    }
  }

  /**
   * Check whether conversation supports calling.
   * @param {string} conversation_id - ID of conversation to join call in
   * @param {z.calling.enum.CALL_STATE} call_state - Current state of call
   * @returns {Promise} Resolves when conversation supports calling
   */
  _check_calling_support(conversation_id, call_state) {
    return this.conversation_repository.get_conversation_by_id(conversation_id)
      .then(({participating_user_ids}) => {
        if (!participating_user_ids().length) {
          amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CALL_EMPTY_CONVERSATION);
          throw new z.calling.CallError(z.calling.CallError.TYPE.NOT_SUPPORTED);
        }

        const is_outgoing_call = call_state === z.calling.enum.CALL_STATE.OUTGOING;
        if (is_outgoing_call && !z.calling.CallingRepository.supports_calling) {
          amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.UNSUPPORTED_OUTGOING_CALL);
          throw new z.calling.CallError(z.calling.CallError.TYPE.NOT_SUPPORTED);
        }
      });
  }

  /**
   * Check whether we are actively participating in a call.
   *
   * @private
   * @param {string} new_call_id - Conversation ID of call about to be joined
   * @param {z.calling.enum.CALL_STATE} call_state - Call state of new call
   * @returns {Promise} Resolves when the new call was joined
   */
  _check_concurrent_joined_call(new_call_id, call_state) {
    return new Promise((resolve) => {
      const ongoing_call_id = this._self_participant_on_a_call();

      if (ongoing_call_id) {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CALL_START_ANOTHER, {
          action() {
            amplify.publish(z.event.WebApp.CALL.STATE.LEAVE, ongoing_call_id, z.calling.enum.TERMINATION_REASON.CONCURRENT_CALL);
            window.setTimeout(resolve, 1000);
          },
          close() {
            if (call_state === z.calling.enum.CALL_STATE.INCOMING) {
              amplify.publish(z.event.WebApp.CALL.STATE.REJECT, new_call_id);
            }
          },
          data: call_state,
        });
        this.logger.warn(`You cannot join a second call while calling in conversation '${ongoing_call_id}'.`);
      } else {
        resolve();
      }
    });
  }


  //##############################################################################
  // call entity creation
  //##############################################################################

  /**
   * Constructs a call entity.
   *
   * @private
   * @param {CallMessage} call_message_et - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @param {z.entity.User} creating_user_et - User that created call
   * @returns {Promise} Resolves with the new call entity
   */
  _create_call(call_message_et, creating_user_et) {
    const {conversation_id, session_id} = call_message_et;

    return this.get_call_by_id(conversation_id)
      .catch(() => {
        return this.conversation_repository.get_conversation_by_id(conversation_id)
          .then((conversation_et) => {
            const call_et = new z.calling.entities.Call(conversation_et, creating_user_et, session_id, this);

            this.calls.push(call_et);
            return call_et;
          });
      });
  }

  /**
   * Constructs an incoming call entity.
   *
   * @private
   * @param {CallMessage} call_message_et - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @param {boolean} [silent=false] - Start call in rejected mode
   * @returns {Promise} Resolves with the new call entity
   */
  _create_incoming_call(call_message_et, source, silent = false) {
    const {conversation_id, props, user_id} = call_message_et;

    return this.user_repository.get_user_by_id(user_id)
      .then((remote_user_et) => this._create_call(call_message_et, remote_user_et))
      .then((call_et) => {
        this.logger.info(`Incoming '${this._get_media_type_from_properties(props)}' call in conversation '${call_et.conversation_et.display_name()}'`, call_et);

        call_et.direction = z.calling.enum.CALL_STATE.INCOMING;
        call_et.set_remote_version(call_message_et);
        call_et.state(silent ? z.calling.enum.CALL_STATE.REJECTED : z.calling.enum.CALL_STATE.INCOMING);

        return call_et.add_or_update_participant(user_id, false, call_message_et)
          .then(() => {
            this.telemetry.track_event(z.tracking.EventName.CALLING.RECEIVED_CALL, call_et);
            this.inject_activate_event(call_message_et, source);

            const event_from_web_socket = source === z.event.EventRepository.SOURCE.WEB_SOCKET;
            if (event_from_web_socket && call_et.is_remote_video_send()) {
              this.media_stream_handler.initiate_media_stream(call_et.id, z.media.MediaType.AUDIO_VIDEO);
            }

            return call_et;
          });
      })
      .catch((error) => {
        this.delete_call(conversation_id);

        if (!(error instanceof z.media.MediaError)) {
          throw error;
        }
      });
  }

  /**
   * Constructs an outgoing call entity.
   *
   * @private
   * @param {CallMessage} call_message_et - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC
   * @returns {Promise} Resolves with the new call entity
   */
  _create_outgoing_call(call_message_et) {
    const {props} = call_message_et;

    return this._create_call(call_message_et, this.user_repository.self())
      .then((call_et) => {
        const media_type = this._get_media_type_from_properties(props);
        this.logger.info(`Outgoing '${media_type}' call in conversation '${call_et.conversation_et.display_name()}'`, call_et);

        call_et.direction = z.calling.enum.CALL_STATE.OUTGOING;
        call_et.state(z.calling.enum.CALL_STATE.OUTGOING);

        this.telemetry.set_media_type(media_type);
        this.telemetry.track_event(z.tracking.EventName.CALLING.INITIATED_CALL, call_et);
        return call_et;
      });
  }


  //##############################################################################
  // Notifications
  //##############################################################################

  /**
   * Inject a call activate event.
   * @param {CallMessage} call_message_et - call message to create event from
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  inject_activate_event(call_message_et, source) {
    const activate_event = z.conversation.EventBuilder.build_voice_channel_activate(call_message_et);
    amplify.publish(z.event.WebApp.EVENT.INJECT, activate_event, source);
  }

  /**
   * Inject a call deactivate event.
   * @param {CallMessage} call_message_et - Call message to create event from
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @param {z.entity.User} [creating_user_et] - User that created call
   * @param {z.calling.enum.TERMINATION_REASON} [reason] - Reason for call to end
   * @returns {undefined} No return value
   */
  inject_deactivate_event(call_message_et, source, creating_user_et, reason) {
    const deactivate_event = z.conversation.EventBuilder.build_voice_channel_deactivate(call_message_et, creating_user_et, reason);
    amplify.publish(z.event.WebApp.EVENT.INJECT, deactivate_event, source);
  }


  //##############################################################################
  // Helper functions
  //##############################################################################

  /**
   * Get an call entity for a given conversation ID.
   * @param {string} conversation_id - ID of Conversation of requested call
   * @returns {Promise} Resolves with the call entity for conversation ID
   */
  get_call_by_id(conversation_id) {
    if (conversation_id) {
      for (const call_et of this.calls()) {
        if (call_et.id === conversation_id) {
          return Promise.resolve(call_et);
        }
      }

      return Promise.reject(new z.calling.CallError(z.calling.CallError.TYPE.NOT_FOUND));
    }

    return Promise.reject(new z.calling.CallError(z.calling.CallError.TYPE.NO_CONVERSATION_ID));
  }

  /**
   * Leave a call we are joined immediately in case the browser window is closed.
   * @note Should only used by "window.onbeforeunload".
   * @returns {undefined} No return value
   */
  leave_call_on_unload() {
    const conversation_id = this._self_client_on_a_call();

    if (conversation_id) {
      this.leave_call(conversation_id);
    }
  }

  /**
   * Get the MediaType from given call event properties.
   * @param {Object} properties - call event properties
   * @returns {z.media.MediaType} MediaType of call
   */
  _get_media_type_from_properties(properties) {
    if (properties && properties.videosend === z.calling.enum.PROPERTY_STATE.TRUE) {
      return z.media.MediaType.VIDEO;
    }

    return z.media.MediaType.AUDIO;
  }

  /**
   * Check if self client is participating in a call.
   * @private
   * @returns {string|boolean} Conversation ID of call or false
   */
  _self_client_on_a_call() {
    for (const call_et of this.calls()) {
      if (call_et.self_client_joined()) {
        return call_et.id;
      }
    }

    return false;
  }

  /**
   * Check if self participant is participating in a call.
   * @private
   * @returns {string|boolean} Conversation ID of call or false
   */
  _self_participant_on_a_call() {
    for (const call_et of this.calls()) {
      if (call_et.self_user_joined()) {
        return call_et.id;
      }
    }

    return false;
  }


  //##############################################################################
  // Calling config
  //##############################################################################

  /**
   * Get the current calling config.
   * @returns {Promise} Resolves with calling config
   */
  get_config() {
    if (this.calling_config) {
      const is_expired_config = this.calling_config.expiration.getTime() < Date.now();

      if (!is_expired_config) {
        this.logger.debug('Returning local calling configuration. No update needed.', this.calling_config);
        return Promise.resolve(this.calling_config);
      }

      this._clear_config();
    }

    return this._get_config_from_backend();
  }

  _clear_config() {
    if (this.calling_config) {
      this.logger.debug(`Removing calling configuration with expiration of '${this.calling_config.expiration.toISOString()}'`);
      this.calling_config = undefined;
    }
  }

  _clear_config_timeout() {
    if (this.calling_config_timeout) {
      window.clearTimeout(this.calling_config_timeout);
      this.calling_config_timeout = undefined;
    }
  }

  /**
   * Get the calling config from the backend and store it.
   *
   * @private
   * @returns {Promise} Resolves with the updated calling config
   */
  _get_config_from_backend() {
    return this.calling_service.get_config()
      .then((calling_config) => {
        if (calling_config) {
          this._clear_config_timeout();

          const ttl = (calling_config.ttl * .9) || CallingRepository.CONFIG.DEFAULT_CONFIG_TTL;
          const timeout = Math.min(ttl, CallingRepository.CONFIG.DEFAULT_CONFIG_TTL) * 1000;
          const expiration_date = new Date(Date.now() + timeout);
          calling_config.expiration = expiration_date;

          this.logger.info(`Updated calling configuration expires on '${expiration_date.toISOString()}'`, calling_config);
          this.calling_config = calling_config;

          this.calling_config_timeout = window.setTimeout(() => {
            this._clear_config();
            this.get_config();
          }, timeout);

          return this.calling_config;
        }
      });
  }


  //##############################################################################
  // Logging
  //##############################################################################

  /**
   * Print the call message log.
   * @returns {undefined} No return value
   */
  print_log() {
    this.logger.force_log(`Call message log contains '${this.message_log.length}' events`, this.message_log);
    this.message_log.forEach(({date, log, message}) => {
      this.logger.force_log(`${date} - ${log}`, message);
    });
  }

  /**
   * Report a call for call analysis.
   * @param {string} conversation_id - ID of conversation
   * @returns {undefined} No return value
   */
  report_call(conversation_id) {
    this.get_call_by_id(conversation_id)
      .catch(() => {
        for (const call_et of this.calls()) {
          if (!z.calling.enum.CALL_STATE_GROUP.IS_ENDED.includes(call_et.state())) {
            return call_et;
          }
        }
      })
      .then((call_et) => {
        if (call_et) {
          return this._send_report(call_et.get_flows().map((flow_et) => flow_et.report_status()));
        }

        if (this.flow_status) {
          return this._send_report(this.flow_status);
        }

        this.logger.warn('Could not find flows to report for call analysis');
      });
  }

  /**
   * Set logging on adapter.js.
   * @param {boolean} is_debugging_enabled - Updated debug state
   * @returns {undefined} No return value
   */
  set_debug_state(is_debugging_enabled) {
    if (this.debug_enabled !== is_debugging_enabled) {
      this.debug_enabled = is_debugging_enabled;
      this.logger.debug(`Debugging enabled state set to '${is_debugging_enabled}'`);
      if (!is_debugging_enabled) {
        this.message_log.length = 0;
      }
    }

    if (adapter) {
      this.logger.debug(`Set logging for WebRTC Adapter: ${is_debugging_enabled}`);
      adapter.disableLog = !is_debugging_enabled;
    }
  }

  /**
   * Store last flow status.
   * @param {Object} flow_status - Status to store
   * @returns {undefined} No return value
   */
  store_flow_status(flow_status) {
    if (flow_status) {
      this.flow_status = flow_status;
    }
  }

  /**
   * Log call messages for debugging.
   *
   * @private
   * @param {boolean} is_outgoing - Is message outgoing
   * @param {CallMessage} call_message_et - Call message to be logged in the sequence
   * @param {string} [date] - Date of message as ISO string
   * @returns {undefined} No return value
   */
  _log_message(is_outgoing, call_message_et, date = new Date().toISOString()) {
    while (this.message_log.length >= CallingRepository.CONFIG.MESSAGE_LOG_LENGTH) {
      this.message_log.shift();
    }

    const {conversation_id, dest_user_id, remote_user_id, response, type, user_id} = call_message_et;

    let log_message;
    if (is_outgoing) {
      if (remote_user_id) {
        log_message = `Sending '${type}' message (response: ${response}) to user '${remote_user_id}' in conversation '${conversation_id}'`;
      } else {
        log_message = `Sending '${type}' message (response: ${response}) to conversation '${conversation_id}'`;
      }
    } else {
      if (dest_user_id && dest_user_id !== this.self_user_id()) {
        return;
      }

      log_message = `Received '${type}' message (response: ${response}) from user '${user_id}' in conversation '${conversation_id}'`;
    }

    this.logger.info(log_message, call_message_et);

    if (this.debug_enabled) {
      const log_entry = {
        date: date,
        log: log_message,
        message: call_message_et,
      };

      this.message_log.push(log_entry);
    }
  }

  /**
   * Send Raygun report.
   *
   * @private
   * @param {Object} custom_data - Information to add to the call report
   * @returns {undefined} No return value
   */
  _send_report(custom_data) {
    Raygun.send(new Error('Call failure report'), custom_data);
    this.logger.debug(`Reported status of flow id '${custom_data.meta.flow_id}' for call analysis`, custom_data);
  }
};
