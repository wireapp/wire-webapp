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
import {isUndefined} from '@sindresorhus/is';
import cx from 'classnames';
import {container} from 'tsyringe';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

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
  retryLabel?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  isQuote?: boolean;
  role?: string;
  tabIndex?: number;
  teamState?: TeamState;
  imageStyles?: CSSObject;
}

interface RemoteDataImageProps extends BaseImageProps {
  image: AssetRemoteData | undefined;
  imageSizes?: {width: string; height: string; ratio: number};
}
interface AssetImageProps extends BaseImageProps {
  image: MediumImage;
}

type ImageLoadState = 'waiting' | 'loading' | 'loaded' | 'failed';

export type GetAssetUrl = (resource: AssetRemoteData, acceptedMimeTypes?: string[]) => Promise<AssetUrl>;

type ImageLoadingOptions = {
  image: AssetRemoteData | undefined;
  imageLoadState: ImageLoadState;
  isInViewport: boolean;
  isFileSharingReceivingEnabled: boolean;
};

function isImageReadyToLoad(options: ImageLoadingOptions): options is ImageLoadingOptions & {image: AssetRemoteData} {
  const {image, imageLoadState, isInViewport, isFileSharingReceivingEnabled} = options;

  return (
    isUndefined(image) === false &&
    imageLoadState === 'waiting' &&
    isInViewport === true &&
    isFileSharingReceivingEnabled === true
  );
}

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
    retryLabel,
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
      retryLabel={retryLabel}
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
    retryLabel,
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
    const imageLoadingOptions = {
      image,
      imageLoadState,
      isInViewport,
      isFileSharingReceivingEnabled,
    };

    if (isImageReadyToLoad(imageLoadingOptions) === false) {
      return;
    }

    const {image: availableImage} = imageLoadingOptions;

    setImageLoadState('loading');
    async function loadImageAsset(): Promise<void> {
      try {
        const allowedImageTypes = [
          'application/octet-stream', // Octet-stream is required to paste images from clipboard
          ...Config.getConfig().ALLOWED_IMAGE_TYPES,
        ];
        const url = await getAssetUrl(availableImage, allowedImageTypes);

        if (isMounted.current === false) {
          url.dispose();

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
  const isFailed = imageLoadState === 'failed';
  const isImageDetailInteractive = isLoaded === true && isUndefined(onClick) === false;
  let imageRole: string | undefined;
  let imageTabIndex: number | undefined;
  let imageStatus: ImageLoadState | 'error' = imageLoadState;
  let imageUieName = 'image-loader';

  if (isFailed === false) {
    imageRole = role;
    imageTabIndex = tabIndex;
  }

  if (isFailed === true) {
    imageStatus = 'error';
  }

  if (isLoaded === true) {
    imageUieName = 'image-asset-img';
  }

  function handleImageVisible(): void {
    setIsInViewport(true);
  }

  function handleImageClick(event: React.MouseEvent<HTMLDivElement>): void {
    if (isLoaded === false) {
      return;
    }

    if (isUndefined(onClick)) {
      return;
    }

    onClick(event);
  }

  function handleImageKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (isLoaded === false) {
      return;
    }

    if (isUndefined(onKeyDown)) {
      return;
    }

    onKeyDown(event);
  }

  function handleImageRetry(): void {
    if (isFailed === false) {
      return;
    }

    setImageLoadState('waiting');
  }

  function renderImageContent(): React.ReactNode {
    if (isFailed === true && isUndefined(retryLabel) === false) {
      return (
        <Button
          aria-label={retryLabel}
          data-uie-name="retry-image-load"
          onClick={handleImageRetry}
          type="button"
          variant={ButtonVariant.TERTIARY}
        >
          {retryLabel}
        </Button>
      );
    }

    return (
      <img
        css={{...getImageStyle(imageSizes), ...imageStyles}}
        src={assetUrl}
        role="presentation"
        alt={alt}
        data-uie-name={imageUieName}
      />
    );
  }

  return (
    <InViewport
      onVisible={handleImageVisible}
      className={cx(className, {
        'loading-dots': isLoading,
        'image-asset--no-image': isLoading || isFailed,
      })}
      onClick={handleImageClick}
      onKeyDown={handleImageKeyDown}
      role={imageRole}
      tabIndex={imageTabIndex}
      aria-label={ariaLabel}
      data-uie-name={dataUieName}
      data-uie-visible={dataUieVisible}
      data-uie-status={imageStatus}
      css={css ?? getWrapperStyles(isImageDetailInteractive)}
    >
      {renderImageContent()}
    </InViewport>
  );
};
