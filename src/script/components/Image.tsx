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

import React, {useEffect, useState} from 'react';

import cx from 'classnames';
import {container} from 'tsyringe';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {RestrictedImage} from './asset/RestrictedImage';
import {useAssetTransfer} from './MessagesList/Message/ContentMessage/asset/AbstractAssetTransferStateTracker';
import {InViewport} from './utils/InViewport';

import {AssetRemoteData} from '../assets/AssetRemoteData';
import {Config} from '../Config';
import {MediumImage} from '../entity/message/MediumImage';
import {TeamState} from '../team/TeamState';

export interface ImageProps extends Omit<React.HTMLProps<HTMLDivElement>, 'onClick'> {
  image: MediumImage;
  onClick?: (asset: AssetRemoteData, event: React.MouseEvent) => void;
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

  const [assetSrc, setAssetSrc] = useState<string>();
  const {resource} = useKoSubscribableChildren(image, ['resource']);

  const {loadAsset} = useAssetTransfer();

  const {isFileSharingReceivingEnabled} = useKoSubscribableChildren(teamState, ['isFileSharingReceivingEnabled']);

  const handleClick = (event: React.MouseEvent) => {
    onClick?.(resource, event);
  };

  useEffect(() => {
    if (!assetSrc && isInViewport && isFileSharingReceivingEnabled) {
      let isWaiting = true;
      (async () => {
        try {
          const blob = (await loadAsset(resource)) as Blob;
          const allowedImageTypes = [
            'application/octet-stream', // Octet-stream is required to paste images from clipboard
            ...Config.getConfig().ALLOWED_IMAGE_TYPES,
          ];
          if (allowedImageTypes.includes(blob.type)) {
            if (isWaiting) {
              setAssetSrc(window.URL.createObjectURL(blob));
            }
          } else {
            throw new Error(`Unsupported image type "${blob.type}".`);
          }
        } catch (error) {
          console.error(error);
        }
      })();

      return () => {
        if (assetSrc) {
          window.URL.revokeObjectURL(assetSrc);
        }
        isWaiting = false;
      };
      return undefined;
    }
  }, [isInViewport, resource, isFileSharingReceivingEnabled, assetSrc, loadAsset]);

  const style = {aspectRatio: `${image.ratio}`, maxWidth: '100%', width: image.width};

  if (!isFileSharingReceivingEnabled) {
    return <RestrictedImage className={className} showMessage={!isQuote} isSmall={isQuote} />;
  }

  return (
    <InViewport onVisible={() => setIsInViewport(true)} className={cx('image-wrapper', className)} {...props}>
      {assetSrc ? (
        <img style={style} onClick={handleClick} src={assetSrc} role="presentation" alt={alt} />
      ) : (
        <div style={style} className={cx('loading-dots')}></div>
      )}
    </InViewport>
  );
};
