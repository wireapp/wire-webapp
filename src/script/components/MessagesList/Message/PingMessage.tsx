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

import {OutlineCheck} from '@wireapp/react-ui-kit';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {ReadReceiptStatus} from './ReadReceiptStatus';

import {PingMessage as PingMessageEntity} from '../../../entity/message/PingMessage';

export interface PingMessageProps {
  message: PingMessageEntity;
  is1to1Conversation: boolean;
  isLastDeliveredMessage: boolean;
}

const PingMessage = ({message, is1to1Conversation, isLastDeliveredMessage}: PingMessageProps) => {
  const {unsafeSenderName, caption, ephemeral_caption, isObfuscated, get_icon_classes} = useKoSubscribableChildren(
    message,
    ['unsafeSenderName', 'caption', 'ephemeral_caption', 'isObfuscated', 'get_icon_classes'],
  );

  return (
    <div className="message-header" data-uie-name="element-message-ping">
      <div className="message-header-icon">
        <div className={`icon-ping ${get_icon_classes}`} />
      </div>
      <div
        className={cx('message-header-label message-header-ping', {
          'ephemeral-message-obfuscated': isObfuscated,
        })}
        title={ephemeral_caption}
        data-uie-name="element-message-ping-text"
      >
        <p className="message-header-label__multiline">
          <span className="message-header-sender-name">{unsafeSenderName}</span>
          <span className="ellipsis">{caption}</span>
        </p>

        <div>
          <ReadReceiptStatus message={message} is1to1Conversation={is1to1Conversation} />

          {message.expectsReadConfirmation && is1to1Conversation && isLastDeliveredMessage && (
            <div
              data-uie-name="status-message-read-receipt-delivered"
              title={t('conversationMessageDelivered')}
              className="delivered-message-icon"
            >
              <OutlineCheck />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export {PingMessage};
