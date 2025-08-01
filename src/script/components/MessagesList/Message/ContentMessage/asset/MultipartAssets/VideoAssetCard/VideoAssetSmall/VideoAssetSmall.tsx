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

import {useId, useState} from 'react';

import {FileFullscreenModal} from 'Components/FileFullscreenModal/FileFullscreenModal';
import {t} from 'Util/LocalizerUtil';

import {contentWrapperStyles, iconWrapperStyles, videoStyles} from './VideoAssetSmall.styles';

import {FilePreviewPlayButton} from '../../common/FilePreviewPlayButton/FilePreviewPlayButton';
import {MediaFilePreviewCard} from '../../common/MediaFilePreviewCard/MediaFilePreviewCard';

interface VideoAssetSmallProps {
  src?: string;
  isLoading: boolean;
  isError: boolean;
  extension: string;
  fileName: string;
  senderName: string;
  timestamp: number;
}

export const VideoAssetSmall = ({
  src,
  isLoading,
  isError,
  extension,
  fileName,
  senderName,
  timestamp,
}: VideoAssetSmallProps) => {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        css={contentWrapperStyles}
        onClick={() => setIsOpen(true)}
        aria-label={t('accessibility.conversationAssetImageAlt', {
          username: senderName,
          messageDate: timestamp,
        })}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={id}
      >
        <MediaFilePreviewCard
          label={src ? t('conversationFileVideoPreviewLabel', {src}) : ''}
          isLoading={isLoading}
          isError={isError}
        >
          {!isLoading && !isError && (
            <>
              <video src={src} preload="metadata" css={videoStyles} />
              <div css={iconWrapperStyles}>
                <FilePreviewPlayButton />
              </div>
            </>
          )}
        </MediaFilePreviewCard>
      </button>
      <FileFullscreenModal
        id={id}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        filePreviewUrl={src}
        fileExtension={extension}
        fileName={fileName}
        senderName={senderName}
        timestamp={timestamp}
      />
    </>
  );
};
