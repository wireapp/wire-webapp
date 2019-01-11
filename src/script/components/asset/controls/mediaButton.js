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

z.components.MediaButtonComponent = class MediaButtonComponent {
  /**
   * Construct a media button.
   *
   * @param {Object} params - Component parameters
   * @param {HTMLElement} params.media_src - Media source
   * @param {boolean} params.large - Display large button
   * @param {z.entity.File} params.asset - Asset file
   * @param {Object} component_info - Component information
   */
  constructor(params, component_info) {
    this.dispose = this.dispose.bind(this);
    this.media_element = params.src;
    this.large = params.large;
    this.asset = params.asset;

    if (this.large) {
      component_info.element.classList.add('media-button-lg');
    }

    this.media_is_playing = ko.observable(false);

    this.svg_view_box = ko.pureComputed(() => {
      const size = this.large ? 64 : 32;
      return `0 0 ${size} ${size}`;
    });

    this.circle_upload_progress = ko.pureComputed(() => {
      const size = this.large ? '200' : '100';
      return `${this.asset.upload_progress() * 2} ${size}`;
    });

    this.circle_download_progress = ko.pureComputed(() => {
      const size = this.large ? '200' : '100';
      return `${this.asset.downloadProgress() * 2} ${size}`;
    });

    this.on_play_button_clicked = function() {
      if (typeof params.play === 'function') {
        params.play();
      }
    };
    this.on_pause_button_clicked = function() {
      if (typeof params.pause === 'function') {
        params.pause();
      }
    };
    this.on_cancel_button_clicked = function() {
      if (typeof params.cancel === 'function') {
        params.cancel();
      }
    };

    this.on_play = this.on_play.bind(this);
    this.on_pause = this.on_pause.bind(this);
    this.media_element.addEventListener('playing', this.on_play);
    this.media_element.addEventListener('pause', this.on_pause);
  }

  on_play() {
    this.media_is_playing(true);
  }

  on_pause() {
    this.media_is_playing(false);
  }

  dispose() {
    this.media_element.removeEventListener('playing', this.on_play);
    this.media_element.removeEventListener('pause', this.on_pause);
  }
};

ko.components.register('media-button', {
  template: `
    <!-- ko if: asset.status() === z.assets.AssetTransferState.UPLOADED -->
      <div class='media-button media-button-play icon-play' data-bind="click: on_play_button_clicked, visible: !media_is_playing()" data-uie-name="do-play-media"></div>
      <div class='media-button media-button-pause icon-pause' data-bind="click: on_pause_button_clicked, visible: media_is_playing()" data-uie-name="do-pause-media"></div>
    <!-- /ko -->
    <!-- ko if: asset.status() === z.assets.AssetTransferState.DOWNLOADING -->
      <div class="media-button icon-close" data-bind="click: asset.cancel_download" data-uie-name="status-loading-media">
        <div class='media-button-border-fill'></div>
        <svg class="svg-theme" data-bind="attr: {viewBox: svg_view_box}">
          <circle data-bind="style: {'stroke-dasharray': circle_download_progress}" class="stroke-theme" r="50%" cx="50%" cy="50%"></circle>
        </svg>
      </div>
    <!-- /ko -->
    <!-- ko if: asset.status() === z.assets.AssetTransferState.UPLOADING -->
      <div class="media-button icon-close" data-bind="click: on_cancel_button_clicked" data-uie-name="do-cancel-media">
        <div class='media-button-border-fill'></div>
        <svg class="svg-theme" data-bind="attr: {viewBox: svg_view_box}">
          <circle data-bind="style: {'stroke-dasharray': circle_upload_progress}" class="stroke-theme" r="50%" cx="50%" cy="50%"></circle>
        </svg>
      </div>
    <!-- /ko -->
`,
  viewModel: {
    createViewModel(params, component_info) {
      return new z.components.MediaButtonComponent(params, component_info);
    },
  },
});
