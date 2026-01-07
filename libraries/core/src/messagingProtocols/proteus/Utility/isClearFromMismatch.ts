/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {MessageSendingStatus} from '@wireapp/api-client/lib/conversation';

const isClearFromMismatch = (mismatch: MessageSendingStatus): boolean => {
  const hasMissing = Object.keys(mismatch.missing || {}).length > 0;
  const hasDeleted = Object.keys(mismatch.deleted || {}).length > 0;
  const hasRedundant = Object.keys(mismatch.redundant || {}).length > 0;
  const hasFailed = Object.keys((mismatch as MessageSendingStatus).failed_to_send || {}).length > 0;
  return !hasMissing && !hasDeleted && !hasRedundant && !hasFailed;
};

export {isClearFromMismatch};
