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

import {useEffect, useState} from 'react';

import cx from 'classnames';

import {ReadIcon} from 'Components/Icon';
import {Message} from 'Repositories/entity/message/Message';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {formatTimeShort} from 'Util/TimeUtil';

export interface ReadReceiptStatusProps {
  is1to1Conversation: boolean;
  message: Message;
  onClickDetails?: (message: Message) => void;
}

export const ReadReceiptStatus = ({message, is1to1Conversation, onClickDetails}: ReadReceiptStatusProps) => {
  const [readReceiptText, setReadReceiptText] = useState('');
  const {readReceipts} = useKoSubscribableChildren(message, ['readReceipts']);

  useEffect(() => {
    if (message.expectsReadConfirmation && readReceipts.length) {
      const text = is1to1Conversation ? formatTimeShort(readReceipts[0].time) : readReceipts.length.toString(10);
      setReadReceiptText(text);
    }
  }, [is1to1Conversation, readReceipts]);

  const showEyeIndicator = !!readReceiptText;

  if (!showEyeIndicator) {
    return null;
  }

  return (
    <button
      className={cx(
        'message-status-read',
        is1to1Conversation && 'message-status-read__one-on-one',
        !!onClickDetails && 'message-status-read__clickable',
      )}
      data-uie-name="status-message-read-receipts"
      aria-label={t('accessibility.messageDetailsReadReceipts', {readReceiptText})}
      {...(!is1to1Conversation && {
        onClick: () => {
          onClickDetails?.(message);
        },
      })}
    >
      <ReadIcon />
      <span className="message-status-read__count" data-uie-name="status-message-read-receipt-count">
        {readReceiptText}
      </span>
    </button>
  );
};
