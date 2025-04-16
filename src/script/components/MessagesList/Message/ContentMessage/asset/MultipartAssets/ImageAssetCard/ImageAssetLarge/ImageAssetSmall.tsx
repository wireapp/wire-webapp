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

import {CSSProperties, useState} from 'react';

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
} from './ImageAssetSmall.styles';

interface ImageAssetLargeProps {
  src?: string;
  metadata: ICellAsset['image'];
  isError: boolean;
}

export const ImageAssetLarge = ({src, metadata, isError}: ImageAssetLargeProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const aspectRatio = metadata?.width && metadata?.height ? metadata?.width / metadata?.height : undefined;
  const opacity = isLoaded ? 1 : 0;

  return (
    <div
      css={containerStyles}
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
          alt=""
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
    </div>
  );
};
