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

import {isNull, isTruthy} from '@sindresorhus/is';

export function getIceCandidatesTypes(iceCandidates: string[]): Record<string, number> {
  return iceCandidates.reduce<Record<string, number>>((types, candidateStr) => {
    const typeMatches = candidateStr.match(/typ (\w+)/);
    if (isNull(typeMatches)) {
      return types;
    }
    const candidateType = typeMatches[1];
    const candidateTypeCount = types[candidateType] + 1;
    types[candidateType] = isTruthy(candidateTypeCount) ? candidateTypeCount : 1;
    return types;
  }, {});
}

/**
 * Returns `true` if the number and types of ice candidates gathered are sufficient to start a call
 *
 * @param peerConnectionConfig the configuration of the peerConnection that initiated the ICE candidate gathering
 * @param iceCandidates ICE candidate strings from SDP
 * @returns `true` if the candidates gathered are enough to send a SDP
 */
export function isValidIceCandidatesGathering(
  peerConnectionConfig: RTCConfiguration,
  iceCandidates: string[],
): boolean {
  if (iceCandidates.length <= 0) {
    // if there are no candidates, no need to check for more conditions
    // the call cannot work
    return false;
  }
  const numberOfRelays = iceCandidates.filter(candidate => {
    return candidate.toLowerCase().includes('relay');
  }).length;
  const numberOfIceServers = (peerConnectionConfig.iceServers ?? []).length;
  if (numberOfIceServers <= 0) {
    return true;
  }
  return numberOfRelays >= 1;
}
