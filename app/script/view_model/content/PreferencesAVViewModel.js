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
  constructor(mainViewModel, contentViewModel, repositories) {
    this.initiateDevices = this.initiateDevices.bind(this);
    this.release_devices = this.release_devices.bind(this);

    this.media_repository = repositories.media;
    this.logger = new z.util.Logger('z.viewModel.content.PreferencesAVViewModel', z.config.LOGGER.OPTIONS);

    this.media_devices_handler = this.media_repository.devices_handler;
    this.available_devices = this.media_devices_handler.available_devices;
    this.current_device_id = this.media_devices_handler.current_device_id;

    this.constraints_handler = this.media_repository.constraints_handler;
    this.media_stream_handler = this.media_repository.stream_handler;
    this.media_stream = this.media_stream_handler.local_media_stream;

    this.isVisible = false;

    this.media_stream.subscribe(media_stream => {
      if (this.audio_interval) {
        this._release_audio_meter();
      }

      if (this.isVisible && media_stream) {
        this._initiate_audio_meter(media_stream);
      }
    });

    this.audio_context = undefined;
    this.audio_level = ko.observable(0);
    this.audio_interval = undefined;

    this.permission_denied = ko.observable(false);
  }

  /**
   * Initiate media devices.
   * @returns {undefined} No return value
   */
  initiateDevices() {
    this.isVisible = true;

    this._get_media_stream().then(media_stream => {
      if (media_stream && !this.audio_interval) {
        this._initiate_audio_meter(media_stream);
      }
    });
  }

  /**
   * Release media devices.
   * @returns {undefined} No return value.
   */
  release_devices() {
    this.isVisible = false;
    this._release_audio_meter();
    this._release_media_stream();
  }

  /**
   * Get current MediaStream or initiate it.
   * @private
   * @returns {Promise} Resolves with a MediaStream
   */
  _get_media_stream() {
    if (this.media_stream() && this.media_stream_handler.local_media_type() === z.media.MediaType.VIDEO) {
      return Promise.resolve(this.media_stream());
    }

    return this.constraints_handler
      .get_media_stream_constraints(
        this.available_devices.audio_input().length,
        this.available_devices.video_input().length
      )
      .then(({media_stream_constraints, media_type}) => {
        return this.media_stream_handler.request_media_stream(media_type, media_stream_constraints);
      })
      .then(media_stream_info => {
        if (this.available_devices.video_input().length) {
          this.media_stream_handler.local_media_type(z.media.MediaType.VIDEO);
        }

        this.media_stream_handler.local_media_stream(media_stream_info.stream);
        return this.media_stream_handler.local_media_stream();
      })
      .catch(error => {
        this.logger.error(`Requesting MediaStream failed: ${error.message}`, error);
        if (
          [z.media.MediaError.TYPE.MEDIA_STREAM_DEVICE, z.media.MediaError.TYPE.MEDIA_STREAM_PERMISSION].includes(
            error.type
          )
        ) {
          this.permission_denied(true);
          return false;
        }
        throw error;
      });
  }

  /**
   * Initiate audio meter.
   *
   * @private
   * @param {MediaStream} media_stream - MediaStream to measure audio levels on
   * @returns {undefined} No return value
   */
  _initiate_audio_meter(media_stream) {
    this.logger.info('Initiating new audio meter', media_stream);
    this.audio_context = this.media_repository.get_audio_context();

    this.audio_analyser = this.audio_context.createAnalyser();
    this.audio_analyser.fftSize = 1024;
    this.audio_analyser.smoothingTimeConstant = 0.2;
    this.audio_data_array = new Float32Array(this.audio_analyser.frequencyBinCount);

    this.audio_interval = window.setInterval(() => {
      this.audio_analyser.getFloatFrequencyData(this.audio_data_array);
      let volume = 0;
      // Data is in the db range of -100 to -30, but can also be -Infinity. We normalize the value up to -50 to the range of 0, 1.
      for (const data of this.audio_data_array) {
        volume += Math.abs(Math.max(data, -100) + 100) / 50;
      }

      const average_volume = volume / this.audio_data_array.length;

      return this.audio_level(average_volume - 0.075);
    }, 100);

    this.audio_source = this.audio_context.createMediaStreamSource(media_stream);
    this.audio_source.connect(this.audio_analyser);
  }

  _release_audio_meter() {
    window.clearInterval(this.audio_interval);
    this.audio_interval = undefined;
    if (this.audio_source) {
      this.audio_source.disconnect();
    }
  }

  _release_media_stream() {
    this.media_stream_handler.reset_media_stream();
    this.permission_denied(false);
  }
};
