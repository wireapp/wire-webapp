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
import {container} from 'tsyringe';

import {FileWithPreview} from 'Components/Conversation/useFiles/useFiles';
import {isAudio, isVideo, isImage} from 'src/script/assets/AssetMetaDataBuilder';
import {CellsRepository} from 'src/script/cells/CellsRepository';

import {AudioPreviewCard} from './AudioPreviewCard/AudioPreviewCard';
import {FilePreviewCard} from './FilePreviewCard/FilePreviewCard';
import {wrapperStyles} from './FilePreviews.styles';
import {ImagePreviewCard} from './ImagePreviewCard/ImagePreviewCard';
import {useFilePreview} from './useFilePreview/useFilePreview';
import {VideoPreviewCard} from './VideoPreviewCard/VideoPreviewCard';

interface FilePreviewsProps {
  files: FileWithPreview[];
}

export const FilePreviews = ({files}: FilePreviewsProps) => {
  const [wrapperRef] = useAutoAnimate();

  return (
    <div ref={wrapperRef} css={wrapperStyles}>
      {files.map(file => (
        <FilePreview key={file.id} file={file} />
      ))}
    </div>
  );
};

interface FilePreviewProps {
  file: FileWithPreview;
  cellsRepository?: CellsRepository;
}

const FilePreview = ({file, cellsRepository = container.resolve(CellsRepository)}: FilePreviewProps) => {
  const {name, extension, size, isLoading, isError, handleDelete, handleRetry} = useFilePreview({
    file,
    cellsRepository,
  });

  if (isImage(file)) {
    return (
      <ImagePreviewCard
        src={file.preview}
        onDelete={handleDelete}
        onRetry={handleRetry}
        isLoading={isLoading}
        isError={isError}
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
        isLoading={isLoading}
        isError={isError}
      />
    );
  }

  if (isVideo(file)) {
    return (
      <VideoPreviewCard
        src={file.preview}
        onDelete={handleDelete}
        onRetry={handleRetry}
        isLoading={isLoading}
        isError={isError}
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
      isLoading={isLoading}
      isError={isError}
    />
  );
};
