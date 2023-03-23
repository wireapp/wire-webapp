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

import React, {useEffect, useState} from 'react';

import cx from 'classnames';

import {Icon} from 'Components/Icon';
import {Message} from 'Entities/message/Message';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {formatDateNumeral, formatTimeShort} from 'Util/TimeUtil';

import {useMessageFocusedTabIndex} from './util';

export interface ReadReceiptStatusProps {
  is1to1Conversation: boolean;
  isLastDeliveredMessage: boolean;
  message: Message;
  onClickReceipts?: (message: Message) => void;
  isMessageFocused: boolean;
}

const ReadReceiptStatus: React.FC<ReadReceiptStatusProps> = ({
  message,
  onClickReceipts,
  is1to1Conversation,
  isLastDeliveredMessage,
  isMessageFocused,
}) => {
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);
  const [readReceiptText, setReadReceiptText] = useState('');
  const [readReceiptTooltip, setReadReceiptTooltip] = useState('');
  const {readReceipts} = useKoSubscribableChildren(message, ['readReceipts']);

  useEffect(() => {
    if (message.expectsReadConfirmation && readReceipts.length) {
      const text = is1to1Conversation ? formatTimeShort(readReceipts[0].time) : readReceipts.length.toString(10);
      setReadReceiptText(text);
    }
  }, [is1to1Conversation, readReceipts]);

  useEffect(() => {
    if (readReceipts.length && is1to1Conversation) {
      setReadReceiptTooltip(formatDateNumeral(readReceipts[0].time));
    }
  }, [is1to1Conversation, readReceipts]);

  const showDeliveredMessage = isLastDeliveredMessage && readReceiptText === '';
  const showEyeIndicator = !!readReceiptText;

  return (
    <>
      {showDeliveredMessage && (
        <span className="message-status" data-uie-name="status-message-read-receipt-delivered">
          {t('conversationMessageDelivered')}
        </span>
      )}
      {showEyeIndicator && (
        <button
          type="button"
          tabIndex={messageFocusedTabIndex}
          className={cx('button-reset-default', 'message-status-read', {
            'message-status-read--clickable': !is1to1Conversation,
            'message-status-read--visible': isLastDeliveredMessage,
            'with-tooltip with-tooltip--receipt': readReceiptTooltip,
          })}
          data-tooltip={readReceiptTooltip}
          {...(!is1to1Conversation && {
            onClick: () => onClickReceipts?.(message),
          })}
          data-uie-name="status-message-read-receipts"
          aria-label={t('accessibility.messageDetailsReadReceipts', readReceiptText)}
        >
          <Icon.Read />
          <span className="message-status-read__count" data-uie-name="status-message-read-receipt-count">
            {readReceiptText}
          </span>
        </button>
      )}
    </>
  );
};

export {ReadReceiptStatus};
