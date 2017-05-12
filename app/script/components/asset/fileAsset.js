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
window.z.components = z.components || {};

z.components.FileAssetComponent = class FileAssetComponent {
  /**
   * Construct a new file asset.
   *
   * @param {Object} params - Component parameters
   * @param {z.entity.Message} params.message - Message entity
   */
  constructor(params) {
    this.message = ko.unwrap(params.message);
    this.asset = this.message.get_first_asset();
    this.expired = this.message.is_expired;
    this.header = params.header || false;

    this.circle_upload_progress = ko.pureComputed(() => {
      const size = this.large ? '200' : '100';
      return `${this.asset.upload_progress() * 2} ${size}`;
    });

    this.circle_download_progress = ko.pureComputed(() => {
      const size = this.large ? '200' : '100';
      return `${this.asset.download_progress() * 2} ${size}`;
    });

    this.file_extension = ko.pureComputed(() => {
      const ext = z.util.get_file_extension(this.asset.file_name);
      return ext.length <= 3 ? ext : '';
    });
  }
};

ko.components.register('file-asset', {
  template: `\
    <!-- ko ifnot: expired() -->
      <!-- ko if: header -->
        <asset-header params="message: message"></asset-header>
      <!-- /ko -->
      <div class="file"
         data-uie-name="file"
         data-bind="attr: {'data-uie-value': asset.file_name},
                    click: asset.status() === z.assets.AssetTransferState.UPLOADED ? asset.download : null,
                    css: {'cursor-pointer': asset.status() === z.assets.AssetTransferState.UPLOADED}">
        <!-- ko if: !asset.uploaded_on_this_client() && asset.status() === z.assets.AssetTransferState.UPLOADING -->
          <div class="asset-placeholder">
            <div class="three-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        <!-- /ko -->
        <!-- ko ifnot: !asset.uploaded_on_this_client() && asset.status() === z.assets.AssetTransferState.UPLOADING -->
          <!-- ko if: asset.status() === z.assets.AssetTransferState.UPLOADED -->
            <div class="file-icon icon-file" data-uie-name="file-icon" data-bind="click: asset.download, clickBubble: false">
              <span class="file-icon-ext icon-view"></span>
            </div>
          <!-- /ko -->
          <!-- ko if: asset.status() === z.assets.AssetTransferState.DOWNLOADING -->
            <div class="media-button icon-close" data-bind="click: asset.cancel_download, clickBubble: false">
              <div class='media-button-border-file-fill'></div>
              <div class='media-button-border-fill'></div>
              <svg class="svg-theme" viewBox="0 0 32 32">
                <circle data-bind="style: {'stroke-dasharray': circle_download_progress}" class="stroke-theme" r="50%" cx="50%" cy="50%"></circle>
              </svg>
            </div>
          <!-- /ko -->
          <!-- ko if: asset.status() === z.assets.AssetTransferState.UPLOADING -->
            <div class="media-button icon-close" data-bind="click: function() {asset.cancel($parents[1])}, clickBubble: false">
              <div class='media-button-border-file-fill'></div>
              <div class='media-button-border-fill'></div>
              <svg class="svg-theme" viewBox="0 0 32 32">
                <circle data-bind="style: {'stroke-dasharray': circle_upload_progress}" class="stroke-theme" r="50%" cx="50%" cy="50%"></circle>
              </svg>
            </div>
          <!-- /ko -->
          <!-- ko if: asset.status() === z.assets.AssetTransferState.UPLOAD_FAILED -->
            <div class="media-button media-button-error"></div>
          <!-- /ko -->
          <div class="file-desc">
            <div data-uie-name="file-name"
                 data-bind="text: z.util.trim_file_extension(asset.file_name)"
                 class="label-bold-xs ellipsis"></div>
            <ul class="file-desc-meta label-xs text-graphite">
              <li data-uie-name="file-size" data-bind="text: z.util.format_bytes(asset.file_size)"></li>
              <!-- ko if: z.util.get_file_extension(asset.file_name) -->
                <li data-uie-name="file-type" data-bind="text: z.util.get_file_extension(asset.file_name)"></li>
              <!-- /ko -->
              <!-- ko if: asset.status() === z.assets.AssetTransferState.UPLOADING -->
                <li data-uie-name="file-status" data-bind="l10n_text: z.string.conversation_asset_uploading"></li>
              <!-- /ko -->
              <!-- ko if: asset.status() === z.assets.AssetTransferState.UPLOAD_FAILED -->
                <li data-uie-name="file-status" data-bind="l10n_text: z.string.conversation_asset_upload_failed" class="text-red" ></li>
              <!-- /ko -->
              <!-- ko if: asset.status() === z.assets.AssetTransferState.DOWNLOADING -->
                <li data-uie-name="file-status" data-bind="l10n_text: z.string.conversation_asset_downloading"></li>
              <!-- /ko -->
            </ul>
          </div>
        <!-- /ko -->
      </div>
    <!-- /ko -->
  `,
  viewModel: {
    createViewModel(params, component_info) {
      return new z.components.FileAssetComponent(params, component_info);
    },
  },
});
