import {ContentMessage} from '../../entity/message/ContentMessage';
import React from 'react';
import cx from 'classnames';
import ko from 'knockout';
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
import {registerReactComponent} from 'Util/ComponentUtil';

export interface FileAssetProps {
  header?: boolean;
  message: ContentMessage;
}

const FileAssetComponent: React.FC<FileAssetProps> = (props: FileAssetProps) => {
  const message = props.message;
  const asset = message.getFirstAsset() as FileAsset;
  const fileName = trimFileExtension(asset.file_name);
  const formattedFileSize = formatBytes(parseInt(asset.file_size, 10));
  const fileExtension = getFileExtension(asset.file_name);

  const assetRepository = container.resolve(AssetRepository);
  const uploadProgress = assetRepository.getUploadProgress(message.id);

  // This is a hack since we don't have a FileAsset available before it's uploaded completely
  // we have to check if there is upload progress to transition into the AssetTransferState.UPLOADING state.
  const assetStatus = ko.computed(() => {
    if (uploadProgress() > 0 && uploadProgress() < 100) {
      return AssetTransferState.UPLOADING;
    }
    return asset.status();
  });

  // Handlers
  const downloadAsset = () => assetRepository.downloadFile(asset);

  const cancelUpload = () => {
    assetRepository.cancelUpload(message.id);
    amplify.publish(WebAppEvents.CONVERSATION.ASSET.CANCEL, message.id);
  };

  // UI States
  const hasHeader = props.header;
  const isPendingUpload = assetStatus() === AssetTransferState.UPLOAD_PENDING;
  const isNotUploading = assetStatus() !== AssetTransferState.UPLOAD_PENDING;
  const isFailedUpload = assetStatus() === AssetTransferState.UPLOAD_FAILED;
  const isUploaded = assetStatus() === AssetTransferState.UPLOADED;
  const isDownloading = assetStatus() === AssetTransferState.DOWNLOADING;
  const isUploading = assetStatus() === AssetTransferState.UPLOADING;

  return (
    <>
      {!message.isObfuscated() && (
        <>
          {hasHeader && <AssetHeader message={message} />}
          <div
            className={cx('file', {
              'cursor-pointer': assetStatus() === AssetTransferState.UPLOADED,
            })}
            data-uie-name="file"
            data-uie-value={asset.file_name}
            onClick={() => {
              if (assetStatus() === AssetTransferState.UPLOADED) {
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

                {isDownloading && (
                  <AssetLoader loadProgress={asset.downloadProgress()} onCancel={asset.cancelDownload} />
                )}

                {isUploading && <AssetLoader loadProgress={uploadProgress()} onCancel={cancelUpload} />}

                {isFailedUpload && <div className="media-button media-button-error"></div>}

                <div data-uie-name="file-name">
                  <div className="label-bold-xs ellipsis" data-uie-name="file-name">
                    {fileName}
                  </div>
                  <ul className="file-desc-meta label-xs text-foreground">
                    <li data-uie-name="file-size">{formattedFileSize}</li>
                    {fileExtension && <li data-uie-name="file-type">{fileExtension}</li>}
                    {isUploading && <li data-uie-name="file-type">{t('conversationAssetUploading')}</li>}
                    {isFailedUpload && <li data-uie-name="file-type">{t('conversationAssetUploadFailed')}</li>}
                    {isDownloading && <li data-uie-name="file-type">{t('conversationAssetDownloading')}</li>}
                  </ul>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default FileAssetComponent;

registerReactComponent('file-asset', {
  component: FileAssetComponent,
  optionalParams: ['header'],
  template:
    '<div data-bind="react: {header, message: ko.unwrap(message)}" style="width: 100%; align-self: center"></div>',
});
