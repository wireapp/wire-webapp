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

import {QualifiedId} from '@wireapp/api-client/lib/user/';

import {FileWithPreview, useFileUploadState} from 'Components/conversation/useFilesUploadState/useFilesUploadState';
import {buildCellsUploadPath} from 'Components/conversation/utils/buildCellsUploadPath';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {Config} from 'src/script/Config';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {getFileExtension, trimFileExtension, formatBytes} from 'Util/util';

interface FilePreviewParams {
  file: FileWithPreview;
  cellsRepository: CellsRepository;
  conversationId: string;
  conversationQualifiedId: QualifiedId;
}

export const useFilePreview = ({file, cellsRepository, conversationId, conversationQualifiedId}: FilePreviewParams) => {
  const {fireAndForgetInvoker} = useApplicationContext();
  const {deleteFile, updateFile} = useFileUploadState();

  const name = trimFileExtension(file.name);
  const extension = getFileExtension(file.name);
  const size = formatBytes(file.size);

  const isLoading = file.uploadStatus === 'uploading';
  const isError = file.uploadStatus === 'error';

  const transformedName = isError ? `Upload failed: ${name}` : name;

  const cancelUpload = () => {
    cellsRepository.cancelUpload(file.id);
    deleteFile({conversationId, fileId: file.id});
  };

  const handleDelete = () => {
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }

    if (isLoading) {
      cancelUpload();
      return;
    }

    deleteFile({conversationId, fileId: file.id});
    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      await cellsRepository.deleteNodeDraft({uuid: file.remoteUuid, versionId: file.remoteVersionId});
    });
  };

  const handleRetry = async () => {
    try {
      updateFile({conversationId, fileId: file.id, data: {uploadStatus: 'uploading'}});
      const path = buildCellsUploadPath({
        conversationId,
        conversationQualifiedId,
        cellsWireDomain: Config.getConfig().CELLS_WIRE_DOMAIN,
        isDevelopment: process.env.NODE_ENV === 'development',
      });

      const {uuid, versionId} = await cellsRepository.uploadNodeDraft({
        uuid: file.id,
        file,
        path,
      });
      updateFile({
        conversationId,
        fileId: file.id,
        data: {remoteUuid: uuid, remoteVersionId: versionId, uploadStatus: 'success'},
      });
    } catch (error: unknown) {
      updateFile({conversationId, fileId: file.id, data: {uploadStatus: 'error'}});
    }
  };

  return {
    name: transformedName,
    extension,
    size,
    isError,
    handleDelete,
    handleRetry,
  };
};
