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
      DEFAULT_UPDATE_INTERVAL: 30 * 60, // 30 minutes in seconds
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
   * @param {CallService} call_service - CallService] Backend REST API call service implementation
   * @param {CallingService} calling_service -  Backend REST API calling service implementation
   * @param {ClientRepository} client_repository - Repository for client interactions
   * @param {ConversationRepository} conversation_repository -  Repository for conversation interactions
   * @param {MediaRepository} media_repository -  Repository for media interactions
   * @param {UserRepository} user_repository -  Repository for all user and connection interactions
   */
  constructor(call_service, calling_service, client_repository, conversation_repository, media_repository, user_repository) {
    this.call_service = call_service;
    this.calling_service = calling_service;
    this.client_repository = client_repository;
    this.conversation_repository = conversation_repository;
    this.media_repository = media_repository;
    this.user_repository = user_repository;
    this.logger = new z.util.Logger('z.calling.CallingRepository', z.config.LOGGER.OPTIONS);

    this.calling_config = ko.observable();
    this.calling_config_timeout = undefined;
    this.use_v3_api = undefined;

    this.v2_call_center = new z.calling.v2.CallCenter(this.call_service, this.conversation_repository, this.media_repository, this.user_repository);
    this.v3_call_center = new z.calling.v3.CallCenter(this.calling_config, this.client_repository, this.conversation_repository, this.media_repository, this.user_repository);

    this.calls = ko.pureComputed(() => {
      return this.v2_call_center.calls().concat(this.v3_call_center.e_calls());
    });
    this.joined_call = ko.pureComputed(() => {
      return this.v3_call_center.joined_e_call() || this.v2_call_center.joined_call();
    });

    this.remote_media_streams = this.media_repository.stream_handler.remote_media_streams;
    this.self_stream_state = this.media_repository.stream_handler.self_stream_state;

    this.flow_status = undefined;

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
    amplify.subscribe(z.event.WebApp.CALL.MEDIA.TOGGLE, (conversation_id, media_type) => {
      this.switch_call_center(z.calling.enum.CALL_ACTION.TOGGLE_MEDIA, [conversation_id, media_type]);
    });

    amplify.subscribe(z.event.WebApp.CALL.STATE.DELETE, (conversation_id) => {
      this.switch_call_center(z.calling.enum.CALL_ACTION.DELETE, [conversation_id]);
    });

    amplify.subscribe(z.event.WebApp.CALL.STATE.JOIN, this.join_call.bind(this));

    amplify.subscribe(z.event.WebApp.CALL.STATE.LEAVE, (conversation_id, termination_reason) => {
      this.switch_call_center(z.calling.enum.CALL_ACTION.LEAVE, [conversation_id, termination_reason]);
    });

    amplify.subscribe(z.event.WebApp.CALL.STATE.REJECT, (conversation_id) => {
      this.switch_call_center(z.calling.enum.CALL_ACTION.REJECT, [conversation_id]);
    });

    amplify.subscribe(z.event.WebApp.CALL.STATE.PARTICIPANT_LEFT, (conversation_id, user_id) => {
      this.switch_call_center(z.calling.enum.CALL_ACTION.PARTICIPANT_LEFT, [conversation_id, user_id]);
    });

    amplify.subscribe(z.event.WebApp.CALL.STATE.TOGGLE, this.toggle_state.bind(this));
    amplify.subscribe(z.event.WebApp.DEBUG.UPDATE_LAST_CALL_STATUS, this.store_flow_status.bind(this));
    amplify.subscribe(z.event.WebApp.LOADED, this.initiate_config.bind(this));
    amplify.subscribe(z.util.Logger.prototype.LOG_ON_DEBUG, this.set_logging.bind(this));
  }

  /**
   * Get call by conversation ID.
   * @param {string} conversation_id - Conversation ID
   * @returns {Promise} Resolves with the call entity
   */
  get_call_by_id(conversation_id) {
    return this.v2_call_center.get_call_by_id(conversation_id)
      .catch((error) => {
        if (error.type !== z.calling.v2.CallError.prototype.TYPE.CALL_NOT_FOUND) {
          throw error;
        }

        return this.v3_call_center.get_e_call_by_id(conversation_id);
      });
  }

  /**
   * Get protocol version of call.
   * @param {string} conversation_id - Conversation ID
   * @returns {Promise} Resolves with the z.calling.enum.PROTOCOL of the call
   */
  get_protocol_version(conversation_id) {
    return this.get_call_by_id(conversation_id)
      .then(function(call) {
        if (call instanceof z.calling.entities.Call) {
          return z.calling.enum.PROTOCOL.VERSION_2;
        }

        if (call instanceof z.calling.entities.ECall) {
          return z.calling.enum.PROTOCOL.VERSION_3;
        }
      });
  }

  /**
   * Initiate calling config update.
   * @returns {undefined} No return value
   */
  initiate_config() {
    this._update_calling_config();
  }

  /**
   * Join a call.
   *
   * @param {string} conversation_id - Conversation ID
   * @param {boolean} video_send - Should video be send
   * @returns {undefined} No return value
   */
  join_call(conversation_id, video_send) {
    this.get_call_by_id(conversation_id)
      .then((call_et) => call_et.state())
      .catch(function(error) {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }

        return z.calling.enum.CALL_STATE.OUTGOING;
      })
      .then((call_state) => {
        if (call_state === z.calling.enum.CALL_STATE.OUTGOING && !z.calling.CallingRepository.supports_calling) {
          return amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.UNSUPPORTED_OUTGOING_CALL);
        }

        return this._check_concurrent_joined_call(conversation_id, call_state)
          .then(() => this.switch_call_center(z.calling.enum.CALL_ACTION.JOIN, [conversation_id, video_send]));
      });
  }

  /**
   * Set protocol version of call.
   * @param {string} conversation_id - Conversation ID
   * @returns {Promise} Resolves with the z.calling.enum.PROTOCOL to be used for the call
   */
  set_protocol_version(conversation_id) {
    return this.conversation_repository.get_conversation_by_id_async(conversation_id)
      .then((conversation_et) => {
        if (conversation_et.is_group()) {
          if (this.use_v3_api !== undefined) {
            return this.use_v3_api ? z.calling.enum.PROTOCOL.VERSION_3 : z.calling.enum.PROTOCOL.VERSION_2;
          }

          return z.calling.enum.PROTOCOL.VERSION_2;
        }

        return z.calling.enum.PROTOCOL.VERSION_3;
      })
      .then((protocol_version) => {
        this.logger.log(`Selected outgoing call protocol version: ${protocol_version}`,
          {
            conversation_id: conversation_id,
            use_v3_api: this.use_v3_api,
          });

        return protocol_version;
      });
  }

  /**
   * Forward user action to with a call to the appropriate call center.
   *
   * @param {z.calling.enum.CALL_ACTION} fn_name - Name of function for call action to be called
   * @param {*} args - Arguments to call function with
   * @returns {undefined} No return value
   */
  switch_call_center(fn_name, args) {
    const [conversation_id] = args;

    this.get_protocol_version(conversation_id)
      .catch((error) => {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }

        if (fn_name === z.calling.enum.CALL_ACTION.JOIN) {
          return this.set_protocol_version(conversation_id);
        }
      })
      .then((protocol_version) => {
        if (protocol_version) {
          switch (protocol_version) {
            case z.calling.enum.PROTOCOL.VERSION_2:
              return this.v2_call_center.state_handler[fn_name](...args);
            case z.calling.enum.PROTOCOL.VERSION_3:
              return this.v3_call_center[fn_name](...args);
            default:
              throw new z.calling.v3.CallError(z.calling.v3.CallError.TYPE.UNSUPPORTED_VERSION);
          }
        }
      });
  }

  /**
   * User action to toggle the call state.
   *
   * @param {boolean} [video_send=false] - Is this a video call
   * @param {Conversation} conversation_et - Conversation for which state will be toggled
   * @returns {undefined} No return value
   */
  toggle_state(video_send, conversation_et) {
    if (!conversation_et) {
      if (this.conversation_repository.active_conversation()) {
        conversation_et = this.conversation_repository.active_conversation();
      } else {
        this.logger.info('No conversation selected to toggle call state in');
      }
    }

    if (video_send && conversation_et.is_group()) {
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CALL_NO_VIDEO_IN_GROUP);
    } else {
      if (conversation_et.id === this._self_client_on_a_call()) {
        return this.switch_call_center(z.calling.enum.CALL_ACTION.LEAVE, [conversation_et.id]);
      }
      this.join_call(conversation_et.id, video_send);
    }
  }

  /**
   * Leave a call we are joined immediately in case the browser window is closed.
   * @note Should only used by "window.onbeforeunload".
   * @returns {undefined} No return value
   */
  leave_call_on_beforeunload() {
    const conversation_id = this._self_client_on_a_call();

    if (conversation_id) {
      this.get_protocol_version(conversation_id)
        .then((protocol_version) => {
          if (protocol_version === z.calling.enum.PROTOCOL.VERSION_2) {
            return this.v2_call_center.state_handler.leave_call(conversation_id);
          }
        })
        .catch(function(error) {
          if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
            throw error;
          }
        });
    }
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
          action: function() {
            amplify.publish(z.event.WebApp.CALL.STATE.LEAVE, ongoing_call_id, z.calling.enum.TERMINATION_REASON.CONCURRENT_CALL);
            window.setTimeout(resolve, 1000);
          },
          close: function() {
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

  /**
   * Get the calling config from the backend and store it.
   * @private
   * @returns {undefined} No return value
   */
  _update_calling_config() {
    this.calling_service.get_config()
      .then((calling_config) => {
        // Removed reliance on "calling_config.ttl" until further notice
        const timeout_in_seconds = CallingRepository.CONFIG.DEFAULT_UPDATE_INTERVAL;

        this.logger.info(`Updated calling configuration - next update in ${timeout_in_seconds}s`, calling_config);
        this.calling_config(calling_config);
        if (this.calling_config_timeout) {
          window.clearTimeout(this.calling_config_timeout);
        }
        this.calling_config_timeout = window.setTimeout(this._update_calling_config.bind(this), timeout_in_seconds * 1000);
      });
  }


  //##############################################################################
  // Logging
  //##############################################################################

  /**
   * Set logging on adapter.js.
   * @param {boolean} is_logging_enabled - New logging state
   * @returns {undefined} No return value
   */
  set_logging(is_logging_enabled) {
    if (adapter) {
      this.logger.debug(`Set logging for WebRTC Adapter: ${is_logging_enabled}`);
      adapter.disableLog = !is_logging_enabled;
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
