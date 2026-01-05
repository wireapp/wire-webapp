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

import * as Icon from 'Components/Icon';
import {CallMessage as CallMessageEntity} from 'Repositories/entity/message/CallMessage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {MessageTime} from './MessageTime';

interface CallMessageProps {
  message: CallMessageEntity;
}

const CallMessage = ({message}: CallMessageProps) => {
  const {caption, unsafeSenderName, timestamp} = useKoSubscribableChildren(message, [
    'caption',
    'unsafeSenderName',
    'timestamp',
  ]);

  const isCompleted = message.wasCompleted();

  return (
    <div className="message-header">
      <div className="message-header-icon message-header-icon--svg">
        {isCompleted ? (
          <div className="svg-green">
            <Icon.PickupIcon />
          </div>
        ) : (
          <div className="svg-red">
            <Icon.HangupIcon />
          </div>
        )}
      </div>
      <div
        className="message-header-label"
        data-uie-name="element-message-call"
        data-uie-value={isCompleted ? 'completed' : 'not_completed'}
      >
        <p>
          <span className="message-header-sender-name">{unsafeSenderName}</span>
          <span>{caption}</span>
        </p>
      </div>
      <p className="message-body-actions">
        <MessageTime timestamp={timestamp} data-uie-uid={message.id} data-uie-name="item-message-call-timestamp" />
      </p>
    </div>
  );
};

export {CallMessage};
