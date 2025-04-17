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

import {CSSProperties, useState, useId} from 'react';

import {ICellAsset} from '@wireapp/protocol-messaging';
import {UnavailableFileIcon} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {
  containerStyles,
  errorIconStyles,
  errorTextStyles,
  imageStyle,
  imageWrapperStyles,
  infoOverlayStyles,
  infoWrapperStyles,
  loaderIconStyles,
} from './ImageAssetLarge.styles';

import {ImageFullscreenModal} from '../common/ImageFullscreenModal/ImageFullscreenModal';

interface ImageAssetLargeProps {
  src?: string;
  name: string;
  extension: string;
  metadata: ICellAsset['image'];
  isError: boolean;
  senderName: string;
  timestamp: number;
}

export const ImageAssetLarge = ({
  src,
  name,
  extension,
  metadata,
  isError,
  senderName,
  timestamp,
}: ImageAssetLargeProps) => {
  const id = useId();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const aspectRatio = metadata?.width && metadata?.height ? metadata?.width / metadata?.height : undefined;
  const opacity = isLoaded ? 1 : 0;

  return (
    <>
      <button
        css={containerStyles}
        onClick={() => setIsOpen(true)}
        aria-label={t('cellsGlobalView.imageFullScreenModalCloseButton')}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={id}
        style={
          {
            '--aspect-ratio': aspectRatio,
          } as CSSProperties
        }
      >
        <div css={infoOverlayStyles}>
          <div css={infoWrapperStyles}>
            {!isLoaded && !isError && <div className="icon-spinner spin" css={loaderIconStyles} />}
            {isError && (
              <>
                <UnavailableFileIcon css={errorIconStyles} width={14} height={14} />
                <p css={errorTextStyles}>{t('cellsUnavailableFile')}</p>
              </>
            )}
          </div>
        </div>
        <div css={imageWrapperStyles}>
          <img
            src={src}
            alt={t('accessibility.conversationAssetImageAlt', {
              username: senderName,
              messageDate: timestamp,
            })}
            css={imageStyle}
            style={
              {
                '--opacity': opacity,
              } as CSSProperties
            }
            width={metadata?.width}
            onLoad={() => setIsLoaded(true)}
          />
        </div>
      </button>
      <ImageFullscreenModal
        id={id}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        imageSrc={src}
        imageName={name}
        imageExtension={extension}
        senderName={senderName}
        timestamp={timestamp}
      />
    </>
  );
};
