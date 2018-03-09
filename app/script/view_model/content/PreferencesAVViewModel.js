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

'use strict';

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

    this.mediaRepository = repositories.media;
    this.logger = new z.util.Logger('z.viewModel.content.PreferencesAVViewModel', z.config.LOGGER.OPTIONS);

    this.devicesHandler = this.mediaRepository.devices_handler;
    this.availableDevices = this.devicesHandler.available_devices;
    this.currentDeviceId = this.devicesHandler.current_device_id;

    this.constraintsHandler = this.mediaRepository.constraints_handler;
    this.streamHandler = this.mediaRepository.stream_handler;
    this.mediaStream = this.streamHandler.local_media_stream;

    this.isVisible = false;

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
   * @returns {Promise} Resolves with a MediaStream
   */
  _getMediaStream() {
    if (this.mediaStream() && this.streamHandler.local_media_type() === z.media.MediaType.VIDEO) {
      return Promise.resolve(this.mediaStream());
    }

    const requestAudio = !!this.availableDevices.audio_input().length;
    const requestVideo = !!this.availableDevices.video_input().length;
    return this.constraintsHandler
      .get_media_stream_constraints(requestAudio, requestVideo)
      .then(({media_stream_constraints, mediaType}) => {
        return this.streamHandler.request_media_stream(mediaType, media_stream_constraints);
      })
      .then(mediaStreamInfo => {
        if (this.availableDevices.video_input().length) {
          this.streamHandler.local_media_type(z.media.MediaType.VIDEO);
        }

        this.streamHandler.local_media_stream(mediaStreamInfo.stream);
        return this.streamHandler.local_media_stream();
      })
      .catch(error => {
        this.logger.error(`Requesting MediaStream failed: ${error.message}`, error);

        const expectedErrors = [
          z.media.MediaError.TYPE.MEDIA_STREAM_DEVICE,
          z.media.MediaError.TYPE.MEDIA_STREAM_PERMISSION,
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
    this.audioContext = this.mediaRepository.get_audio_context();

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
    this.streamHandler.reset_media_stream();
    this.permissionDenied(false);
  }
};
