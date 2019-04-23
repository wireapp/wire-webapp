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

import Logger from 'utils/Logger';
import TimeUtil from 'utils/TimeUtil';
import trackingHelpers from '../../tracking/Helpers';
import {ConversationType} from '../../tracking/attribute';
import {sortObjectByKeys} from 'utils/util';

// Call traces entity.
class CallTelemetry {
  constructor() {
    this.logger = Logger('CallTelemetry');

    this.sessions = {};
    this.remote_version = undefined;
    this.hasToggledAV = false;
    this.maxNumberOfParticipants = 0;
    this.direction = undefined;

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
    const sortedSessions = sortObjectByKeys(this.sessions, true);

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
   * @param {CALL_STATE} direction - direction of the call (outgoing or incoming)
   * @param {z.media.MediaType} [mediaType=z.media.MediaType.AUDIO] - Media type for this call
   * @returns {undefined} No return value
   */
  initiateNewCall(direction, mediaType = z.media.MediaType.AUDIO) {
    this.mediaType = mediaType;
    this.hasToggledAV = false;
    this.maxNumberOfParticipants = 0;
    this.direction = direction;
    this.logger.info(`Initiate new '${direction}' call of type '${this.mediaType}'`);
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
   * @param {CallEntity} callEntity - Call entity
   * @param {Object} [attributes={}] - Attributes for the event
   * @returns {undefined} No return value
   */
  track_event(eventName, callEntity, attributes = {}) {
    if (callEntity) {
      const {conversationEntity, isGroup} = callEntity;

      const videoTypes = [z.media.MediaType.VIDEO, z.media.MediaType.AUDIO_VIDEO];

      attributes = Object.assign(
        {
          conversation_participants: conversationEntity.getNumberOfParticipants(),
          conversation_participants_in_call_max: this.maxNumberOfParticipants
            ? this.maxNumberOfParticipants
            : undefined,
          conversation_type: isGroup ? ConversationType.GROUP : ConversationType.ONE_TO_ONE,
          direction: this.direction,
          remote_version: [
            z.tracking.EventName.CALLING.ESTABLISHED_CALL,
            z.tracking.EventName.CALLING.JOINED_CALL,
          ].includes(eventName)
            ? this.remote_version
            : undefined,
          started_as_video: videoTypes.includes(this.mediaType),
          with_service: conversationEntity.hasService(),
        },
        trackingHelpers.getGuestAttributes(conversationEntity),
        attributes
      );
    }

    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, eventName, attributes);
  }

  /**
   * Track the call duration.
   * @param {CallEntity} callEntity - Call entity
   * @returns {undefined} No return value
   */
  track_duration(callEntity) {
    const {terminationReason, timerStart, durationTime} = callEntity;

    const duration = Math.floor((Date.now() - timerStart) / TimeUtil.UNITS_IN_MILLIS.SECOND);

    if (!window.isNaN(duration)) {
      this.logger.info(`Call duration: ${duration} seconds.`, durationTime());

      const attributes = {
        AV_switch_toggled: this.hasToggledAV,
        duration: duration,
        reason: terminationReason,
        remote_version: this.remote_version,
      };

      this.track_event(z.tracking.EventName.CALLING.ENDED_CALL, callEntity, attributes);
    }
  }

  numberOfParticipantsChanged(newNumberOfParticipants) {
    this.maxNumberOfParticipants = Math.max(this.maxNumberOfParticipants, newNumberOfParticipants);
  }
}

export {CallTelemetry};
