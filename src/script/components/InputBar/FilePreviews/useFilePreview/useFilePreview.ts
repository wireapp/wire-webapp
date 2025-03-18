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

import {FileWithPreview, useFileUploadState} from 'Components/Conversation/useFilesUploadState/useFilesUploadState';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {Config} from 'src/script/Config';
import {getFileExtension, trimFileExtension, formatBytes} from 'Util/util';

interface FilePreviewParams {
  file: FileWithPreview;
  cellsRepository: CellsRepository;
  conversationId: string;
}

export const useFilePreview = ({file, cellsRepository, conversationId}: FilePreviewParams) => {
  const {deleteFile, updateFile} = useFileUploadState();

  const name = trimFileExtension(file.name);
  const extension = getFileExtension(file.name);
  const size = formatBytes(file.size);

  const isLoading = file.uploadStatus === 'uploading';
  const isError = file.uploadStatus === 'error';

  const transformedName = isError ? `Upload failed: ${name}` : name;

  const handleDelete = () => {
    deleteFile(file.id);
    void cellsRepository.deleteFileDraft({uuid: file.remoteUuid, versionId: file.remoteVersionId});
  };

  const handleRetry = async () => {
    try {
      updateFile(file.id, {uploadStatus: 'uploading'});
      const {uuid, versionId} = await cellsRepository.uploadFile({
        file,
        path: `${conversationId}@${Config.getConfig().CELLS_WIRE_DOMAIN}`,
      });
      updateFile(file.id, {remoteUuid: uuid, remoteVersionId: versionId, uploadStatus: 'success'});
    } catch (error) {
      updateFile(file.id, {uploadStatus: 'error'});
    }
  };

  return {
    name: transformedName,
    extension,
    size,
    isLoading,
    isError,
    handleDelete,
    handleRetry,
  };
};
