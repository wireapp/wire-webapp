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

import {amplify} from 'amplify';
import {RaygunStatic} from 'raygun4js';

import {Logger, getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {ConversationType} from '../../tracking/attribute';
import {EventName} from '../../tracking/EventName';
import * as trackingHelpers from '../../tracking/Helpers';

import {WebAppEvents} from '../../event/WebApp';
import {MediaType} from '../../media/MediaType';

import {CallEntity} from '../../calling/entities/CallEntity';
import {CALL_STATE} from '../../calling/enum/CallState';

declare const Raygun: RaygunStatic;

export class CallTelemetry {
  direction?: CALL_STATE;
  hasToggledAV?: boolean;
  logger: Logger;
  maxNumberOfParticipants: number;
  mediaType: MediaType;
  remote_version?: string;

  constructor() {
    this.logger = getLogger('CallTelemetry');

    this.remote_version = undefined;
    this.hasToggledAV = false;
    this.maxNumberOfParticipants = 0;
    this.direction = undefined;

    this.mediaType = MediaType.AUDIO;
  }

  //##############################################################################
  // Error reporting
  //##############################################################################

  report_error(description: string, passed_error: Error): void {
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
   * @param direction direction of the call (outgoing or incoming)
   */
  initiateNewCall(direction: CALL_STATE, mediaType = MediaType.AUDIO): void {
    this.mediaType = mediaType;
    this.hasToggledAV = false;
    this.maxNumberOfParticipants = 0;
    this.direction = direction;
    this.logger.info(`Initiate new '${direction}' call of type '${this.mediaType}'`);
  }

  setAVToggled(): void {
    this.hasToggledAV = true;
  }

  set_remote_version(remote_version: string): void {
    if (this.remote_version !== remote_version) {
      this.remote_version = remote_version;
      this.logger.info(`Identified remote call version as '${remote_version}'`);
    }
  }

  /**
   * Reports call events for call tracking to Localytics.
   */
  track_event(eventName: string, callEntity: CallEntity, attributes = {}): void {
    if (callEntity) {
      const {conversationEntity, isGroup} = callEntity;

      const videoTypes = [MediaType.VIDEO, MediaType.AUDIO_VIDEO];

      attributes = {
        conversation_participants: conversationEntity.getNumberOfParticipants(),
        conversation_participants_in_call_max: this.maxNumberOfParticipants ? this.maxNumberOfParticipants : undefined,
        conversation_type: isGroup ? ConversationType.GROUP : ConversationType.ONE_TO_ONE,
        direction: this.direction,
        remote_version: [EventName.CALLING.ESTABLISHED_CALL, EventName.CALLING.JOINED_CALL].includes(eventName)
          ? this.remote_version
          : undefined,
        started_as_video: videoTypes.includes(this.mediaType),
        with_service: conversationEntity.hasService(),
        ...trackingHelpers.getGuestAttributes(conversationEntity),
        ...attributes,
      };
    }

    amplify.publish(WebAppEvents.ANALYTICS.EVENT, eventName, attributes);
  }

  track_duration(callEntity: CallEntity): void {
    const {terminationReason, timerStart, durationTime} = callEntity;

    const duration = Math.floor((Date.now() - timerStart) / TIME_IN_MILLIS.SECOND);

    if (!isNaN(duration)) {
      this.logger.info(`Call duration: ${duration} seconds.`, durationTime());

      const attributes = {
        AV_switch_toggled: this.hasToggledAV,
        duration: duration,
        reason: terminationReason,
        remote_version: this.remote_version,
      };

      this.track_event(EventName.CALLING.ENDED_CALL, callEntity, attributes);
    }
  }

  numberOfParticipantsChanged(newNumberOfParticipants: number): void {
    this.maxNumberOfParticipants = Math.max(this.maxNumberOfParticipants, newNumberOfParticipants);
  }
}
