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

import React from 'react';

import cx from 'classnames';

import {Image} from 'Components/Image';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {safeWindowOpen} from 'Util/SanitizationUtil';
import {cleanURL, prependProtocol} from 'Util/UrlUtil';
import {isTweetUrl} from 'Util/ValidationUtil';

import {AssetHeader} from './AssetHeader';

import type {ContentMessage} from '../../../../../entity/message/ContentMessage';
import type {Text} from '../../../../../entity/message/Text';
import {useMessageFocusedTabIndex} from '../../util';

export interface LinkPreviewAssetProps {
  /** Does the asset have a visible header? */
  header?: boolean;
  message: ContentMessage;
  isFocusable?: boolean;
}

const LinkPreviewAsset: React.FC<LinkPreviewAssetProps> = ({header = false, message, isFocusable = true}) => {
  const {
    previews: [preview],
  } = useKoSubscribableChildren(message.getFirstAsset() as Text, ['previews']);

  const isTypeTweet = !!preview?.tweet;
  const isTweet = isTypeTweet && isTweetUrl(preview?.url);
  const author = isTweet ? preview.tweet?.author?.substring(0, 20) : '';
  const previewImage = preview?.image;
  const {isObfuscated} = useKoSubscribableChildren(message, ['isObfuscated']);
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isFocusable);

  const onClick = () => {
    if (!message.isExpired()) {
      safeWindowOpen(preview?.url);
    }
  };

  return isObfuscated ? (
    <div className="link-preview-asset ephemeral-asset-expired">
      <div className="link-preview-image-container">
        <div className="link-preview-image-placeholder icon-link bg-color-ephemeral text-white" />
      </div>
      <div className="link-preview-info">
        <p
          className={cx(
            'link-preview-info-title',
            'ephemeral-message-obfuscated',
            `link-preview-info-title-${header ? 'singleline' : 'multiline'}`,
          )}
        >
          {preview?.title}
        </p>
        <p className="link-preview-info-link ephemeral-message-obfuscated ellipsis">{preview?.url}</p>
      </div>
    </div>
  ) : (
    <div
      role="button"
      tabIndex={messageFocusedTabIndex}
      className="link-preview-asset"
      onClick={onClick}
      onKeyDown={e => handleKeyDown(e, onClick)}
    >
      <div className="link-preview-image-container">
        {preview && previewImage ? (
          <Image className="link-preview-image" asset={previewImage} data-uie-name="link-preview-image" />
        ) : (
          <div className="link-preview-image-placeholder icon-link" />
        )}
      </div>
      <div className="link-preview-info">
        {header && <AssetHeader className="link-preview-info-header" message={message} />}
        {preview && (
          <>
            <p
              className={cx(
                'link-preview-info-title',
                `link-preview-info-title-${header ? 'singleline' : 'multiline'}`,
              )}
              data-uie-name="link-preview-title"
            >
              {preview.title}
            </p>
            {isTweet ? (
              <div
                className="link-preview-info-link text-foreground"
                title={preview.url}
                data-uie-name="link-preview-tweet-author"
              >
                <p className="font-weight-bold link-preview-info-title-singleline">{author}</p>
                <p>{t('conversationTweetAuthor')}</p>
              </div>
            ) : (
              <a
                className="link-preview-info-link text-foreground ellipsis"
                href={prependProtocol(preview.url)}
                target="_blank"
                rel="noopener noreferrer"
                title={preview.url}
                data-uie-name="link-preview-url"
              >
                {cleanURL(preview.url)}
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export {LinkPreviewAsset};
