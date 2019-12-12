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

import {getFileExtension, trimFileExtension, formatBytes} from 'Util/util';

import './assetLoader';
import {AbstractAssetTransferStateTracker} from './AbstractAssetTransferStateTracker';

class FileAssetComponent extends AbstractAssetTransferStateTracker {
  /**
   * Construct a new file asset.
   *
   * @param {Object} params - Component parameters
   * @param {Message} params.message - Message entity
   */
  constructor(params) {
    super(ko.unwrap(params.message));
    this.message = ko.unwrap(params.message);
    this.asset = this.message.get_first_asset();
    this.header = params.header || false;
    this.formattedFileSize = formatBytes(this.asset.file_size);
    this.fileName = trimFileExtension(this.asset.file_name);
    this.fileExtension = getFileExtension(this.asset.file_name);
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
                    click: transferState() === AssetTransferState.UPLOADED ? asset.download : null,
                    css: {'cursor-pointer': transferState() === AssetTransferState.UPLOADED}">
        <!-- ko if: transferState() === AssetTransferState.UPLOAD_PENDING  -->
          <div class="asset-placeholder loading-dots">
          </div>
        <!-- /ko -->
        <!-- ko if: transferState() !== AssetTransferState.UPLOAD_PENDING -->
          <!-- ko if: transferState() === AssetTransferState.UPLOADED -->
            <div class="file-icon icon-file" data-bind="click: asset.download, clickBubble: false" data-uie-name="file-icon">
              <span class="file-icon-ext icon-view"></span>
            </div>
          <!-- /ko -->
          <!-- ko if: transferState() === AssetTransferState.DOWNLOADING -->
            <asset-loader params="loadProgress: asset.downloadProgress, onCancel: asset.cancel_download"></asset-loader>
          <!-- /ko -->
          <!-- ko if: transferState() === AssetTransferState.UPLOADING -->
            <asset-loader params="loadProgress: uploadProgress, onCancel: () => {cancelUpload(message)}"></asset-loader>
          <!-- /ko -->
          <!-- ko if: transferState() === AssetTransferState.UPLOAD_FAILED -->
            <div class="media-button media-button-error"></div>
          <!-- /ko -->
          <div class="file-desc">
            <div data-uie-name="file-name"
                 data-bind="text: fileName"
                 class="label-bold-xs ellipsis"></div>
            <ul class="file-desc-meta label-xs text-foreground">
              <li data-bind="text: formattedFileSize" data-uie-name="file-size"></li>
              <!-- ko if: fileExtension -->
                <li data-bind="text: fileExtension" data-uie-name="file-type"></li>
              <!-- /ko -->
              <!-- ko if: transferState() === AssetTransferState.UPLOADING -->
                <li data-bind="text: t('conversationAssetUploading')" data-uie-name="file-status"></li>
              <!-- /ko -->
              <!-- ko if: transferState() === AssetTransferState.UPLOAD_FAILED -->
                <li data-bind="text: t('conversationAssetUploadFailed')" class="text-red"  data-uie-name="file-status"></li>
              <!-- /ko -->
              <!-- ko if: transferState() === AssetTransferState.DOWNLOADING -->
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
