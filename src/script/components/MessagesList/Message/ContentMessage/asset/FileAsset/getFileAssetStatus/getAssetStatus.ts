/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {AssetTransferState} from 'src/script/assets/AssetTransferState';

interface GetFileAssetStatusParams {
  uploadProgress: number;
  transferState: AssetTransferState;
}

export const getFileAssetStatus = ({uploadProgress, transferState}: GetFileAssetStatusParams) => {
  // This is a hack since we don't have a FileAsset available before it's
  // uploaded completely we have to check if there is upload progress to
  // transition into the `AssetTransferState.UPLOADING` state.
  const assetStatus =
    // eslint-disable-next-line no-magic-numbers
    uploadProgress && (uploadProgress > 0 && uploadProgress < 100 ? AssetTransferState.UPLOADING : transferState);

  const isPendingUpload = assetStatus === AssetTransferState.UPLOAD_PENDING;
  const isFailedUpload = assetStatus === AssetTransferState.UPLOAD_FAILED;
  const isDownloading = assetStatus === AssetTransferState.DOWNLOADING;
  const isFailedDownloadingDecrypt = assetStatus === AssetTransferState.DOWNLOAD_FAILED_DECRPYT;
  const isFailedDownloadingHash = assetStatus === AssetTransferState.DOWNLOAD_FAILED_HASH;
  const isUploading = assetStatus === AssetTransferState.UPLOADING;

  const isLoading = isPendingUpload || isUploading || isDownloading;
  const isError = isFailedUpload || isFailedDownloadingDecrypt || isFailedDownloadingHash;

  return {isLoading, isError};
};
