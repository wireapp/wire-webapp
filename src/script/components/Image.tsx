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

import cx from 'classnames';
import {container} from 'tsyringe';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {RestrictedImage} from './asset/RestrictedImage';
import {AssetUrl, useAssetTransfer} from './MessagesList/Message/ContentMessage/asset/useAssetTransfer';
import {InViewport} from './utils/InViewport';

import {Config} from '../Config';
import {MediumImage} from '../entity/message/MediumImage';
import {TeamState} from '../team/TeamState';

export interface ImageProps extends React.HTMLProps<HTMLDivElement> {
  image: MediumImage;
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
  const {resource} = useKoSubscribableChildren(image, ['resource']);

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

  const placeholderStyle = {aspectRatio: `${image.ratio}`, maxWidth: '100%'};

  return (
    <InViewport onVisible={() => setIsInViewport(true)} className={cx('image-wrapper', className)} {...props}>
      {imageUrl ? (
        <img onClick={onClick} src={imageUrl.url} role="presentation" alt={alt} />
      ) : (
        <div style={placeholderStyle} className={cx('loading-dots')}></div>
      )}
    </InViewport>
  );
};
