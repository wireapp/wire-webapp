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

import {SDPMapper} from 'src/script/calling/SDPMapper';
import {SDP_TYPE} from 'src/script/calling/rtc/SDPType';
import {Environment} from 'src/script/util/Environment';

describe('SDPMapper', () => {
  const defaultConfig = {isGroup: false, isIceRestart: false, isLocalSdp: true};
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

      expect(() => SDPMapper.rewriteSdp(undefined)).toThrow(expectedError);
    });

    it('replaces "UPD/TLS/" only for local SPD', () => {
      const rtcSdp = {
        sdp: sdpStr,
        type: SDP_TYPE.OFFER,
      };

      const {sdp: localSdp} = SDPMapper.rewriteSdp(rtcSdp, defaultConfig);

      expect(localSdp.sdp).not.toContain('UDP/TLS/');
      expect(localSdp.sdp).toContain('RTP/SAVP');
      checkUntouchedLines(rtcSdp.sdp, localSdp.sdp);

      const {sdp: remoteSdp} = SDPMapper.rewriteSdp(rtcSdp, {isGroup: false, isIceRestart: false, isLocalSdp: false});

      expect(remoteSdp.sdp).toContain('UDP/TLS/');
      checkUntouchedLines(rtcSdp.sdp, remoteSdp.sdp);
    });

    it('adapts protocol for an offer created by Firefox > 63', () => {
      const firefoxSdp = `
${sdpStr}
m=application 0 UDP/DTLS/SCTP webrtc-datachannel`.replace(/\n/g, '\r\n');

      const rtcSdp = {
        sdp: firefoxSdp,
        type: SDP_TYPE.OFFER,
      };

      const originalFirefox = Environment.browser.firefox;
      Environment.browser.firefox = true;

      const {sdp: localSdp} = SDPMapper.rewriteSdp(rtcSdp, defaultConfig);

      expect(localSdp.sdp).not.toContain('UDP/DTLS/');
      expect(localSdp.sdp).toContain('DTLS/SCTP');
      checkUntouchedLines(rtcSdp.sdp, localSdp.sdp);
      Environment.browser.firefox = originalFirefox;
    });

    it('Use the most recent syntax to define the sctp port', () => {
      const remoteSdp = `${sdpStr}
a=sctpmap:5000 webrtc-datachannel 1024
`.replace(/\n/g, '\r\n');

      const rtcSdp = {
        sdp: remoteSdp,
        type: SDP_TYPE.OFFER,
      };

      const originalFirefox = Environment.browser.firefox;
      Environment.browser.firefox = true;

      const {sdp: localSdp} = SDPMapper.rewriteSdp(rtcSdp, {isGroup: false, isIceRestart: false, isLocalSdp: false});

      expect(localSdp.sdp).not.toContain('a=sctpmap:5000 webrtc-datachannel 1024');
      expect(localSdp.sdp).toContain('a=sctp-port:5000');
      checkUntouchedLines(rtcSdp.sdp, localSdp.sdp);
      Environment.browser.firefox = originalFirefox;
    });

    it('adds the browser name and app version for local SDP', () => {
      const rtcSdp = {
        sdp: sdpStr,
        type: SDP_TYPE.OFFER,
      };

      spyOn(Environment, 'version').and.callFake(isDesktop => (isDesktop ? '5.5.5' : '4.4.4'));

      // webapp
      const originalDesktop = Environment.desktop;
      const originalBrowser = Environment.browser;
      Environment.desktop = false;
      Environment.browser = {
        name: 'firefox',
        version: '12',
      };

      const {sdp: browserSdp} = SDPMapper.rewriteSdp(rtcSdp, defaultConfig);

      expect(browserSdp.sdp).toContain('a=tool:webapp 4.4.4 (firefox 12)');
      expect(browserSdp.sdp).toContain('t=0 0');
      checkUntouchedLines(rtcSdp.sdp, browserSdp.sdp);

      Environment.desktop = true;
      Environment.browser = {
        name: 'chrome',
        version: '12',
      };
      const {sdp: electronSdp} = SDPMapper.rewriteSdp(rtcSdp, defaultConfig);

      expect(electronSdp.sdp).toContain('a=tool:electron 5.5.5 4.4.4 (chrome 12)');
      expect(electronSdp.sdp).toContain('t=0 0');
      checkUntouchedLines(rtcSdp.sdp, electronSdp.sdp);
      Environment.desktop = originalDesktop;
      Environment.browser = originalBrowser;
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

      const rtcSdp = {
        sdp: sdpStr + candidates,
        type: SDP_TYPE.OFFER,
      };

      const {sdp} = SDPMapper.rewriteSdp(rtcSdp, defaultConfig);

      expect(sdp.sdp.match(/a=candidate/g).length).toEqual(8);
      checkUntouchedLines(rtcSdp.sdp, sdp.sdp);
    });

    it('changes the data channel and video channel port number for firefox only', () => {
      const dataChannel = `m=application 0`;
      const videoChannel = `m=video 0`;
      const rtcSdp = {
        sdp: `${sdpStr}\r\n${dataChannel}\r\n${videoChannel}`,
        type: SDP_TYPE.OFFER,
      };

      const originalFirefox = Environment.browser.firefox;
      Environment.browser.firefox = true;
      const {sdp: firefoxSdp} = SDPMapper.rewriteSdp(rtcSdp, defaultConfig);

      expect(firefoxSdp.sdp).toContain('m=application 9');
      expect(firefoxSdp.sdp).toContain('m=video 9');
      checkUntouchedLines(rtcSdp.sdp, firefoxSdp.sdp);

      Environment.browser.firefox = false;
      const {sdp: noFirefoxSdp} = SDPMapper.rewriteSdp(rtcSdp, defaultConfig);

      expect(noFirefoxSdp.sdp).toContain('m=application 0');
      expect(noFirefoxSdp.sdp).toContain('m=video 0');
      checkUntouchedLines(rtcSdp.sdp, noFirefoxSdp.sdp);
      Environment.browser.firefox = originalFirefox;
    });

    it('adds audio bitrate and PTime for group and restarted ICE', () => {
      const groupConfig = {
        isGroup: true,
        isIceRestart: false,
        isLocalSdp: true,
      };

      const iceRestartConfig = {
        isGroup: false,
        isIceRestart: true,
        isLocalSdp: true,
      };

      const rtcSdp = {
        sdp: sdpStr,
        type: SDP_TYPE.OFFER,
      };

      [groupConfig, iceRestartConfig].forEach(config => {
        const {sdp: groupSdp} = SDPMapper.rewriteSdp(rtcSdp, config);

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
        .replace(/a=sctpmap:.*?(\r\n|$)/g, '')
        .replace(/a=sctp-port:.*?(\r\n|$)/g, '')
        .replace(/a=rtpmap.*?(\r\n|$)/g, '');
    };

    expect(normalize(sourceSdp)).toBe(normalize(transformedSdp));
  }
});
