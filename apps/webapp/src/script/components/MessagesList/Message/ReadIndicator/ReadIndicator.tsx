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

import * as Icon from 'Components/Icon';
import {Message} from 'Repositories/entity/message/Message';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {formatTimeShort} from 'Util/TimeUtil';

import {ReadIndicatorContainer, ReadIndicatorStyles, ReadReceiptText} from './ReadIndicator.styles';

interface ReadIndicatorProps {
  message: Message;
  is1to1Conversation?: boolean;
  showIconOnly?: boolean;
  onClick?: (message: Message) => void;
}

export const ReadIndicator = ({
  message,
  is1to1Conversation = false,
  showIconOnly = false,
  onClick,
}: ReadIndicatorProps) => {
  const {readReceipts} = useKoSubscribableChildren(message, ['readReceipts']);

  if (is1to1Conversation) {
    const readReceiptText = readReceipts.length ? formatTimeShort(readReceipts[0].time) : '';

    return (
      <div css={ReadIndicatorContainer} className="read-indicator-wrapper">
        <span css={ReadIndicatorStyles(showIconOnly)} data-uie-name="status-message-read-receipts">
          {showIconOnly && readReceiptText && <Icon.ReadIcon />}

          {!showIconOnly && !!readReceiptText && (
            <div css={ReadReceiptText} data-uie-name="status-message-read-receipt-text">
              <Icon.ReadIcon /> {readReceiptText}
            </div>
          )}
        </span>
      </div>
    );
  }

  const readReceiptCount = readReceipts.length;

  if (readReceiptCount === 0) {
    return null;
  }

  if (showIconOnly) {
    return (
      <span css={ReadIndicatorStyles(true)} data-uie-name="status-message-read-receipts-header">
        <Icon.ReadIcon />
      </span>
    );
  }

  return (
    <div css={ReadIndicatorContainer} className="read-indicator-wrapper">
      <button
        css={ReadIndicatorStyles(false)}
        onClick={() => onClick?.(message)}
        className="button-reset-default read-indicator"
        data-uie-name="status-message-read-receipts"
      >
        <div css={ReadReceiptText} data-uie-name="status-message-read-receipt-count">
          <Icon.ReadIcon /> {readReceiptCount}
        </div>
      </button>
    </div>
  );
};
