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
import Icon from 'Components/Icon';
import {CallMessage as CallMessageEntity} from '../../entity/message/CallMessage';

import {registerReactComponent, useKoSubscribable} from 'Util/ComponentUtil';
import MessageTime from './MessageTime';

export interface CallMessageProps {
  message: CallMessageEntity;
}

const CallMessage: React.FC<CallMessageProps> = ({message}) => {
  const unsafeSenderName = useKoSubscribable(message.unsafeSenderName);
  const caption = useKoSubscribable(message.caption);
  const timestamp = useKoSubscribable(message.timestamp);

  const isCompleted = message.wasCompleted();

  return (
    <div className="message-header">
      <div className="message-header-icon message-header-icon--svg">
        {isCompleted ? (
          <div className="svg-green">
            <Icon.Pickup />
          </div>
        ) : (
          <div className="svg-red">
            <Icon.Hangup />
          </div>
        )}
      </div>
      <div
        className="message-header-label"
        data-uie-name="element-message-call"
        data-uie-value={isCompleted ? 'completed' : 'not_completed'}
      >
        <span className="message-header-sender-name">{unsafeSenderName}</span>
        <span className="ellipsis">{caption}</span>
      </div>
      <div className="message-body-actions">
        <MessageTime timestamp={timestamp} data-uie-uid={message.id} data-uie-name="item-message-call-timestamp" />
      </div>
    </div>
  );
};

export default CallMessage;

registerReactComponent('call-message', {
  component: CallMessage,
  template: '<div data-bind="react: {message: ko.unwrap(message)}"></div>',
});
