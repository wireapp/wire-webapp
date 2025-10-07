/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {Availability} from '@wireapp/protocol-messaging';

import {BaseError} from '../../error/BaseError';
import {UserError} from '../../error/UserError';

const AVAILABILITY_VALUES: Record<keyof typeof Availability.Type, string> = {
  AVAILABLE: 'available',
  AWAY: 'away',
  BUSY: 'busy',
  NONE: 'none',
};

const valueFromType = (availabilityType: Availability.Type): string => {
  const TYPE_VALUES = {
    [Availability.Type.AVAILABLE]: AVAILABILITY_VALUES.AVAILABLE,
    [Availability.Type.AWAY]: AVAILABILITY_VALUES.AWAY,
    [Availability.Type.BUSY]: AVAILABILITY_VALUES.BUSY,
    [Availability.Type.NONE]: AVAILABILITY_VALUES.NONE,
  };

  const value = TYPE_VALUES[availabilityType];
  if (value) {
    return value;
  }
  throw new UserError(BaseError.TYPE.INVALID_PARAMETER, BaseError.MESSAGE.INVALID_PARAMETER);
};

export const protoFromType = (availabilityType: Availability.Type) => {
  const typeValue = valueFromType(availabilityType).toUpperCase() as keyof typeof Availability.Type;
  return Availability.Type[typeValue];
};
