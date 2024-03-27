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

import {isValidIceCandidatesGathering, getIceCandidatesTypes} from 'Util/PeerConnectionUtil';

describe('PeerConnectionUtil', () => {
  const hostIceCandidates = [
    'a=candidate:0 1 UDP 2122252543 192.168.120.196 32785 typ host',
    'a=candidate:3 1 TCP 2105524479 192.168.120.196 9 typ host tcptype active',
    'a=candidate:0 2 UDP 2122252542 192.168.120.196 47577 typ host',
    'a=candidate:3 2 TCP 2105524478 192.168.120.196 9 typ host tcptype active',
  ];
  const relayIceCandidates = [
    'a=candidate:2 1 UDP 92216831 52.59.229.255 45814 typ relay raddr 52.59.229.255 rport 45814',
    'a=candidate:2 2 UDP 92216830 52.59.229.255 51684 typ relay raddr 52.59.229.255 rport 51684',
    'a=candidate:4 1 UDP 8331263 52.59.229.255 59586 typ relay raddr 52.59.229.255 rport 59586',
    'a=candidate:4 2 UDP 8331262 52.59.229.255 53103 typ relay raddr 52.59.229.255 rport 53103',
    'a=candidate:5 1 UDP 8331263 52.59.229.255 40234 typ relay raddr 52.59.229.255 rport 40234',
    'a=candidate:5 2 UDP 8331262 52.59.229.255 58977 typ relay raddr 52.59.229.255 rport 58977',
  ];

  describe('isValidIceCandidatesGathering', () => {
    it('returns false if no ice candidate gathered', () => {
      const result = isValidIceCandidatesGathering({}, []);

      expect(result).toBe(false);
    });

    it('returns true if there are some not-relay candidates with empty iceServers config', () => {
      const result = isValidIceCandidatesGathering({iceServers: []}, hostIceCandidates);

      expect(result).toBe(true);
    });

    it('returns true if there are as many relay ice candidates as there are iceServers', () => {
      [1, 2, 3, 4, 5, 6].forEach(numberOfServers => {
        const result = isValidIceCandidatesGathering(
          {iceServers: new Array(numberOfServers)},
          relayIceCandidates.slice(0, numberOfServers),
        );

        expect(result).toBe(true);
      });
    });

    it('returns false if there are some ice servers and no relay candidate', () => {
      [1, 2, 3, 4, 5, 6].forEach(numberOfServers => {
        const result = isValidIceCandidatesGathering({iceServers: new Array(numberOfServers)}, hostIceCandidates);

        expect(result).toBe(false);
      });
    });

    it('returns true if there is one ice server and one or more candidates', () => {
      [1, 2, 3, 4, 5, 6].forEach(numberOfCandidates => {
        const result = isValidIceCandidatesGathering(
          {iceServers: new Array(1)},
          relayIceCandidates.slice(0, numberOfCandidates),
        );

        expect(result).toBe(true);
      });
    });
  });

  describe('getIceCandidatesTypes', () => {
    it('detects types of candidates', () => {
      const candidates = hostIceCandidates.concat(relayIceCandidates);

      expect(getIceCandidatesTypes(candidates)).toEqual({
        host: hostIceCandidates.length,
        relay: relayIceCandidates.length,
      });
    });
  });
});
