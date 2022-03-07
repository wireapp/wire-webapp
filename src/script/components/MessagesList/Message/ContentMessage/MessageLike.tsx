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

export interface MessageLikeProps {
  className?: string;
  message: ContentMessage;
  onLike: (message: ContentMessage, button?: boolean) => void;
}

const MessageLike: React.FC<MessageLikeProps> = ({message, onLike, className}) => {
  const {is_liked: isLiked} = useKoSubscribableChildren(message, ['is_liked']);

  return (
    <button
      className={cx(className, {
        'like-button-liked': isLiked,
      })}
      style={{
        opacity: isLiked ? 1 : undefined,
      }}
      data-uie-name="do-like-message"
      data-uie-value={isLiked}
      aria-label={isLiked ? 'Liked' : 'Like'}
      onClick={() => onLike(message)}
      type="button"
    >
      <span className="icon-like-small"></span>
      <span className="icon-liked-small"></span>
    </button>
  );
};

export default MessageLike;
