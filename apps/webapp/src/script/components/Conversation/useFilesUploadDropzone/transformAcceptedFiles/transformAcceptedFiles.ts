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

import {FileWithPreview} from 'Components/Conversation/useFilesUploadState/useFilesUploadState';
import {createUuid} from 'Util/uuid';

export const transformAcceptedFiles = (files: File[]): FileWithPreview[] => {
  return files.map(file => {
    return Object.assign(file, {
      id: createUuid(),
      preview: URL.createObjectURL(file),
      remoteUuid: '',
      remoteVersionId: '',
      uploadStatus: 'uploading' as const,
      uploadProgress: 0,
    });
  });
};
