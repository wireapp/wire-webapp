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
import NamedIcon from 'Components/NamedIcon';
import {t} from 'Util/LocalizerUtil';
import {CallingTimeoutMessage} from '../../entity/message/CallingTimeoutMessage';

import {registerReactComponent, useKoSubscribable} from 'Util/ComponentUtil';
import MessageTime from './MessageTime';
import {REASON} from '@wireapp/avs';

export interface CallTimeoutMessageProps {
  message: CallingTimeoutMessage;
}

const CallTimeoutMessage: React.FC<CallTimeoutMessageProps> = ({message}) => {
  const reason = message.reason;
  const timestamp = useKoSubscribable(message.timestamp);
  const text = `${t('callWasEndedBecause')} `;

  return (
    <div className="message-header">
      <div className="message-header-icon message-header-icon--svg">
        <div className="svg-red">
          <NamedIcon name="hangup-icon" width="20" height="8" />
        </div>
      </div>
      <div
        className="message-header-label"
        data-uie-name="element-message-call"
        data-uie-value={reason === REASON.NOONE_JOINED ? 'no-one-joined' : 'everyone-left'}
      >
        <span className="ellipsis">
          {text}
          <b>{reason === REASON.NOONE_JOINED ? t('callNoOneJoined') : t('callEveryOneLeft')}</b>
        </span>
      </div>
      <div className="message-body-actions">
        <MessageTime timestamp={timestamp} data-uie-uid={message.id} data-uie-name="item-message-call-timestamp" />
      </div>
    </div>
  );
};

export default CallTimeoutMessage;

registerReactComponent('call-timeout-message', {
  component: CallTimeoutMessage,
  template: '<div data-bind="react: {message: ko.unwrap(message)}"></div>',
});
