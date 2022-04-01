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

import AssetHeader from './AssetHeader';
import RestrictedFile from 'Components/asset/RestrictedFile';
import AssetLoader from './AssetLoader';
import {formatBytes, getFileExtension, trimFileExtension} from 'Util/util';
import {t} from 'Util/LocalizerUtil';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';

import type {FileAsset} from '../../../../../entity/message/FileAsset';
import type {ContentMessage} from '../../../../../entity/message/ContentMessage';
import {AssetTransferState} from '../../../../../assets/AssetTransferState';
import {TeamState} from '../../../../../team/TeamState';
import {useAssetTransfer} from './AbstractAssetTransferStateTracker';

export interface FileAssetProps {
  hasHeader?: boolean;
  message: ContentMessage;
  teamState?: TeamState;
}

const FileAssetComponent: React.FC<FileAssetProps> = ({
  message,
  hasHeader = false,
  teamState = container.resolve(TeamState),
}) => {
  const asset = message.getFirstAsset() as FileAsset;

  const {transferState, downloadAsset, uploadProgress, cancelUpload} = useAssetTransfer(message);
  const {isObfuscated} = useKoSubscribableChildren(message, ['isObfuscated']);
  const {downloadProgress} = useKoSubscribableChildren(asset, ['downloadProgress']);
  const {isFileSharingReceivingEnabled} = useKoSubscribableChildren(teamState, ['isFileSharingReceivingEnabled']);

  const fileName = trimFileExtension(asset.file_name);
  const fileExtension = getFileExtension(asset.file_name);
  const formattedFileSize = formatBytes(asset.file_size);

  // This is a hack since we don't have a FileAsset available before it's
  // uploaded completely we have to check if there is upload progress to
  // transition into the `AssetTransferState.UPLOADING` state.
  const assetStatus = uploadProgress > 0 && uploadProgress < 100 ? AssetTransferState.UPLOADING : transferState;

  const isPendingUpload = assetStatus === AssetTransferState.UPLOAD_PENDING;
  const isFailedUpload = assetStatus === AssetTransferState.UPLOAD_FAILED;
  const isUploaded = assetStatus === AssetTransferState.UPLOADED;
  const isDownloading = assetStatus === AssetTransferState.DOWNLOADING;
  const isUploading = assetStatus === AssetTransferState.UPLOADING;

  return (
    !isObfuscated && (
      <div className="file-asset" data-uie-name="file-asset" data-uie-value={asset.file_name}>
        {hasHeader && <AssetHeader message={message} />}
        {isFileSharingReceivingEnabled ? (
          <div
            className={cx('file', {
              'cursor-pointer': isUploaded,
            })}
            data-uie-name="file"
            data-uie-value={asset.file_name}
            role="button"
            tabIndex={0}
            aria-label={`${t('conversationContextMenuDownload')} ${fileName}.${fileExtension}`}
            onClick={() => {
              if (isUploaded) {
                downloadAsset(asset);
              }
            }}
            onKeyDown={event => {
              if (isUploaded) {
                handleKeyDown(event, downloadAsset.bind(null, asset));
              }
            }}
          >
            {isPendingUpload ? (
              <div className="asset-placeholder loading-dots"></div>
            ) : (
              <>
                {isUploaded && (
                  <div className="file__icon icon-file" data-uie-name="file-icon">
                    <span className="file__icon__ext icon-view" />
                  </div>
                )}

                {isDownloading && (
                  <AssetLoader loadProgress={downloadProgress} onCancel={() => asset.cancelDownload()} />
                )}

                {isUploading && <AssetLoader loadProgress={uploadProgress} onCancel={() => cancelUpload()} />}

                {isFailedUpload && <div className="media-button media-button-error" />}

                <div className="file__desc">
                  <div className="label-bold-xs ellipsis" data-uie-name="file-name">
                    {fileName}
                  </div>
                  <ul className="file__desc__meta label-xs text-foreground">
                    <li className="label-nocase-xs" data-uie-name="file-size">
                      {formattedFileSize}
                    </li>
                    {fileExtension && <li data-uie-name="file-type">{fileExtension}</li>}
                    {isUploading && <li data-uie-name="file-status">{t('conversationAssetUploading')}</li>}
                    {isFailedUpload && <li data-uie-name="file-status">{t('conversationAssetUploadFailed')}</li>}
                    {isDownloading && <li data-uie-name="file-status">{t('conversationAssetDownloading')}</li>}
                  </ul>
                </div>
              </>
            )}
          </div>
        ) : (
          <RestrictedFile asset={asset} />
        )}
      </div>
    )
  );
};

export default FileAssetComponent;

registerReactComponent('file-asset', {
  component: FileAssetComponent,
  template: '<div data-bind="react: {hasHeader: header, message: ko.unwrap(message)}"></div>',
});
