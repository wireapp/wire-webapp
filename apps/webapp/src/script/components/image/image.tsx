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
import type {FunctionComponent} from 'react';

import {CSSObject} from '@emotion/react';
import cx from 'classnames';
import {container} from 'tsyringe';

import {InViewport} from 'Components/inViewport';
import {AssetRemoteData} from 'Repositories/assets/assetRemoteData';
import {MediumImage} from 'Repositories/entity/message/mediumImage';
import {TeamState} from 'Repositories/team/TeamState';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {getLogger, Logger} from 'Util/logger';

import {getImageStyle, getWrapperStyles} from './image.styles';
import {RestrictedImage} from './restrictedImage';

import {Config} from '../../Config';
import {
  AssetUrl,
  useAssetTransfer,
} from '../messagesList/message/contentMessage/asset/common/useAssetTransfer/useAssetTransfer';

const defaultLogger = getLogger('Image');

export type ImageLogger = Pick<Logger, 'error'>;

interface BaseImageProps {
  alt?: string;
  'aria-label'?: string;
  className?: string;
  'data-uie-name'?: string;
  'data-uie-visible'?: boolean;
  css?: CSSObject;
  getAssetUrl?: GetAssetUrl;
  logger?: ImageLogger;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  isQuote?: boolean;
  role?: string;
  tabIndex?: number;
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

type ImageLoadState = 'waiting' | 'loading' | 'loaded' | 'failed';

export type GetAssetUrl = (resource: AssetRemoteData, acceptedMimeTypes?: string[]) => Promise<AssetUrl>;

export const AssetImage: FunctionComponent<AssetImageProps> = (properties: AssetImageProps) => {
  const {
    'aria-label': ariaLabel,
    alt,
    className,
    css,
    'data-uie-name': dataUieName,
    'data-uie-visible': dataUieVisible,
    getAssetUrl,
    image,
    imageStyles,
    isQuote,
    logger,
    onClick,
    onKeyDown,
    role,
    tabIndex,
    teamState,
  } = properties;
  const {resource} = useKoSubscribableChildren(image, ['resource']);

  return (
    <Image
      aria-label={ariaLabel}
      alt={alt}
      className={className}
      css={css}
      data-uie-name={dataUieName}
      data-uie-visible={dataUieVisible}
      getAssetUrl={getAssetUrl}
      image={resource}
      imageSizes={image}
      imageStyles={imageStyles}
      isQuote={isQuote}
      logger={logger}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={role}
      tabIndex={tabIndex}
      teamState={teamState}
    />
  );
};

export const Image: FunctionComponent<RemoteDataImageProps> = (properties: RemoteDataImageProps) => {
  const {
    'aria-label': ariaLabel,
    image,
    imageSizes,
    onClick,
    className,
    css,
    'data-uie-name': dataUieName,
    'data-uie-visible': dataUieVisible,
    getAssetUrl: getAssetUrlOverride,
    isQuote = false,
    logger = defaultLogger,
    teamState = container.resolve(TeamState),
    alt,
    imageStyles,
    onKeyDown,
    role,
    tabIndex,
  } = properties;
  const [isInViewport, setIsInViewport] = useState(false);
  const [imageLoadState, setImageLoadState] = useState<ImageLoadState>('waiting');
  const isMounted = useRef(false);

  const [imageUrl, setImageUrl] = useState<AssetUrl>();

  const {fireAndForgetInvoker} = useApplicationContext();
  const {getAssetUrl: getAssetUrlFromAssetTransfer} = useAssetTransfer();
  const getAssetUrl = getAssetUrlOverride ?? getAssetUrlFromAssetTransfer;

  const {isFileSharingReceivingEnabled} = useKoSubscribableChildren(teamState, ['isFileSharingReceivingEnabled']);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (imageLoadState !== 'waiting' || isInViewport === false || isFileSharingReceivingEnabled === false) {
      return;
    }

    setImageLoadState('loading');
    async function loadImageAsset(): Promise<void> {
      try {
        const allowedImageTypes = [
          'application/octet-stream', // Octet-stream is required to paste images from clipboard
          ...Config.getConfig().ALLOWED_IMAGE_TYPES,
        ];
        const url = await getAssetUrl(image, allowedImageTypes);

        if (isMounted.current === false) {
          return;
        }
        setImageUrl(url);
        setImageLoadState('loaded');
      } catch (error: unknown) {
        if (isMounted.current === false) {
          return;
        }
        logger.error('Failed to load image asset', error);
        setImageLoadState('failed');
      }
    }

    fireAndForgetInvoker.fireAndForget(loadImageAsset);
  }, [imageLoadState, isInViewport, image, isFileSharingReceivingEnabled, getAssetUrl, fireAndForgetInvoker, logger]);

  useEffect(() => {
    return () => {
      imageUrl?.dispose();
    };
  }, [imageUrl]);

  if (!isFileSharingReceivingEnabled) {
    return <RestrictedImage className={className} showMessage={!isQuote} isSmall={isQuote} />;
  }

  const dummyImageUrl = `data:image/svg+xml;utf8,<svg aria-hidden="true" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1' width='${imageSizes?.width}' height='${imageSizes?.height}'></svg>`;
  const assetUrl = imageUrl?.url ?? dummyImageUrl;
  const isLoading = imageLoadState === 'waiting' || imageLoadState === 'loading';
  const isLoaded = imageLoadState === 'loaded';

  return (
    <InViewport
      onVisible={() => {
        setIsInViewport(true);
      }}
      className={cx(className, {'loading-dots image-asset--no-image': isLoading})}
      onClick={event => {
        if (isLoaded) {
          onClick?.(event);
        }
      }}
      onKeyDown={onKeyDown}
      role={role}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      data-uie-name={dataUieName}
      data-uie-visible={dataUieVisible}
      data-uie-status={imageLoadState === 'failed' ? 'error' : imageLoadState}
      css={css ?? getWrapperStyles(onClick !== undefined)}
    >
      <img
        css={{...getImageStyle(imageSizes), ...imageStyles}}
        src={assetUrl}
        role="presentation"
        alt={alt}
        data-uie-name={isLoaded ? 'image-asset-img' : 'image-loader'}
      />
    </InViewport>
  );
};
