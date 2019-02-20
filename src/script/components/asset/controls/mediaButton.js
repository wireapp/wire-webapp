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
import AssetTransferState from '../../../assets/AssetTransferState';

import '../assetLoader';

class MediaButtonComponent {
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
    this.media_element = params.src;
    this.large = params.large;
    this.asset = params.asset;
    this.uploadProgress = params.uploadProgress;
    this.transferState = params.transferState;

    this.dispose = this.dispose.bind(this);
    this.on_play = this.on_play.bind(this);
    this.on_pause = this.on_pause.bind(this);

    if (this.large) {
      component_info.element.classList.add('media-button-lg');
    }

    this.media_is_playing = ko.observable(false);

    const noop = () => {};

    this.on_play_button_clicked = typeof params.play === 'function' ? () => params.play() : noop;
    this.on_pause_button_clicked = typeof params.pause === 'function' ? () => params.pause() : noop;
    this.on_cancel_button_clicked = typeof params.cancel === 'function' ? () => params.cancel() : noop;

    this.media_element.addEventListener('playing', this.on_play);
    this.media_element.addEventListener('pause', this.on_pause);
  }

  on_play() {
    this.media_is_playing(true);
  }

  on_pause() {
    this.media_is_playing(false);
  }

  isUploaded(transferState) {
    return transferState === AssetTransferState.UPLOADED;
  }

  isDownloading(transferState) {
    return transferState === AssetTransferState.DOWNLOADING;
  }

  isUploading(transferState) {
    return transferState === AssetTransferState.UPLOADING;
  }

  dispose() {
    this.media_element.removeEventListener('playing', this.on_play);
    this.media_element.removeEventListener('pause', this.on_pause);
  }
}

ko.components.register('media-button', {
  template: `
    <!-- ko if: isUploaded(transferState()) -->
      <div class='media-button media-button-play icon-play' data-bind="click: on_play_button_clicked, visible: !media_is_playing()" data-uie-name="do-play-media"></div>
      <div class='media-button media-button-pause icon-pause' data-bind="click: on_pause_button_clicked, visible: media_is_playing()" data-uie-name="do-pause-media"></div>
    <!-- /ko -->
    <!-- ko if: isDownloading(transferState()) -->
      <div class="media-button icon-close" data-bind="click: asset.cancel_download" data-uie-name="status-loading-media">
        <div class='media-button-border-fill'></div>
        <asset-loader params="large: large, loadProgress: asset.downloadProgress"></asset-loader>
      </div>
    <!-- /ko -->
      <!-- ko if: isUploading(transferState()) -->
      <div class="media-button icon-close" data-bind="click: on_cancel_button_clicked" data-uie-name="do-cancel-media">
        <div class='media-button-border-fill'></div>
        <asset-loader params="large: large, loadProgress: uploadProgress"></asset-loader>
      </div>
    <!-- /ko -->
`,
  viewModel: {
    createViewModel(params, component_info) {
      return new MediaButtonComponent(params, component_info);
    },
  },
});
