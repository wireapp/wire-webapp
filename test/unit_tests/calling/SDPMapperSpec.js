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

// grunt test_run:calling/SDPMapper

describe('z.calling.SDPMapper', () => {
  const envInitialState = Object.assign({}, z.util.Environment);

  afterEach(() => {
    z.util.Environment = Object.assign({}, envInitialState);
  });

  const sdpMapper = z.calling.SDPMapper;

  const sdpStr = `v=0
o=alice 2890844526 2890844526 IN IP4 host.atlanta.example.com
s=
c=IN IP4 host.atlanta.example.com
t=0 0
m=audio 49170 RTP/AVP 97
a=rtpmap:97 iLBC/8000 opus
a=tcap:5 UDP/TLS/RTP/SAVP`.replace(/\n/g, '\r\n');

  describe('rewriteSdp', () => {
    it('fails if no SDP given', () => {
      const expectedError = new z.error.CallError(z.error.CallError.TYPE.NOT_FOUND, 'Cannot rewrite undefined SDP');

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

      const {sdp: localSdp} = sdpMapper.rewriteSdp(rtcSdp, z.calling.enum.SDP_SOURCE.LOCAL, flowEntity);

      expect(localSdp.sdp).not.toContain('UDP/TLS/');
      expect(localSdp.sdp).toContain('RTP/SAVP');
      checkUntouchedLines(rtcSdp.sdp, localSdp.sdp);

      const {sdp: remoteSdp} = sdpMapper.rewriteSdp(rtcSdp, z.calling.enum.SDP_SOURCE.REMOTE, flowEntity);

      expect(remoteSdp.sdp).toContain('UDP/TLS/');
      checkUntouchedLines(rtcSdp.sdp, remoteSdp.sdp);
    });

    it('adds the browser name and app version for local SDP', () => {
      const rtcSdp = {
        sdp: sdpStr,
        type: z.calling.rtc.SDP_TYPE.OFFER,
      };

      const flowEntity = {
        negotiationMode: () => '',
      };

      spyOn(z.util.Environment, 'version').and.callFake(isDesktop => (isDesktop ? '5.5.5' : '4.4.4'));

      // webapp
      z.util.Environment.desktop = false;
      z.util.Environment.browser = {
        name: 'firefox',
        version: '12',
      };

      const {sdp: browserSdp} = sdpMapper.rewriteSdp(rtcSdp, z.calling.enum.SDP_SOURCE.LOCAL, flowEntity);

      expect(browserSdp.sdp).toContain('a=tool:webapp 4.4.4 (firefox 12)');
      expect(browserSdp.sdp).toContain('t=0 0');
      checkUntouchedLines(rtcSdp.sdp, browserSdp.sdp);

      z.util.Environment.desktop = true;
      z.util.Environment.browser = {
        name: 'chrome',
        version: '12',
      };
      const {sdp: electronSdp} = sdpMapper.rewriteSdp(rtcSdp, z.calling.enum.SDP_SOURCE.LOCAL, flowEntity);

      expect(electronSdp.sdp).toContain('a=tool:electron 5.5.5 4.4.4 (chrome 12)');
      expect(electronSdp.sdp).toContain('t=0 0');
      checkUntouchedLines(rtcSdp.sdp, electronSdp.sdp);
    });

    it('keeps all the ice candidates', () => {
      const candidates = `
a=candidate:1467250027 1 udp 2122260223 192.168.0.196 46243 typ host generation 0
a=candidate:1467250027 2 udp 2122260222 192.168.0.196 56280 typ host generation 0
a=candidate:435653019 1 tcp 1845501695 192.168.0.196 0 typ host tcptype active generation 0
a=candidate:435653019 2 tcp 1845501695 192.168.0.196 0 typ host tcptype active generation 0
a=candidate:1853887674 1 udp 1518280447 47.61.61.61 36768 typ srflx raddr 192.168.0.196 rport 36768 generation 0
a=candidate:1853887674 2 udp 1518280447 47.61.61.61 36768 typ srflx raddr 192.168.0.196 rport 36768 generation 0
a=candidate:750991856 2 udp 25108222 237.30.30.30 51472 typ relay raddr 47.61.61.61 rport 54763 generation 0
a=candidate:750991856 1 udp 25108223 237.30.30.30 58779 typ relay raddr 47.61.61.61 rport 54761 generation 0
`.replace(/\n/g, '\r\n');

      const flowEntity = {
        negotiationMode: () => '',
      };

      const rtcSdp = {
        sdp: sdpStr + candidates,
        type: z.calling.rtc.SDP_TYPE.OFFER,
      };

      const {sdp} = sdpMapper.rewriteSdp(rtcSdp, z.calling.enum.SDP_SOURCE.LOCAL, flowEntity);

      expect(sdp.sdp.match(/a=candidate/g).length).toEqual(8);
      checkUntouchedLines(rtcSdp.sdp, sdp.sdp);
    });

    it('changes the data channel and video channel port number for firefox only', () => {
      const dataChannel = `m=application 0`;
      const videoChannel = `m=video 0`;
      const flowEntity = {
        negotiationMode: () => '',
      };

      const rtcSdp = {
        sdp: `${sdpStr}\r\n${dataChannel}\r\n${videoChannel}`,
        type: z.calling.rtc.SDP_TYPE.OFFER,
      };

      z.util.Environment.browser.firefox = true;
      const {sdp: firefoxSdp} = sdpMapper.rewriteSdp(rtcSdp, z.calling.enum.SDP_SOURCE.LOCAL, flowEntity);

      expect(firefoxSdp.sdp).toContain('m=application 9');
      expect(firefoxSdp.sdp).toContain('m=video 9');
      checkUntouchedLines(rtcSdp.sdp, firefoxSdp.sdp);

      z.util.Environment.browser.firefox = false;
      const {sdp: noFirefoxSdp} = sdpMapper.rewriteSdp(rtcSdp, z.calling.enum.SDP_SOURCE.LOCAL, flowEntity);

      expect(noFirefoxSdp.sdp).toContain('m=application 0');
      expect(noFirefoxSdp.sdp).toContain('m=video 0');
      checkUntouchedLines(rtcSdp.sdp, noFirefoxSdp.sdp);
    });

    it('adds audio bitrate and PTime for group and restarted ICE', () => {
      const groupFlowEntity = {
        isGroup: true,
        negotiationMode: () => '',
      };

      const restartedICEFlowEntity = {
        negotiationMode: () => z.calling.enum.SDP_NEGOTIATION_MODE.ICE_RESTART,
      };

      const rtcSdp = {
        sdp: sdpStr,
        type: z.calling.rtc.SDP_TYPE.OFFER,
      };

      [groupFlowEntity, restartedICEFlowEntity].forEach(flowEntity => {
        const {sdp: groupSdp} = sdpMapper.rewriteSdp(rtcSdp, z.calling.enum.SDP_SOURCE.LOCAL, flowEntity);

        expect(groupSdp.sdp).toContain('b=AS:');
        expect(groupSdp.sdp).toContain('a=ptime:');
        checkUntouchedLines(rtcSdp.sdp, groupSdp.sdp);
      });
    });
  });

  function checkUntouchedLines(sourceSdp, transformedSdp) {
    const normalize = sdp => {
      return sdp
        .replace(/UDP\/TLS\//g, '')
        .replace(/a=tool:(electron|webapp).*?(\r\n|$)/g, '')
        .replace(/b=AS:.*?(\r\n|$)/g, '')
        .replace(/a=ptime:.*?(\r\n|$)/g, '')
        .replace(/m=(application|video).*?(\r\n|$)/g, '')
        .replace(/a=rtpmap.*?(\r\n|$)/g, '');
    };

    expect(normalize(sourceSdp)).toBe(normalize(transformedSdp));
  }
});
