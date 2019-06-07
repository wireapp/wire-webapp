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

import {VIDEO_STATE} from '@wireapp/avs';
import ko from 'knockout';

export type UserId = string;
export type DeviceId = string;

export class Participant {
  public userId: UserId;
  public deviceId: DeviceId;
  public videoState: ko.Observable<number>;
  public videoStream: ko.Observable<MediaStream | undefined>;
  public audioStream: ko.Observable<MediaStream | undefined>;
  public hasActiveVideo: ko.PureComputed<boolean>;
  public sharesScreen: ko.PureComputed<boolean>;
  public sharesCamera: ko.PureComputed<boolean>;
  public hasPausedVideo: ko.PureComputed<boolean>;

  constructor(userId: UserId, deviceId: DeviceId) {
    this.userId = userId;
    this.deviceId = deviceId;
    this.videoState = ko.observable(VIDEO_STATE.STOPPED);
    this.hasActiveVideo = ko.pureComputed(() => {
      return (this.sharesCamera() || this.sharesScreen()) && !!this.videoStream();
    });
    this.sharesScreen = ko.pureComputed(() => {
      return this.videoState() === VIDEO_STATE.SCREENSHARE;
    });
    this.sharesCamera = ko.pureComputed(() => {
      return [VIDEO_STATE.STARTED, VIDEO_STATE.PAUSED].includes(this.videoState());
    });
    this.hasPausedVideo = ko.pureComputed(() => {
      return this.videoState() === VIDEO_STATE.PAUSED;
    });
    this.videoStream = ko.observable();
    this.audioStream = ko.observable();
  }

  setAudioStream(audioStream: MediaStream): void {
    this.releaseStream(this.audioStream());
    this.audioStream(audioStream);
  }

  setVideoStream(videoStream: MediaStream | undefined): void {
    this.releaseStream(this.videoStream());
    this.videoStream(videoStream);
  }

  updateMediaStream(newStream: MediaStream): MediaStream {
    if (newStream.getVideoTracks().length) {
      this.setVideoStream(new MediaStream(newStream.getVideoTracks()));
    }
    if (newStream.getAudioTracks().length) {
      this.setAudioStream(new MediaStream(newStream.getAudioTracks()));
    }
    return this.getMediaStream();
  }

  getMediaStream(): MediaStream {
    const audioTracks: MediaStreamTrack[] = this.audioStream() ? this.audioStream().getTracks() : [];
    const videoTracks: MediaStreamTrack[] = this.videoStream() ? this.videoStream().getTracks() : [];
    return new MediaStream(audioTracks.concat(videoTracks));
  }

  releaseVideoStream(): void {
    this.releaseStream(this.videoStream());
    this.videoStream(undefined);
  }

  releaseAudioStream(): void {
    this.releaseStream(this.audioStream());
    this.audioStream(undefined);
  }

  releaseMediaStream(): void {
    this.releaseVideoStream();
    this.releaseAudioStream();
  }

  private releaseStream(mediaStream: MediaStream | undefined): void {
    if (!mediaStream) {
      return;
    }

    mediaStream.getTracks().forEach(track => {
      track.stop();
      mediaStream.removeTrack(track);
    });
  }
}
