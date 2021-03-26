import {ContentMessage} from '../../entity/message/ContentMessage';
import React from 'react';
import cx from 'classnames';
import ko from 'knockout';
import AssetHeader from 'Components/asset/AssetHeader';
import {FileAsset} from '../../entity/message/FileAsset';
import {AssetRepository} from '../../assets/AssetRepository';
import {container} from 'tsyringe';
import {AssetTransferState} from '../../assets/AssetTransferState';

export interface FileAssetProps {
  /** Does the asset have a visible header? */
  header: boolean;
  message: ContentMessage | ko.Subscribable<ContentMessage>;
}

const FileAssetComponent: React.FC<FileAssetProps> = (props: FileAssetProps) => {
  const message = ko.unwrap(props.message);
  const asset = message.getFirstAsset() as FileAsset;

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

  // UI States
  const hasVisibleHeader = props.header;
  const header = hasVisibleHeader && <AssetHeader message={message} />;

  const downloadAsset = () => assetRepository.downloadFile(asset);

  return (
    <>
      {!message.isObfuscated() && (
        <>
          {header}
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
          ></div>
        </>
      )}
    </>
  );
};

export default FileAssetComponent;
