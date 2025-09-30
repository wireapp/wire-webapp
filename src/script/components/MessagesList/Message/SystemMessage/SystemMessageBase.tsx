/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import React, {ReactNode} from 'react';

import {SystemMessage} from 'Repositories/entity/message/SystemMessage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {MessageTime} from '../MessageTime';

interface SystemMessageProps {
  message: SystemMessage;
  isSenderNameVisible?: boolean;
  icon?: ReactNode;
}

export const SystemMessageBase: React.FC<SystemMessageProps> = ({message, isSenderNameVisible = false, icon}) => {
  const {unsafeSenderName, timestamp} = useKoSubscribableChildren(message, ['unsafeSenderName', 'timestamp']);

  return (
    <div className="message-header" data-uie-name="element-message-system">
      {icon && <div className="message-header-icon message-header-icon--svg text-foreground">{icon}</div>}
      <p className="message-header-label">
        <span className="message-header-label__multiline">
          {isSenderNameVisible && <span className="message-header-sender-name">{unsafeSenderName}</span>}
          {message.caption && (
            <span className="system-message-caption ellipsis" dangerouslySetInnerHTML={{__html: message.caption}} />
          )}
        </span>
      </p>
      <div className="message-body-actions">
        <MessageTime timestamp={timestamp} data-uie-uid={message.id} data-uie-name="item-message-call-timestamp" />
      </div>
    </div>
  );
};
