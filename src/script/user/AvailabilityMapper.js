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

import {t} from 'utils/LocalizerUtil';

window.z = window.z || {};
window.z.user = z.user || {};

z.user.AvailabilityMapper = (() => {
  const AVAILABILITY_VALUES = {
    AVAILABLE: 'available',
    AWAY: 'away',
    BUSY: 'busy',
    NONE: 'none',
  };

  const valueFromType = availabilityType => {
    const TYPE_VALUES = {
      [z.user.AvailabilityType.AVAILABLE]: AVAILABILITY_VALUES.AVAILABLE,
      [z.user.AvailabilityType.AWAY]: AVAILABILITY_VALUES.AWAY,
      [z.user.AvailabilityType.BUSY]: AVAILABILITY_VALUES.BUSY,
      [z.user.AvailabilityType.NONE]: AVAILABILITY_VALUES.NONE,
    };

    const value = TYPE_VALUES[availabilityType];
    if (value) {
      return value;
    }
    throw new z.error.UserError(z.error.BaseError.TYPE.INVALID_PARAMETER);
  };

  return {
    nameFromType: availabilityType => {
      const TYPE_STRINGS = {
        [z.user.AvailabilityType.AVAILABLE]: t('userAvailabilityAvailable'),
        [z.user.AvailabilityType.AWAY]: t('userAvailabilityAway'),
        [z.user.AvailabilityType.BUSY]: t('userAvailabilityBusy'),
        [z.user.AvailabilityType.NONE]: t('userAvailabilityNone'),
      };

      const string = TYPE_STRINGS[availabilityType];
      if (string) {
        return string;
      }
      throw new z.error.UserError(z.error.BaseError.TYPE.INVALID_PARAMETER);
    },
    protoFromType: availabilityType => {
      const typeValue = valueFromType(availabilityType).toUpperCase();
      return z.proto.Availability.Type[typeValue];
    },
    valueFromType,
  };
})();
