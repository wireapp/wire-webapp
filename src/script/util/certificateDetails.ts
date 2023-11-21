/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {WireIdentity} from '@wireapp/core/lib/messagingProtocols/mls';

import {MLSStatuses} from 'Components/VerificationBadge';

type CoreStatus = WireIdentity['status'];
const statusMap: Record<CoreStatus, MLSStatuses> = {
  0: MLSStatuses.VALID,
  1: MLSStatuses.EXPIRED,
  2: MLSStatuses.EXPIRED,
};

export const mapMLSStatus = (status?: CoreStatus) => {
  if (!status) {
    return MLSStatuses.NOT_DOWNLOADED;
  }
  return statusMap[status];
};
