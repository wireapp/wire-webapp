/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
window.z.announce = z.announce || {};

z.components.AudioAssetComponent = class AudioAssetComponent {
  /**
   * Construct a new link preview asset.
   *
   * @param {Object} params - Component parameters
   * @param {z.entity.Message} params.message - Message entity
   * @param {Object} component_info - Component information
   */
  constructor(params, component_info) {
    this.dispose = this.dispose.bind(this);
    this.logger = new z.util.Logger('AudioAssetComponent', z.config.LOGGER.OPTIONS);

    this.message = ko.unwrap(params.message);
    this.asset = this.message.get_first_asset();
    this.expired = this.message.is_expired;
    this.header = params.header || false;

    this.audio_src = ko.observable();
    this.audio_element = $(component_info.element).find('audio')[0];
    this.audio_time = ko.observable(0);
    this.audio_is_loaded = ko.observable(false);

    this.show_loudness_preview = ko.pureComputed(() => {
      if (this.asset.meta !== null && this.asset.meta.loudness !== null) {
        return this.asset.meta.loudness.length > 0;
      }
    });

    if (this.asset.meta !== null) {
      this.audio_time(this.asset.meta.duration);
    }

    $(component_info.element).attr({
      'data-uie-name': 'audio-asset',
      'data-uie-value': this.asset.file_name,
    });
  }

  on_loadedmetadata() {
    this._send_tracking_event();
  }

  on_timeupdate() {
    this.audio_time(this.audio_element.currentTime);
  }

  on_play_button_clicked() {
    Promise.resolve()
      .then(() => {
        if (!this.audio_src()) {
          return this.asset.load()
            .then((blob) => this.audio_src(window.URL.createObjectURL(blob)));
        }
      })
      .then(() => {
        this.audio_element.play();
      })
      .catch((error) => {
        this.logger.error('Failed to load audio asset ', error);
      });
  }

  on_pause_button_clicked() {
    if (this.audio_element) {
      this.audio_element.pause();
    }
  }

  _send_tracking_event() {
    const duration = Math.floor(this.audio_element.duration);

    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.MEDIA.PLAYED_AUDIO_MESSAGE, {
      duration: z.util.bucket_values(duration, [0, 10, 30, 60, 300, 900, 1800]),
      duration_actual: duration,
      type: z.util.get_file_extension(this.asset.file_name),
    });
  }

  dispose() {
    window.URL.revokeObjectURL(this.audio_src());
  }
};

ko.components.register('audio-asset', {
  template: `
    <audio data-bind="attr: {src: audio_src}, event: {loadedmetadata: on_loadedmetadata, timeupdate: on_timeupdate}"></audio>
    <!-- ko ifnot: expired() -->
      <!-- ko if: header -->
        <asset-header params="message: message"></asset-header>
      <!-- /ko -->
      <!-- ko if: !asset.uploaded_on_this_client() && asset.status() === z.assets.AssetTransferState.UPLOADING -->
        <div class="asset-placeholder">
          <div class="three-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      <!-- /ko -->
      <!-- ko ifnot: !asset.uploaded_on_this_client() && asset.status() === z.assets.AssetTransferState.UPLOADING -->
        <div class="audio-controls">
          <media-button params="src: audio_element,
                                asset: asset,
                                play: on_play_button_clicked,
                                pause: on_pause_button_clicked,
                                cancel: function() {asset.cancel($parents[1])}">
          </media-button>
          <!-- ko if: asset.status() !== z.assets.AssetTransferState.UPLOADING -->
            <span class="audio-controls-time label-xs"
                  data-uie-name="status-audio-time"
                  data-bind="text: z.util.format_seconds(audio_time())">
            </span>
            <!-- ko if: show_loudness_preview -->
              <audio-seek-bar data-uie-name="status-audio-seekbar"
                              params="src: audio_element, asset: asset, disabled: !audio_src()"></audio-seek-bar>
            <!-- /ko -->
            <!-- ko ifnot: show_loudness_preview -->
              <seek-bar data-uie-name="status-audio-seekbar"
                        params="src: audio_element, dark: true, disabled: !audio_src()"></seek-bar>
            <!-- /ko -->
          <!-- /ko -->
        </div>
      <!-- /ko -->
    <!-- /ko -->
  `,
  viewModel: {
    createViewModel(params, component_info) {
      return new z.components.AudioAssetComponent(params, component_info);
    },
  },
});
