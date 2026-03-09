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

import {VIDEO_STATE} from '@wireapp/avs';
import {AvsDebugger} from '@wireapp/avs-debugger';

import {User} from 'Repositories/entity/User';
import {BackgroundEffectsController} from 'Repositories/media/BackgroundEffects/effects/BackgroundEffectsController';
import {
  BLUR_STRENGTHS,
  DEFAULT_BACKGROUND_EFFECT,
  type BackgroundEffectSelection,
  type BackgroundSource,
} from 'Repositories/media/VideoBackgroundEffects';
import {getLogger, Logger} from 'Util/Logger';
import {matchQualifiedIds} from 'Util/QualifiedId';

export type UserId = string;
export type ClientId = string;

export class Participant {
  // Video
  public readonly videoState = observable(VIDEO_STATE.STOPPED);
  public readonly videoStream = observable<MediaStream | undefined>();
  public readonly processedVideoStream = observable<{stream: MediaStream; release: () => void} | undefined>();
  public readonly backgroundEffect = observable<BackgroundEffectSelection>(DEFAULT_BACKGROUND_EFFECT);
  public readonly hasActiveVideo: ko.PureComputed<boolean>;
  public readonly hasPausedVideo: ko.PureComputed<boolean>;
  public readonly sharesScreen: ko.PureComputed<boolean>;
  public readonly sharesCamera: ko.PureComputed<boolean>;
  public readonly isSwitchingVideoResolution = observable(false);
  public readonly startedScreenSharingAt = observable<number>(0);
  public readonly isActivelySpeaking = observable(false);
  public readonly isSendingVideo: ko.PureComputed<boolean>;
  public readonly isAudioEstablished = observable(false);
  private backgroundEffectsController: BackgroundEffectsController | null = null;
  private readonly logger: Logger;

  // Audio
  public readonly audioStream = observable<MediaStream | undefined>();
  public readonly isMuted = observable(false);
  public readonly handRaisedAt = observable<number | null>(null);

  constructor(
    public readonly user: User,
    public readonly clientId: ClientId,
  ) {
    this.logger = getLogger('Participant');
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

  public releaseProcessedVideoStream(): void {
    this.processedVideoStream()?.release();
    this.processedVideoStream(undefined);
    this.backgroundEffectsController = null;
  }

  /**
   * Applies a background effect to this participant's video stream.
   *
   * This method:
   * 1. Initializes the background effects controller if needed (first call or after release)
   * 2. Starts processing the video track with the selected effect
   * 3. Updates the controller's mode and background source for virtual effects
   * 4. Returns the processed MediaStream with effects applied
   *
   * For 'none' effect, releases any existing processed stream and returns
   * the original video stream. The controller is reused if already initialized
   * to avoid reinitialization overhead. Background sources are only updated
   * when switching effects on an existing controller (not during initial creation).
   *
   * @param effect - Background effect to apply ('none', 'blur', 'virtual', or 'custom').
   * @param backgroundSource - Optional background source for virtual/custom effects.
   *                          Required for 'custom' effect type. Only used when
   *                          updating an existing controller, not during initialization.
   * @returns Promise resolving to the processed MediaStream with effects applied,
   *          or undefined if application fails or no video stream is available.
   */
  public async applyBackgroundEffect(
    effect: BackgroundEffectSelection,
    backgroundSource?: BackgroundSource,
  ): Promise<MediaStream | undefined> {
    const originalVideoStream = this.videoStream();
    if (!originalVideoStream) {
      return undefined;
    }
    if (effect.type === 'none') {
      this.releaseProcessedVideoStream();
      return originalVideoStream;
    }
    const videoTrack = originalVideoStream.getVideoTracks()[0];
    if (!videoTrack) {
      return undefined;
    }

    const isVirtual = effect.type === 'virtual' || effect.type === 'custom';
    const blurStrength = effect.type === 'blur' ? BLUR_STRENGTHS[effect.level] : BLUR_STRENGTHS.high;

    const shouldCreateController = !this.backgroundEffectsController || !this.processedVideoStream();
    if (shouldCreateController) {
      const controller = new BackgroundEffectsController();
      try {
        const {outputTrack, stop} = await controller.start(videoTrack, {
          mode: isVirtual ? 'virtual' : 'blur',
          blurStrength,
          quality: 'auto',
          targetFps: 15,
          debugMode: 'off',
          ...(isVirtual && backgroundSource ? {backgroundImage: backgroundSource} : {}),
        });
        const processedStream = new MediaStream([outputTrack]);
        this.backgroundEffectsController = controller;
        this.processedVideoStream({
          stream: processedStream,
          release: () => {
            stop();
            outputTrack.stop();
            this.backgroundEffectsController = null;
          },
        });
      } catch (error) {
        controller.stop();
        this.logger.warn('BackgroundEffectsController failed with error:', error);
        this.releaseProcessedVideoStream();
        return undefined;
      }
    }

    if (!this.backgroundEffectsController) {
      return this.processedVideoStream()?.stream;
    }

    if (isVirtual) {
      this.backgroundEffectsController.setMode('virtual');
      if (backgroundSource && !shouldCreateController) {
        this.backgroundEffectsController.setBackgroundSource(backgroundSource);
      }
    } else {
      this.backgroundEffectsController.setMode('blur');
      this.backgroundEffectsController.setBlurStrength(blurStrength);
    }

    return this.processedVideoStream()?.stream;
  }

  readonly doesMatchIds = (userId: QualifiedId, clientId: ClientId): boolean =>
    matchQualifiedIds(userId, this.user.qualifiedId) && clientId === this.clientId;

  setAudioStream(audioStream: MediaStream, stopTracks: boolean): void {
    this.releaseStream(this.audioStream(), stopTracks);
    this.audioStream(audioStream);
  }

  setVideoStream(videoStream: MediaStream, stopTracks: boolean): void {
    this.releaseProcessedVideoStream();
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
      this.processedVideoStream()?.stream.getTracks() ?? this.videoStream()?.getTracks() ?? [];
    return new MediaStream(audioTracks.concat(videoTracks));
  }

  releaseVideoStream(stopTracks: boolean): void {
    this.releaseStream(this.videoStream(), stopTracks);
    this.releaseProcessedVideoStream();
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
