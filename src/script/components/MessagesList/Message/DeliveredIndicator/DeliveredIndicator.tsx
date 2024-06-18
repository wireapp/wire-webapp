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

import {forwardRef, ForwardRefRenderFunction} from 'react';

import {DeliveryIndicatorStyles} from 'Components/MessagesList/Message/DeliveredIndicator/DeliveredIndicator.styles';
import {t} from 'Util/LocalizerUtil';

export interface DeliveredIndicatorProps {
  isLastDeliveredMessage: boolean;
}

const DeliveredIndicatorComponent: ForwardRefRenderFunction<HTMLDivElement, DeliveredIndicatorProps> = (
  {isLastDeliveredMessage},
  ref,
) => {
  return (
    <div
      css={DeliveryIndicatorStyles(isLastDeliveredMessage)}
      data-uie-name={isLastDeliveredMessage ? 'status-message-read-receipt-delivered' : undefined}
      ref={ref}
    >
      {t('conversationMessageDelivered')}
    </div>
  );
};

export const DeliveredIndicator = forwardRef(DeliveredIndicatorComponent);
DeliveredIndicator.displayName = 'DeliveredIndicator';
