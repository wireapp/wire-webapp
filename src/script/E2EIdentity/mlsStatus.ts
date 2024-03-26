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

import {DeviceStatus} from '@wireapp/core/lib/messagingProtocols/mls';

export enum MLSStatuses {
  VALID = 'valid',
  NOT_ACTIVATED = 'not_activated',
  EXPIRED = 'expired',
  EXPIRES_SOON = 'expires_soon',
  REVOKED = 'revoked',
}

const statusMap: Record<DeviceStatus, MLSStatuses> = {
  [DeviceStatus.Valid]: MLSStatuses.VALID,
  [DeviceStatus.Expired]: MLSStatuses.EXPIRED,
  [DeviceStatus.Revoked]: MLSStatuses.REVOKED,
};

export const mapMLSStatus = (status?: DeviceStatus) => {
  return !status ? MLSStatuses.NOT_ACTIVATED : statusMap[status];
};
