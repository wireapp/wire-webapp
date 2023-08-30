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

import cx from 'classnames';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {MessageTime} from './MessageTime';

import {PingMessage as PingMessageEntity} from '../../../entity/message/PingMessage';

export interface PingMessageProps {
  message: PingMessageEntity;
}

const PingMessage: React.FC<PingMessageProps> = ({message}) => {
  const {unsafeSenderName, caption, timestamp, ephemeral_caption, isObfuscated, get_icon_classes} =
    useKoSubscribableChildren(message, [
      'unsafeSenderName',
      'caption',
      'timestamp',
      'ephemeral_caption',
      'isObfuscated',
      'get_icon_classes',
    ]);

  return (
    <div className="message-header" data-uie-name="element-message-ping">
      <div className="message-header-icon">
        <div className={`icon-ping ${get_icon_classes}`} />
      </div>
      <div
        className={cx('message-header-label', {
          'ephemeral-message-obfuscated': isObfuscated,
        })}
        title={ephemeral_caption}
        data-uie-name="element-message-ping-text"
      >
        <p className="message-header-label__multiline">
          <span className="message-header-sender-name">{unsafeSenderName}</span>
          <span className="ellipsis">{caption}</span>
        </p>
      </div>
      <div className="message-body-actions">
        <MessageTime timestamp={timestamp} data-uie-uid={message.id} data-uie-name="item-message-call-timestamp" />
      </div>
    </div>
  );
};

export {PingMessage};
