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

'use strict';

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
      const TYPE_STRING_IDS = {
        [z.user.AvailabilityType.AVAILABLE]: z.string.userAvailabilityAvailable,
        [z.user.AvailabilityType.AWAY]: z.string.userAvailabilityAway,
        [z.user.AvailabilityType.BUSY]: z.string.userAvailabilityBusy,
        [z.user.AvailabilityType.NONE]: z.string.userAvailabilityNone,
      };

      const stringId = TYPE_STRING_IDS[availabilityType];
      if (stringId) {
        return z.l10n.text(stringId);
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
