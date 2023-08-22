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

import {Icon} from 'Components/Icon';
import {SystemMessage as SystemMessageEntity} from 'src/script/entity/message/SystemMessage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {MessageTime} from './MessageTime';

import {RenameMessage} from '../../../entity/message/RenameMessage';
import {SystemMessageType} from '../../../message/SystemMessageType';
export interface SystemMessageProps {
  message: SystemMessageEntity;
}

const SystemMessage: React.FC<SystemMessageProps> = ({message}) => {
  const {unsafeSenderName, timestamp, caption} = useKoSubscribableChildren(message, [
    'unsafeSenderName',
    'timestamp',
    'caption',
  ]);

  // Only set for RenameMessage, MemberMessage has a different super_type
  const messageName = (message as RenameMessage).name;

  return (
    <>
      <div className="message-header" data-uie-name="element-message-system">
        <div className="message-header-icon message-header-icon--svg text-foreground">
          {message.system_message_type === SystemMessageType.CONVERSATION_RENAME && <Icon.Edit />}
          {message.system_message_type === SystemMessageType.CONVERSATION_MESSAGE_TIMER_UPDATE && <Icon.Timer />}
          {message.system_message_type === SystemMessageType.CONVERSATION_RECEIPT_MODE_UPDATE && <Icon.Read />}
          {message.system_message_type === SystemMessageType.MLS_CONVERSATION_RECOVERED && <Icon.ExclamationMark />}
        </div>
        <p className="message-header-label">
          <span className="message-header-label__multiline">
            <span className="message-header-sender-name">{unsafeSenderName}</span>
            <span className="ellipsis">{caption}</span>
          </span>
        </p>
        <div className="message-body-actions">
          <MessageTime timestamp={timestamp} data-uie-uid={message.id} data-uie-name="item-message-call-timestamp" />
        </div>
      </div>
      <div className="message-body font-weight-bold">{messageName}</div>
    </>
  );
};

export {SystemMessage};
