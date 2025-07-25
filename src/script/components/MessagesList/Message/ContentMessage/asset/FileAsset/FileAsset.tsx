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

import React from 'react';

import cx from 'classnames';
import {container} from 'tsyringe';

import {RestrictedFile} from 'Components/MessagesList/Message/ContentMessage/asset/FileAsset/RestrictedFile/RestrictedFile';
import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import type {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import type {FileAsset as FileAssetType} from 'Repositories/entity/message/FileAsset';
import {TeamState} from 'Repositories/team/TeamState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {formatBytes, getFileExtension, trimFileExtension} from 'Util/util';

import {useMessageFocusedTabIndex} from '../../../util';
import {AssetHeader} from '../common/AssetHeader/AssetHeader';
import {AssetLoader} from '../common/AssetLoader/AssetLoader';
import {useAssetTransfer} from '../common/useAssetTransfer/useAssetTransfer';

export interface FileAssetProps {
  hasHeader?: boolean;
  message: ContentMessage;
  teamState?: TeamState;
  isFocusable?: boolean;
}

const FileAsset: React.FC<FileAssetProps> = ({
  message,
  hasHeader = false,
  teamState = container.resolve(TeamState),
  isFocusable = true,
}) => {
  const asset = message.getFirstAsset() as FileAssetType;

  const {transferState, downloadAsset, uploadProgress, cancelUpload} = useAssetTransfer(message);
  const {isObfuscated} = useKoSubscribableChildren(message, ['isObfuscated']);
  const {downloadProgress} = useKoSubscribableChildren(asset, ['downloadProgress']);
  const {isFileSharingReceivingEnabled} = useKoSubscribableChildren(teamState, ['isFileSharingReceivingEnabled']);
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isFocusable);

  const fileName = trimFileExtension(asset.file_name);
  const fileExtension = getFileExtension(asset.file_name!);
  const formattedFileSize = formatBytes(asset.file_size);

  // This is a hack since we don't have a FileAsset available before it's
  // uploaded completely we have to check if there is upload progress to
  // transition into the `AssetTransferState.UPLOADING` state.
  const assetStatus =
    uploadProgress && (uploadProgress > 0 && uploadProgress < 100 ? AssetTransferState.UPLOADING : transferState);

  const isPendingUpload = assetStatus === AssetTransferState.UPLOAD_PENDING;
  const isFailedUpload = assetStatus === AssetTransferState.UPLOAD_FAILED;
  const isUploadedOrCancelled =
    assetStatus === AssetTransferState.UPLOADED || assetStatus === AssetTransferState.CANCELED;
  const isDownloading = assetStatus === AssetTransferState.DOWNLOADING;
  const isFailedDownloadingDecrypt = assetStatus === AssetTransferState.DOWNLOAD_FAILED_DECRPYT;
  const isFailedDownloadingHash = assetStatus === AssetTransferState.DOWNLOAD_FAILED_HASH;
  const isUploading = assetStatus === AssetTransferState.UPLOADING;

  const onDownloadAsset = async () => {
    if (isUploadedOrCancelled) {
      await downloadAsset(asset);
    }
  };

  if (isObfuscated) {
    return null;
  }

  return (
    <div className="file-asset" data-uie-name="file-asset" data-uie-value={asset.file_name}>
      {hasHeader && <AssetHeader message={message} />}

      {isFileSharingReceivingEnabled ? (
        <div
          className={cx('file', {
            'cursor-pointer': isUploadedOrCancelled,
          })}
          data-uie-name="file"
          data-uie-value={asset.file_name}
          role="button"
          tabIndex={messageFocusedTabIndex}
          aria-label={`${t('conversationContextMenuDownload')} ${fileName}.${fileExtension}`}
          onClick={onDownloadAsset}
          onKeyDown={event => handleKeyDown({event, callback: onDownloadAsset, keys: [KEY.ENTER, KEY.SPACE]})}
        >
          {isPendingUpload ? (
            <div className="asset-placeholder loading-dots" />
          ) : (
            <>
              {isUploadedOrCancelled && (
                <div className="file__icon icon-file" data-uie-name="file-icon">
                  <span className="file__icon__ext icon-view" />
                </div>
              )}

              {isDownloading && (
                <AssetLoader loadProgress={downloadProgress || 0} onCancel={() => asset.cancelDownload()} />
              )}

              {isUploading && <AssetLoader loadProgress={uploadProgress || 0} onCancel={() => cancelUpload()} />}

              {(isFailedUpload || isFailedDownloadingDecrypt || isFailedDownloadingHash) && (
                <div className="media-button media-button-error" />
              )}

              <div className="file__desc">
                <p className="label-bold-xs ellipsis" data-uie-name="file-name">
                  {fileName}
                </p>
                <ul className="file__desc__meta label-xs text-foreground">
                  <li className="label-nocase-xs" data-uie-name="file-size">
                    {formattedFileSize}
                  </li>

                  {fileExtension && <li data-uie-name="file-type">{fileExtension}</li>}

                  {isUploading && <li data-uie-name="file-status">{t('conversationAssetUploading')}</li>}

                  {isFailedUpload && <li data-uie-name="file-status">{t('conversationAssetUploadFailed')}</li>}

                  {isDownloading && <li data-uie-name="file-status">{t('conversationAssetDownloading')}</li>}

                  {isFailedDownloadingDecrypt && (
                    <li data-uie-name="file-status">{t('conversationAssetFailedDecryptDownloading')}</li>
                  )}

                  {isFailedDownloadingHash && (
                    <li data-uie-name="file-status">{t('conversationAssetFailedHashDownloading')}</li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      ) : (
        <RestrictedFile asset={asset} />
      )}
    </div>
  );
};

export {FileAsset};
