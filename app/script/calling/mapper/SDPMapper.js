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

const SDP_MAPPER_CONFIG = {
  AUDIO_BITRATE: '30',
  AUDIO_PTIME: '60',
};

z.calling.mapper.SDPMapper = {
  /**
   * Get the tool version that generated the SDP
   * @param {string} sdp_string - Full SDP string
   * @returns {string} Tool version of SDP
   */
  get_tool_version(sdp_string) {
    for (const sdp_line of sdp_string.split('\r\n')) {
      if (sdp_line.startsWith('a=tool')) {
        return sdp_line.replace('a=tool:', '');
      }
    }
  },

  /**
   * Map e-call setup message to RTCSessionDescription.
   * @param {z.calling.entities.ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
   * @returns {Promise} Resolves with a webRTC standard compliant RTCSessionDescription
   */
  map_e_call_message_to_object(e_call_message_et) {
    const sdp = {
      sdp: e_call_message_et.sdp,
      type: e_call_message_et.response === true ? z.calling.rtc.SDP_TYPE.ANSWER : z.calling.rtc.SDP_TYPE.OFFER,
    };

    return Promise.resolve(new window.RTCSessionDescription(sdp));
  },

  /**
   * Map call event to RTCSessionDescription.
   * @param {Object} event - Call message containing SDP
   * @returns {RTCSessionDescription} webRTC standard compliant RTCSessionDescription
   */
  map_event_to_object(event) {
    const sdp = {
      sdp: event.sdp,
      type: event.state,
    };

    return new window.RTCSessionDescription(sdp);
  },

  /**
   * Rewrite the SDP for compatibility reasons.
   *
   * @param {RTCSessionDescription} rtc_sdp - Session Description Protocol to be rewritten
   * @param {z.calling.enum.SDP_SOURCE} [sdp_source=z.calling.enum.SDP_SOURCE.REMOTE] - Source of the SDP - local or remote
   * @param {z.calling.entities.EFlow|z.calling.entities.Flow} flow_et - Flow entity
   * @returns {Object} Object containing rewritten Session Description Protocol and number of ICE candidates
   */
  rewrite_sdp(rtc_sdp, sdp_source = z.calling.enum.SDP_SOURCE.REMOTE, flow_et) {
    if (sdp_source === z.calling.enum.SDP_SOURCE.LOCAL) {
      rtc_sdp.sdp = rtc_sdp.sdp.replace('UDP/TLS/', '');
    }

    const sdp_lines = [];
    const ice_candidates = [];

    rtc_sdp.sdp.split('\r\n').forEach(function(sdp_line) {
      let outline = sdp_line;

      if (sdp_line.startsWith('t=')) {
        if (sdp_source === z.calling.enum.SDP_SOURCE.LOCAL) {
          sdp_lines.push(sdp_line);

          const browser_string = `${z.util.Environment.browser.name} ${z.util.Environment.browser.version}`;
          if (z.util.Environment.electron) {
            outline = `a=tool:electron ${z.util.Environment.version()} ${z.util.Environment.version(false)} (${browser_string})`;
          } else {
            outline = `a=tool:webapp ${z.util.Environment.version(false)} (${browser_string})`;
          }
        }

      } else if (sdp_line.startsWith('a=candidate')) {
        ice_candidates.push(sdp_line);

      // Remove once obsolete due to high uptake of clients based on AVS build 3.3.11 containing fix for AUDIO-1215
      } else if (sdp_line.startsWith('a=mid')) {
        if (sdp_source === z.calling.enum.SDP_SOURCE.REMOTE && z.util.Environment.browser.firefox && rtc_sdp.type === z.calling.rtc.SDP_TYPE.ANSWER) {
          if (sdp_line === 'a=mid:data') {
            outline = 'a=mid:sdparta_2';
          }
        }

      // Code to nail in bit-rate and ptime settings for improved performance and experience
      } else if (sdp_line.startsWith('m=audio')) {
        if (flow_et.negotiation_mode() === z.calling.enum.SDP_NEGOTIATION_MODE.ICE_RESTART || (sdp_source === z.calling.enum.SDP_SOURCE.LOCAL && flow_et.is_group())) {
          sdp_lines.push(sdp_line);
          outline = `b=AS:${SDP_MAPPER_CONFIG.AUDIO_BITRATE}`;
        }

      } else if (sdp_line.startsWith('a=rtpmap')) {
        if (flow_et.negotiation_mode() === z.calling.enum.SDP_NEGOTIATION_MODE.ICE_RESTART || (sdp_source === z.calling.enum.SDP_SOURCE.LOCAL && flow_et.is_group())) {
          if (z.util.StringUtil.includes(sdp_line, 'opus')) {
            sdp_lines.push(sdp_line);
            outline = `a=ptime:${SDP_MAPPER_CONFIG.AUDIO_PTIME}`;
          }
        }

      // Workaround for incompatibility between Chrome 57 and AVS builds. Remove once update of clients with AVS 3.3.x is high enough.
      } else if (sdp_line.startsWith('a=fmtp')) {
        if (sdp_line === 'a=fmtp:125 apt=100') {
          outline = 'a=fmtp:125 apt=96';
        }
      }

      if (outline !== undefined) {
        sdp_lines.push(outline);
      }
    });

    rtc_sdp.sdp = sdp_lines.join('\r\n');
    return Promise.resolve({ice_candidates: ice_candidates, sdp: rtc_sdp});
  },
};
