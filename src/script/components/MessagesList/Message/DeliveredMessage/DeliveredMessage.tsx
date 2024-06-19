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

import {OutlineCheck} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';
import {formatTimeShort} from 'Util/TimeUtil';

import {ReadReceipt} from '../../../../storage';

interface DeliveredMessageProps {
  isLastDeliveredMessage?: boolean;
  readReceipts?: ReadReceipt[];
}

export const DeliveredMessage = ({isLastDeliveredMessage = false, readReceipts = []}: DeliveredMessageProps) => {
  const readReceiptText = readReceipts.length ? formatTimeShort(readReceipts[0].time) : '';
  const showDeliveredMessageIcon = isLastDeliveredMessage && readReceiptText === '';

  if (!showDeliveredMessageIcon) {
    return null;
  }

  return (
    <div
      data-uie-name="status-message-read-receipt-delivered"
      title={t('conversationMessageDelivered')}
      className="delivered-message-icon"
    >
      <OutlineCheck />
    </div>
  );
};
