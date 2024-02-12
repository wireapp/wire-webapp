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

import React from 'react';

import {CSSObject} from '@emotion/react';
import {container} from 'tsyringe';

import {Icon} from 'Components/Icon';
import {Image} from 'Components/Image';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {ContentMessage} from '../../../../../../entity/message/ContentMessage';
import {MediumImage} from '../../../../../../entity/message/MediumImage';
import {TeamState} from '../../../../../../team/TeamState';
import {AssetLoader} from '../AssetLoader';
import {useAssetTransfer} from '../useAssetTransfer';

export interface ImageAssetProps {
  asset: MediumImage;
  message: ContentMessage;
  onClick: (message: ContentMessage, event: React.MouseEvent | React.KeyboardEvent) => void;
  teamState?: TeamState;
  isFocusable?: boolean;
}

const MAX_ASSET_WIDTH = 800;

export const ImageAsset = ({asset, message, onClick, teamState = container.resolve(TeamState)}: ImageAssetProps) => {
  const {isObfuscated, visible} = useKoSubscribableChildren(message, ['isObfuscated', 'visible']);
  const {isUploading, uploadProgress, cancelUpload} = useAssetTransfer(message);
  const {isFileSharingReceivingEnabled} = useKoSubscribableChildren(teamState, ['isFileSharingReceivingEnabled']);

  const imageAltText = t('accessibility.conversationAssetImageAlt', {
    messageDate: `${message.displayTimestampShort()}`,
    username: `${message.user().name()}`,
  });

  const imageContainerStyle: CSSObject = {
    maxWidth: 'var(--conversation-message-asset-width)',
  };

  const isImageWidthLargerThanDefined = parseInt(asset.width, 10) >= MAX_ASSET_WIDTH;
  const imageWidth = isImageWidthLargerThanDefined ? `${MAX_ASSET_WIDTH}px` : asset.width;

  const imageAsset: CSSObject = {
    aspectRatio: isFileSharingReceivingEnabled ? `${asset.ratio}` : undefined,
    maxHeight: '80vh',
    maxWidth: !imageUrl?.url ? '100%' : imageWidth,

    ...(!imageUrl?.url &&
      !isImageWidthLargerThanDefined && {
        height: asset.height,
      }),
  };

  const imageStyle: CSSObject = {
    width: imageWidth,
    maxWidth: '100%',
    height: 'auto',
  };

  return (
    <div data-uie-name="image-asset" css={imageContainerStyle}>
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

      {!isUploading && (
        <Image
          image={asset}
          alt={imageAltText}
          data-uie-visible={visible && !isObfuscated}
          onClick={event => onClick(message, event)}
          onKeyDown={event => handleKeyDown(event, onClick.bind(null, message, event))}
          tabIndex={0}
          role="button"
          data-uie-name="go-image-detail"
          aria-label={imageAltText}
        />
      )}
    </div>
  );
};
