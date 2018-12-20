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

// KARMA_SPECS=telemetry/calling/CallLogger yarn test:app

import sdpTransform from 'sdp-transform';

describe('z.telemetry.calling.CallLogger', () => {
  const callLogger = new z.telemetry.calling.CallLogger('test', null, {}, 'test');

  it('properly obfuscate IPv4 addresses', () => {
    expect(callLogger.safeGuard('test 10.10.12.43 test')).toBe('test 10.10.XXX.XXX test');
    expect(callLogger.safeGuard('127.0.0.1')).toBe('127.0.XXX.XXX');
    expect(callLogger.safeGuard('52.153.34.121')).toBe('52.153.XXX.XXX');
  });

  it('ignore invalid IPv4 addresses', () => {
    expect(callLogger.safeGuard('10.10.I12.I12')).toBe('10.10.I12.I12');
  });

  it('properly obfuscate IPv6 addresses', () => {
    expect(callLogger.safeGuard('e5c7:839a:5fee:39a3:86b4:e3af:65ed:4286')).toBe('e5c7:839a:5fee:XXXX:XXXX:XXXX:XXXX');
    expect(callLogger.safeGuard('8329:1d53:ec1c:1c3d:6569:2920:f0fd:5b64')).toBe('8329:1d53:ec1c:XXXX:XXXX:XXXX:XXXX');
  });

  it('ignore invalid IPv6 addresses', () => {
    expect(callLogger.safeGuard('65ed:5b64[]:ec1c:,,,:6569:2920:f0fd:5b64')).toBe(
      '65ed:5b64[]:ec1c:,,,:6569:2920:f0fd:5b64'
    );
  });

  it('properly obfuscate UUIDs', () => {
    expect(callLogger.safeGuard('df63c05f-cfbb-4c33-a759-d867ed8fd803')).toBe('df63');
    expect(callLogger.safeGuard('789bbed7-6da0-46e2-b5aa-3347a4f80c1e')).toBe('789b');
  });

  it('ignore invalid UUIDs', () => {
    expect(callLogger.safeGuard('s-cfbb-4c33-a759-a')).toBe('s-cfbb-4c33-a759-a');
  });

  it('properly obfuscate a SDP message', () => {
    const originalSdp = `v=0
o=- 4162068053823794076 2 IN IP4 127.0.0.1
s=-
t=0 0
a=tool:webapp 2018.05.04.0718 (Chrome 66)
a=group:BUNDLE audio video data
a=msid-semantic: WMS EwQOn5YWBRyDDfyGSGRaMgKqCG7APyMD9UXk
m=audio 41059 RTP/SAVPF 111
c=IN IP4 18.194.139.224
a=rtcp:9 IN IP4 0.0.0.0
a=candidate:3129949526 1 udp 2122260223 10.10.124.6 58873 typ host generation 0 network-id 2 network-cost 50
a=candidate:317266735 1 udp 2122194687 192.168.120.173 64564 typ host generation 0 network-id 1 network-cost 10
a=candidate:332444291 1 udp 1686052607 62.210.99.39 58873 typ srflx raddr 10.10.124.6 rport 58873 generation 0 network-id 2 network-cost 50
a=candidate:4094476710 1 tcp 1518280447 10.10.124.6 9 typ host tcptype active generation 0 network-id 2 network-cost 50
a=candidate:1550510047 1 tcp 1518214911 192.168.120.173 9 typ host tcptype active generation 0 network-id 1 network-cost 10
a=candidate:2418293877 1 udp 41885439 18.194.139.224 41059 typ relay raddr 62.210.99.39 rport 58873 generation 0 network-id 2 network-cost 50
a=candidate:1647293877 1 udp 41885695 54.93.169.110 46225 typ relay raddr 62.210.99.39 rport 58873 generation 0 network-id 2 network-cost 50
a=ice-ufrag:9hp9
a=ice-pwd:kTmV2sRxTv4ct0PabUVbsp4t
a=x-KASEv1:w+U/tSD28B9XMTjaqbmMRyiTIl+Ri5lw5oK6k2/DPU0=
a=ice-options:trickle
a=fingerprint:sha-256 71:97:92:58:9B:19:12:4F:50:3C:C9:A6:A5:A0:EA:CA:16:E8:7A:D8:02:3C:5B:A9:FC:87:B7:48:55:3D:55:D3
a=setup:active
a=mid:audio
a=sendrecv
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=fmtp:111 minptime=10;useinbandfec=1
a=ssrc:3363014553 cname:v27FZ532FnSl96bM
a=ssrc:3363014553 msid:EwQOn5YWBRyDDfyGSGRaMgKqCG7APyMD9UXk 12f3c08f-7ecb-475d-82d5-7abbd0da2429
a=ssrc:3363014553 mslabel:EwQOn5YWBRyDDfyGSGRaMgKqCG7APyMD9UXk
a=ssrc:3363014553 label:12f3c08f-7ecb-475d-82d5-7abbd0da2429
m=video 9 RTP/SAVPF 100 96
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:9hp9
a=ice-pwd:kTmV2sRxTv4ct0PabUVbsp4t
a=ice-options:trickle
a=fingerprint:sha-256 71:97:92:58:9B:19:12:4F:50:3C:C9:A6:A5:A0:EA:CA:16:E8:7A:D8:02:3C:5B:A9:FC:87:B7:48:55:3D:55:D3
a=setup:active
a=mid:video
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:4 urn:3gpp:video-orientation
a=recvonly
a=rtcp-mux
a=rtpmap:100 VP8/90000
a=rtcp-fb:100 goog-remb
a=rtcp-fb:100 ccm fir
a=rtcp-fb:100 nack
a=rtcp-fb:100 nack pli
a=rtpmap:96 rtx/90000
a=fmtp:96 apt=100
m=application 9 DTLS/SCTP 5000
c=IN IP4 0.0.0.0
b=AS:30
a=ice-ufrag:9hp9
a=ice-pwd:kTmV2sRxTv4ct0PabUVbsp4t
a=ice-options:trickle
a=fingerprint:sha-256 71:97:92:58:9B:19:12:4F:50:3C:C9:A6:A5:A0:EA:CA:16:E8:7A:D8:02:3C:5B:A9:FC:87:B7:48:55:3D:55:D3
a=setup:active
a=mid:data
a=sctpmap:5000 webrtc-datachannel 1024`;
    const obfuscatedSdp = `v=0
o=- 4162068053823794076 2 IN IP4 127.0.XXX.XXX
s=-
t=0 0
a=msid-semantic: WMS EwQOn5YWBRyDDfyGSGRaMgKqCG7APyMD9UXk
a=group:BUNDLE audio video data
a=tool:webapp 2018.05.04.0718 (Chrome 66)
m=audio 41059 RTP/SAVPF 111
c=IN IP4 18.194.XXX.XXX
a=rtpmap:111 opus/48000/2
a=fmtp:111 minptime=10;useinbandfec=1
a=rtcp:9 IN IP4 0.0.XXX.XXX
a=setup:active
a=mid:audio
a=sendrecv
a=ice-ufrag:9hp9
a=ice-pwd:XXXXXXXXXXXXXXXXXXXXXXXX
a=fingerprint:sha-256 XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
a=candidate:3129949526 1 udp 2122260223 10.10.XXX.XXX 58873 typ host generation 0 network-id 2 network-cost 50
a=candidate:317266735 1 udp 2122194687 192.168.XXX.XXX 64564 typ host generation 0 network-id 1 network-cost 10
a=candidate:332444291 1 udp 1686052607 62.210.XXX.XXX 58873 typ srflx raddr 10.10.XXX.XXX rport 58873 generation 0 network-id 2 network-cost 50
a=candidate:4094476710 1 tcp 1518280447 10.10.XXX.XXX 9 typ host tcptype active generation 0 network-id 2 network-cost 50
a=candidate:1550510047 1 tcp 1518214911 192.168.XXX.XXX 9 typ host tcptype active generation 0 network-id 1 network-cost 10
a=candidate:2418293877 1 udp 41885439 18.194.XXX.XXX 41059 typ relay raddr 62.210.XXX.XXX rport 58873 generation 0 network-id 2 network-cost 50
a=candidate:1647293877 1 udp 41885695 54.93.XXX.XXX 46225 typ relay raddr 62.210.XXX.XXX rport 58873 generation 0 network-id 2 network-cost 50
a=ice-options:trickle
a=ssrc:3363014553 cname:v27FZ532FnSl96bM
a=ssrc:3363014553 msid:EwQOn5YWBRyDDfyGSGRaMgKqCG7APyMD9UXk 12f3
a=ssrc:3363014553 mslabel:EwQOn5YWBRyDDfyGSGRaMgKqCG7APyMD9UXk
a=ssrc:3363014553 label:12f3
a=rtcp-mux
a=x-KASEv1:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
m=video 9 RTP/SAVPF 100 96
c=IN IP4 0.0.XXX.XXX
a=rtpmap:100 VP8/90000
a=rtpmap:96 rtx/90000
a=fmtp:96 apt=100
a=rtcp:9 IN IP4 0.0.XXX.XXX
a=rtcp-fb:100 goog-remb
a=rtcp-fb:100 ccm fir
a=rtcp-fb:100 nack
a=rtcp-fb:100 nack pli
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:4 urn:3gpp:video-orientation
a=setup:active
a=mid:video
a=recvonly
a=ice-ufrag:9hp9
a=ice-pwd:XXXXXXXXXXXXXXXXXXXXXXXX
a=fingerprint:sha-256 XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
a=ice-options:trickle
a=rtcp-mux
m=application 9 DTLS/SCTP 5000
c=IN IP4 0.0.XXX.XXX
b=AS:30
a=setup:active
a=mid:data
a=ice-ufrag:9hp9
a=ice-pwd:XXXXXXXXXXXXXXXXXXXXXXXX
a=fingerprint:sha-256 XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
a=ice-options:trickle
a=sctpmap:5000 webrtc-datachannel 1024`;

    expect(callLogger.safeGuard(callLogger.obfuscateSdp(originalSdp)).trim()).toBe(
      sdpTransform.write(sdpTransform.parse(obfuscatedSdp)).trim()
    );
  });
});
