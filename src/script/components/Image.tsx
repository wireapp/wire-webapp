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

import ko from 'knockout';
import {container} from 'tsyringe';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {RestrictedImage} from './asset/RestrictedImage';
import {AssetUrl, useAssetTransfer} from './MessagesList/Message/ContentMessage/asset/useAssetTransfer';
import {InViewport} from './utils/InViewport';

import {AssetRemoteData} from '../assets/AssetRemoteData';
import {Config} from '../Config';
import {MediumImage} from '../entity/message/MediumImage';
import {TeamState} from '../team/TeamState';

const imageWrapperStyle = {
  width: '100%',
};

export interface ImageProps extends React.HTMLProps<HTMLDivElement> {
  image: MediumImage | AssetRemoteData;
  alt?: string;
  isQuote?: boolean;
  teamState?: TeamState;
}

export const Image: React.FC<ImageProps> = ({
  image,
  onClick,
  className,
  isQuote = false,
  teamState = container.resolve(TeamState),
  alt,
  ...props
}) => {
  const [isInViewport, setIsInViewport] = useState(false);
  /** keeps track of whether the component is mounted or not to avoid setting the image url in case it's not */
  const isUnmouted = useRef(false);

  const [imageUrl, setImageUrl] = useState<AssetUrl>();
  const imageData =
    image instanceof AssetRemoteData
      ? {resource: ko.observable(image), ratio: undefined as undefined, width: undefined}
      : image;
  const {resource} = useKoSubscribableChildren(imageData, ['resource']);

  const {getAssetUrl} = useAssetTransfer();

  const {isFileSharingReceivingEnabled} = useKoSubscribableChildren(teamState, ['isFileSharingReceivingEnabled']);

  useEffect(() => {
    if (!imageUrl && isInViewport && resource && isFileSharingReceivingEnabled) {
      void (async () => {
        try {
          const allowedImageTypes = [
            'application/octet-stream', // Octet-stream is required to paste images from clipboard
            ...Config.getConfig().ALLOWED_IMAGE_TYPES,
          ];
          const url = await getAssetUrl(resource, allowedImageTypes);
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
  }, [imageUrl, isInViewport, resource, isFileSharingReceivingEnabled, getAssetUrl]);

  useEffect(() => {
    return () => {
      isUnmouted.current = true;
      imageUrl?.dispose();
    };
  }, [imageUrl]);

  if (!isFileSharingReceivingEnabled) {
    return <RestrictedImage className={className} showMessage={!isQuote} isSmall={isQuote} />;
  }

  const imageStyle = {
    aspectRatio: `${imageData.ratio}`,
    maxWidth: '100%',
    width: imageData.width,
    cursor: onClick ? 'pointer' : 'default',
  };

  const status = imageUrl ? 'loaded' : 'loading';

  return (
    <InViewport
      onVisible={() => setIsInViewport(true)}
      css={imageWrapperStyle}
      className={className}
      data-uie-status={status}
      {...props}
    >
      {imageUrl ? (
        <img
          css={imageStyle}
          onClick={onClick}
          src={imageUrl.url}
          role="presentation"
          alt={alt}
          data-uie-name="image-asset-img"
        />
      ) : (
        <div css={imageStyle} className="loading-dots" data-uie-name="image-loader"></div>
      )}
    </InViewport>
  );
};
