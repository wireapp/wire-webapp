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

import cx from 'classnames';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {checkIsMessageDelivered} from 'Util/util';

import {ReadReceiptStatus} from './ReadReceiptStatus';

import {PingMessage as PingMessageEntity} from '../../../entity/message/PingMessage';

export interface PingMessageProps {
  message: PingMessageEntity;
  is1to1Conversation: boolean;
  isLastDeliveredMessage: boolean;
}

const PingMessage = ({message, is1to1Conversation, isLastDeliveredMessage}: PingMessageProps) => {
  const {unsafeSenderName, caption, ephemeral_caption, isObfuscated, get_icon_classes, readReceipts} =
    useKoSubscribableChildren(message, [
      'unsafeSenderName',
      'caption',
      'ephemeral_caption',
      'isObfuscated',
      'get_icon_classes',
      'readReceipts',
    ]);

  const showDeliveredMessageIcon = checkIsMessageDelivered(isLastDeliveredMessage, readReceipts);

  return (
    <div className="message-header" data-uie-name="element-message-ping">
      <div className="message-header-icon">
        <div className={`icon-ping ${get_icon_classes}`} />
      </div>
      <div
        className={cx('message-header-label', {
          'ephemeral-message-obfuscated': isObfuscated,
          'message-header-ping-delivered': showDeliveredMessageIcon,
        })}
        title={ephemeral_caption}
        data-uie-name="element-message-ping-text"
      >
        <p className="message-header-label__multiline">
          <span className="message-header-sender-name">{unsafeSenderName}</span>
          <span className="ellipsis">{caption}</span>
        </p>

        {showDeliveredMessageIcon ? (
          <div className="message-ping-delivered-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none">
              <path
                fill="#676B71"
                fillRule="evenodd"
                d="M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Zm2 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-8.659 3.27 5.128-5.127-1.414-1.415-4.42 4.421-1.69-1.69-1.414 1.415 2.396 2.396.707.708.707-.708Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        ) : (
          <ReadReceiptStatus message={message} is1to1Conversation={is1to1Conversation} />
        )}
      </div>
    </div>
  );
};

export {PingMessage};
