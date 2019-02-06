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

import AbstractAssetTransferStateTracker from './AbstractAssetTransferStateTracker';

class AudioAssetComponent extends AbstractAssetTransferStateTracker {
  /**
   * Construct a new link preview asset.
   *
   * @param {Object} params - Component parameters
   * @param {z.entity.Message} params.message - Message entity
   * @param {Object} component_info - Component information
   */
  constructor(params, component_info) {
    super(ko.unwrap(params.message));
    this.dispose = this.dispose.bind(this);
    this.logger = new z.util.Logger('AudioAssetComponent', z.config.LOGGER.OPTIONS);

    this.message = ko.unwrap(params.message);
    this.asset = this.message.get_first_asset();
    this.header = params.header || false;

    this.audio_src = ko.observable();
    this.audio_element = $(component_info.element).find('audio')[0];
    this.audio_time = ko.observable(0);
    this.audio_is_loaded = ko.observable(false);

    this.show_loudness_preview = ko.pureComputed(() => {
      if (this.asset.meta && this.asset.meta.loudness) {
        return this.asset.meta.loudness.length > 0;
      }
    });

    if (this.asset.meta) {
      this.audio_time(this.asset.meta.duration);
    }

    $(component_info.element).attr({
      'data-uie-name': 'audio-asset',
      'data-uie-value': this.asset.file_name,
    });

    this.on_play_button_clicked = this.on_play_button_clicked.bind(this);
    this.on_pause_button_clicked = this.on_pause_button_clicked.bind(this);
  }

  on_timeupdate() {
    this.audio_time(this.audio_element.currentTime);
  }

  on_play_button_clicked() {
    Promise.resolve()
      .then(() => {
        if (!this.audio_src()) {
          return this.asset.load().then(blob => this.audio_src(window.URL.createObjectURL(blob)));
        }
      })
      .then(() => this.audio_element.play())
      .catch(error => this.logger.error('Failed to load audio asset ', error));
  }

  on_pause_button_clicked() {
    if (this.audio_element) {
      this.audio_element.pause();
    }
  }

  dispose() {
    window.URL.revokeObjectURL(this.audio_src());
  }
}

ko.components.register('audio-asset', {
  template: `
    <audio data-bind="attr: {src: audio_src}, event: {timeupdate: on_timeupdate}"></audio>
    <!-- ko ifnot: message.isObfuscated() -->
      <!-- ko if: header -->
        <asset-header params="message: message"></asset-header>
      <!-- /ko -->
      <!-- ko if: transferState() === z.assets.AssetTransferState.UPLOAD_PENDING -->
        <div class="asset-placeholder">
          <div class="three-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      <!-- /ko -->
      <!-- ko if: transferState() !== z.assets.AssetTransferState.UPLOAD_PENDING -->
        <div class="audio-controls">
          <media-button params="src: audio_element,
                                asset: asset,
                                play: on_play_button_clicked,
                                pause: on_pause_button_clicked,
                                cancel: () => cancelUpload(message),
                                transferState: transferState,
                                uploadProgress: uploadProgress
                                ">
          </media-button>
          <!-- ko if: transferState() !== z.assets.AssetTransferState.UPLOADING -->
            <span class="audio-controls-time label-xs"
                  data-uie-name="status-audio-time"
                  data-bind="text: z.util.TimeUtil.formatSeconds(audio_time())">
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
      return new AudioAssetComponent(params, component_info);
    },
  },
});
