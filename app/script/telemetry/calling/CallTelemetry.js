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
window.z.telemetry = z.telemetry || {};
window.z.telemetry.calling = z.telemetry.calling || {};

// Call traces entity.
z.telemetry.calling.CallTelemetry = class CallTelemetry {
  constructor() {
    this.logger = new z.util.Logger('z.telemetry.calling.CallTelemetry', z.config.LOGGER.OPTIONS);

    this.sessions = {};
    this.remote_version = undefined;
    this.hasToggledAV = false;

    this.mediaType = z.media.MediaType.AUDIO;
  }

  //##############################################################################
  // Sessions
  //##############################################################################

  /**
   * Force log last call session IDs.
   * @returns {Object} Containing all the sessions
   */
  log_sessions() {
    const sortedSessions = z.util.sortObjectByKeys(this.sessions, true);

    this.logger.force_log('Your last session IDs:');
    Object.values(sortedSessions).forEach(trackingInfo => this.logger.force_log(trackingInfo.to_string()));

    return sortedSessions;
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
      custom_data = {error: passed_error};
      raygun_error.stack = passed_error.stack;
    }

    Raygun.send(raygun_error, custom_data);
  }

  //##############################################################################
  // Analytics
  //##############################################################################

  /**
   * Prepare the call telemetry for a new call (resets to initial values)
   * @param {z.media.MediaType} [mediaType=z.media.MediaType.AUDIO] - Media type for this call
   * @returns {undefined} No return value
   */
  initiateNewCall(mediaType = z.media.MediaType.AUDIO) {
    this.mediaType = mediaType;
    this.hasToggledAV = false;
    this.logger.info(`Initiate new call of type '${this.mediaType}'`);
  }

  setAVToggled() {
    this.hasToggledAV = true;
  }

  /**
   * Sets the remove version of the call.
   * @param {string} remote_version - Remove version string
   * @returns {undefined} No return value
   */
  set_remote_version(remote_version) {
    if (this.remote_version !== remote_version) {
      this.remote_version = remote_version;
      this.logger.info(`Identified remote call version as '${remote_version}'`);
    }
  }

  /**
   * Reports call events for call tracking to Localytics.
   * @param {z.tracking.EventName} eventName - String for call event
   * @param {z.calling.entities.CallEntity} callEntity - Call entity
   * @param {Object} [attributes={}] - Attributes for the event
   * @returns {undefined} No return value
   */
  track_event(eventName, callEntity, attributes = {}) {
    if (callEntity) {
      const {conversationEntity, isGroup, maxNumberOfParticipants, direction} = callEntity;

      const videoTypes = [z.media.MediaType.VIDEO, z.media.MediaType.AUDIO_VIDEO];

      attributes = Object.assign(
        {
          conversation_participants: conversationEntity.getNumberOfParticipants(),
          conversation_participants_in_call: maxNumberOfParticipants ? maxNumberOfParticipants : undefined,
          conversation_type: isGroup
            ? z.tracking.attribute.ConversationType.GROUP
            : z.tracking.attribute.ConversationType.ONE_TO_ONE,
          direction,
          remote_version: [
            z.tracking.EventName.CALLING.ESTABLISHED_CALL,
            z.tracking.EventName.CALLING.JOINED_CALL,
          ].includes(eventName)
            ? this.remote_version
            : undefined,
          started_as_video: videoTypes.includes(this.mediaType),
          with_service: conversationEntity.isWithBot(),
        },
        z.tracking.helpers.getGuestAttributes(conversationEntity),
        attributes
      );
    }

    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, eventName, attributes);
  }

  /**
   * Track the call duration.
   * @param {z.calling.entities.CallEntity} callEntity - Call entity
   * @returns {undefined} No return value
   */
  track_duration(callEntity) {
    const {terminationReason, timerStart, durationTime} = callEntity;

    const duration = Math.floor((Date.now() - timerStart) / 1000);

    if (!window.isNaN(duration)) {
      this.logger.info(`Call duration: ${duration} seconds.`, durationTime());

      let duration_bucket;
      if (duration <= 15) {
        duration_bucket = '0s-15s';
      } else if (duration <= 30) {
        duration_bucket = '16s-30s';
      } else if (duration <= 60) {
        duration_bucket = '31s-60s';
      } else if (duration <= 3 * 60) {
        duration_bucket = '61s-3min';
      } else if (duration <= 10 * 60) {
        duration_bucket = '3min-10min';
      } else if (duration <= 60 * 60) {
        duration_bucket = '10min-1h';
      } else {
        duration_bucket = '1h-infinite';
      }

      const attributes = {
        AV_switch_toggled: this.hasToggledAV,
        duration: duration_bucket,
        duration_sec: duration,
        reason: terminationReason,
        remote_version: this.remote_version,
      };

      const eventName = z.tracking.EventName.CALLING.ENDED_CALL;
      this.track_event(eventName, callEntity, attributes);
    }
  }
};
