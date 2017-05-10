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

z.calling.payloads.ICECandidateInfo = class ICECandidateInfo {
  /**
   * Object to keep an ICE candidate bundled with signaling information.
   *
   * @param {string} conversation_id - Conversation ID
   * @param {string} flow_id - Flow ID
   * @param {RTCIceCandidate} ice_candidate - Interactive Connectivity Establishment (ICE) Candidate
   */
  constructor(conversation_id, flow_id, ice_candidate) {
    this.conversation_id = conversation_id;
    this.flow_id = flow_id;
    this.ice_candidate = ice_candidate;
  }
};
