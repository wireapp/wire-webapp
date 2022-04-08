/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import Icon from 'Components/Icon';
import React, {useEffect, useState} from 'react';
import {container} from 'tsyringe';
import cx from 'classnames';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import useEffectRef from 'Util/useEffectRef';

import {Config} from '../../../../../Config';
import {ContentMessage} from '../../../../../entity/message/ContentMessage';
import {MediumImage} from '../../../../../entity/message/MediumImage';
import {TeamState} from '../../../../../team/TeamState';
import AssetLoader from './AssetLoader';
import RestrictedImage from 'Components/asset/RestrictedImage';
import {useViewPortObserver} from '../../../../../ui/viewportObserver';
import {useAssetTransfer} from './AbstractAssetTransferStateTracker';

export interface ImageAssetProps {
  asset: MediumImage;
  message: ContentMessage;
  onClick: (message: ContentMessage, event: React.MouseEvent | React.KeyboardEvent) => void;
  teamState?: TeamState;
}

const ImageAsset: React.FC<ImageAssetProps> = ({asset, message, onClick, teamState = container.resolve(TeamState)}) => {
  const [imageUrl, setImageUrl] = useState<string>();
  const {resource} = useKoSubscribableChildren(asset, ['resource']);
  const {isObfuscated, visible} = useKoSubscribableChildren(message, ['isObfuscated', 'visible']);
  const {isFileSharingReceivingEnabled} = useKoSubscribableChildren(teamState, ['isFileSharingReceivingEnabled']);
  const [viewportElementRef, setViewportElementRef] = useEffectRef<HTMLDivElement>();
  const isInViewport = useViewPortObserver(viewportElementRef);
  const {isUploading, uploadProgress, cancelUpload, loadAsset} = useAssetTransfer(message);

  useEffect(() => {
    if (!imageUrl && isInViewport && resource && isFileSharingReceivingEnabled) {
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
              setImageUrl(window.URL.createObjectURL(blob));
            }
          } else {
            throw new Error(`Unsupported image type "${blob.type}".`);
          }
        } catch (error) {
          console.error(error);
        }
      })();
      return () => {
        isWaiting = false;
      };
    }
    return undefined;
  }, [isInViewport, resource, isFileSharingReceivingEnabled]);

  const dummyImageUrl = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1' width='${asset.width}' height='${asset.height}'></svg>`;

  const imageAltText = `${message.user().name()} ${t(
    'accessibility.conversationAssetImageAlt',
  )} ${message.displayTimestampLong()} ${message.displayTimestampShort()}`;

  return (
    <div data-uie-name="image-asset">
      {isFileSharingReceivingEnabled ? (
        <div
          className={cx('image-asset', {
            'bg-color-ephemeral': isObfuscated,
            'image-asset--no-image': !isObfuscated && !imageUrl,
            'loading-dots': !isUploading && !resource && !isObfuscated,
          })}
          data-uie-visible={visible && !isObfuscated}
          data-uie-status={imageUrl ? 'loaded' : 'loading'}
          onClick={event => onClick(message, event)}
          onKeyDown={event => handleKeyDown(event, onClick.bind(null, message, event))}
          tabIndex={0}
          role="button"
          data-uie-name="go-image-detail"
          aria-label={imageAltText}
          ref={setViewportElementRef}
        >
          {isUploading && (
            <div className="asset-loader">
              <AssetLoader loadProgress={uploadProgress} onCancel={cancelUpload} />
            </div>
          )}

          {isObfuscated && (
            <div className="image-icon flex-center full-screen">
              <Icon.Image />
            </div>
          )}
          <img
            data-uie-name="image-asset-img"
            className={cx('image-element', {'image-ephemeral': isObfuscated})}
            style={!imageUrl ? {aspectRatio: asset.ratio.toString(), width: '100%'} : undefined}
            src={imageUrl || dummyImageUrl}
            alt={imageAltText}
          />
        </div>
      ) : (
        <RestrictedImage />
      )}
    </div>
  );
};

export default ImageAsset;
