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

import {ZoomableImage} from 'Components/ZoomableImage/ZoomableImage';
import {t} from 'Util/LocalizerUtil';

import {imageWrapperStyles, wrapperStyles} from './ImageFullscreenModal.styles';

import {FileFullscreenModal} from '../../../common/FileFullscreenModal/FileFullscreenModal';

interface ImageFullscreenModalProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  imageSrc?: string;
  imageName?: string;
  imageExtension?: string;
  senderName: string;
  timestamp: number;
}

export const ImageFullscreenModal = ({
  id,
  isOpen,
  onClose,
  imageSrc,
  imageName,
  imageExtension,
  senderName,
  timestamp,
}: ImageFullscreenModalProps) => {
  return (
    <FileFullscreenModal
      id={id}
      isOpen={isOpen}
      onClose={onClose}
      fileExtension={imageExtension!}
      fileName={imageName!}
      senderName={senderName}
      timestamp={timestamp}
    >
      <div css={wrapperStyles}>
        <div css={imageWrapperStyles}>
          <ZoomableImage
            src={imageSrc}
            alt={t('accessibility.conversationAssetImageAlt', {
              username: senderName,
              messageDate: timestamp,
            })}
          />
        </div>
      </div>
    </FileFullscreenModal>
  );
};
