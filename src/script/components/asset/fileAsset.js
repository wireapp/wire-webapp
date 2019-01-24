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

import './assetLoader';

class FileAssetComponent {
  /**
   * Construct a new file asset.
   *
   * @param {Object} params - Component parameters
   * @param {z.entity.Message} params.message - Message entity
   */
  constructor(params) {
    this.message = ko.unwrap(params.message);
    this.asset = this.message.get_first_asset();
    this.header = params.header || false;

    this.file_extension = ko.pureComputed(() => {
      const ext = z.util.getFileExtension(this.asset.file_name);
      return ext.length <= 3 ? ext : '';
    });
  }
}

ko.components.register('file-asset', {
  template: `\
    <!-- ko ifnot: message.isObfuscated() -->
      <!-- ko if: header -->
        <asset-header params="message: message"></asset-header>
      <!-- /ko -->
      <div class="file"
         data-uie-name="file"
         data-bind="attr: {'data-uie-value': asset.file_name},
                    click: asset.status() === z.assets.AssetTransferState.UPLOADED ? asset.download : null,
                    css: {'cursor-pointer': asset.status() === z.assets.AssetTransferState.UPLOADED}">
        <!-- ko if: asset.status() === z.assets.AssetTransferState.UPLOAD_PENDING -->
          <div class="asset-placeholder">
            <div class="three-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        <!-- /ko -->
        <!-- ko if: asset.status() !== z.assets.AssetTransferState.UPLOAD_PENDING -->
          <!-- ko if: asset.status() === z.assets.AssetTransferState.UPLOADED -->
            <div class="file-icon icon-file" data-bind="click: asset.download, clickBubble: false" data-uie-name="file-icon">
              <span class="file-icon-ext icon-view"></span>
            </div>
          <!-- /ko -->
          <!-- ko if: asset.status() === z.assets.AssetTransferState.DOWNLOADING -->
            <div class="media-button icon-close" data-bind="click: asset.cancel_download, clickBubble: false">
              <div class='media-button-border-file-fill'></div>
              <div class='media-button-border-fill'></div>
              <asset-loader params="loadProgress: asset.downloadProgress"></asset-loader>
            </div>
          <!-- /ko -->
          <!-- ko if: asset.status() === z.assets.AssetTransferState.UPLOADING -->
            <div class="media-button icon-close" data-bind="click: function() {asset.cancel(message)}, clickBubble: false">
              <div class='media-button-border-file-fill'></div>
              <div class='media-button-border-fill'></div>
              <asset-loader params="loadProgress: asset.upload_progress"></asset-loader>
            </div>
          <!-- /ko -->
          <!-- ko if: asset.status() === z.assets.AssetTransferState.UPLOAD_FAILED -->
            <div class="media-button media-button-error"></div>
          <!-- /ko -->
          <div class="file-desc">
            <div data-uie-name="file-name"
                 data-bind="text: z.util.trimFileExtension(asset.file_name)"
                 class="label-bold-xs ellipsis"></div>
            <ul class="file-desc-meta label-xs text-foreground">
              <li data-bind="text: z.util.formatBytes(asset.file_size)" data-uie-name="file-size"></li>
              <!-- ko if: z.util.getFileExtension(asset.file_name) -->
                <li data-bind="text: z.util.getFileExtension(asset.file_name)" data-uie-name="file-type"></li>
              <!-- /ko -->
              <!-- ko if: asset.status() === z.assets.AssetTransferState.UPLOADING -->
                <li data-bind="text: t('conversationAssetUploading')" data-uie-name="file-status"></li>
              <!-- /ko -->
              <!-- ko if: asset.status() === z.assets.AssetTransferState.UPLOAD_FAILED -->
                <li data-bind="text: t('conversationAssetUploadFailed')" class="text-red"  data-uie-name="file-status"></li>
              <!-- /ko -->
              <!-- ko if: asset.status() === z.assets.AssetTransferState.DOWNLOADING -->
                <li data-bind="text: t('conversationAssetDownloading')" data-uie-name="file-status"></li>
              <!-- /ko -->
            </ul>
          </div>
        <!-- /ko -->
      </div>
    <!-- /ko -->
  `,
  viewModel: {
    createViewModel(params, componentInfo) {
      return new FileAssetComponent(params, componentInfo);
    },
  },
});
