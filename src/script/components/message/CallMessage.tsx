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

import NamedIcon from 'Components/NamedIcon';
import React from 'react';
import {CallMessage as CallMessageEntity} from '../../entity/message/CallMessage';

import {registerReactComponent} from 'Util/ComponentUtil';

export interface CallMessageProps {
  message: CallMessageEntity;
}

const CallMessage: React.FC<CallMessageProps> = ({message}) => {
  const isCompleted = message.was_completed();
  const unsafeSenderName = message.unsafeSenderName();
  const caption = message.caption();
  const displayTimestampShort = message.displayTimestampShort();
  const displayTimestampLong = message.displayTimestampLong();

  // Equivalent for `ko.bindingHandlers.showAllTimestamps`
  const showAllTimestamps = (show: boolean) => {
    const times = document.querySelectorAll('.time');
    times.forEach(time => time.classList.toggle('show-timestamp', show));
  };

  return (
    <div className="message-header">
      <div className="message-header-icon message-header-icon--svg">
        {isCompleted ? (
          <div className="svg-green">
            <NamedIcon name="pickup-icon" width="16" height="16" />
          </div>
        ) : (
          <div className="svg-red">
            <NamedIcon name="hangup-icon" width="20" height="8" />
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
        <time
          className="time with-tooltip with-tooltip--top with-tooltip--time"
          onMouseEnter={() => showAllTimestamps(true)}
          onMouseLeave={() => showAllTimestamps(false)}
          data-timestamp={message.timestamp}
          data-tooltip={displayTimestampLong}
        >
          {displayTimestampShort}
        </time>
      </div>
    </div>
  );
};

export default CallMessage;

registerReactComponent('call-message', {
  component: CallMessage,
  template: '<div data-bind="react: {message: ko.unwrap(message)}"></div>',
});
