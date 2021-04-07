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

import {ContentMessage} from '../../entity/message/ContentMessage';
import React, {useEffect, useState} from 'react';
import cx from 'classnames';
import AssetHeader from 'Components/asset/AssetHeader';
import {FileAsset} from '../../entity/message/FileAsset';
import {AssetRepository} from '../../assets/AssetRepository';
import {container} from 'tsyringe';
import {AssetTransferState} from '../../assets/AssetTransferState';
import AssetLoader from 'Components/asset/AssetLoader';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import {formatBytes, getFileExtension, trimFileExtension} from 'Util/util';
import {t} from 'Util/LocalizerUtil';
import {registerReactComponent, useKoSubscribable} from 'Util/ComponentUtil';

export interface FileAssetProps {
  header?: boolean;
  message: ContentMessage;
}

const FileAssetComponent: React.FC<FileAssetProps> = ({message, header}) => {
  const asset = message.getFirstAsset() as FileAsset;
  const plainAssetStatus = useKoSubscribable(asset.status);
  const fileName = trimFileExtension(asset.file_name);
  const formattedFileSize = formatBytes(parseInt(asset.file_size, 10));
  const fileExtension = getFileExtension(asset.file_name);

  const [assetStatus, setAssetStatus] = useState(plainAssetStatus);
  const assetRepository = container.resolve(AssetRepository);
  const uploadProgress = useKoSubscribable(assetRepository.getUploadProgress(message.id));
  const downloadProgress = useKoSubscribable(asset.downloadProgress);

  // This is a hack since we don't have a FileAsset available before it's
  // uploaded completely we have to check if there is upload progress to
  // transition into the `AssetTransferState.UPLOADING` state.
  useEffect(() => {
    if (uploadProgress > 0 && uploadProgress < 100) {
      setAssetStatus(AssetTransferState.UPLOADING);
    } else {
      setAssetStatus(plainAssetStatus);
    }
  }, [uploadProgress, plainAssetStatus]);

  const downloadAsset = () => assetRepository.downloadFile(asset);

  const cancelUpload = () => {
    assetRepository.cancelUpload(message.id);
    amplify.publish(WebAppEvents.CONVERSATION.ASSET.CANCEL, message.id);
  };

  const hasHeader = !!header;
  const isPendingUpload = assetStatus === AssetTransferState.UPLOAD_PENDING;
  const isNotUploading = !isPendingUpload;
  const isFailedUpload = assetStatus === AssetTransferState.UPLOAD_FAILED;
  const isUploaded = assetStatus === AssetTransferState.UPLOADED;
  const isDownloading = assetStatus === AssetTransferState.DOWNLOADING;
  const isUploading = assetStatus === AssetTransferState.UPLOADING;

  return (
    !message.isObfuscated() && (
      <>
        {hasHeader && <AssetHeader message={message} />}
        <div
          className={cx('file', {
            'cursor-pointer': isUploaded,
          })}
          data-uie-name="file"
          data-uie-value={asset.file_name}
          onClick={() => {
            if (isUploaded) {
              downloadAsset();
            }
          }}
        >
          {isPendingUpload && <div className="asset-placeholder loading-dots"></div>}
          {isNotUploading && (
            <>
              {isUploaded && (
                <div
                  className="file-icon icon-file"
                  onClick={event => {
                    event.stopPropagation();
                    downloadAsset();
                  }}
                  data-uie-name="file-icon"
                >
                  <span className="file-icon-ext icon-view"></span>
                </div>
              )}

              {isDownloading && <AssetLoader loadProgress={downloadProgress} onCancel={asset.cancelDownload} />}

              {isUploading && <AssetLoader loadProgress={uploadProgress} onCancel={cancelUpload} />}

              {isFailedUpload && <div className="media-button media-button-error"></div>}

              <div className="file-desc">
                <div className="label-bold-xs ellipsis" data-uie-name="file-name">
                  {fileName}
                </div>
                <ul className="file-desc-meta label-xs text-foreground">
                  <li data-uie-name="file-size">{formattedFileSize}</li>
                  {fileExtension && <li data-uie-name="file-type">{fileExtension}</li>}
                  {isUploading && <li data-uie-name="file-status">{t('conversationAssetUploading')}</li>}
                  {isFailedUpload && <li data-uie-name="file-status">{t('conversationAssetUploadFailed')}</li>}
                  {isDownloading && <li data-uie-name="file-status">{t('conversationAssetDownloading')}</li>}
                </ul>
              </div>
            </>
          )}
        </div>
      </>
    )
  );
};

export default FileAssetComponent;

registerReactComponent('file-asset', {
  component: FileAssetComponent,
  optionalParams: ['header'],
  template:
    '<div data-bind="react: {header, message: ko.unwrap(message)}" style="width: 100%; align-self: center"></div>',
});
