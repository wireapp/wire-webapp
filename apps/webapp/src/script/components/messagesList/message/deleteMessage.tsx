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

import type {FunctionComponent} from 'react';

import {noop} from 'noop-esm';

import {useApplicationContext} from 'src/script/page/rootProvider';

import {MessageHeader} from './contentMessage/messageHeader';
import {MessageTime} from './messageTime';

import {DeleteMessage as DeleteMessageEntity} from '../../../repositories/entity/message/deleteMessage';
import {User} from '../../../repositories/entity/User';
import {ServiceEntity} from '../../../repositories/integration/ServiceEntity';
import {formatTimeShort, fromUnixTime, TIME_IN_MILLIS} from '../../../util/timeUtil';

interface DeleteMessageProps {
  message: DeleteMessageEntity;
  onClickAvatar?: (user: User | ServiceEntity) => void;
}

const DeleteMessage: FunctionComponent<DeleteMessageProps> = ({message, onClickAvatar = noop}: DeleteMessageProps) => {
  const {translate} = useApplicationContext();
  const deletedTimeStamp = message.deleted_timestamp ?? 0;

  const formattedDeletionTime = translate('conversationDeleteTimestamp', {
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
