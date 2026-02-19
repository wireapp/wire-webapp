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

import {useAutoAnimate} from '@formkit/auto-animate/react';
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {container} from 'tsyringe';

import {FileWithPreview} from 'Components/Conversation/useFilesUploadState/useFilesUploadState';
import {isAudio, isVideo, isImage} from 'Repositories/assets/AssetMetaDataBuilder';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {isPreviewableImage} from 'Util/ImageUtil';

import {AudioPreviewCard} from './AudioPreviewCard/AudioPreviewCard';
import {FilePreviewCard} from './FilePreviewCard/FilePreviewCard';
import {wrapperStyles} from './FilePreviews.styles';
import {ImagePreviewCard} from './ImagePreviewCard/ImagePreviewCard';
import {useFilePreview} from './useFilePreview/useFilePreview';
import {VideoPreviewCard} from './VideoPreviewCard/VideoPreviewCard';

interface FilePreviewsProps {
  files: FileWithPreview[];
  conversationQualifiedId: QualifiedId;
}

export const FilePreviews = ({files, conversationQualifiedId}: FilePreviewsProps) => {
  const [wrapperRef] = useAutoAnimate();

  return (
    <div ref={wrapperRef} css={wrapperStyles}>
      {files.map(file => (
        <FilePreview key={file.id} file={file} conversationQualifiedId={conversationQualifiedId} />
      ))}
    </div>
  );
};

interface FilePreviewProps {
  file: FileWithPreview;
  cellsRepository?: CellsRepository;
  conversationQualifiedId: QualifiedId;
}

const FilePreview = ({
  file,
  cellsRepository = container.resolve(CellsRepository),
  conversationQualifiedId,
}: FilePreviewProps) => {
  const {name, extension, size, isError, handleDelete, handleRetry} = useFilePreview({
    file,
    cellsRepository,
    conversationQualifiedId,
  });

  if (isImage(file) && isPreviewableImage({mimeType: file.type, fileName: file.name})) {
    return (
      <ImagePreviewCard
        src={file.preview}
        onDelete={handleDelete}
        onRetry={handleRetry}
        isError={isError}
        uploadProgress={file.uploadProgress}
      />
    );
  }

  if (isAudio(file)) {
    return (
      <AudioPreviewCard
        extension={extension}
        name={name}
        size={size}
        onDelete={handleDelete}
        onRetry={handleRetry}
        isError={isError}
        uploadProgress={file.uploadProgress}
      />
    );
  }

  if (isVideo(file)) {
    return (
      <VideoPreviewCard
        src={file.preview}
        onDelete={handleDelete}
        onRetry={handleRetry}
        isError={isError}
        uploadProgress={file.uploadProgress}
      />
    );
  }

  return (
    <FilePreviewCard
      extension={extension}
      name={name}
      size={size}
      onDelete={handleDelete}
      onRetry={handleRetry}
      isError={isError}
      uploadProgress={file.uploadProgress}
    />
  );
};
