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

export function getIceCandidatesTypes(iceCandidates) {
  return iceCandidates.reduce((types, candidateStr) => {
    const typeMatches = candidateStr.match(/typ (\w+)/);
    if (!typeMatches) {
      return types;
    }
    const candidateType = typeMatches[1];
    types[candidateType] = types[candidateType] + 1 || 1;
    return types;
  }, {});
}

/**
 * Returns `true` if the number and types of ice candidates gathered are sufficient to start a call
 *
 * @param {RTCConfiguration} peerConnectionConfig the configuration of the peerConnection that initiated the ICE candidate gathering
 * @param {Array<string>} iceCandidates ICE candidate strings from SDP
 * @returns {boolean} `true` if the candidates gathered are enough to send a SDP
 */
export function isValidIceCandidatesGathering(peerConnectionConfig, iceCandidates) {
  if (iceCandidates.length <= 0) {
    // if there are no candidates, no need to check for more conditions
    // the call cannot work
    return false;
  }
  const numberOfRelays = iceCandidates.filter(candidate => candidate.toLowerCase().includes('relay')).length;
  const numberOfIceServers = (peerConnectionConfig.iceServers || []).length;
  if (numberOfIceServers <= 0) {
    return true;
  }
  return numberOfRelays >= 1;
}
