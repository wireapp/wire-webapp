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
import {formatBytes, getFileExtension, trimFileExtension} from 'Util/util';
import type {ContentMessage} from 'src/script/entity/message/ContentMessage';
import type {FileAsset} from '../../entity/message/FileAsset';
import './assetLoader';
import {AssetTransferState} from '../../assets/AssetTransferState';
import {AssetRepository} from '../../assets/AssetRepository';
import {container} from 'tsyringe';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';

interface Params {
  /** Does the asset have a visible header? */
  header: boolean;

  message: ContentMessage | ko.Subscribable<ContentMessage>;
}

class FileAssetComponent {
  readonly AssetTransferState: typeof AssetTransferState = AssetTransferState;
  private readonly assetRepository: AssetRepository;
  private readonly message: ContentMessage;
  private readonly asset: FileAsset;
  readonly assetStatus: ko.PureComputed<AssetTransferState>;
  readonly header: boolean;
  readonly formattedFileSize: string;
  readonly fileName: string;
  readonly fileExtension: string;
  readonly uploadProgress: ko.PureComputed<number>;

  constructor({message, header = false}: Params) {
    this.message = ko.unwrap(message);
    this.assetRepository = container.resolve(AssetRepository);

    this.uploadProgress = this.assetRepository.getUploadProgress(this.message.id);
    this.asset = this.message.get_first_asset() as FileAsset;
    this.header = header;
    this.formattedFileSize = formatBytes(parseInt(this.asset.file_size, 10));
    this.fileName = trimFileExtension(this.asset.file_name);
    this.fileExtension = getFileExtension(this.asset.file_name);

    // This is a hack since we don't have a FileAsset available before it's uploaded completely
    // we have to check if there is upload progress to transition into the AssetTransferState.UPLOADING state.
    this.assetStatus = ko.computed(() => {
      if (this.uploadProgress() > 0 && this.uploadProgress() < 100) {
        return AssetTransferState.UPLOADING;
      }
      return this.asset.status();
    });
  }

  downloadAsset = () => this.assetRepository.downloadFile(this.asset);

  cancelUpload = () => {
    this.assetRepository.cancelUpload(this.message.id);
    amplify.publish(WebAppEvents.CONVERSATION.ASSET.CANCEL, this.message.id);
  };
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
                    click: assetStatus() === AssetTransferState.UPLOADED ? downloadAsset : null,
                    css: {'cursor-pointer': assetStatus() === AssetTransferState.UPLOADED}">
        <!-- ko if: assetStatus() === AssetTransferState.UPLOAD_PENDING  -->
          <div class="asset-placeholder loading-dots">
          </div>
        <!-- /ko -->
        <!-- ko if: assetStatus() !== AssetTransferState.UPLOAD_PENDING -->
          <!-- ko if: assetStatus() === AssetTransferState.UPLOADED -->
            <div class="file-icon icon-file" data-bind="click: downloadAsset, clickBubble: false" data-uie-name="file-icon">
              <span class="file-icon-ext icon-view"></span>
            </div>
          <!-- /ko -->
          <!-- ko if: assetStatus() === AssetTransferState.DOWNLOADING -->
            <asset-loader params="loadProgress: asset.downloadProgress, onCancel: asset.cancelDownload"></asset-loader>
          <!-- /ko -->
          <!-- ko if: assetStatus() === AssetTransferState.UPLOADING -->
            <asset-loader params="loadProgress: uploadProgress, onCancel: () => {cancelUpload()}"></asset-loader>
          <!-- /ko -->
          <!-- ko if: assetStatus() === AssetTransferState.UPLOAD_FAILED -->
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
              <!-- ko if: assetStatus() === AssetTransferState.UPLOADING -->
                <li data-bind="text: t('conversationAssetUploading')" data-uie-name="file-status"></li>
              <!-- /ko -->
              <!-- ko if: assetStatus() === AssetTransferState.UPLOAD_FAILED -->
                <li data-bind="text: t('conversationAssetUploadFailed')" class="text-red"  data-uie-name="file-status"></li>
              <!-- /ko -->
              <!-- ko if: assetStatus() === AssetTransferState.DOWNLOADING -->
                <li data-bind="text: t('conversationAssetDownloading')" data-uie-name="file-status"></li>
              <!-- /ko -->
            </ul>
          </div>
        <!-- /ko -->
      </div>
    <!-- /ko -->
  `,
  viewModel: {
    createViewModel(params: Params): FileAssetComponent {
      return new FileAssetComponent(params);
    },
  },
});
