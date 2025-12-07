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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import ko, {computed, observable, pureComputed} from 'knockout';
import {User} from 'Repositories/entity/User';
import {applyBlur} from 'Repositories/media/VideoBackgroundBlur';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {VIDEO_STATE} from '@wireapp/avs';
import {AvsDebugger} from '@wireapp/avs-debugger';

export type UserId = string;
export type ClientId = string;

export class Participant {
  // Video
  public readonly videoState = observable(VIDEO_STATE.STOPPED);
  public readonly videoStream = observable<MediaStream | undefined>();
  public readonly blurredVideoStream = observable<{stream: MediaStream; release: () => void} | undefined>();
  public readonly hasActiveVideo: ko.PureComputed<boolean>;
  public readonly hasPausedVideo: ko.PureComputed<boolean>;
  public readonly sharesScreen: ko.PureComputed<boolean>;
  public readonly sharesCamera: ko.PureComputed<boolean>;
  public readonly isSwitchingVideoResolution = observable(false);
  public readonly startedScreenSharingAt = observable<number>(0);
  public readonly isActivelySpeaking = observable(false);
  public readonly isSendingVideo: ko.PureComputed<boolean>;
  public readonly isAudioEstablished = observable(false);

  // Audio
  public readonly audioStream = observable<MediaStream | undefined>();
  public readonly isMuted = observable(false);
  public readonly handRaisedAt = observable<number | null>(null);

  constructor(
    public readonly user: User,
    public readonly clientId: ClientId,
  ) {
    this.hasActiveVideo = pureComputed(() => {
      return (this.sharesCamera() || this.sharesScreen()) && !!this.videoStream();
    });
    this.sharesScreen = pureComputed(() => {
      return this.videoState() === VIDEO_STATE.SCREENSHARE;
    });
    this.sharesCamera = pureComputed(() => {
      return [VIDEO_STATE.STARTED, VIDEO_STATE.PAUSED].includes(this.videoState());
    });
    this.hasPausedVideo = pureComputed(() => {
      return this.videoState() === VIDEO_STATE.PAUSED;
    });
    this.isSendingVideo = pureComputed(() => {
      return this.videoState() !== VIDEO_STATE.STOPPED;
    });
    this.isSwitchingVideoResolution(false);

    computed(() => {
      const stream = this.videoStream();
      if (stream && stream.getVideoTracks().length > 0) {
        if (AvsDebugger.hasTrack(this.user.id)) {
          AvsDebugger.removeTrack(this.user.id);
        }
        AvsDebugger.addTrack(this.user.id, this.user.name(), stream.getVideoTracks()[0], this.sharesScreen());
      }
    });
  }

  public releaseBlurredVideoStream(): void {
    this.blurredVideoStream()?.release();
    this.blurredVideoStream(undefined);
  }

  public async setBlurredBackground(isBlurred: boolean) {
    const originalVideoStream = this.videoStream();
    if (isBlurred && originalVideoStream) {
      this.blurredVideoStream(await applyBlur(originalVideoStream));
    } else {
      this.releaseBlurredVideoStream();
    }
    return this.blurredVideoStream()?.stream;
  }

  readonly doesMatchIds = (userId: QualifiedId, clientId: ClientId): boolean =>
    matchQualifiedIds(userId, this.user.qualifiedId) && clientId === this.clientId;

  setAudioStream(audioStream: MediaStream, stopTracks: boolean): void {
    this.releaseStream(this.audioStream(), stopTracks);
    this.audioStream(audioStream);
  }

  setVideoStream(videoStream: MediaStream, stopTracks: boolean): void {
    this.releaseBlurredVideoStream();
    this.releaseStream(this.videoStream(), stopTracks);
    this.videoStream(videoStream);
  }

  updateMediaStream(newStream: MediaStream, stopTracks: boolean): MediaStream {
    if (newStream.getVideoTracks().length) {
      this.setVideoStream(new MediaStream(newStream.getVideoTracks()), stopTracks);
    }
    if (newStream.getAudioTracks().length) {
      this.setAudioStream(new MediaStream(newStream.getAudioTracks()), stopTracks);
    }
    return this.getMediaStream();
  }

  getMediaStream(): MediaStream {
    const audioTracks: MediaStreamTrack[] = this.audioStream()?.getTracks() ?? [];
    const videoTracks: MediaStreamTrack[] =
      this.blurredVideoStream()?.stream.getTracks() ?? this.videoStream()?.getTracks() ?? [];
    return new MediaStream(audioTracks.concat(videoTracks));
  }

  releaseVideoStream(stopTracks: boolean): void {
    this.releaseStream(this.videoStream(), stopTracks);
    this.releaseBlurredVideoStream();
    this.videoStream(undefined);
  }

  releaseAudioStream(): void {
    this.releaseStream(this.audioStream(), true);
    this.audioStream(undefined);
  }

  releaseMediaStream(stopTracks: boolean): void {
    this.releaseVideoStream(stopTracks);
    this.releaseAudioStream();
  }

  setTemporarilyVideoScreenOff(): void {
    // This is a temporary solution. The SFT does not send a response when a track change has occurred.
    // To prevent the wrong video from being briefly displayed, we introduce a timeout here.
    this.isSwitchingVideoResolution(true);
    window.setTimeout(() => {
      this.isSwitchingVideoResolution(false);
    }, 1000);
  }

  private releaseStream(mediaStream: MediaStream | undefined, stopTracks: boolean): void {
    if (!mediaStream) {
      return;
    }

    mediaStream.getTracks().forEach(track => {
      if (stopTracks) {
        track.stop();
      }
      mediaStream.removeTrack(track);
      if (track.kind == 'video' && AvsDebugger.hasTrack(this.user.id)) {
        AvsDebugger.removeTrack(this.user.id);
      }
    });
  }
}
