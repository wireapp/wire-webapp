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

import {useCallback, useEffect, useId, useRef, useState, type FunctionComponent} from 'react';

import {isNan, isNonEmptyString} from '@sindresorhus/is';
import cx from 'classnames';
import {container} from 'tsyringe';

import {ChatPdfPreviewModal} from './chatPdfPreviewModal';
import {ChatPdfViewer} from './chatPdfViewer';
import {PdfAssetPreview} from './pdfAssetPreview';
import {RestrictedFile} from './restrictedFile/restrictedFile';

import {e2ePdfPreviewFeatureToggleName} from '../../../../../../featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from '../../../../../../page/rootProvider';
import type {AssetRemoteData} from '../../../../../../repositories/assets/assetRemoteData';
import {AssetTransferState} from '../../../../../../repositories/assets/assetTransferState';
import type {ContentMessage} from '../../../../../../repositories/entity/message/contentMessage';
import type {FileAsset as FileAssetType} from '../../../../../../repositories/entity/message/fileAsset';
import {TeamState} from '../../../../../../repositories/team/TeamState';
import {useKoSubscribableChildren} from '../../../../../../util/componentUtil';
import {handleKeyDown, KEY} from '../../../../../../util/keyboardUtil';
import {formatBytes, getFileExtension, trimFileExtension} from '../../../../../../util/util';
import {useMessageFocusedTabIndex} from '../../../util';
import {AssetHeader} from '../common/assetHeader/assetHeader';
import {AssetLoader} from '../common/assetLoader/assetLoader';
import {useAssetTransfer} from '../common/useAssetTransfer/useAssetTransfer';

interface FileAssetProps {
  hasHeader?: boolean;
  message: ContentMessage;
  teamState?: TeamState;
  isFocusable?: boolean;
}

const uploadProgressCompletePercentage = 100;

const FileAsset: FunctionComponent<FileAssetProps> = ({
  message,
  hasHeader = false,
  teamState = container.resolve(TeamState),
  isFocusable = true,
}: FileAssetProps) => {
  const asset = message.getFirstAsset() as FileAssetType;
  const {translate, isFeatureToggleEnabled, mainViewModel} = useApplicationContext();
  const loadAsset = useCallback(
    (resource: AssetRemoteData) => {
      return mainViewModel.content.repositories.asset.load(resource);
    },
    [mainViewModel],
  );
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const pdfPreviewModalId = useId();
  const pdfTriggerRef = useRef<HTMLDivElement>(null);
  const wasPdfPreviewOpen = useRef(false);

  const {transferState, downloadAsset, uploadProgress, cancelUpload} = useAssetTransfer(message);
  const {isObfuscated} = useKoSubscribableChildren(message, ['isObfuscated']);
  const {downloadProgress, preview_resource: previewResource} = useKoSubscribableChildren(asset, [
    'downloadProgress',
    'preview_resource',
  ]);
  const {isFileSharingReceivingEnabled} = useKoSubscribableChildren(teamState, ['isFileSharingReceivingEnabled']);
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isFocusable);

  const assetFileName = asset.file_name ?? '';
  const fileName = trimFileExtension(assetFileName);
  const fileExtension = getFileExtension(assetFileName);
  const formattedFileSize = formatBytes(asset.file_size);
  const isPdfPreviewEnabled =
    isFeatureToggleEnabled(e2ePdfPreviewFeatureToggleName) && asset.file_type === 'application/pdf';
  const hasPdfPreview = isPdfPreviewEnabled && previewResource !== undefined;

  // This is a hack since we don't have a FileAsset available before it's
  // uploaded completely we have to check if there is upload progress to
  // transition into the `AssetTransferState.UPLOADING` state.
  const hasTruthyUploadProgress = uploadProgress !== 0 && !isNan(uploadProgress);
  const isUploadInProgress = uploadProgress > 0 && uploadProgress < uploadProgressCompletePercentage;
  let assetStatus: AssetTransferState | number = uploadProgress;
  if (hasTruthyUploadProgress) {
    assetStatus = isUploadInProgress ? AssetTransferState.UPLOADING : transferState;
  }

  const isPendingUpload = assetStatus === AssetTransferState.UPLOAD_PENDING;
  const isFailedUpload = assetStatus === AssetTransferState.UPLOAD_FAILED;
  const isUploadedOrCancelled =
    assetStatus === AssetTransferState.UPLOADED || assetStatus === AssetTransferState.CANCELED;
  const isDownloading = assetStatus === AssetTransferState.DOWNLOADING;
  const isFailedDownloadingDecrypt = assetStatus === AssetTransferState.DOWNLOAD_FAILED_DECRPYT;
  const isFailedDownloadingHash = assetStatus === AssetTransferState.DOWNLOAD_FAILED_HASH;
  const isUploading = assetStatus === AssetTransferState.UPLOADING;
  const originalResource = asset.original_resource();
  const canOpenPdfPreview =
    isPdfPreviewEnabled && isFileSharingReceivingEnabled && isUploadedOrCancelled && originalResource !== undefined;

  const onDownloadAsset = async (): Promise<void> => {
    if (isUploadedOrCancelled) {
      await downloadAsset(asset);
    }
  };

  const openPdfPreview = (): void => {
    setIsPdfPreviewOpen(true);
  };

  useEffect(() => {
    if (wasPdfPreviewOpen.current && !isPdfPreviewOpen) {
      pdfTriggerRef.current?.focus();
    }
    wasPdfPreviewOpen.current = isPdfPreviewOpen;
  }, [isPdfPreviewOpen]);

  if (isObfuscated) {
    return null;
  }

  return (
    <div
      className="file-asset"
      data-uie-name="file-asset"
      data-uie-value={asset.file_name}
      css={hasPdfPreview ? {maxWidth: '500px', alignSelf: 'flex-start'} : undefined}
    >
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
          aria-haspopup={canOpenPdfPreview ? 'dialog' : undefined}
          aria-expanded={canOpenPdfPreview ? isPdfPreviewOpen : undefined}
          aria-controls={canOpenPdfPreview ? pdfPreviewModalId : undefined}
          aria-label={
            canOpenPdfPreview
              ? translate('cells.filePreviewButton.ariaLabel', {name: assetFileName})
              : `${translate('conversationContextMenuDownload')} ${fileName}.${fileExtension}`
          }
          ref={pdfTriggerRef}
          onClick={canOpenPdfPreview ? openPdfPreview : onDownloadAsset}
          onKeyDown={event => {
            return handleKeyDown({
              event,
              callback: canOpenPdfPreview ? openPdfPreview : onDownloadAsset,
              keys: [KEY.ENTER, KEY.SPACE],
            });
          }}
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
                <AssetLoader
                  loadProgress={downloadProgress ?? 0}
                  onCancel={() => {
                    return asset.cancelDownload();
                  }}
                />
              )}

              {isUploading && (
                <AssetLoader
                  loadProgress={uploadProgress === 0 || isNan(uploadProgress) ? 0 : uploadProgress}
                  onCancel={() => {
                    return cancelUpload();
                  }}
                />
              )}

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

                  {isNonEmptyString(fileExtension) ? <li data-uie-name="file-type">{fileExtension}</li> : fileExtension}

                  {isUploading && <li data-uie-name="file-status">{translate('conversationAssetUploading')}</li>}

                  {isFailedUpload && <li data-uie-name="file-status">{translate('conversationAssetUploadFailed')}</li>}

                  {isDownloading && <li data-uie-name="file-status">{translate('conversationAssetDownloading')}</li>}

                  {isFailedDownloadingDecrypt && (
                    <li data-uie-name="file-status">{translate('conversationAssetFailedDecryptDownloading')}</li>
                  )}

                  {isFailedDownloadingHash && (
                    <li data-uie-name="file-status">{translate('conversationAssetFailedHashDownloading')}</li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      ) : (
        <RestrictedFile asset={asset} />
      )}
      {isFileSharingReceivingEnabled && isUploadedOrCancelled && hasPdfPreview && (
        <PdfAssetPreview
          key={previewResource.identifier}
          resource={previewResource}
          loadAsset={loadAsset}
          label={translate('cells.filePreviewButton.ariaLabel', {name: assetFileName})}
          tabIndex={messageFocusedTabIndex}
          onOpenPreview={openPdfPreview}
        />
      )}
      {isPdfPreviewOpen && isPdfPreviewEnabled && isFileSharingReceivingEnabled && originalResource !== undefined && (
        <ChatPdfPreviewModal
          id={pdfPreviewModalId}
          fileName={assetFileName}
          resource={originalResource}
          isOpen={isPdfPreviewOpen}
          loadAsset={loadAsset}
          onDownload={onDownloadAsset}
          onClose={() => {
            return setIsPdfPreviewOpen(false);
          }}
          renderPdf={src => {
            return <ChatPdfViewer key={src} src={src} fileName={assetFileName} />;
          }}
        />
      )}
    </div>
  );
};

export {FileAsset};
