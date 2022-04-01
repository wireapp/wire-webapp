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
import cx from 'classnames';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {Message} from 'src/script/entity/message/Message';
import MessageLike from './MessageLike';

export interface MessageFooterLikeProps {
  is1to1Conversation: boolean;
  message: ContentMessage;
  onClickLikes: (message: Message) => void;
  onLike: (message: ContentMessage, button?: boolean) => void;
}

const MessageFooterLike: React.FC<MessageFooterLikeProps> = ({message, is1to1Conversation, onLike, onClickLikes}) => {
  const {like_caption: likeCaption, reactions_user_ids: reactionsUserIds} = useKoSubscribableChildren(message, [
    'is_liked',
    'like_caption',
    'reactions_user_ids',
  ]);

  return (
    <div className="message-footer">
      <div className="message-footer-icon">
        <MessageLike className="like-button" message={message} onLike={onLike} />
      </div>
      <div
        className={cx('message-footer-label', {
          'cursor-pointer': !is1to1Conversation,
        })}
        onClick={is1to1Conversation ? null : () => onClickLikes(message)}
      >
        <span
          className="font-size-xs text-foreground"
          data-uie-name="message-liked-names"
          data-uie-value={reactionsUserIds}
        >
          {likeCaption}
        </span>
      </div>
    </div>
  );
};

export default MessageFooterLike;
