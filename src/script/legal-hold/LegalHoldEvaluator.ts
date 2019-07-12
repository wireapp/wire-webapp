/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {LegalHoldStatus} from '@wireapp/protocol-messaging';

type MappedEventData = {
  expects_read_confirmation?: boolean;
  legal_hold_status?: LegalHoldStatus;
};

// @see https://github.com/wearezeta/documentation/blob/master/topics/legal-hold/use-cases/009-receive-message.png
export const hasMessageLegalHoldFlag = (data: MappedEventData): boolean => {
  switch (data.legal_hold_status) {
    case LegalHoldStatus.DISABLED:
    case LegalHoldStatus.ENABLED:
      return true;
    default:
      return false;
  }
};

export const renderLegalHoldMessage = (data: MappedEventData, localState: LegalHoldStatus) => {
  if (typeof data.legal_hold_status === 'number') {
    return data.legal_hold_status !== localState;
  }
  return false;
};
