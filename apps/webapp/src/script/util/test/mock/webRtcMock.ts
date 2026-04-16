/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {nonstandard, RTCRtpSender, MediaStream} from '@roamhq/wrtc';

const {RTCAudioSource} = nonstandard;

declare global {
  interface Window {
    MediaStream: typeof MediaStream;
    RTCAudioSource: typeof RTCAudioSource;
    RTCRtpSender: typeof RTCRtpSender;
  }
}
const RTCRtpSenderMock = {
  prototype: {createEncodedVideoStreams: {}, createEncodedStreams: {}, transform: {}},
};

Object.defineProperty(window, 'MediaStream', {
  value: MediaStream,
  writable: true,
});

Object.defineProperty(window, 'RTCAudioSource', {
  value: RTCAudioSource,
  writable: true,
});

Object.defineProperty(window, 'RTCRtpSender', {
  value: RTCRtpSenderMock,
  writable: true,
});
