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

import {REASON} from '@wireapp/avs';

import * as Icon from 'Components/Icon';
import {CallingTimeoutMessage} from 'Repositories/entity/message/CallingTimeoutMessage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {MessageTime} from './MessageTime';

export interface CallTimeoutMessageProps {
  message: CallingTimeoutMessage;
}

const CallTimeoutMessage: React.FC<CallTimeoutMessageProps> = ({message}) => {
  const reason = message.reason;
  const {timestamp} = useKoSubscribableChildren(message, ['timestamp']);
  const text = `${t('callWasEndedBecause')} `;

  return (
    <div className="message-header">
      <div className="message-header-icon message-header-icon--svg">
        <div className="svg-red">
          <Icon.HangupIcon />
        </div>
      </div>
      <div
        className="message-header-label"
        data-uie-name="element-message-call"
        data-uie-value={reason === REASON.NOONE_JOINED ? 'no-one-joined' : 'everyone-left'}
      >
        <p>
          {text}
          <b>{reason === REASON.NOONE_JOINED ? t('callNoOneJoined') : t('callEveryOneLeft')}</b>
        </p>
      </div>
      <p className="message-body-actions">
        <MessageTime timestamp={timestamp} data-uie-uid={message.id} data-uie-name="item-message-call-timestamp" />
      </p>
    </div>
  );
};

export {CallTimeoutMessage};
