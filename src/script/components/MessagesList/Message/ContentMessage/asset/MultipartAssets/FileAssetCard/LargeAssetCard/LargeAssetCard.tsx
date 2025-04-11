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

import {UnavailableFileIcon} from '@wireapp/react-ui-kit';

import {FileCard} from 'Components/FileCard/FileCard';
import {t} from 'Util/LocalizerUtil';

import {
  contentWrapperStyles,
  errorIconStyles,
  errorTextStyles,
  imageStyles,
  infoOverlayStyles,
  infoWrapperStyles,
  loaderIconStyles,
} from './LargeAssetCard.styles';

interface LargeAssetCardProps {
  extension: string;
  name: string;
  size: string;
  previewImageUrl?: string;
  isLoading: boolean;
  isError: boolean;
}

export const LargeAssetCard = ({extension, name, size, previewImageUrl, isError, isLoading}: LargeAssetCardProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const shouldDisplayLoading = (previewImageUrl ? !isLoaded : isLoading) && !isError;
  const shouldDisplayError = isError && !previewImageUrl;

  return (
    <FileCard.Root variant="large" extension={extension} name={name} size={size}>
      <FileCard.Header>
        <FileCard.Icon type={isError ? 'unavailable' : 'file'} />
        {!isError && <FileCard.Type />}
        <FileCard.Name variant={isError ? 'secondary' : 'primary'} />
      </FileCard.Header>
      <FileCard.Content>
        <div css={contentWrapperStyles}>
          <img
            src={previewImageUrl}
            style={{'--opacity': isLoaded && previewImageUrl ? 1 : 0} as CSSProperties}
            alt=""
            css={imageStyles}
            onLoad={() => setIsLoaded(true)}
          />
          <div css={infoOverlayStyles}>
            <div css={infoWrapperStyles}>
              {shouldDisplayLoading && <div className="icon-spinner spin" css={loaderIconStyles} />}
              {shouldDisplayError && (
                <>
                  <UnavailableFileIcon css={errorIconStyles} width={14} height={14} />
                  <p css={errorTextStyles}>{t('cellsUnavailableFile')}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </FileCard.Content>
    </FileCard.Root>
  );
};
