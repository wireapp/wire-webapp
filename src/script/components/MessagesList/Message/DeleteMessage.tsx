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

import {DeleteMessage as DeleteMessageEntity} from 'Repositories/entity/message/DeleteMessage';
import {User} from 'Repositories/entity/User';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {t} from 'Util/LocalizerUtil';
import {formatTimeShort, fromUnixTime, TIME_IN_MILLIS} from 'Util/TimeUtil';

import {MessageHeader} from './ContentMessage/MessageHeader';
import {MessageTime} from './MessageTime';

export interface DeleteMessageProps {
  message: DeleteMessageEntity;
  onClickAvatar?: (user: User | ServiceEntity) => void;
}

const DeleteMessage: React.FC<DeleteMessageProps> = ({message, onClickAvatar = () => {}}) => {
  const deletedTimeStamp = message.deleted_timestamp || 0;

  const formattedDeletionTime = t('conversationDeleteTimestamp', {
    date: formatTimeShort(fromUnixTime(deletedTimeStamp / TIME_IN_MILLIS.SECOND)),
  });

  return (
    <MessageHeader message={message} onClickAvatar={onClickAvatar} uieName="element-message-delete" noBadges noColor>
      <span className="message-header-label-icon icon-trash" title={formattedDeletionTime} />
      <p className="message-body-actions">
        <MessageTime
          timestamp={deletedTimeStamp}
          data-uie-uid={message.id}
          data-uie-name="item-message-delete-timestamp"
        >
          {formattedDeletionTime}
        </MessageTime>
      </p>
    </MessageHeader>
  );
};

export {DeleteMessage};
