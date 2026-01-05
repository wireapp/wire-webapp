/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import React, {useEffect, useRef, useState} from 'react';

import {CSSObject} from '@emotion/react';
import cx from 'classnames';
import {container} from 'tsyringe';

import {InViewport} from 'Components/InViewport';
import {AssetRemoteData} from 'Repositories/assets/AssetRemoteData';
import {MediumImage} from 'Repositories/entity/message/MediumImage';
import {TeamState} from 'Repositories/team/TeamState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {getLogger} from 'Util/Logger';

const logger = getLogger('Image');

import {getImageStyle, getWrapperStyles} from './Image.styles';
import {RestrictedImage} from './RestrictedImage';

import {Config} from '../../Config';
import {
  AssetUrl,
  useAssetTransfer,
} from '../MessagesList/Message/ContentMessage/asset/common/useAssetTransfer/useAssetTransfer';

interface BaseImageProps extends React.HTMLProps<HTMLDivElement> {
  alt?: string;
  isQuote?: boolean;
  teamState?: TeamState;
  imageStyles?: CSSObject;
}

interface RemoteDataImageProps extends BaseImageProps {
  image: AssetRemoteData;
  imageSizes?: {width: string; height: string; ratio: number};
}
interface AssetImageProps extends BaseImageProps {
  image: MediumImage;
}

export const AssetImage = ({image, alt, ...props}: AssetImageProps) => {
  const {resource} = useKoSubscribableChildren(image, ['resource']);

  return <Image image={resource} imageSizes={image} alt={alt} {...props} />;
};

export const Image = ({
  image,
  imageSizes,
  onClick,
  className,
  isQuote = false,
  teamState = container.resolve(TeamState),
  alt,
  imageStyles,
  ...props
}: RemoteDataImageProps) => {
  const [isInViewport, setIsInViewport] = useState(false);
  /** keeps track of whether the component is mounted or not to avoid setting the image url in case it's not */
  const isUnmouted = useRef(false);

  const [imageUrl, setImageUrl] = useState<AssetUrl>();

  const {getAssetUrl} = useAssetTransfer();

  const {isFileSharingReceivingEnabled} = useKoSubscribableChildren(teamState, ['isFileSharingReceivingEnabled']);

  useEffect(() => {
    if (!imageUrl && isInViewport && image && isFileSharingReceivingEnabled) {
      void (async () => {
        try {
          const allowedImageTypes = [
            'application/octet-stream', // Octet-stream is required to paste images from clipboard
            ...Config.getConfig().ALLOWED_IMAGE_TYPES,
          ];
          const url = await getAssetUrl(image, allowedImageTypes);
          if (isUnmouted.current) {
            // Avoid re-rendering a component that is umounted
            return;
          }
          setImageUrl(url);
        } catch (error) {
          logger.development.error('Failed to load image', error);
        }
      })();
    }
  }, [imageUrl, isInViewport, image, isFileSharingReceivingEnabled, getAssetUrl]);

  useEffect(() => {
    return () => {
      isUnmouted.current = true;
      imageUrl?.dispose();
    };
  }, [imageUrl]);

  if (!isFileSharingReceivingEnabled) {
    return <RestrictedImage className={className} showMessage={!isQuote} isSmall={isQuote} />;
  }

  const dummyImageUrl = `data:image/svg+xml;utf8,<svg aria-hidden="true" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1' width='${imageSizes?.width}' height='${imageSizes?.height}'></svg>`;
  const assetUrl = imageUrl?.url || dummyImageUrl;
  const isLoading = !imageUrl;

  return (
    <InViewport
      onVisible={() => setIsInViewport(true)}
      css={getWrapperStyles(!!onClick)}
      className={cx(className, {'loading-dots image-asset--no-image': isLoading})}
      onClick={event => {
        if (!isLoading) {
          onClick?.(event);
        }
      }}
      data-uie-status={isLoading ? 'loading' : 'loaded'}
      {...props}
    >
      <img
        css={{...getImageStyle(imageSizes), ...imageStyles}}
        src={assetUrl}
        role="presentation"
        alt={alt}
        data-uie-name={isLoading ? 'image-loader' : 'image-asset-img'}
      />
    </InViewport>
  );
};
