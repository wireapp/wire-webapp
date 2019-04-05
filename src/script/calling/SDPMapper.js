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

import {Environment} from 'Util/Environment';
import {includesString} from 'Util/StringUtil';

import {SDP_TYPE} from './rtc/SDPType';

export const SDPMapper = {
  CONFIG: {
    AUDIO_BITRATE: '30',
    AUDIO_PTIME: '60',
  },

  /**
   * Get the tool version that generated the SDP
   * @param {string} sdpString - Full SDP string
   * @returns {string} Tool version of SDP
   */
  getToolVersion(sdpString) {
    for (const sdpLine of sdpString.split('\r\n')) {
      if (sdpLine.startsWith('a=tool')) {
        return sdpLine.replace('a=tool:', '');
      }
    }
  },

  /**
   * Map call setup message to RTCSessionDescription.
   * @param {CallMessageEntity} callMessageEntity - Call message entity of type CALL_MESSAGE_TYPE.SETUP
   * @returns {Promise} Resolves with a webRTC standard compliant RTCSessionDescription
   */
  mapCallMessageToObject(callMessageEntity) {
    const {response, sdp: sdpString} = callMessageEntity;
    const sdp = {
      sdp: sdpString,
      type: response ? SDP_TYPE.ANSWER : SDP_TYPE.OFFER,
    };

    return Promise.resolve(sdp);
  },

  mapMessageContentToRTCSessionDescription(messageContent) {
    const {resp, sdp} = messageContent;
    return {sdp, type: resp ? z.calling.rtc.SDP_TYPE.ANSWER : z.calling.rtc.SDP_TYPE.OFFER};
  },

  /**
   * Rewrite the SDP for compatibility reasons.
   *
   * @param {RTCSessionDescriptionInit} rtcSdp - Session Description Protocol to be rewritten
   * @param {Object} config - Gives info on the type of SDP and what is its destination
   * @returns {Object} Object containing rewritten Session Description Protocol and number of ICE candidates
   */
  rewriteSdp(rtcSdp, {isIceRestart, isGroup, isLocalSdp} = {}) {
    if (!rtcSdp) {
      throw new z.error.CallError(z.error.CallError.TYPE.NOT_FOUND, 'Cannot rewrite undefined SDP');
    }

    const {sdp, type} = rtcSdp;
    const sdpLines = [];
    const iceCandidates = [];
    let sessionDescription;

    const isFirefox = Environment.browser.firefox;

    const isLocalSdpInGroup = isLocalSdp && isGroup;
    const isOffer = rtcSdp.type === SDP_TYPE.OFFER;

    sessionDescription = isLocalSdp ? sdp.replace('UDP/TLS/', '') : sdp;

    if (isFirefox) {
      sessionDescription = isLocalSdp
        ? sessionDescription.replace(' UDP/DTLS/SCTP', ' DTLS/SCTP')
        : sessionDescription.replace(/ DTLS\/SCTP (5000|webrtc-datachannel)/, ' UDP/DTLS/SCTP webrtc-datachannel');
    }

    sessionDescription.split('\r\n').forEach(sdpLine => {
      let outline = sdpLine;

      if (sdpLine.startsWith('t=')) {
        if (isLocalSdp) {
          sdpLines.push(sdpLine);

          const browserString = `${Environment.browser.name} ${Environment.browser.version}`;
          const webappVersion = Environment.version(false);

          outline = Environment.desktop
            ? `a=tool:electron ${Environment.version(true)} ${webappVersion} (${browserString})`
            : `a=tool:webapp ${webappVersion} (${browserString})`;
        }
      } else if (sdpLine.startsWith('a=candidate')) {
        iceCandidates.push(sdpLine);
      } else if (sdpLine.startsWith('m=')) {
        if (sdpLine.startsWith('m=audio')) {
          // Code to nail in bit-rate and ptime settings for improved performance and experience
          const shouldAddBitRate = isLocalSdpInGroup || isIceRestart;
          if (shouldAddBitRate) {
            sdpLines.push(sdpLine);
            outline = `b=AS:${SDPMapper.CONFIG.AUDIO_BITRATE}`;
          }
        } else if (isFirefox && isLocalSdp && isOffer) {
          // Set ports to activate media in outgoing Firefox SDP to ensure enabled media
          outline = sdpLine.replace(/^m=(application|video) 0/, 'm=$1 9');
        }
      } else if (sdpLine.startsWith('a=rtpmap')) {
        const shouldAddPTime = isLocalSdpInGroup || isIceRestart;
        if (shouldAddPTime && includesString(sdpLine, 'opus')) {
          sdpLines.push(sdpLine);
          outline = `a=ptime:${SDPMapper.CONFIG.AUDIO_PTIME}`;
        }
      } else if (isFirefox && !isLocalSdp && sdpLine.startsWith('a=sctpmap:')) {
        outline = 'a=sctp-port:5000';
      }

      if (outline !== undefined) {
        sdpLines.push(outline);
      }
    });

    sessionDescription = sdpLines.join('\r\n');
    const sdpInit = {sdp: sessionDescription, type};
    return {iceCandidates, sdp: sdpInit};
  },
};
