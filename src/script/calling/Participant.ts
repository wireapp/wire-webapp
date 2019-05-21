/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {VIDEO_STATE} from 'avs-web';
import ko from 'knockout';

export type UserId = string;
export type DeviceId = string;

export class Participant {
  public userId: UserId;
  public deviceId: DeviceId;
  public videoState: ko.Observable<number>;
  public mediaStream: ko.Observable<MediaStream | undefined>;
  public hasActiveVideo: ko.PureComputed<boolean>;
  public sharesScreen: ko.PureComputed<boolean>;
  public sharesCamera: ko.PureComputed<boolean>;

  constructor(userId: UserId, deviceId: DeviceId) {
    this.userId = userId;
    this.deviceId = deviceId;
    this.videoState = ko.observable(VIDEO_STATE.STOPPED);
    this.hasActiveVideo = ko.pureComputed(() => {
      return this.sharesCamera() || this.sharesScreen();
    });
    this.sharesScreen = ko.pureComputed(() => {
      return this.videoState() === VIDEO_STATE.SCREENSHARE;
    });
    this.sharesCamera = ko.pureComputed(() => {
      return this.videoState() === VIDEO_STATE.STARTED;
    });
    this.mediaStream = ko.observable();
  }

  setMediaStream(mediaStream: MediaStream, state: VIDEO_STATE): void {
    this.releaseVideoStream();
    this.mediaStream(mediaStream);
    this.videoState(state);
  }

  releaseVideoStream(): void {
    if (this.mediaStream()) {
      this.mediaStream()
        .getTracks()
        .forEach(track => track.stop());
    }
  }
}
