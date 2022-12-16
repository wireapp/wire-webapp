/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

/* eslint-disable jsx-a11y/no-noninteractive-tabindex */

import {FC} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {RestrictedVideo} from 'Components/asset/RestrictedVideo';
import {ParticipantMicOnIcon} from 'Components/calling/ParticipantMicOnIcon';
import {Icon} from 'Components/Icon';
import {Image} from 'Components/Image';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {renderMessage} from 'Util/messageRenderer';

import {ContentMessage} from '../../../entity/message/ContentMessage';

interface ReplyBarProps {
  replyMessageEntity: ContentMessage;
  onCancel: () => void;
}

const ReplyBar: FC<ReplyBarProps> = ({replyMessageEntity, onCancel}) => {
  const {
    assets,
    headerSenderName,
    was_edited: wasEdited,
  } = useKoSubscribableChildren(replyMessageEntity, ['assets', 'headerSenderName', 'was_edited']);
  const replyAsset = assets?.[0];

  return (
    <div className="input-bar__reply" data-uie-name="input-bar-reply-box">
      <button
        aria-label={t('replyBarCancelMessage')}
        type="button"
        className="button-reset-default"
        onClick={onCancel}
        data-uie-name="do-close-reply-box"
      >
        <Icon.Close className="close-icon" />
      </button>

      <div className="input-bar__reply__body">
        <div className="input-bar__reply__vert-bar"></div>

        <div className="input-bar__reply__text">
          <div className="input-bar__reply__sender-name">
            <span data-uie-name="label-name-reply-box" tabIndex={TabIndex.FOCUSABLE}>
              {headerSenderName}
            </span>

            {wasEdited && (
              <Icon.Edit
                className="edit-icon"
                data-uie-name="message-edited-reply-box"
                aria-label={t('replyBarEditMessage')}
                tabIndex={TabIndex.FOCUSABLE}
              />
            )}
          </div>

          {replyAsset?.isText() && (
            <div
              className="input-bar__reply__message input-bar__reply__message__text"
              data-uie-name="media-text-reply-box"
              dangerouslySetInnerHTML={{__html: renderMessage(replyAsset.text, null, replyAsset.mentions())}}
              aria-label={replyAsset.text}
              tabIndex={TabIndex.FOCUSABLE}
            />
          )}

          {replyAsset?.isImage() && (
            <div
              data-uie-name="media-picture-reply-box"
              tabIndex={TabIndex.FOCUSABLE}
              aria-label={replyAsset.file_name}
            >
              <Image
                className="bar__reply__message input-bar__reply__message__image"
                asset={replyAsset.resource()}
                isQuote
              />
            </div>
          )}

          {replyAsset?.isVideo() && (
            <div data-uie-name="media-video-reply-box" tabIndex={TabIndex.FOCUSABLE} aria-label={replyAsset.file_name}>
              <RestrictedVideo className="input-bar__reply__message" showMessage={false} isSmall />
            </div>
          )}

          {replyAsset?.isAudio() && (
            <div className="input-bar__reply__message" data-uie-name="media-audio-reply-box">
              <ParticipantMicOnIcon className="input-bar__reply__icon" />

              <span tabIndex={TabIndex.FOCUSABLE}>{t('replyAudioMessage')}</span>
            </div>
          )}

          {replyAsset?.isFile() && (
            <div className="input-bar__reply__message" data-uie-name="media-file-reply-box">
              <Icon.File className="input-bar__reply__icon" />

              <span tabIndex={TabIndex.FOCUSABLE}>{replyAsset.file_name}</span>
            </div>
          )}

          {replyAsset?.isLocation() && (
            <div className="input-bar__reply__message" data-uie-name="media-location-reply-box">
              <Icon.Location className="input-bar__reply__icon" aria-label={t('replyBarLocation')} />

              <span tabIndex={TabIndex.FOCUSABLE}>{replyAsset.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export {ReplyBar};
