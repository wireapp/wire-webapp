/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

export enum TYPE {
  CALL_QUALITY_POOR = 'call_quality_poor',
  CONNECTIVITY_RECONNECT = 'connectivity_reconnect',
  CONNECTIVITY_RECOVERY = 'connectivity_recovery',
  DENIED_CAMERA = 'camera_access_denied',
  DENIED_MICROPHONE = 'mic_access_denied',
  DENIED_SCREEN = 'screen_access_denied',
  LIFECYCLE_UPDATE = 'lifecycle_update',
  NOT_FOUND_CAMERA = 'not_found_camera',
  NOT_FOUND_MICROPHONE = 'not_found_microphone',
  NO_INTERNET = 'no_internet',
  REQUEST_CAMERA = 'request_camera',
  REQUEST_MICROPHONE = 'request_microphone',
  REQUEST_NOTIFICATION = 'request_notification',
  REQUEST_SCREEN = 'request_screen',
  UNSUPPORTED_INCOMING_CALL = 'unsupported_incoming_call',
  UNSUPPORTED_OUTGOING_CALL = 'unsupported_outgoing_call',
}

export const CONFIG = {
  DIMMED_MODES: [TYPE.REQUEST_CAMERA, TYPE.REQUEST_MICROPHONE, TYPE.REQUEST_NOTIFICATION, TYPE.REQUEST_SCREEN],
  MINI_MODES: [TYPE.CONNECTIVITY_RECONNECT, TYPE.LIFECYCLE_UPDATE, TYPE.NO_INTERNET, TYPE.CALL_QUALITY_POOR],
};
