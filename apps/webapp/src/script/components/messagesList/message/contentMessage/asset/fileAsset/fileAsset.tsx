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

import {useCallback, useEffect, useId, useRef, useState, type ComponentProps, type FunctionComponent} from 'react';

import {isNan, isNonEmptyString} from '@sindresorhus/is';
import cx from 'classnames';
import Long from 'long';
import {container} from 'tsyringe';

import {PdfAssetOptions} from './pdfAssetOptions';
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
  FullscreenModalComponent?: ComponentProps<typeof PdfAssetPreview>['FullscreenModalComponent'];
  hasHeader?: boolean;
  message: ContentMessage;
  teamState?: TeamState;
  isFocusable?: boolean;
}

const uploadProgressCompletePercentage = 100;
const maxProtocolFileSize = Long.MAX_UNSIGNED_VALUE.toNumber();

type SerializedLong = {
  high: number;
  low: number;
  unsigned?: boolean;
};

function isInt32(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && (value | 0) === value;
}

function isSerializedLong(value: unknown): value is SerializedLong {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const serializedLong = value as Record<string, unknown>;
  return (
    isInt32(serializedLong.low) &&
    isInt32(serializedLong.high) &&
    (serializedLong.unsigned === undefined || typeof serializedLong.unsigned === 'boolean')
  );
}

function normalizeFileSize(fileSize: unknown): number | undefined {
  let size: number;

  if (typeof fileSize === 'number') {
    size = fileSize;
  } else if (typeof fileSize === 'string' && fileSize.trim() !== '') {
    size = Number(fileSize);
  } else if (isSerializedLong(fileSize)) {
    size = Long.fromBits(fileSize.low, fileSize.high, fileSize.unsigned ?? false).toNumber();
  } else {
    return undefined;
  }

  return Number.isFinite(size) && Number.isInteger(size) && size >= 0 && size <= maxProtocolFileSize ? size : undefined;
}

const FileAsset: FunctionComponent<FileAssetProps> = ({
  FullscreenModalComponent,
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
  const previewTriggerRef = useRef<HTMLElement>(null);
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
  const fileSize = normalizeFileSize(asset.file_size);
  const formattedFileSize = fileSize === undefined ? undefined : formatBytes(fileSize);
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
  const canShowPdfPreview =
    isPdfPreviewEnabled && isFileSharingReceivingEnabled && hasPdfPreview && originalResource !== undefined;
  const canOpenPdfPreview = canShowPdfPreview && isUploadedOrCancelled;

  const onDownloadAsset = async (): Promise<void> => {
    if (isUploadedOrCancelled) {
      await downloadAsset(asset);
    }
  };

  const openPdfPreview = (trigger: HTMLElement): void => {
    previewTriggerRef.current = trigger;
    setIsPdfPreviewOpen(true);
  };

  useEffect(() => {
    if (!canShowPdfPreview && isPdfPreviewOpen) {
      setIsPdfPreviewOpen(false);
    }
  }, [canShowPdfPreview, isPdfPreviewOpen]);

  useEffect(() => {
    if (wasPdfPreviewOpen.current && !isPdfPreviewOpen) {
      previewTriggerRef.current?.focus();
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
        <div css={{position: 'relative', width: '100%'}}>
          <div
            className={cx('file', {
              'cursor-pointer': isUploadedOrCancelled,
            })}
            css={canOpenPdfPreview ? {paddingRight: '40px'} : undefined}
            data-uie-name="file"
            data-uie-value={asset.file_name}
            role="button"
            tabIndex={messageFocusedTabIndex}
            aria-haspopup={canOpenPdfPreview ? 'dialog' : undefined}
            aria-expanded={canShowPdfPreview ? isPdfPreviewOpen : undefined}
            aria-controls={canShowPdfPreview ? pdfPreviewModalId : undefined}
            aria-label={
              canOpenPdfPreview
                ? translate('cells.filePreviewButton.ariaLabel', {name: assetFileName})
                : `${translate('conversationContextMenuDownload')} ${fileName}.${fileExtension}`
            }
            onClick={event => {
              if (canOpenPdfPreview) {
                openPdfPreview(event.currentTarget);
                return;
              }
              void onDownloadAsset();
            }}
            onKeyDown={event => {
              const trigger = event.currentTarget;
              return handleKeyDown({
                event,
                callback: () => {
                  if (canOpenPdfPreview) {
                    openPdfPreview(trigger);
                    return;
                  }
                  void onDownloadAsset();
                },
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
                    {formattedFileSize !== undefined && (
                      <li className="label-nocase-xs" data-uie-name="file-size">
                        {formattedFileSize}
                      </li>
                    )}

                    {isNonEmptyString(fileExtension) ? (
                      <li data-uie-name="file-type">{fileExtension}</li>
                    ) : (
                      fileExtension
                    )}

                    {isUploading && <li data-uie-name="file-status">{translate('conversationAssetUploading')}</li>}

                    {isFailedUpload && (
                      <li data-uie-name="file-status">{translate('conversationAssetUploadFailed')}</li>
                    )}

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
          {canOpenPdfPreview && (
            <PdfAssetOptions
              labels={{
                menu: translate('cells.options.label'),
                open: translate('cells.options.open'),
                download: translate('cells.options.download'),
              }}
              canDownload={isUploadedOrCancelled}
              onOpen={openPdfPreview}
              onDownload={onDownloadAsset}
            />
          )}
        </div>
      ) : (
        <RestrictedFile asset={asset} />
      )}
      {canShowPdfPreview &&
        previewResource !== undefined &&
        originalResource !== undefined &&
        (isUploadedOrCancelled || isPdfPreviewOpen) && (
          <PdfAssetPreview
            FullscreenModalComponent={FullscreenModalComponent}
            id={pdfPreviewModalId}
            key={previewResource.identifier}
            thumbnailResource={previewResource}
            originalResource={originalResource}
            label={translate('cells.filePreviewButton.ariaLabel', {name: assetFileName})}
            fileName={fileName}
            fileExtension={fileExtension}
            senderName={message.user().name()}
            timestamp={message.timestamp()}
            isOpen={isPdfPreviewOpen}
            onOpenPreview={openPdfPreview}
            onClose={() => {
              return setIsPdfPreviewOpen(false);
            }}
            onDownload={onDownloadAsset}
            tabIndex={messageFocusedTabIndex}
            loadAsset={loadAsset}
          />
        )}
    </div>
  );
};

export {FileAsset};
