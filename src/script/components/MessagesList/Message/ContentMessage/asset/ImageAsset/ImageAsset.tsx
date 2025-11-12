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

import * as Icon from 'Components/Icon';
import {AssetImage} from 'Components/Image';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {MediumImage} from 'Repositories/entity/message/MediumImage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {AssetLoader} from '../common/AssetLoader/AssetLoader';
import {useAssetTransfer} from '../common/useAssetTransfer/useAssetTransfer';

export interface ImageAssetProps {
  asset: MediumImage;
  message: ContentMessage;
  onClick: (message: ContentMessage, event: React.MouseEvent | React.KeyboardEvent) => void;
  isFocusable?: boolean;
}

export const ImageAsset = ({asset, message, onClick}: ImageAssetProps) => {
  const {isObfuscated, visible} = useKoSubscribableChildren(message, ['isObfuscated', 'visible']);
  const {isUploading, uploadProgress, cancelUpload} = useAssetTransfer(message);

  const imageAltText = t('accessibility.conversationAssetImageAlt', {
    messageDate: `${message.displayTimestampShort()}`,
    username: `${message.user().name()}`,
  });

  const imageContainerStyle: CSSObject = {
    maxWidth: 'var(--conversation-message-asset-width)',
    maxHeight: 'var(--conversation-message-image-asset-max-height)',
    width: asset.width,
    aspectRatio: asset.ratio,
  };

  return (
    <div data-uie-name="image-asset" className="image-asset" css={imageContainerStyle}>
      {isUploading && (
        <div className="asset-loader">
          <AssetLoader loadProgress={uploadProgress} onCancel={cancelUpload} />
        </div>
      )}

      {isObfuscated && (
        <div className="image-icon flex-center full-screen bg-color-ephemeral">
          <Icon.ImageIcon />
        </div>
      )}

      {!isUploading && !isObfuscated && (
        <AssetImage
          image={asset}
          alt={imageAltText}
          data-uie-name="go-image-detail"
          data-uie-visible={visible && !isObfuscated}
          onClick={event => onClick(message, event)}
          onKeyDown={event =>
            handleKeyDown({event, callback: onClick.bind(null, message, event), keys: [KEY.ENTER, KEY.SPACE]})
          }
          tabIndex={0}
          role="button"
          aria-label={imageAltText}
        />
      )}
    </div>
  );
};
