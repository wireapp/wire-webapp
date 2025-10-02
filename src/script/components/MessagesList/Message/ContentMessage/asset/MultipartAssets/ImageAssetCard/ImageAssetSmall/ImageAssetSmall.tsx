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

import {t} from 'Util/LocalizerUtil';

import {containerStyles, imageStyles} from './ImageAssetSmall.styles';

import {FileFullscreenModal} from '../../../../../../../FileFullscreenModal/FileFullscreenModal';
import {MediaFilePreviewCard} from '../../common/MediaFilePreviewCard/MediaFilePreviewCard';

interface ImageAssetSmallProps {
  src?: string;
  name: string;
  extension: string;
  isLoading: boolean;
  isError: boolean;
  senderName: string;
  timestamp: number;
}

export const ImageAssetSmall = ({
  src,
  name,
  extension,
  isLoading,
  isError,
  senderName,
  timestamp,
}: ImageAssetSmallProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const id = useId();

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
      >
        <MediaFilePreviewCard
          label={src ? t('conversationFileImagePreviewLabel', {src}) : ''}
          isLoading={!isLoaded}
          isError={isError}
        >
          {!isLoading && !isError && src && <img src={src} alt="" css={imageStyles} onLoad={() => setIsLoaded(true)} />}
        </MediaFilePreviewCard>
      </button>
      <FileFullscreenModal
        id={id}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        filePreviewUrl={src}
        fileExtension={extension}
        fileName={name}
        fileUrl={src}
        senderName={senderName}
        timestamp={timestamp}
      />
    </>
  );
};
