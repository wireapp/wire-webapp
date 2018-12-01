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

const sdp_payloads = {
  original: {
    sdp:
      'v=0\r\n' +
      'o=- 417754658890736523 2 IN IP4 127.0.0.1\r\n' +
      's=-\r\n' +
      't=0 0\r\n' +
      'a=group:BUNDLE audio video\r\n' +
      'a=msid-semantic: WMS vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7\r\n' +
      'm=audio 33723 RTP/SAVPF 111 103 104 9 0 8 106 105 13 126\r\n' +
      'c=IN IP4 54.170.248.231\r\n' +
      'a=rtcp:9 IN IP4 0.0.0.0\r\n' +
      'a=ice-ufrag:QeJO/RZdtjZZAB4C\r\n' +
      'a=ice-pwd:6Q224z4qZ5MgDieVn9i6ltyc\r\n' +
      'a=fingerprint:sha-256 49:EE:7F:43:E6:66:BC:49:1B:7D:CF:53:3F:26:DA:B5:C8:44:2E:08:A8:B4:EE:98:AF:18:19:02:66:2A:FB:6C\r\n' +
      'a=setup:actpass\r\n' +
      'a=mid:audio\r\n' +
      'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n' +
      'a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n' +
      'a=sendrecv\r\n' +
      'a=rtcp-mux\r\n' +
      'a=rtpmap:111 opus/48000/2\r\n' +
      'a=rtcp-fb:111 transport-cc\r\n' +
      'a=fmtp:111 minptime=10;useinbandfec=1\r\n' +
      'a=rtpmap:103 ISAC/16000\r\n' +
      'a=rtpmap:104 ISAC/32000\r\n' +
      'a=rtpmap:9 G722/8000\r\n' +
      'a=rtpmap:0 PCMU/8000\r\n' +
      'a=rtpmap:8 PCMA/8000\r\n' +
      'a=rtpmap:106 CN/32000\r\n' +
      'a=rtpmap:105 CN/16000\r\n' +
      'a=rtpmap:13 CN/8000\r\n' +
      'a=rtpmap:126 telephone-event/8000\r\n' +
      'a=maxptime:60\r\n' +
      'a=ssrc:118391381 cname:V7K44N907S4bMCCq\r\n' +
      'a=ssrc:118391381 msid:vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7 94185153-8005-4a0f-8e71-28ae69ef9fc8\r\n' +
      'a=ssrc:118391381 mslabel:vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7\r\n' +
      'a=ssrc:118391381 label:94185153-8005-4a0f-8e71-28ae69ef9fc8\r\n' +
      'm=video 9 RTP/SAVPF 100 101 116 117 96 97 98\r\n' +
      'c=IN IP4 0.0.0.0\r\n' +
      'a=rtcp:9 IN IP4 0.0.0.0\r\n' +
      'a=ice-ufrag:QeJO/RZdtjZZAB4C\r\n' +
      'a=ice-pwd:6Q224z4qZ5MgDieVn9i6ltyc\r\n' +
      'a=fingerprint:sha-256 49:EE:7F:43:E6:66:BC:49:1B:7D:CF:53:3F:26:DA:B5:C8:44:2E:08:A8:B4:EE:98:AF:18:19:02:66:2A:FB:6C\r\n' +
      'a=setup:actpass\r\n' +
      'a=mid:video\r\n' +
      'a=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\n' +
      'a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n' +
      'a=extmap:4 urn:3gpp:video-orientation\r\n' +
      'a=sendrecv\r\n' +
      'a=rtcp-mux\r\n' +
      'a=rtcp-rsize\r\n' +
      'a=rtpmap:100 VP8/90000\r\n' +
      'a=rtcp-fb:100 ccm fir\r\n' +
      'a=rtcp-fb:100 nack\r\n' +
      'a=rtcp-fb:100 nack pli\r\n' +
      'a=rtcp-fb:100 goog-remb\r\n' +
      'a=rtcp-fb:100 transport-cc\r\n' +
      'a=rtpmap:101 VP9/90000\r\n' +
      'a=rtcp-fb:101 ccm fir\r\n' +
      'a=rtcp-fb:101 nack\r\n' +
      'a=rtcp-fb:101 nack pli\r\n' +
      'a=rtcp-fb:101 goog-remb\r\n' +
      'a=rtcp-fb:101 transport-cc\r\n' +
      'a=rtpmap:116 red/90000\r\n' +
      'a=rtpmap:117 ulpfec/90000\r\n' +
      'a=rtpmap:96 rtx/90000\r\n' +
      'a=fmtp:96 apt=100\r\n' +
      'a=rtpmap:97 rtx/90000\r\n' +
      'a=fmtp:97 apt=101\r\n' +
      'a=rtpmap:98 rtx/90000\r\n' +
      'a=fmtp:98 apt=116\r\n' +
      'a=ssrc-group:FID 773423550 2255821848\r\n' +
      'a=ssrc:773423550 cname:V7K44N907S4bMCCq\r\n' +
      'a=ssrc:773423550 msid:vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7 68dc6bc0-c2c8-4f6d-b07d-3a4e00434eca\r\n' +
      'a=ssrc:773423550 mslabel:vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7\r\n' +
      'a=ssrc:773423550 label:68dc6bc0-c2c8-4f6d-b07d-3a4e00434eca\r\n' +
      'a=ssrc:2255821848 cname:V7K44N907S4bMCCq\r\n' +
      'a=ssrc:2255821848 msid:vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7 68dc6bc0-c2c8-4f6d-b07d-3a4e00434eca\r\n' +
      'a=ssrc:2255821848 mslabel:vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7\r\n' +
      'a=ssrc:2255821848 label:68dc6bc0-c2c8-4f6d-b07d-3a4e00434eca',
    type: 'offer',
  },
  original_fingerprint: {
    sdp:
      'v=0\r\n' +
      'o=- 417754658890736523 2 IN IP4 127.0.0.1\r\n' +
      's=-\r\n' +
      't=0 0\r\n' +
      'a=group:BUNDLE audio video\r\n' +
      'a=msid-semantic: WMS vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7\r\n' +
      'm=audio 33723 RTP/SAVPF 111 103 104 9 0 8 106 105 13 126\r\n' +
      'c=IN IP4 54.170.248.231\r\n' +
      'a=rtcp:9 IN IP4 0.0.0.0\r\n' +
      'a=ice-ufrag:QeJO/RZdtjZZAB4C\r\n' +
      'a=ice-pwd:6Q224z4qZ5MgDieVn9i6ltyc\r\n' +
      'a=fingerprint:sha-256 49:ee:7f:43:e6:66:bc:49:1b:7d:cf:53:3f:26:da:b5:c8:44:2e:08:a8:b4:ee:98:af:18:19:02:66:2a:fb:6c\r\n' +
      'a=setup:actpass\r\n' +
      'a=mid:audio\r\n' +
      'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level',
    type: 'offer',
  },
  rewritten_codecs: {
    sdp:
      'v=0\r\n' +
      'o=- 417754658890736523 2 IN IP4 127.0.0.1\r\n' +
      's=-\r\n' +
      't=0 0\r\n' +
      'a=group:BUNDLE audio video\r\n' +
      'a=msid-semantic: WMS vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7\r\n' +
      'm=audio 33723 RTP/SAVPF 111 103 104 9 0 8 106 105 13 126\r\n' +
      'c=IN IP4 54.170.248.231\r\n' +
      'a=rtcp:9 IN IP4 0.0.0.0\r\n' +
      'a=ice-ufrag:QeJO/RZdtjZZAB4C\r\n' +
      'a=ice-pwd:6Q224z4qZ5MgDieVn9i6ltyc\r\n' +
      'a=fingerprint:sha-256 49:EE:7F:43:E6:66:BC:49:1B:7D:CF:53:3F:26:DA:B5:C8:44:2E:08:A8:B4:EE:98:AF:18:19:02:66:2A:FB:6C\r\n' +
      'a=setup:actpass\r\n' +
      'a=mid:audio\r\n' +
      'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n' +
      'a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n' +
      'a=sendrecv\r\n' +
      'a=rtcp-mux\r\n' +
      'a=rtpmap:111 opus/48000/2\r\n' +
      'a=rtcp-fb:111 transport-cc\r\n' +
      'a=fmtp:111 minptime=10;useinbandfec=1\r\n' +
      'a=rtpmap:103 ISAC/16000\r\n' +
      'a=rtpmap:104 ISAC/32000\r\n' +
      'a=rtpmap:9 G722/8000\r\n' +
      'a=rtpmap:0 PCMU/8000\r\n' +
      'a=rtpmap:8 PCMA/8000\r\n' +
      'a=rtpmap:106 CN/32000\r\n' +
      'a=rtpmap:105 CN/16000\r\n' +
      'a=rtpmap:13 CN/8000\r\n' +
      'a=rtpmap:126 telephone-event/8000\r\n' +
      'a=maxptime:60\r\n' +
      'a=ssrc:118391381 cname:V7K44N907S4bMCCq\r\n' +
      'a=ssrc:118391381 msid:vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7 94185153-8005-4a0f-8e71-28ae69ef9fc8\r\n' +
      'a=ssrc:118391381 mslabel:vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7\r\n' +
      'a=ssrc:118391381 label:94185153-8005-4a0f-8e71-28ae69ef9fc8\r\n' +
      'm=video 9 RTP/SAVPF 100 101 117 96 97\r\n' +
      'c=IN IP4 0.0.0.0\r\n' +
      'a=rtcp:9 IN IP4 0.0.0.0\r\n' +
      'a=ice-ufrag:QeJO/RZdtjZZAB4C\r\n' +
      'a=ice-pwd:6Q224z4qZ5MgDieVn9i6ltyc\r\n' +
      'a=fingerprint:sha-256 49:EE:7F:43:E6:66:BC:49:1B:7D:CF:53:3F:26:DA:B5:C8:44:2E:08:A8:B4:EE:98:AF:18:19:02:66:2A:FB:6C\r\n' +
      'a=setup:actpass\r\n' +
      'a=mid:video\r\n' +
      'a=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\n' +
      'a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n' +
      'a=extmap:4 urn:3gpp:video-orientation\r\n' +
      'a=sendrecv\r\n' +
      'a=rtcp-mux\r\n' +
      'a=rtcp-rsize\r\n' +
      'a=rtpmap:100 VP8/90000\r\n' +
      'a=rtcp-fb:100 ccm fir\r\n' +
      'a=rtcp-fb:100 nack\r\n' +
      'a=rtcp-fb:100 nack pli\r\n' +
      'a=rtcp-fb:100 goog-remb\r\n' +
      'a=rtcp-fb:100 transport-cc\r\n' +
      'a=rtpmap:101 VP9/90000\r\n' +
      'a=rtcp-fb:101 ccm fir\r\n' +
      'a=rtcp-fb:101 nack\r\n' +
      'a=rtcp-fb:101 nack pli\r\n' +
      'a=rtcp-fb:101 goog-remb\r\n' +
      'a=rtcp-fb:101 transport-cc\r\n' +
      'a=rtpmap:117 ulpfec/90000\r\n' +
      'a=rtpmap:96 rtx/90000\r\n' +
      'a=fmtp:96 apt=100\r\n' +
      'a=rtpmap:97 rtx/90000\r\n' +
      'a=fmtp:97 apt=101\r\n' +
      'a=ssrc-group:FID 773423550 2255821848\r\n' +
      'a=ssrc:773423550 cname:V7K44N907S4bMCCq\r\n' +
      'a=ssrc:773423550 msid:vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7 68dc6bc0-c2c8-4f6d-b07d-3a4e00434eca\r\n' +
      'a=ssrc:773423550 mslabel:vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7\r\n' +
      'a=ssrc:773423550 label:68dc6bc0-c2c8-4f6d-b07d-3a4e00434eca\r\n' +
      'a=ssrc:2255821848 cname:V7K44N907S4bMCCq\r\n' +
      'a=ssrc:2255821848 msid:vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7 68dc6bc0-c2c8-4f6d-b07d-3a4e00434eca\r\n' +
      'a=ssrc:2255821848 mslabel:vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7\r\n' +
      'a=ssrc:2255821848 label:68dc6bc0-c2c8-4f6d-b07d-3a4e00434eca',
    type: 'offer',
  },
  rewritten_fingerprint: {
    sdp:
      'v=0\r\n' +
      'o=- 417754658890736523 2 IN IP4 127.0.0.1\r\n' +
      's=-\r\n' +
      't=0 0\r\n' +
      'a=group:BUNDLE audio video\r\n' +
      'a=msid-semantic: WMS vmYtSQeNol6s2SCJ4LwWRDmzJnEGZPNcvMw7\r\n' +
      'm=audio 33723 RTP/SAVPF 111 103 104 9 0 8 106 105 13 126\r\n' +
      'c=IN IP4 54.170.248.231\r\n' +
      'a=rtcp:9 IN IP4 0.0.0.0\r\n' +
      'a=ice-ufrag:QeJO/RZdtjZZAB4C\r\n' +
      'a=ice-pwd:6Q224z4qZ5MgDieVn9i6ltyc\r\n' +
      'a=fingerprint:sha-256 49:EE:7F:43:E6:66:BC:49:1B:7D:CF:53:3F:26:DA:B5:C8:44:2E:08:A8:B4:EE:98:AF:18:19:02:66:2A:FB:6C\r\n' +
      'a=setup:actpass\r\n' +
      'a=mid:audio\r\n' +
      'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level',
    type: 'offer',
  },
};

window.sdp_payloads = sdp_payloads;
