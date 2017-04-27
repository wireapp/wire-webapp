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
window.z.telemetry = z.telemetry || {};
window.z.telemetry.calling = z.telemetry.calling || {};

// Call traces entity.
z.telemetry.calling.CallTelemetry = class CallTelemetry {
  constructor(protocol_version) {
    this.logger = new z.util.Logger('z.telemetry.calling.CallTelemetry', z.config.LOGGER.OPTIONS);

    this.sessions = {};
    this.protocol_version = protocol_version === z.calling.enum.PROTOCOL.VERSION_2 ? 'C2' : 'C3';
    this.remote_version = undefined;

    this.media_type = z.media.MediaType.AUDIO;
  }

  //##############################################################################
  // Sessions
  //##############################################################################

  /**
   * Force log last call session IDs.
   * @returns {Object} Containing all the sessions
   */
  log_sessions() {
    const sorted_sessions = z.util.sort_object_by_keys(this.sessions, true);

    this.logger.force_log('Your last session IDs:');
    for (const session_id in sorted_sessions) {
      if (sorted_sessions.hasOwnProperty(session_id)) {
        const tracking_info = sorted_sessions[session_id];
        this.logger.force_log(tracking_info.to_string());
      }
    }

    return sorted_sessions;
  }

  /**
   * Track session ID.
   * @param {string} conversation_id - ID of conversation for call session
   * @param {string} session_id - Session ID from backend call event
   * @returns {undefined} No return value
   */
  track_session(conversation_id, {session: session_id}) {
    this.sessions[session_id] = new z.calling.v2.CallTrackingInfo({
      conversation_id: conversation_id,
      session_id: session_id,
    });
  }


  //##############################################################################
  // Error reporting
  //##############################################################################

  /**
   * Report an error to Raygun.
   * @param {string} description - Error description
   * @param {Error} passed_error - Error to be attached to the report
   * @returns {undefined} No return value
   */
  report_error(description, passed_error) {
    let custom_data;
    const raygun_error = new Error(description);

    if (passed_error) {
      custom_data =
        {error: passed_error};
      raygun_error.stack = passed_error.stack;
    }

    Raygun.send(raygun_error, custom_data);
  }


  //##############################################################################
  // Analytics
  //##############################################################################

  /**
   * Set the media type of the call.
   * @param {boolean} [video_send=false] - Call contains video
   * @returns {undefined} No return value
   */
  set_media_type(video_send = false) {
    this.media_type = video_send ? z.media.MediaType.VIDEO : z.media.MediaType.AUDIO;
    this.logger.info(`Set media type to '${this.media_type}'`);
  }

  /**
   * Sets the remove version of the call.
   * @param {string} remote_version - Remove version string
   * @returns {undefined} No return value
   */
  set_remote_version(remote_version) {
    if (this.remote_version !== remote_version) {
      this.remote_version = remote_version;
      return this.logger.info(`Identified remote call version as '${remote_version}'`);
    }
  }

  /**
   * Reports call events for call tracking to Localytics.
   * @param {z.tracking.EventName} event_name - String for call event
   * @param {z.calling.Call|z.calling.entities.ECall} call_et - Call entity
   * @param {Object} [attributes={}] - Attributes for the event
   * @returns {undefined} No return value
   */
  track_event(event_name, call_et, attributes = {}) {
    if (call_et) {
      const {conversation_et, is_group, max_number_of_participants} = call_et;

      attributes = $.extend({
        conversation_participants: conversation_et.number_of_participants(),
        conversation_participants_in_call: max_number_of_participants,
        conversation_type: is_group() ? z.tracking.attribute.ConversationType.GROUP : z.tracking.attribute.ConversationType.ONE_TO_ONE,
        remote_version: [z.tracking.EventName.CALLING.ESTABLISHED_CALL, z.tracking.EventName.CALLING.JOINED_CALL].includes(event_name) ? this.remote_version : undefined,
        version: this.protocol_version,
        with_bot: conversation_et.is_with_bot(),
      },
      attributes);

      if (this.media_type === z.media.MediaType.VIDEO) {
        event_name = event_name.replace('_call', '_video_call');
      }
    }

    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, event_name, attributes);
  }

  /**
   * Track the call duration.
   * @param {z.calling.entities.Call|z.calling.entities.ECall} call_et - Call entity
   * @returns {undefined} No return value
   */
  track_duration(call_et) {
    const {conversation_et, duration_time, is_group, termination_reason, timer_start, max_number_of_participants} = call_et;
    const duration = Math.floor((Date.now() - timer_start) / 1000);

    if (!window.isNaN(duration)) {
      this.logger.info(`Call duration: ${duration} seconds.`, duration_time());

      let duration_bucket;
      if (duration <= 15) {
        duration_bucket = '0s-15s';
      } else if (duration <= 30) {
        duration_bucket = '16s-30s';
      } else if (duration <= 60) {
        duration_bucket = '31s-60s';
      } else if (duration <= (3 * 60)) {
        duration_bucket = '61s-3min';
      } else if (duration <= (10 * 60)) {
        duration_bucket = '3min-10min';
      } else if (duration <= (60 * 60)) {
        duration_bucket = '10min-1h';
      } else {
        duration_bucket = '1h-infinite';
      }

      const attributes = {
        conversation_participants: conversation_et.number_of_participants(),
        conversation_participants_in_call: max_number_of_participants,
        conversation_type: is_group() ? z.tracking.attribute.ConversationType.GROUP : z.tracking.attribute.ConversationType.ONE_TO_ONE,
        duration: duration_bucket,
        duration_sec: duration,
        reason: termination_reason,
        remote_version: this.remote_version,
        version: this.protocol_version,
        with_bot: conversation_et.is_with_bot(),
      };

      let event_name = z.tracking.EventName.CALLING.ENDED_CALL;
      if (this.media_type === z.media.MediaType.VIDEO) {
        event_name = event_name.replace('_call', '_video_call');
      }

      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, event_name, attributes);
    }
  }
};
