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

import ko from 'knockout';
import {getLogger, Logger} from 'Util/Logger';
import {Environment} from 'Util/Environment';
import {Config, Configuration} from '../../Config';
import {MediaType} from '../../media/MediaType';
import {MediaRepository} from '../../media/MediaRepository';
import {MediaStreamHandler} from '../../media/MediaStreamHandler';
import {MediaConstraintsHandler} from '../../media/MediaConstraintsHandler';
import {UserRepository} from '../../user/UserRepository';
import {Call} from '../../calling/Call';
import {DeviceIds, Devices, DeviceSupport, MediaDevicesHandler} from '../../media/MediaDevicesHandler';

type MediaSourceChanged = (mediaStream: MediaStream, mediaType: MediaType, call?: Call) => void;
type WillChangeMediaSource = (mediaType: MediaType) => boolean;
type CallBacksType = {
  mediaSourceChanged: MediaSourceChanged;
  willChangeMediaSource: WillChangeMediaSource;
};

export class PreferencesAVViewModel {
  audioContext: AudioContext;
  audioInterval: number;
  audioLevel: ko.Observable<number>;
  audioSource: MediaStreamAudioSourceNode;
  availableDevices: Devices;
  brandName: string;
  Config: Configuration;
  constraintsHandler: MediaConstraintsHandler;
  currentDeviceId: DeviceIds;
  devicesHandler: MediaDevicesHandler;
  deviceSupport: DeviceSupport;
  hasAudioTrack: ko.PureComputed<boolean>;
  hasOnlyOneMicrophone: ko.PureComputed<boolean>;
  hasVideoTrack: ko.PureComputed<boolean>;
  isActivatedAccount: ko.PureComputed<boolean>;
  isTemporaryGuest: ko.PureComputed<boolean>;
  logger: Logger;
  mediaSourceChanged: MediaSourceChanged;
  mediaStream: ko.Observable<MediaStream>;
  streamHandler: MediaStreamHandler;
  supportsAudioOutput: ko.PureComputed<boolean>;
  userRepository: UserRepository;
  willChangeMediaSource: WillChangeMediaSource;

  static get CONFIG() {
    return {
      AUDIO_METER: {
        FFT_SIZE: 1024,
        INTERVAL: 100,
        LEVEL_ADJUSTMENT: 0.075,
        SMOOTHING_TIME_CONSTANT: 0.2,
      },
    };
  }

  constructor(mediaRepository: MediaRepository, userRepository: UserRepository, callbacks: CallBacksType) {
    this.willChangeMediaSource = callbacks.willChangeMediaSource;
    this.mediaSourceChanged = callbacks.mediaSourceChanged;

    this.logger = getLogger('PreferencesAVViewModel');

    this.userRepository = userRepository;

    this.isActivatedAccount = this.userRepository.isActivatedAccount;

    this.devicesHandler = mediaRepository.devicesHandler;
    this.availableDevices = this.devicesHandler.availableDevices;
    this.currentDeviceId = this.devicesHandler.currentDeviceId;
    this.deviceSupport = this.devicesHandler.deviceSupport;
    this.Config = Config.getConfig();

    this.currentDeviceId.audioInput.subscribe(() => this.tryAgain(MediaType.AUDIO));
    this.currentDeviceId.videoInput.subscribe(() => this.tryAgainVideo());

    this.constraintsHandler = mediaRepository.constraintsHandler;
    this.streamHandler = mediaRepository.streamHandler;

    const hasTracksOfType = (tracksGetter: 'getAudioTracks' | 'getVideoTracks') => {
      const tracks = this.mediaStream() && this.mediaStream()[tracksGetter]();
      return !!tracks;
    };
    this.mediaStream = ko.observable(new MediaStream());
    this.hasAudioTrack = ko.pureComputed(() => hasTracksOfType('getAudioTracks'));
    this.hasVideoTrack = ko.pureComputed(() => hasTracksOfType('getVideoTracks'));
    this.hasOnlyOneMicrophone = ko.pureComputed(() => this.availableDevices.audioInput().length < 2);

    const selfUser = this.userRepository.self;
    this.isTemporaryGuest = ko.pureComputed(() => selfUser() && selfUser().isTemporaryGuest());

    this.audioContext = undefined;
    this.audioInterval = undefined;
    this.audioLevel = ko.observable(0);
    this.audioSource = undefined;

    this.brandName = this.Config.BRAND_NAME;

    this.supportsAudioOutput = ko.pureComputed(() => {
      return this.deviceSupport.audioOutput() && Environment.browser.supports.audioOutputSelection;
    });
  }

  tryAgainVideo() {
    return this.tryAgain(MediaType.VIDEO);
  }

  // async updateStream(mediaType: MediaType): Promise<void> {
  //   alert('updateStream');
  //   this.currentMediaType = mediaType;
  //   await this.tryAgain();
  //
  //   const needsStreamUpdate = this.willChangeMediaSource(mediaType);
  //
  //   if (!needsStreamUpdate && !this.mediaStream()) {
  //     return undefined;
  //   }
  //
  //   try {
  //     const stream = await this.getMediaStream(mediaType);
  //     this.mediaSourceChanged(stream, mediaType);
  //     if (this.mediaStream()) {
  //       stream.getTracks().forEach(track => {
  //         this.mediaStream().addTrack(track);
  //       });
  //       this.initiateAudioMeter(this.mediaStream());
  //     } else {
  //       stream.getTracks().forEach(track => track.stop());
  //     }
  //   } catch (error) {
  //     this.logger.warn(`Requesting MediaStream failed: ${error.message}`, error);
  //     this.releaseMediaStream();
  //   }
  // }

  async initiateDevices(mediaType: MediaType): Promise<void> {
    try {
      const mediaStream = await this.getMediaStream(mediaType);
      // this.mediaStream(mediaStream);
      mediaStream.getTracks().forEach(track => this.mediaStream().addTrack(track));
      this.mediaSourceChanged(mediaStream, mediaType);

      if (mediaStream.getAudioTracks().length && !this.audioInterval) {
        this.initiateAudioMeter(mediaStream);
      }
    } catch (error) {
      this.logger.warn(`Requesting MediaStream failed: ${error.message}`, error);
      this.releaseMediaStream(mediaType);
    }
  }

  async tryAgain(mediaType: MediaType): Promise<void> {
    // TODO: Check if there is already a pending media stream request
    await this.releaseDevices(mediaType);
    this.initiateDevices(mediaType);
    await this.willChangeMediaSource(mediaType);
  }

  async releaseDevices(requestedMediaType: MediaType): Promise<void> {
    await this.releaseAudioMeter();
    this.releaseMediaStream(requestedMediaType);
  }

  private async getMediaStream(requestedMediaType: MediaType): Promise<MediaStream> {
    if (!this.deviceSupport.videoInput() && !this.deviceSupport.audioInput()) {
      return Promise.resolve(undefined);
    }
    const supportsVideo = this.deviceSupport.videoInput();
    const supportsAudio = this.deviceSupport.audioInput();

    const requestAudio = supportsAudio && [MediaType.AUDIO, MediaType.AUDIO_VIDEO].includes(requestedMediaType);
    const requestVideo = supportsVideo && [MediaType.VIDEO, MediaType.AUDIO_VIDEO].includes(requestedMediaType);

    const stream = await this.getStreamsSeparately(requestAudio, requestVideo);
    await this.devicesHandler.refreshMediaDevices();
    return stream;
  }

  private async getStreamsSeparately(requestAudio: boolean, requestVideo: boolean): Promise<MediaStream> {
    const mediaStreams = [];

    if (requestAudio) {
      try {
        const audioStream = await this.streamHandler.requestMediaStream(true, false, false, false);
        mediaStreams.push(audioStream);
      } catch (error) {
        this.logger.warn(error);
      }
    }

    if (requestVideo) {
      try {
        const videoStream = await this.streamHandler.requestMediaStream(false, true, false, false);
        mediaStreams.push(videoStream);
      } catch (error) {
        this.logger.warn(error);
      }
    }

    if (mediaStreams.length === 0) {
      throw new Error('No media streams available.');
    }

    const tracks = mediaStreams.reduce((trackList, mediaStream) => {
      return trackList.concat(mediaStream.getTracks());
    }, []);

    return new MediaStream(tracks);
  }

  private initiateAudioMeter(mediaStream: MediaStream): void {
    this.logger.info(`Initiating new audio meter for stream ID "${mediaStream.id}"`, mediaStream);
    if (!window.AudioContext || !window.AudioContext.prototype.createMediaStreamSource) {
      this.logger.warn('AudioContext is not supported, no volume indicator can be generated');
    }
    this.audioContext = new window.AudioContext();

    const audioAnalyser = this.audioContext.createAnalyser();
    audioAnalyser.fftSize = PreferencesAVViewModel.CONFIG.AUDIO_METER.FFT_SIZE;
    audioAnalyser.smoothingTimeConstant = PreferencesAVViewModel.CONFIG.AUDIO_METER.SMOOTHING_TIME_CONSTANT;

    const audioDataArray = new Float32Array(audioAnalyser.frequencyBinCount);

    this.audioInterval = window.setInterval(() => {
      audioAnalyser.getFloatFrequencyData(audioDataArray);
      let volume = 0;

      // Data is in the db range of -100 to -30, but can also be -Infinity. We normalize the value up to -50 to the range of 0, 1.
      for (const dataPoint of audioDataArray) {
        volume += Math.abs(Math.max(dataPoint, -100) + 100) / 50;
      }

      const averageVolume = volume / audioDataArray.length;

      this.audioLevel(averageVolume - PreferencesAVViewModel.CONFIG.AUDIO_METER.LEVEL_ADJUSTMENT);
    }, PreferencesAVViewModel.CONFIG.AUDIO_METER.INTERVAL);

    this.audioSource = this.audioContext.createMediaStreamSource(mediaStream);
    this.audioSource.connect(audioAnalyser);
  }

  private async releaseAudioMeter(): Promise<void> {
    window.clearInterval(this.audioInterval);
    this.audioInterval = undefined;

    if (this.audioContext) {
      try {
        await this.audioContext.close();
        this.logger.info('Closed existing AudioContext', this.audioContext);
        this.audioContext = undefined;
      } catch (error) {
        this.logger.error(error);
      }
    }

    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = undefined;
    }
  }

  private releaseMediaStream(mediaType: MediaType): void {
    if (this.mediaStream()) {
      this.streamHandler.releaseTracksFromStream(this.mediaStream(), mediaType);
      // const hasNoTracks = this.mediaStream().getTracks().length === 0;
      // if (hasNoTracks) {
      //   this.mediaStream(undefined);
      // }
    }
  }
}
