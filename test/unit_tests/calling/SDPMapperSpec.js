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

'use strict';

// grunt test_init && grunt test_run:calling/SDPMapper

describe('z.calling.SDPMapper', () => {
  const sdpMapper = z.calling.SDPMapper;

  const sdpStr = `v=0
o=alice 2890844526 2890844526 IN IP4 host.atlanta.example.com
s=
c=IN IP4 host.atlanta.example.com
t=0 0
m=audio 49170 RTP/AVP 97
a=rtpmap:97 iLBC/8000
a=tcap:5 UDP/TLS/RTP/SAVP
`.replace('\n', '\r\n');

  describe('rewriteSdp', () => {
    it('fails if no SDP given', () => {
      const expectedError = new z.calling.CallError(z.calling.CallError.TYPE.NOT_FOUND, 'Cannot rewrite undefined SDP');
      expect(() => sdpMapper.rewriteSdp(undefined)).toThrow(expectedError);
    });

    it('replaces "UPD/TLS/" only for local SPD', () => {
      const rtcSdp = {
        sdp: sdpStr,
        type: z.calling.rtc.SDP_TYPE.OFFER,
      };

      const flowEntity = {
        negotiationMode: () => '',
      };

      // local SDP
      const {sdp: localSdp} = sdpMapper.rewriteSdp(rtcSdp, z.calling.enum.SDP_SOURCE.LOCAL, flowEntity);
      expect(localSdp.sdp).not.toContain('UDP/TLS/');
      expect(localSdp.sdp).toContain('RTP/SAVP');

      // remote SDP
      const {sdp: remoteSdp} = sdpMapper.rewriteSdp(rtcSdp, z.calling.enum.SDP_SOURCE.REMOTE, flowEntity);
      expect(remoteSdp.sdp).toContain('UDP/TLS/');
    });

    it('adds the browser name and app version for local SDP', () => {
      const rtcSdp = {
        sdp: sdpStr,
        type: z.calling.rtc.SDP_TYPE.OFFER,
      };

      const flowEntity = {
        negotiationMode: () => '',
      };

      spyOn(z.util.Environment, 'version').and.callFake(webapp => (webapp ? '5.5.5' : '4.4.4'));

      // webapp
      z.util.Environment.desktop = false;
      z.util.Environment.browser = {
        name: 'firefox',
        version: '12',
      };

      const {sdp: localSdp} = sdpMapper.rewriteSdp(rtcSdp, z.calling.enum.SDP_SOURCE.LOCAL, flowEntity);
      expect(localSdp.sdp).toContain('a=tool:webapp 5.5.5 (firefox 12)');
    });
  });
});
