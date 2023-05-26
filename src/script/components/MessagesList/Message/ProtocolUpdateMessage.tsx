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
import {ProtocolUpdateMessage as ProtocolUpdateMessageEntity} from 'src/script/entity/message/ProtocolUpdateMessage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {MessageTime} from './MessageTime';

export interface ProtocolUpdateMessageProps {
  message: ProtocolUpdateMessageEntity;
}

export const ProtocolUpdateMessage: React.FC<ProtocolUpdateMessageProps> = ({message}) => {
  const {caption, timestamp} = useKoSubscribableChildren(message, ['caption', 'timestamp']);

  return (
    <div className="message-header" data-uie-name="element-message-protocol-update">
      <div className="message-header-icon message-header-icon--svg text-foreground">
        <Icon.Info />
      </div>
      <div className="message-header-label" data-uie-name="element-message-protocol-update-text">
        <p className="message-header-label__multiline">
          <span className="ellipsis">
            <strong>{caption}</strong>
          </span>
        </p>
      </div>
      <div className="message-body-actions">
        <MessageTime timestamp={timestamp} data-uie-uid={message.id} data-uie-name="item-message-call-timestamp" />
      </div>
    </div>
  );
};
