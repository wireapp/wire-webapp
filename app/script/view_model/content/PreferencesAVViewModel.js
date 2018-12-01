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

    this.logger = new z.util.Logger('z.viewModel.content.PreferencesAVViewModel', z.config.LOGGER.OPTIONS);

    this.mediaRepository = repositories.media;
    this.userRepository = repositories.user;

    this.isActivatedAccount = this.userRepository.isActivatedAccount;

    this.devicesHandler = this.mediaRepository.devicesHandler;
    this.availableDevices = this.devicesHandler.availableDevices;
    this.currentDeviceId = this.devicesHandler.currentDeviceId;
    this.deviceSupport = this.devicesHandler.deviceSupport;

    this.constraintsHandler = this.mediaRepository.constraintsHandler;
    this.streamHandler = this.mediaRepository.streamHandler;
    this.mediaStream = this.streamHandler.localMediaStream;

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

    this.supportsAudioOutput = ko.pureComputed(() => {
      return this.deviceSupport.audioOutput() && z.util.Environment.browser.supports.audioOutputSelection;
    });
  }

  /**
   * Initiate media devices.
   * @returns {undefined} No return value
   */
  initiateDevices() {
    this.isVisible = true;

    this._getMediaStream().then(mediaStream => {
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
   * Check supported media type.
   * @private
   * @returns {Promise} Resolves with a MediaType or false
   */
  _checkMediaSupport() {
    let mediaType;
    if (this.deviceSupport.audioInput()) {
      mediaType = this.deviceSupport.videoInput() ? z.media.MediaType.AUDIO_VIDEO : z.media.MediaType.AUDIO;
    } else {
      mediaType = this.deviceSupport.videoInput() ? z.media.MediaType.VIDEO : undefined;
    }

    return mediaType
      ? Promise.resolve(mediaType)
      : Promise.reject(new z.error.MediaError(z.error.MediaError.TYPE.MEDIA_STREAM_DEVICE));
  }

  /**
   * Get current MediaStream or initiate it.
   * @private
   * @returns {Promise} Resolves with a MediaStream
   */
  _getCurrentMediaStream() {
    const hasActiveStream = this.deviceSupport.videoInput()
      ? !!this.mediaStream() && this.streamHandler.localMediaType() === z.media.MediaType.VIDEO
      : !!this.mediaStream();

    return Promise.resolve(hasActiveStream ? this.mediaStream() : undefined);
  }

  /**
   * Get current MediaStream or initiate it.
   * @private
   * @returns {Promise} Resolves with a MediaStream
   */
  _getMediaStream() {
    return this._getCurrentMediaStream().then(mediaStream => (mediaStream ? mediaStream : this._initiateMediaStream()));
  }

  /**
   * Initiate MediaStream.
   * @private
   * @returns {Promise} Resolves with a MediaStream
   */
  _initiateMediaStream() {
    return this._checkMediaSupport()
      .then(mediaType => {
        return this.constraintsHandler
          .getMediaStreamConstraints(this.deviceSupport.audioInput(), this.deviceSupport.videoInput())
          .then(streamConstraints => this.streamHandler.requestMediaStream(mediaType, streamConstraints));
      })
      .then(mediaStreamInfo => {
        if (this.deviceSupport.videoInput()) {
          this.streamHandler.localMediaType(z.media.MediaType.VIDEO);
        }

        this.streamHandler.localMediaStream(mediaStreamInfo.stream);
        return this.streamHandler.localMediaStream();
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
    this.streamHandler.resetMediaStream();
    this.permissionDenied(false);
  }
};
