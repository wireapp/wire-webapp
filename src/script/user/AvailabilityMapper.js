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

import {t} from 'Util/LocalizerUtil';

import {AvailabilityType} from './AvailabilityType';

import {BaseError} from '../error/BaseError';

const AVAILABILITY_VALUES = {
  AVAILABLE: 'available',
  AWAY: 'away',
  BUSY: 'busy',
  NONE: 'none',
};

export const valueFromType = availabilityType => {
  const TYPE_VALUES = {
    [AvailabilityType.AVAILABLE]: AVAILABILITY_VALUES.AVAILABLE,
    [AvailabilityType.AWAY]: AVAILABILITY_VALUES.AWAY,
    [AvailabilityType.BUSY]: AVAILABILITY_VALUES.BUSY,
    [AvailabilityType.NONE]: AVAILABILITY_VALUES.NONE,
  };

  const value = TYPE_VALUES[availabilityType];
  if (value) {
    return value;
  }
  throw new z.error.UserError(BaseError.TYPE.INVALID_PARAMETER);
};

export const nameFromType = availabilityType => {
  const TYPE_STRINGS = {
    [AvailabilityType.AVAILABLE]: t('userAvailabilityAvailable'),
    [AvailabilityType.AWAY]: t('userAvailabilityAway'),
    [AvailabilityType.BUSY]: t('userAvailabilityBusy'),
    [AvailabilityType.NONE]: t('userAvailabilityNone'),
  };

  const string = TYPE_STRINGS[availabilityType];
  if (string) {
    return string;
  }
  throw new z.error.UserError(BaseError.TYPE.INVALID_PARAMETER);
};

export const protoFromType = availabilityType => {
  const typeValue = valueFromType(availabilityType).toUpperCase();
  return Availability.Type[typeValue];
};
