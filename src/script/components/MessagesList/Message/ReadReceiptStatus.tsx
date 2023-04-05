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
import {Message} from 'src/script/entity/message/Message';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {formatTimeShort} from 'Util/TimeUtil';

export interface ReadReceiptStatusProps {
  is1to1Conversation: boolean;
  isLastDeliveredMessage: boolean;
  message: Message;
}

const ReadReceiptStatus: React.FC<ReadReceiptStatusProps> = ({message, is1to1Conversation, isLastDeliveredMessage}) => {
  const [readReceiptText, setReadReceiptText] = useState('');
  const {readReceipts} = useKoSubscribableChildren(message, ['readReceipts']);

  useEffect(() => {
    if (message.expectsReadConfirmation && readReceipts.length) {
      const text = is1to1Conversation ? formatTimeShort(readReceipts[0].time) : readReceipts.length.toString(10);
      setReadReceiptText(text);
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
        <div
          className={cx('message-status-read', is1to1Conversation && 'message-status-read__one-on-one')}
          data-uie-name="status-message-read-receipts"
          aria-label={t('accessibility.messageDetailsReadReceipts', readReceiptText)}
        >
          <Icon.Read />
          <span className="message-status-read__count" data-uie-name="status-message-read-receipt-count">
            {readReceiptText}
          </span>
        </div>
      )}
    </>
  );
};

export {ReadReceiptStatus};
