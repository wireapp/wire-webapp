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
window.z.components = z.components || {};

z.components.VideoAssetComponent = class VideoAssetComponent {
  /**
   * Construct a new video asset.
   *
   * @param {Object} params - Component parameters
   * @param {z.entity.Message} params.message - Message entity
   * @param {Object} component_info - Component information
   */
  constructor(params, component_info) {
    this.logger = new z.util.Logger('VideoAssetComponent', z.config.LOGGER.OPTIONS);

    this.message = ko.unwrap(params.message);
    this.asset = this.message.get_first_asset();

    this.preview_subscription = undefined;

    this.video_element = $(component_info.element).find('video')[0];
    this.video_src = ko.observable();
    this.video_time = ko.observable();

    this.video_playback_error = ko.observable(false);
    this.show_bottom_controls = ko.observable(false);

    this.video_time_rest = ko.pureComputed(() => this.video_element.duration - this.video_time());

    if (this.asset.preview_resource()) {
      this._load_video_preview();
    } else {
      this.preview_subscription = this.asset.preview_resource.subscribe(this._load_video_preview.bind(this));
    }

    this.onPlayButtonClicked = this.onPlayButtonClicked.bind(this);
    this.on_pause_button_clicked = this.on_pause_button_clicked.bind(this);
    this.displaySmall = ko.observable(!!params.isQuote);
  }

  _load_video_preview() {
    this.asset.load_preview().then(blob => {
      if (blob) {
        this.video_element.setAttribute('poster', window.URL.createObjectURL(blob));
        this.video_element.style.backgroundColor = '#000';
      }
    });
  }

  on_loadedmetadata() {
    this.video_time(this.video_element.duration);
  }

  on_timeupdate() {
    this.video_time(this.video_element.currentTime);
  }

  on_error(component, jquery_event) {
    this.video_playback_error(true);
    this.logger.error('Video cannot be played', jquery_event);
  }

  onPlayButtonClicked() {
    this.displaySmall(false);
    if (this.video_src()) {
      if (this.video_element) {
        this.video_element.play();
      }
    } else {
      this.asset
        .load()
        .then(blob => {
          this.video_src(window.URL.createObjectURL(blob));
          if (this.video_element) {
            this.video_element.play();
          }
          this.show_bottom_controls(true);
        })
        .catch(error => this.logger.error('Failed to load video asset ', error));
    }
  }

  on_pause_button_clicked() {
    if (this.video_element) {
      this.video_element.pause();
    }
  }

  on_video_playing() {
    this.video_element.style.backgroundColor = '#000';
  }

  dispose() {
    if (this.preview_subscription) {
      this.preview_subscription.dispose();
    }
    window.URL.revokeObjectURL(this.video_src());
  }
};

ko.components.register('video-asset', {
  template: `
    <!-- ko ifnot: message.isObfuscated() -->
      <div class="video-asset-container"
        data-bind="hide_controls: 2000,
                   attr: {'data-uie-value': asset.file_name},
                   css: {'video-asset-container--small': displaySmall()}"
        data-uie-name="video-asset">
        <video playsinline
               data-bind="attr: {src: video_src},
                          css: {hidden: asset.status() === z.assets.AssetTransferState.UPLOADING},
                          event: {loadedmetadata: on_loadedmetadata,
                                  timeupdate: on_timeupdate,
                                  error: on_error,
                                  playing: on_video_playing}">
        </video>
        <!-- ko if: video_playback_error -->
          <div class="video-playback-error label-xs" data-bind="l10n_text: z.string.conversationPlaybackError"></div>
        <!-- /ko -->
        <!-- ko ifnot: video_playback_error -->
          <!-- ko if: asset.status() === z.assets.AssetTransferState.UPLOAD_PENDING -->
            <div class="asset-placeholder">
              <div class="three-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          <!-- /ko -->

          <!-- ko if: asset.status() !== z.assets.AssetTransferState.UPLOAD_PENDING -->
            <div class="video-controls-center">
              <!-- ko if: displaySmall() -->
                <media-button params="src: video_element,
                                      large: false,
                                      asset: asset,
                                      play: onPlayButtonClicked">
                </media-button>
              <!-- /ko -->
              <!-- ko ifnot: displaySmall() -->
                <media-button params="src: video_element,
                                      large: true,
                                      asset: asset,
                                      play: onPlayButtonClicked,
                                      pause: on_pause_button_clicked,
                                      cancel: () => asset.cancel(message)">
                </media-button>
              <!-- /ko -->
            </div>
            <div class='video-controls-bottom' data-bind='visible: show_bottom_controls()'>
              <seek-bar data-ui-name="status-video-seekbar" class="video-controls-seekbar" params="src: video_element"></seek-bar>
              <span class="video-controls-time label-xs" data-bind="text: z.util.TimeUtil.formatSeconds(video_time_rest())" data-uie-name="status-video-time"></span>
            </div>
          <!-- /ko -->
        <!-- /ko -->
      </div>
      <div class="video-asset-container__sizer"></div>
    <!-- /ko -->
  `,
  viewModel: {
    createViewModel(params, component_info) {
      return new z.components.VideoAssetComponent(params, component_info);
    },
  },
});
