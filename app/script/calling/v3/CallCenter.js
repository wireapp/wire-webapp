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
window.z.calling.v3 = z.calling.v3 || {};


z.calling.v3.CallCenter = class CallCenter {
  /**
   * Construct a new e-call center.
   *
   * @param {ko.observable} calling_config - Calling configuration from backend
   * @param {z.client.ClientRepository} client_repository - Repository for client interactions
   * @param {z.conversation.ConversationRepository} conversation_repository - Repository for conversation interactions
   * @param {z.media.MediaRepository} media_repository - Repository for media interactions
   * @param {z.user.UserRepository} user_repository - Repository for all user and connection interactions
   */
  constructor(calling_config, client_repository, conversation_repository, media_repository, user_repository) {
    this.calling_config = calling_config;
    this.client_repository = client_repository;
    this.conversation_repository = conversation_repository;
    this.media_repository = media_repository;
    this.user_repository = user_repository;
    this.logger = new z.util.Logger('z.calling.v3.CallCenter', z.config.LOGGER.OPTIONS);

    // Telemetry
    this.telemetry = new z.telemetry.calling.CallTelemetry(z.calling.enum.PROTOCOL.VERSION_3);

    // Media Handler
    this.media_devices_handler = this.media_repository.devices_handler;
    this.media_stream_handler = this.media_repository.stream_handler;
    this.media_element_handler = this.media_repository.element_handler;

    this.e_calls = ko.observableArray([]);
    this.joined_e_call = ko.pureComputed(() => {
      for (const e_call_et of this.e_calls()) {
        if (e_call_et.self_client_joined()) {
          return e_call_et;
        }
      }
    });

    this.self_state = this.media_stream_handler.self_stream_state;

    this.block_media_stream = true;
    this.subscribe_to_events();
  }

  /**
   * Subscribe to amplify topics.
   * @returns {undefined} No return value
   */
  subscribe_to_events() {
    amplify.subscribe(z.event.WebApp.CALL.EVENT_FROM_BACKEND, this.on_event.bind(this));
    amplify.subscribe(z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, this.set_notification_handling_state.bind(this));
    amplify.subscribe(z.util.Logger.prototype.LOG_ON_DEBUG, this.set_logging.bind(this));
  }

  /**
   * Set the notification handling state.
   *
   * @note Temporarily ignore call related events when handling notifications from the stream
   * @param {z.event.NOTIFICATION_HANDLING_STATE} handling_state - State of the notifications stream handling
   * @returns {undefined} No return value
   */
  set_notification_handling_state(handling_state) {
    const new_block_media_stream_state = handling_state !== z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    if (this.block_media_stream !== new_block_media_stream_state) {
      this.block_media_stream = new_block_media_stream_state;
      this.logger.debug(`Block requesting MediaStream: ${this.block_media_stream}`);
    }
  }


  //##############################################################################
  // Inbound e-call events
  //##############################################################################

  /**
   * Handle incoming calling events from backend.
   * @param {Object} event - Event payload
   * @returns {undefined} No return value
   */
  on_event(event) {
    const {type: event_type, content: event_content} = event;

    if (event_type === z.event.Client.CALL.E_CALL) {
      if (event_content.version !== z.calling.enum.PROTOCOL.VERSION_3) {
        throw new z.calling.v3.CallError(z.calling.v3.CallError.TYPE.UNSUPPORTED_VERSION);
      }
      const e_call_message_et = z.calling.mapper.ECallMessageMapper.map_event(event);

      if (z.calling.CallingRepository.supports_calling) {
        return this._on_event_in_supported_browsers(e_call_message_et);
      }
      this._on_event_in_unsupported_browsers(e_call_message_et);
    }
  }

  /**
   * E-call event handling for browsers supporting calling.
   * @private
   * @param {ECallMessage} e_call_message_et - Mapped incoming e-call message entity
   * @returns {undefined} No return value
   */
  _on_event_in_supported_browsers(e_call_message_et) {
    const {conversation_id, response, type, user_id} = e_call_message_et;

    this.logger.info(`Received e-call '${type}' message (response: ${response}) from user '${user_id}' in conversation '${conversation_id}'`, e_call_message_et);

    this._validate_message_type(e_call_message_et)
    .then(() => {
      switch (type) {
        case z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL:
          this._on_cancel(e_call_message_et);
          break;
        case z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_CHECK:
          this._on_group_check(e_call_message_et);
          break;
        case z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_LEAVE:
          this._on_group_leave(e_call_message_et);
          break;
        case z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP:
          this._on_group_setup(e_call_message_et);
          break;
        case z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_START:
          this._on_group_start(e_call_message_et);
          break;
        case z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP:
          this._on_hangup(e_call_message_et);
          break;
        case z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC:
          this._on_prop_sync(e_call_message_et);
          break;
        case z.calling.enum.E_CALL_MESSAGE_TYPE.REJECT:
          this._on_reject(e_call_message_et);
          break;
        case z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP:
          this._on_setup(e_call_message_et);
          break;
        case z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE:
          this._on_update(e_call_message_et);
          break;
        default:
          this.logger.warn(`E-call event of unknown type '${type}' was ignored`, e_call_message_et);
      }
    });
  }

  /**
   * E-call event handling for browsers not supporting calling.
   * @private
   * @param {ECallMessage} e_call_message_et - Mapped incoming e-call message entity
   * @returns {undefined} No return value
   */
  _on_event_in_unsupported_browsers(e_call_message_et) {
    const {conversation_id, response, type, user_id} = e_call_message_et;

    if (!response) {
      switch (type) {
        case z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP: {
          this.inject_activate_event(e_call_message_et);
          this.user_repository.get_user_by_id(user_id)
            .then((user_et) => {
              amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL, {
                call_id: conversation_id,
                first_name: user_et.name(),
              });
            });
          break;
        }

        case z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL: {
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
   * E-call cancel message handling.
   *
   * @private
   * @param {ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
   * @returns {undefined} No return value
   */
  _on_cancel(e_call_message_et) {
    const {client_id, conversation_id, response, user_id} = e_call_message_et;

    if (!response) {
      this.get_e_call_by_id(conversation_id)
        .then((e_call_et) => e_call_et.verify_session_id(e_call_message_et))
        .then((e_call_et) => e_call_et.delete_e_participant(user_id, client_id, z.calling.enum.TERMINATION_REASON.OTHER_USER))
        .then((e_call_et) => e_call_et.deactivate_call(e_call_message_et, z.calling.enum.TERMINATION_REASON.OTHER_USER))
        .catch((error) => {
          if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
            this.inject_deactivate_event(e_call_message_et);
            throw error;
          }
        });
    }
  }

  /**
   * E-call group check message handling.
   *
   * @private
   * @param {ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_CHECK
   * @returns {undefined} No return value
   */
  _on_group_check(e_call_message_et) {
    const {conversation_id, user_id} = e_call_message_et;

    this.get_e_call_by_id(conversation_id)
      .then((e_call_et) => {
        // @todo Grant message for ongoing call

        e_call_et.schedule_group_check();
      })
      .catch((error) => {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }

        if (user_id !== this.user_repository.self().id) {
          this.conversation_repository.grant_message(conversation_id, z.ViewModel.MODAL_CONSENT_TYPE.INCOMING_CALL, [user_id])
            .then(() => {
              this._create_incoming_e_call(e_call_message_et, true);
            });
        }
      });
  }

  /**
   * E-call group leave message handling.
   *
   * @private
   * @param {ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_LEAVE
   * @returns {undefined} No return value
   */
  _on_group_leave(e_call_message_et) {
    const {conversation_id, client_id, user_id} = e_call_message_et;

    this.get_e_call_by_id(conversation_id)
      .then((e_call_et) => e_call_et.delete_e_participant(user_id, client_id, z.calling.enum.TERMINATION_REASON.OTHER_USER))
      .then((e_call_et) => e_call_et.check_activity(z.calling.enum.TERMINATION_REASON.OTHER_USER))
      .catch(function(error) {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * E-call group setup message handling.
   *
   * @private
   * @param {ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP
   * @returns {undefined} No return value
   */
  _on_group_setup(e_call_message_et) {
    const {conversation_id, dest_client_id, dest_user_id, response, user_id} = e_call_message_et;

    if (dest_user_id !== this.user_repository.self().id || dest_client_id !== this.client_repository.current_client().id) {
      return this.logger.log(`Ignored non-targeted e-call group setup intended for client '${dest_client_id}' of user '${dest_user_id}'`);
    }

    this.get_e_call_by_id(conversation_id)
      .then((e_call_et) => {
        // @todo Grant message for ongoing call

        e_call_et.set_remote_version(e_call_message_et);
        e_call_et.update_e_participant(user_id, e_call_message_et, response !== true);
      })
      .catch(function(error) {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * E-call group start message handling.
   *
   * @private
   * @param {ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_START
   * @returns {undefined} No return value
   */
  _on_group_start(e_call_message_et) {
    const {conversation_id, user_id} = e_call_message_et;

    this.get_e_call_by_id(conversation_id)
      .then((e_call_et) => {
        // @todo Grant message for ongoing call

        if (user_id === this.user_repository.self().id) {
          e_call_et.self_user_joined(true);
          e_call_et.state(z.calling.enum.CALL_STATE.REJECTED);
        }

        if (e_call_et.state() === z.calling.enum.CALL_STATE.OUTGOING) {
          e_call_et.state(z.calling.enum.CALL_STATE.CONNECTING);
        }

        // add the correct participant, start negotiating
        this.user_repository.get_user_by_id(user_id)
          .then((remote_user_et) => e_call_et.add_e_participant(remote_user_et, e_call_message_et, e_call_et.self_client_joined()));
      })
      .catch((error) => {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }

        if (user_id !== this.user_repository.self().id) {
          this.conversation_repository.grant_message(conversation_id, z.ViewModel.MODAL_CONSENT_TYPE.INCOMING_CALL, [user_id])
            .then(() => this._create_incoming_e_call(e_call_message_et));
        }
      });
  }

  /**
   * E-call hangup message handling.
   *
   * @private
   * @param {ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP
   * @returns {undefined} No return value
   */
  _on_hangup(e_call_message_et) {
    const {conversation_id, client_id, response, user_id} = e_call_message_et;

    if (!response) {
      this.get_e_call_by_id(conversation_id)
        .then((e_call_et) => e_call_et.verify_session_id(e_call_message_et))
        .then((e_call_et) => {
          this._confirm_e_call_message(e_call_et, e_call_message_et);
          return e_call_et.delete_e_participant(user_id, client_id, z.calling.enum.TERMINATION_REASON.OTHER_USER);
        })
        .then((e_call_et) => e_call_et.deactivate_call(e_call_message_et, z.calling.enum.TERMINATION_REASON.OTHER_USER))
        .catch(function(error) {
          if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
            throw error;
          }
        });
    }
  }

  /**
   * E-call prop-sync message handling.
   *
   * @private
   * @param {ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
   * @returns {undefined} No return value
   */
  _on_prop_sync(e_call_message_et) {
    const {conversation_id, user_id} = e_call_message_et;

    this.get_e_call_by_id(conversation_id)
      .then((e_call_et) => e_call_et.verify_session_id(e_call_message_et))
      .then((e_call_et) => {
        this._confirm_e_call_message(e_call_et, e_call_message_et);
        e_call_et.update_e_participant(user_id, e_call_message_et);
      })
      .catch(function(error) {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * E-call reject message handling.
   *
   * @private
   * @param {ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.REJECT
   * @returns {undefined} No return value
   */
  _on_reject(e_call_message_et) {
    const {conversation_id, user_id} = e_call_message_et;

    this.get_e_call_by_id(conversation_id)
      .then((e_call_et) => {
        if (user_id !== this.user_repository.self().id) {
          throw new z.calling.v3.CallError(z.calling.v3.CallError.TYPE.WRONG_SENDER, 'Call rejected by wrong user');
        }

        this.logger.info(`Rejecting e-call in conversation '${conversation_id}'`, e_call_et);
        e_call_et.state(z.calling.enum.CALL_STATE.REJECTED);
        this.media_stream_handler.reset_media_stream();
      })
      .catch(function(error) {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * E-call setup message handling.
   *
   * @private
   * @param {ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
   * @returns {undefined} No return value
   */
  _on_setup(e_call_message_et) {
    const {conversation_id, response, user_id} = e_call_message_et;

    this.get_e_call_by_id(conversation_id)
      .then((e_call_et) => {
        e_call_et.set_remote_version(e_call_message_et);

        if (response) {
          switch (e_call_et.state()) {
            case z.calling.enum.CALL_STATE.INCOMING: {
              this.logger.info(`Incoming e-call in conversation '${e_call_et.conversation_et.display_name()}' accepted on other device`);
              return this.delete_call(conversation_id);
            }

            case z.calling.enum.CALL_STATE.OUTGOING: {
              return e_call_et.update_e_participant(user_id, e_call_message_et)
                .then(() => e_call_et.state(z.calling.enum.CALL_STATE.CONNECTING));
            }

            default: {
              break;
            }
          }
        }

        this.user_repository.get_user_by_id(user_id)
          .then((remote_user_et) => e_call_et.add_e_participant(remote_user_et, e_call_message_et, true));
      })
      .catch((error) => {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }

        if (!response && user_id !== this.user_repository.self().id) {
          this.conversation_repository.grant_message(conversation_id, z.ViewModel.MODAL_CONSENT_TYPE.INCOMING_CALL, [user_id])
            .then(() => this._create_incoming_e_call(e_call_message_et));
        }
      });
  }

  /**
   * E-call setup message handling.
   *
   * @private
   * @param {ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
   * @returns {undefined} No return value
   */
  _on_update(e_call_message_et) {
    const {conversation_id, user_id} = e_call_message_et;

    this.get_e_call_by_id(conversation_id)
      .then((e_call_et) => e_call_et.verify_session_id(e_call_message_et))
      .then((e_call_et) => e_call_et.update_e_participant(user_id, e_call_message_et))
      .catch(function(error) {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * Validate that type of e-call message matches conversation type.
   * @param {ECallMessage} e_call_message_et - E-call message to validate
   * @returns {Promise} Resolves if the message is valid
   */
  _validate_message_type(e_call_message_et) {
    const {conversation_id, type} = e_call_message_et;

    return this.conversation_repository.get_conversation_by_id_async(conversation_id)
      .then(function(conversation_et) {
        if (conversation_et.is_one2one()) {
          const group_message_types = [
            z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_CHECK,
            z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_LEAVE,
            z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP,
            z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_START,
          ];

          if (group_message_types.includes(type)) {
            throw new z.calling.v3.CallError(z.calling.v3.CallError.TYPE.WRONG_CONVERSATION_TYPE);
          }
        } else if (conversation_et.is_group()) {
          const one2one_message_types = [
            z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP,
          ];

          if (one2one_message_types.includes(type)) {
            throw new z.calling.v3.CallError(z.calling.v3.CallError.TYPE.WRONG_CONVERSATION_TYPE);
          }
        } else {
          throw new z.calling.v3.CallError(z.calling.v3.CallError.TYPE.WRONG_CONVERSATION_TYPE);
        }
      });
  }


  //##############################################################################
  // Outbound e-call events
  //##############################################################################

  /**
   * Create additional payload.
   *
   * @param {string} conversation_id - ID of conversation
   * @param {string} remote_user_id - ID of remote user
   * @param {string} remote_client_id - ID of remote client
   * @returns {{conversation_id: string, remote_client_id: string, remote_user_id: *, time: string, user_id: string}} Additional payload
   */
  create_additional_payload(conversation_id, remote_user_id, remote_client_id) {
    return {
      conversation_id: conversation_id,
      remote_client_id: remote_client_id,
      remote_user_id: remote_user_id,
      time: new Date().toISOString(),
      user_id: this.user_repository.self().id,
    };
  }

  /**
   * Create properties payload for e-call events.
   *
   * @param {z.media.MediaType|boolean} payload_type - Media type of property change or forced videosend state
   * @param {boolean} [invert=false] - Invert state
   * @param {Object} additional_payload - Optional additional payload to be added
   * @returns {Object} E-call message props object
   */
  create_payload_prop_sync(payload_type, invert, additional_payload) {
    let payload;

    if (_.isBoolean(payload_type)) {
      payload = {
        props: {
          videosend: `${payload_type}`,
        },
      };
    } else {
      let audio_send_state, screen_send_state, video_send_state = undefined;

      switch (payload_type) {
        case z.media.MediaType.AUDIO:
          audio_send_state = invert ? !this.self_state.audio_send() : this.self_state.audio_send();

          payload = {
            props: {
              audiosend: `${audio_send_state}`},
          };
          break;
        case z.media.MediaType.SCREEN:
          screen_send_state = invert ? !this.self_state.screen_send() : this.self_state.screen_send();
          video_send_state = invert ? z.calling.enum.PROPERTY_STATE.FALSE : this.self_state.video_send();

          payload = {
            props: {
              screensend: `${screen_send_state}`,
              videosend: `${video_send_state}`,
            },
          };
          break;
        case z.media.MediaType.VIDEO:
          screen_send_state = invert ? z.calling.enum.PROPERTY_STATE.FALSE : this.self_state.screen_send();
          video_send_state = invert ? !this.self_state.video_send() : this.self_state.video_send();

          payload = {
            props: {
              screensend: `${screen_send_state}`,
              videosend: `${video_send_state}`,
            },
          };
          break;
        default:
          throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }

    if (additional_payload) {
      payload = $.extend(payload, additional_payload);
    }
    return payload;
  }

  /**
   * Send an e-call event.
   *
   * @param {z.entity.Conversation} conversation_et - Conversation to send message in
   * @param {ECallMessage} e_call_message_et - E-call message entity
   * @returns {Promise} Resolves when the event has been sent
   */
  send_e_call_event(conversation_et, e_call_message_et) {
    if (!_.isObject(e_call_message_et)) {
      throw new z.calling.v3.CallError(z.calling.v3.CallError.TYPE.WRONG_PAYLOAD_FORMAT);
    }

    const {conversation_id, remote_user_id, response, type} = e_call_message_et;

    return this.get_e_call_by_id(conversation_id || conversation_et.id)
      .then((e_call_et) => {
        const data_channel_message_types = [
          z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP,
          z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC,
        ];

        if (data_channel_message_types.includes(type)) {
          return e_call_et.get_e_participant_by_id(remote_user_id)
            .then((e_participant_et) => {
              const {e_flow_et} = e_participant_et;
              e_flow_et.send_message(e_call_message_et);
            });
        }
        throw new z.calling.v3.CallError(z.calling.v3.CallError.TYPE.NO_DATA_CHANNEL);
      })
      .catch((error) => {
        const expected_error_types = [
          z.calling.v3.CallError.TYPE.NO_DATA_CHANNEL,
          z.calling.v3.CallError.TYPE.NOT_FOUND,
        ];

        if (!expected_error_types.includes(error.type)) {
          throw error;
        }

        this.logger.info(`Sending e-call '${type}' message (response: ${response}) to conversation '${conversation_id}'`, e_call_message_et.to_JSON());

        return this._limit_message_recipients(e_call_message_et)
          .then(({precondition_option, user_client_map}) => {
            if (type === z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP) {
              e_call_message_et.type = z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL;
            }

            return this.conversation_repository.send_e_call(conversation_et, e_call_message_et, user_client_map, precondition_option);
          });
      });
  }

  /**
   *
   * @private
   * @param {ECall} e_call_et - Call entity
   * @param {ECallMessage} incoming_e_call_message_et - Incoming e-call message
   * @returns {undefined} No return value
   */
  _confirm_e_call_message(e_call_et, incoming_e_call_message_et) {
    const {response} = incoming_e_call_message_et;

    if (!response) {
      e_call_et.confirm_message(incoming_e_call_message_et);
    }
  }

  /**
   * Limit the message recipients for a call message.
   *
   * @private
   * @param {ECallMessage} e_call_message_et - E-call message to target at clients
   * @returns {Promise} Resolves with the client user map and precondition option
   */
  _limit_message_recipients(e_call_message_et) {
    const {remote_client_id, remote_user, remote_user_id, response, type} = e_call_message_et;
    let recipients_promise;

    if (type === z.calling.enum.E_CALL_MESSAGE_TYPE.REJECT) {
      recipients_promise = Promise.resolve({self_user_et: this.user_repository.self()});
    } else if (remote_user) {
      recipients_promise = Promise.resolve({remote_user_et: remote_user, self_user_et: this.user_repository.self()});
    } else {
      recipients_promise = this.user_repository.get_user_by_id(remote_user_id)
        .then((remote_user_et) => ({remote_user_et: remote_user_et, self_user_et: this.user_repository.self()}));
    }

    return recipients_promise
      .then(({remote_user_et, self_user_et}) => {
        let precondition_option, user_client_map;

        switch (type) {
          case z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL: {
            if (response === true) {
              // Send to remote client that initiated call
              precondition_option = true;
              user_client_map = {
                [remote_user_et.id]: [`${remote_client_id}`],
              };
            } else {
              // Send to all clients of remote user
              precondition_option = [remote_user_et.id];
              user_client_map = {
                [remote_user_et.id]: remote_user_et.devices().map((device) => device.id),
              };
            }
            break;
          }

          case z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP:
          case z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP:
          case z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC:
          case z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE: {
            // Send to remote client that call is connected with
            if (remote_client_id) {
              precondition_option = true;
              user_client_map = {
                [remote_user_et.id]: [`${remote_client_id}`],
              };
            }
            break;
          }

          case z.calling.enum.E_CALL_MESSAGE_TYPE.REJECT: {
            // Send to all clients of self user
            precondition_option = [self_user_et.id];
            user_client_map = {
              [self_user_et.id]: self_user_et.devices().map((device) => device.id),
            };
            break;
          }

          case z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP: {
            if (response === true) {
              // Send to remote client that initiated call and all clients of self user
              precondition_option = [self_user_et.id];
              user_client_map = {
                [remote_user_et.id]: [`${remote_client_id}`],
                [self_user_et.id]: self_user_et.devices().map((device) => device.id),
              };
            } else {
              // Send to all clients of remote user
              precondition_option = [remote_user_et.id];
              user_client_map = {
                [remote_user_et.id]: remote_user_et.devices().map((device) => device.id),
              };
            }
            break;
          }

          default: {
            break;
          }
        }

        return {precondition_option: precondition_option, user_client_map: user_client_map};
      });
  }


  //##############################################################################
  // E-call actions
  //##############################################################################

  /**
   * Delete an e-call.
   * @param {string} conversation_id - ID of conversation to delete e-call from
   * @returns {undefined} No return value
   */
  delete_call(conversation_id) {
    this.get_e_call_by_id(conversation_id)
      .then((e_call_et) => {
        this.logger.info(`Deleting e-call in conversation '${conversation_id}'`, e_call_et);

        e_call_et.delete_call();
        this.e_calls.remove((e_call) => e_call.id === conversation_id);
        this.media_stream_handler.reset_media_stream();
      })
      .catch(function(error) {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * User action to join an e-call.
   *
   * @param {string} conversation_id - ID of conversation to join e-call in
   * @param {boolean} [video_send=false] - Send video for this e-call
   * @returns {undefined} No return value
   */
  join_call(conversation_id, video_send = false) {
    this.get_e_call_by_id(conversation_id)
      .catch((error) => {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }

        const prop_sync_payload = this.create_payload_prop_sync(video_send, false, {conversation_id: conversation_id});

        return this._create_outgoing_e_call(z.calling.mapper.ECallMessageMapper.build_prop_sync(false, undefined, prop_sync_payload));
      })
      .then((e_call_et) => {
        this.logger.info(`Joining e-call in conversation '${conversation_id}'`, e_call_et);

        e_call_et.initiate_telemetry(video_send);
        if (this.media_stream_handler.local_media_stream()) {
          return e_call_et;
        }

        return this.media_stream_handler.initiate_media_stream(conversation_id, video_send)
          .then(() => e_call_et);
      })
      .then((e_call_et) => {
        e_call_et.timings.time_step(z.telemetry.calling.CallSetupSteps.STREAM_RECEIVED);
        e_call_et.join_call();
      })
      .catch((error) => {
        this.delete_call(conversation_id);
        if (!(error instanceof z.media.MediaError)) {
          throw error;
        }
      });
  }

  /**
   * User action to leave an e-call.
   *
   * @param {string} conversation_id - ID of conversation to leave e-call in
   * @param {z.calling.enum.TERMINATION_REASON} termination_reason - Reason for call termination
   * @returns {undefined} No return value
   */
  leave_call(conversation_id, termination_reason) {
    this.get_e_call_by_id(conversation_id)
      .then((e_call_et) => {
        this.logger.info(`Leaving e-call in conversation '${conversation_id}' triggered by '${termination_reason}'`, e_call_et);

        if (e_call_et.state() !== z.calling.enum.CALL_STATE.ONGOING) {
          termination_reason = undefined;
        }

        this.media_stream_handler.release_media_stream();
        e_call_et.leave_call(termination_reason);
      })
      .catch(function(error) {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * Remove a participant from an e-call if he was removed from the group.
   *
   * @param {string} conversation_id - ID of conversation for which the user should be removed from the e-call
   * @param {string} user_id - ID of user to be removed
   * @returns {undefined} No return value
   */
  participant_left(conversation_id, user_id) {
    this.get_e_call_by_id(conversation_id)
      .then((e_call_et) => e_call_et.delete_e_participant(user_id, undefined, z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE))
      .then((e_call_et) => {
        if (!e_call_et.participants().length) {
          e_call_et.set_self_state(false, z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE);
          this.delete_call(conversation_id);
        }
      });
  }

  /**
   * User action to reject incoming e-call.
   * @param {string} conversation_id - ID of conversation to ignore e-call in
   * @returns {undefined} No return value
   */
  reject_call(conversation_id) {
    this.get_e_call_by_id(conversation_id)
      .then((e_call_et) => {
        this.logger.info(`Rejecting e-call in conversation '${conversation_id}'`, e_call_et);

        e_call_et.reject_call();
      })
      .catch(function(error) {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * User action to toggle one of the media stats of an e-call.
   *
   * @param {string} conversation_id - ID of conversation with e-call
   * @param {z.media.MediaType} media_type - MediaType of requested change
   * @returns {undefined} No return value
   */
  toggle_media(conversation_id, media_type) {
    this.get_e_call_by_id(conversation_id)
      .then((e_call_et) => e_call_et.toggle_media(media_type))
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
      .catch(function(error) {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }


  //##############################################################################
  // E-call entity creation
  //##############################################################################

  /**
   * Constructs a e-call entity.
   *
   * @private
   * @param {ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
   * @param {z.entity.User} creating_user_et - User that created e-call
   * @returns {Promise} Resolves with the new e-call entity
   */
  _create_e_call(e_call_message_et, creating_user_et) {
    const {conversation_id, session_id} = e_call_message_et;

    return this.get_e_call_by_id(conversation_id)
      .catch(() => {
        return this.conversation_repository.get_conversation_by_id_async(conversation_id)
          .then((conversation_et) => {
            const e_call_et = new z.calling.entities.ECall(conversation_et, creating_user_et, session_id, this);

            this.e_calls.push(e_call_et);
            return e_call_et;
          });
      });
  }

  /**
   * Constructs an incoming e-call entity.
   *
   * @private
   * @param {ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
   * @param {boolean} silent - Start call in rejected mode
   * @returns {Promise} Resolves with the new e-call entity
   */
  _create_incoming_e_call(e_call_message_et, silent = false) {
    const {conversation_id, props, user_id} = e_call_message_et;

    return this.user_repository.get_user_by_id(user_id)
      .then((remote_user_et) => {
        return this._create_e_call(e_call_message_et, remote_user_et)
          .then((e_call_et) => {
            this.logger.info(`Incoming '${this._get_media_type_from_properties(props)}' e-call in conversation '${e_call_et.conversation_et.display_name()}'`, e_call_et);

            if (silent) {
              e_call_et.state(z.calling.enum.CALL_STATE.REJECTED);

            } else {
              e_call_et.state(z.calling.enum.CALL_STATE.INCOMING);
            }

            e_call_et.set_remote_version(e_call_message_et);
            return e_call_et.add_e_participant(remote_user_et, e_call_message_et, false)
              .then(() => {
                this.telemetry.track_event(z.tracking.EventName.CALLING.RECEIVED_CALL, e_call_et);
                this.inject_activate_event(e_call_message_et);
                if (e_call_et.is_remote_video_send() && !this.block_media_stream) {
                  this.media_stream_handler.initiate_media_stream(e_call_et.id, true);
                }
              });
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
   * Constructs an outgoing e-call entity.
   *
   * @private
   * @param {ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC
   * @returns {Promise} Resolves with the new e-call entity
   */
  _create_outgoing_e_call(e_call_message_et) {
    const {props} = e_call_message_et;

    return this._create_e_call(e_call_message_et, this.user_repository.self())
      .then((e_call_et) => {
        const media_type = this._get_media_type_from_properties(props);
        this.logger.info(`Outgoing '${media_type}' e-call in conversation '${e_call_et.conversation_et.display_name()}'`, e_call_et);

        e_call_et.state(z.calling.enum.CALL_STATE.OUTGOING);
        this.telemetry.set_media_type(media_type === z.media.MediaType.VIDEO);
        this.telemetry.track_event(z.tracking.EventName.CALLING.INITIATED_CALL, e_call_et);
        return e_call_et;
      });
  }


  //##############################################################################
  // Notifications
  //##############################################################################

  /**
   * Inject a call activate event.
   * @param {ECallMessage} e_call_message_et - E-call message to create event from
   * @returns {undefined} No return value
   */
  inject_activate_event(e_call_message_et) {
    const activate_event = z.conversation.EventBuilder.build_voice_channel_activate(e_call_message_et);
    amplify.publish(z.event.WebApp.EVENT.INJECT, activate_event);
  }

  /**
   * Inject a call deactivate event.
   * @param {ECallMessage} e_call_message_et - E-call message to create event from
   * @param {z.entity.User} creating_user_et - User that created call
   * @param {z.calling.enum.TERMINATION_REASON} reason - Reason for call to end
   * @returns {undefined} No return value
   */
  inject_deactivate_event(e_call_message_et, creating_user_et, reason) {
    const deactivate_event = z.conversation.EventBuilder.build_voice_channel_deactivate(e_call_message_et, creating_user_et, reason);
    amplify.publish(z.event.WebApp.EVENT.INJECT, deactivate_event);
  }


  //##############################################################################
  // Helper functions
  //##############################################################################

  /**
   * Get an e-call entity for a given conversation ID.
   * @param {string} conversation_id - ID of Conversation of requested e-call
   * @returns {ECall} E-call entity for conversation ID
  */
  get_e_call_by_id(conversation_id) {
    if (conversation_id) {
      for (const e_call_et of this.e_calls()) {
        if (e_call_et.id === conversation_id) {
          return Promise.resolve(e_call_et);
        }
      }

      return Promise.reject(new z.calling.v3.CallError(z.calling.v3.CallError.TYPE.NOT_FOUND));
    }

    return Promise.reject(new z.calling.v3.CallError(z.calling.v3.CallError.TYPE.NO_CONVERSATION_ID));
  }

  /**
   * Set logging on adapter.js.
   * @param {boolean} is_enabled - Is adapter logging enabled
   * @returns {undefined} No return value
   */
  set_logging(is_enabled) {
    if (adapter) {
      this.logger.debug(`Set logging for webRTC Adapter: ${is_enabled}`);
      adapter.disableLog = !is_enabled;
    }
  }

  /**
   * Get the MediaType from given e-call event properties.
   * @param {Object} properties - E-call event properties
   * @returns {z.media.MediaType} MediaType of e-call
   */
  _get_media_type_from_properties(properties) {
    if (properties && properties.videosend === z.calling.enum.PROPERTY_STATE.TRUE) {
      return z.media.MediaType.VIDEO;
    }

    return z.media.MediaType.AUDIO;
  }
};
