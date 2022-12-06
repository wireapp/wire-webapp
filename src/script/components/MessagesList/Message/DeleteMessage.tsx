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

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {User} from 'src/script/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {formatTimeShort, fromUnixTime, TIME_IN_MILLIS} from 'Util/TimeUtil';

import {MessageTime} from './MessageTime';

import {DeleteMessage as DeleteMessageEntity} from '../../../entity/message/DeleteMessage';
import {ServiceEntity} from '../../../integration/ServiceEntity';

export interface DeleteMessageProps {
  message: DeleteMessageEntity;
  onClickAvatar: (user: User | ServiceEntity) => void;
}

const DeleteMessage: React.FC<DeleteMessageProps> = ({message, onClickAvatar}) => {
  const {unsafeSenderName, user} = useKoSubscribableChildren(message, ['unsafeSenderName', 'user']);

  const deletedTimeStamp = message.deleted_timestamp || 0;

  const formattedDeletionTime = t(
    'conversationDeleteTimestamp',
    formatTimeShort(fromUnixTime(deletedTimeStamp / TIME_IN_MILLIS.SECOND)),
  );

  return (
    <div className="message-header">
      <div className="message-header-icon">
        <Avatar
          className="cursor-pointer"
          participant={user}
          onAvatarClick={onClickAvatar}
          avatarSize={AVATAR_SIZE.X_SMALL}
        />
      </div>
      <div className="message-header-label" data-uie-name="element-message-delete">
        <p className="message-header-label-sender" data-uie-name="element-message-delete-sender-name">
          {unsafeSenderName}
        </p>
        <span className="message-header-label-icon icon-trash" title={formattedDeletionTime} />
      </div>
      <p className="message-body-actions">
        <MessageTime
          timestamp={deletedTimeStamp}
          data-uie-uid={message.id}
          data-uie-name="item-message-delete-timestamp"
        >
          {formattedDeletionTime}
        </MessageTime>
      </p>
    </div>
  );
};

export {DeleteMessage};
