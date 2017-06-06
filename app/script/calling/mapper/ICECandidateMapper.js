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
window.z.calling.mapper = z.calling.mapper || {};

z.calling.mapper.ICECandidateMapper = {
  /**
   * Map ICE message to RTCIceCandidate.
   * @param {Object} ice_message - ICE message from backend
   * @returns {RTCIceCandidate} Mapped RTCIceCandidate
   */
  map_ice_message_to_object(ice_message) {
    const candidate_info = {
      candidate: ice_message.sdp,
      sdpMLineIndex: ice_message.sdp_mline_index,
      sdpMid: ice_message.sdp_mid,
    };

    return new RTCIceCandidate(candidate_info);
  },

  /**
   * Map RTCIceCandidate to ICE message object.
   * @param {RTCIceCandidate} ice_candidate - RTCIceCandidate to map
   * @returns {Object} ICE message for backend
   */
  map_ice_object_to_message(ice_candidate) {
    return {
      sdp: ice_candidate.candidate,
      sdp_mid: ice_candidate.sdpMid,
      sdp_mline_index: ice_candidate.sdpMLineIndex,
    };
  },
};
