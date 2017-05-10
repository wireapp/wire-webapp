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
window.z.calling.payloads = z.calling.payloads || {};

z.calling.payloads.SDPInfo = class SDPInfo {
  /**
   * Object to keep an SDP bundled with signaling information.
   *
   * @param {Object} params - Properties to setup the ICE information container
   * @param {string} params.conversation_id - Conversation ID
   * @param {string} params.flow_id - Flow ID
   * @param {RTCSessionDescription} params.sdp - Session Description Protocol (SDP)
   */
  constructor(params) {
    this.conversation_id = params.conversation_id;
    this.flow_id = params.flow_id;
    this.sdp = params.sdp;
  }
};
