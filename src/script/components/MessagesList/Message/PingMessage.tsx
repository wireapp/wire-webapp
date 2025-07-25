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

import {Message} from 'Repositories/entity/message/Message';
import {PingMessage as PingMessageEntity} from 'Repositories/entity/message/PingMessage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {ReadReceiptStatus} from './ReadReceiptStatus';

export interface PingMessageProps {
  message: PingMessageEntity;
  is1to1Conversation: boolean;
  isLastDeliveredMessage: boolean;
  onClickDetails: (message: Message) => void;
}

export const PingMessage = ({
  message,
  is1to1Conversation,
  isLastDeliveredMessage,
  onClickDetails,
}: PingMessageProps) => {
  const {unsafeSenderName, caption, ephemeralCaption, isObfuscated, iconClasses} = useKoSubscribableChildren(message, [
    'unsafeSenderName',
    'caption',
    'ephemeralCaption',
    'isObfuscated',
    'iconClasses',
  ]);

  return (
    <div className="message-header" data-uie-name="element-message-ping">
      <div className="message-header-icon">
        <div className={cx('icon-ping', iconClasses)} />
      </div>

      <div
        className={cx('message-header-label message-header-ping', {
          'ephemeral-message-obfuscated': isObfuscated,
        })}
        title={ephemeralCaption}
        data-uie-name="element-message-ping-text"
      >
        <div className="message-header-content">
          <p className="message-header-label__multiline message-ping__content">
            <span className="message-header-sender-name">{unsafeSenderName}</span>
            <span className="ellipsis">{caption}</span>
          </p>

          <ReadReceiptStatus
            message={message}
            is1to1Conversation={is1to1Conversation}
            onClickDetails={onClickDetails}
          />
        </div>

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
  );
};
