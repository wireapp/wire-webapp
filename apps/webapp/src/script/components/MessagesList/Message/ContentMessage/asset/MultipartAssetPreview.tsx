/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {FC, useState} from 'react';

import {container} from 'tsyringe';

import {ICellAsset} from '@wireapp/protocol-messaging';
import {MultipleFilesIcon, PlayIcon} from '@wireapp/react-ui-kit';

import {FileTypeIcon} from 'Components/Conversation/common/FileTypeIcon/FileTypeIcon';
import {FileFullscreenModal} from 'Components/FileFullscreenModal/FileFullscreenModal';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {getFileExtension, getName} from 'Util/util';

import {useGetMultipartAsset} from './MultipartAssets/useGetMultipartAsset/useGetMultipartAsset';

interface MultipartAssetPreviewProps {
  cellAssets: ICellAsset[];
  conversationId: string;
  attachmentsCountCopy: string;
  cellsRepository?: CellsRepository;
  senderName: string;
  timestamp: number;
}

export const MultipartAssetPreview: FC<MultipartAssetPreviewProps> = ({
  cellAssets,
  attachmentsCountCopy,
  cellsRepository = container.resolve(CellsRepository),
  senderName,
  timestamp,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const firstAsset = cellAssets[0];
  const modalId = `multipart-preview-${firstAsset?.uuid || 'unknown'}`;

  const isImage = firstAsset?.contentType?.startsWith('image');
  const isVideo = firstAsset?.contentType?.startsWith('video');
  const hasPreview = (isImage || isVideo) && !!firstAsset?.uuid;

  const {src, imagePreviewUrl, isLoading} = useGetMultipartAsset({
    uuid: firstAsset?.uuid || '',
    cellsRepository,
    isEnabled: hasPreview,
    retryPreviewUntilSuccess: false,
  });

  if (!cellAssets || cellAssets.length === 0) {
    return null;
  }

  const previewUrl = isVideo ? imagePreviewUrl : src;

  // Show loading state or preview for images/videos
  const shouldDisplayImagePreview = hasPreview && (previewUrl || isLoading);
  const hasMultipleFiles = cellAssets.length > 1;

  // Only show text if no preview OR if there are multiple files
  const showText = !shouldDisplayImagePreview || hasMultipleFiles;

  // Get file extension for FileTypeIcon - use initialName if available, fallback to contentType
  const fileExtension = firstAsset?.initialName
    ? getFileExtension(firstAsset.initialName)
    : firstAsset?.contentType?.split('/').pop() || '';

  // Get the file name to display for single files
  const fileName = firstAsset?.initialName ? getName(firstAsset.initialName) : '';

  // Determine what text to show: file name for single file, count for multiple files
  const displayText = hasMultipleFiles ? attachmentsCountCopy : fileName;

  return (
    <>
      <div className="message-quote__attachments" data-uie-name="media-attachments-quote">
        {shouldDisplayImagePreview ? (
          <div
            className="message-quote__preview-thumbnail"
            onClick={() => setIsModalOpen(true)}
            style={{cursor: 'pointer'}}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsModalOpen(true);
              }
            }}
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="" />
                {isVideo && (
                  <div className="message-quote__preview-overlay" aria-hidden="true">
                    <PlayIcon width={16} height={16} />
                  </div>
                )}
              </>
            ) : (
              <div className="message-quote__preview-loading" />
            )}
          </div>
        ) : hasMultipleFiles ? (
          <MultipleFilesIcon className="message-quote__files-icon" width={16} height={16} aria-hidden="true" />
        ) : (
          <span
            className="message-quote__filetype-icon"
            role="img"
            aria-label={fileExtension ? `${fileExtension.toUpperCase()} file` : 'File attachment'}
          >
            <FileTypeIcon extension={fileExtension} size={16} />
          </span>
        )}
        {showText && <span>{displayText}</span>}
      </div>

      {shouldDisplayImagePreview && (
        <FileFullscreenModal
          id={modalId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          filePreviewUrl={isVideo ? imagePreviewUrl : src}
          fileExtension={fileExtension}
          fileName={fileName}
          fileUrl={src}
          senderName={senderName}
          timestamp={timestamp}
        />
      )}
    </>
  );
};
