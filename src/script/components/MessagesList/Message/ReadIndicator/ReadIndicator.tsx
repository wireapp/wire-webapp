/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {Icon} from 'Components/Icon';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {formatTimeShort} from 'Util/TimeUtil';

import {ReadIndicatorStyles, ReadReceiptText} from './ReadIndicator.styles';

import {Message} from '../../../../entity/message/Message';

interface ReadIndicatorProps {
  message: Message;
  is1to1Conversation?: boolean;
  isLastDeliveredMessage?: boolean;
  showIconOnly?: boolean;
  onClick: (message: Message) => void;
}

export const ReadIndicator = ({
  message,
  is1to1Conversation = false,
  isLastDeliveredMessage = false,
  showIconOnly = false,
  onClick,
}: ReadIndicatorProps) => {
  const {readReceipts} = useKoSubscribableChildren(message, ['readReceipts']);

  // if (!message.expectsReadConfirmation) {
  //   return null;
  // }

  if (is1to1Conversation) {
    const readReceiptText = readReceipts.length ? formatTimeShort(readReceipts[0].time) : '';
    const showDeliveredMessage = isLastDeliveredMessage && readReceiptText === '';

    return (
      <span css={ReadIndicatorStyles(showIconOnly)} data-uie-name="status-message-read-receipts">
        {showDeliveredMessage && (
          <span data-uie-name="status-message-read-receipt-delivered">{t('conversationMessageDelivered')}</span>
        )}

        {showIconOnly && readReceiptText && <Icon.Read />}

        {!showIconOnly && !!readReceiptText && (
          <div css={ReadReceiptText} data-uie-name="status-message-read-receipt-text">
            <Icon.Read /> {readReceiptText}
          </div>
        )}
      </span>
    );
  }

  const readReceiptCount = readReceipts.length;
  const showEyeIndicatorOnly = showIconOnly && readReceiptCount > 0;

  return (
    <button
      css={ReadIndicatorStyles(showIconOnly)}
      onClick={() => onClick(message)}
      className="button-reset-default"
      data-uie-name="status-message-read-receipts"
    >
      {showEyeIndicatorOnly ? (
        <Icon.Read />
      ) : (
        !!readReceiptCount && (
          <div css={ReadReceiptText} data-uie-name="status-message-read-receipt-count">
            <Icon.Read /> {readReceiptCount}
          </div>
        )
      )}
    </button>
  );
};
