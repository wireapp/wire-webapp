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

import {getLogger} from 'Util/Logger';
import {Environment} from 'Util/Environment';
import {Config} from '../../auth/config';
import {MediaType} from '../../media/MediaType';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

z.viewModel.content.PreferencesAVViewModel = class PreferencesAVViewModel {
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

  constructor(mainViewModel, contentViewModel, repositories) {
    this.initiateDevices = this.initiateDevices.bind(this);
    this.releaseDevices = this.releaseDevices.bind(this);

    this.logger = getLogger('z.viewModel.content.PreferencesAVViewModel');

    this.mediaRepository = repositories.media;
    this.userRepository = repositories.user;
    this.callingRepository = repositories.calling;

    this.isActivatedAccount = this.userRepository.isActivatedAccount;

    this.devicesHandler = this.mediaRepository.devicesHandler;
    this.availableDevices = this.devicesHandler.availableDevices;
    this.currentDeviceId = this.devicesHandler.currentDeviceId;
    this.deviceSupport = this.devicesHandler.deviceSupport;

    const updateStream = mediaType => {
      const hasActiveStreams = this.streamHandler.localMediaStream() || this.mediaStream();
      if (!hasActiveStreams) {
        // if there is no active call or the preferences is not showing any streams, we do not need to request a new stream
        return;
      }
      const currentCallMediaStream = this.streamHandler.localMediaStream();
      // release first the current call's tracks and the preferences' tracks (Firefox doesn't allow to request another mic if one is already active)
      if (currentCallMediaStream) {
        this.streamHandler.releaseTracksFromStream(currentCallMediaStream, mediaType);
      }
      if (this.mediaStream()) {
        this.streamHandler.releaseTracksFromStream(this.mediaStream(), mediaType);
      }

      return this._getMediaStream(mediaType).then(stream => {
        if (!stream) {
          return this.mediaStream(undefined);
        }
        this.streamHandler.changeMediaStream(stream, mediaType);
        if (this.mediaStream()) {
          stream.getTracks().forEach(track => {
            this.mediaStream().addTrack(track);
          });
        } else {
          stream.getTracks().forEach(track => track.stop());
        }
      });
    };

    this.currentDeviceId.audioInput.subscribe(() => updateStream(MediaType.AUDIO));
    this.currentDeviceId.videoInput.subscribe(() => updateStream(MediaType.VIDEO));

    this.constraintsHandler = this.mediaRepository.constraintsHandler;
    this.streamHandler = this.mediaRepository.streamHandler;
    this.mediaStream = ko.observable();

    this.isVisible = false;

    const selfUser = this.userRepository.self;
    this.isTemporaryGuest = ko.pureComputed(() => selfUser() && selfUser().isTemporaryGuest());

    this.mediaStream.subscribe(mediaStream => {
      if (this.audioInterval) {
        this._releaseAudioMeter();
      }

      if (this.isVisible && mediaStream) {
        this._initiateAudioMeter(mediaStream);
      }
    });

    this.audioContext = undefined;
    this.audioInterval = undefined;
    this.audioLevel = ko.observable(0);
    this.audioSource = undefined;

    this.permissionDenied = ko.observable(false);
    this.brandName = Config.BRAND_NAME;

    this.supportsAudioOutput = ko.pureComputed(() => {
      return this.deviceSupport.audioOutput() && Environment.browser.supports.audioOutputSelection;
    });
  }

  /**
   * Initiate media devices.
   * @returns {undefined} No return value
   */
  initiateDevices() {
    this.isVisible = true;

    this._getMediaStream().then(mediaStream => {
      this.mediaStream(mediaStream);
      if (mediaStream && !this.audioInterval) {
        this._initiateAudioMeter(mediaStream);
      }
    });
  }

  tryAgain() {
    this.releaseDevices();
    this.initiateDevices();
  }

  /**
   * Release media devices.
   * @returns {undefined} No return value.
   */
  releaseDevices() {
    this.isVisible = false;
    this._releaseAudioMeter();
    this._releaseMediaStream();
  }

  /**
   * Get current MediaStream or initiate it.
   * @private
   * @param {MediaType} requestedMediaType - MediaType to request the user
   * @returns {Promise} Resolves with a MediaStream
   */
  _getMediaStream(requestedMediaType = MediaType.AUDIO_VIDEO) {
    if (!this.deviceSupport.videoInput() && !this.deviceSupport.audioInput()) {
      this.permissionDenied(true);
      return Promise.resolve(undefined);
    }
    const supportsVideo = this.deviceSupport.videoInput();
    const supportsAudio = this.deviceSupport.audioInput();
    const requestAudio = supportsAudio && [MediaType.AUDIO, MediaType.AUDIO_VIDEO].includes(requestedMediaType);
    const requestVideo = supportsVideo && [MediaType.VIDEO, MediaType.AUDIO_VIDEO].includes(requestedMediaType);
    const streamConstraints = this.constraintsHandler.getMediaStreamConstraints(requestAudio, requestVideo);
    return this.streamHandler
      .requestMediaStream(requestedMediaType, streamConstraints)
      .then(({stream}) => {
        // refresh devices list in order to display the labels (see https://stackoverflow.com/a/46659819/2745879)
        this.devicesHandler.getMediaDevices();
        return stream;
      })
      .catch(error => {
        this.logger.error(`Requesting MediaStream failed: ${error.message}`, error);

        const expectedErrors = [
          z.error.MediaError.TYPE.MEDIA_STREAM_DEVICE,
          z.error.MediaError.TYPE.MEDIA_STREAM_PERMISSION,
        ];

        const isExpectedError = expectedErrors.includes(error.type);
        if (isExpectedError) {
          this.permissionDenied(true);
          return false;
        }

        throw error;
      });
  }

  /**
   * Initiate audio meter.
   *
   * @private
   * @param {MediaStream} mediaStream - MediaStream to measure audio levels on
   * @returns {undefined} No return value
   */
  _initiateAudioMeter(mediaStream) {
    this.logger.info('Initiating new audio meter', mediaStream);
    this.audioContext = this.mediaRepository.getAudioContext();

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

  _releaseAudioMeter() {
    window.clearInterval(this.audioInterval);
    this.audioInterval = undefined;
    if (this.audioSource) {
      this.audioSource.disconnect();
    }
  }

  _releaseMediaStream() {
    if (this.mediaStream()) {
      this.streamHandler.releaseTracksFromStream(this.mediaStream());
      this.mediaStream(undefined);
    }
    this.permissionDenied(false);
  }
};
