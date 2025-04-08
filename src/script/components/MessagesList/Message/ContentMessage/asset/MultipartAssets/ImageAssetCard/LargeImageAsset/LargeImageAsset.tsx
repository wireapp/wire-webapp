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

import {ICellAsset} from '@pydio/protocol-messaging';

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
} from './LargeImageAsset.styles';

interface LargeImageAssetProps {
  src?: string;
  metadata: ICellAsset['image'];
  isError: boolean;
}

export const LargeImageAsset = ({src, metadata, isError}: LargeImageAssetProps) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <div
      css={containerStyles}
      style={
        {
          '--aspect-ratio': metadata?.height ? metadata?.width / metadata?.height : undefined,
        } as CSSProperties
      }
    >
      <div css={infoOverlayStyles}>
        <div css={infoWrapperStyles}>
          {!isImageLoaded && !isError && <div className="icon-spinner spin" css={loaderIconStyles} />}
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
              '--opacity': isImageLoaded ? 1 : 0,
            } as CSSProperties
          }
          width={metadata?.width}
          onLoad={() => setIsImageLoaded(true)}
        />
      </div>
    </div>
  );
};
