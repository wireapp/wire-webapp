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
  fileType?: string;
}
interface AssetImageProps extends BaseImageProps {
  image: MediumImage;
}

export const AssetImage = ({image, alt, ...props}: AssetImageProps) => {
  const {resource} = useKoSubscribableChildren(image, ['resource']);

  return <Image image={resource} imageSizes={image} fileType={image.file_type} alt={alt} {...props} />;
};

export const Image = ({
  image,
  imageSizes,
  fileType,
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
          const url = await getAssetUrl(image, allowedImageTypes, fileType);
          if (isUnmouted.current) {
            // Avoid re-rendering a component that is umounted
            return;
          }
          setImageUrl(url);
        } catch (error) {
          console.error(error);
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
  const ImageElement = ({src}: {src: string}) => (
    <img
      css={{...getImageStyle(imageSizes), ...imageStyles}}
      src={src}
      role="presentation"
      alt={alt}
      data-uie-name={isLoading ? 'image-loader' : 'image-asset-img'}
      onClick={event => {
        if (!isLoading) {
          onClick?.(event);
        }
      }}
    />
  );

  return (
    <InViewport
      onVisible={() => setIsInViewport(true)}
      css={getWrapperStyles(!!onClick)}
      className={cx(className, {'loading-dots image-asset--no-image': isLoading})}
      data-uie-status={isLoading ? 'loading' : 'loaded'}
      {...props}
    >
      {imageUrl?.pauseFrameUrl ? (
        <div className="image-asset--animated-wrapper">
          <ImageElement src={imageUrl?.pauseFrameUrl} />
          <details open className="image-asset--animated">
            <summary role="button" aria-label="Toggle animation playback"></summary>
            <ImageElement src={assetUrl} />
          </details>
        </div>
      ) : (
        <ImageElement src={assetUrl} />
      )}
    </InViewport>
  );
};
