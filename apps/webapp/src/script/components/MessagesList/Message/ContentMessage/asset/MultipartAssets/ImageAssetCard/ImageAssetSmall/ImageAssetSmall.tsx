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

import {useState} from 'react';

import {t} from 'Util/localizerUtil';

import {containerStyles, imageStyles} from './ImageAssetSmall.styles';

import {FileFullscreenModal} from '../../../../../../../FileFullscreenModal/FileFullscreenModal';
import {MediaFilePreviewCard} from '../../common/MediaFilePreviewCard/MediaFilePreviewCard';

interface ImageAssetSmallProps {
  filePreviewUrl?: string;
  fileUrl?: string;
  name: string;
  extension: string;
  isLoading: boolean;
  isError: boolean;
  senderName: string;
  timestamp: number;
  id: string;
}

export const ImageAssetSmall = ({
  id,
  filePreviewUrl,
  fileUrl,
  name,
  extension,
  isLoading,
  isError,
  senderName,
  timestamp,
}: ImageAssetSmallProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isUnavailable = isError || hasLoadError;

  return (
    <>
      <button
        css={containerStyles}
        onClick={() => setIsOpen(true)}
        aria-label={t('accessibility.conversationAssetImageAlt', {
          username: senderName,
          messageDate: timestamp,
        })}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={id}
        disabled={isUnavailable}
      >
        <MediaFilePreviewCard
          label={filePreviewUrl ? t('conversationFileImagePreviewLabel', {src: filePreviewUrl}) : ''}
          isLoading={!isLoaded}
          isError={isUnavailable}
        >
          {!isLoading && !isUnavailable && filePreviewUrl && (
            <img
              src={filePreviewUrl}
              alt=""
              css={imageStyles}
              onLoad={() => setIsLoaded(true)}
              onError={() => {
                setHasLoadError(true);
                setIsLoaded(true);
              }}
            />
          )}
        </MediaFilePreviewCard>
      </button>
      <FileFullscreenModal
        id={id}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        filePreviewUrl={filePreviewUrl}
        fileExtension={extension}
        fileName={name}
        fileUrl={fileUrl}
        senderName={senderName}
        timestamp={timestamp}
      />
    </>
  );
};
