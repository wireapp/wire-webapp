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
import {PingMessage as PingMessageEntity} from '../../../entity/message/PingMessage';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import MessageTime from './MessageTime';
import ReadReceiptStatus from './ReadReceiptStatus';
import {Message} from 'src/script/entity/message/Message';

export interface PingMessageProps {
  is1to1Conversation: boolean;
  isLastDeliveredMessage: boolean;
  message: PingMessageEntity;
  onClickReceipts?: (message: Message) => void;
}

const PingMessage: React.FC<PingMessageProps> = ({
  message,
  is1to1Conversation,
  isLastDeliveredMessage,
  onClickReceipts,
}) => {
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
        <span className="message-header-label__multiline">
          <span className="message-header-sender-name">{unsafeSenderName}</span>
          <span className="ellipsis">{caption}</span>
        </span>
      </div>
      <div className="message-body-actions">
        <MessageTime timestamp={timestamp} data-uie-uid={message.id} data-uie-name="item-message-call-timestamp" />
        <ReadReceiptStatus
          message={message}
          is1to1Conversation={is1to1Conversation}
          isLastDeliveredMessage={isLastDeliveredMessage}
          onClickReceipts={onClickReceipts}
        />
      </div>
    </div>
  );
};

export default PingMessage;
