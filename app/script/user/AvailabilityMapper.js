/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

z.user.AvailbilityMapper = (() => {
  const nameFromType = availabilityType => {
    switch (availabilityType) {
      case z.user.AvailabilityType.AVAILABLE:
        return z.l10n.text(z.string.user_availability_available);
      case z.user.AvailabilityType.AWAY:
        return z.l10n.text(z.string.user_availability_away);
      case z.user.AvailabilityType.BUSY:
        return z.l10n.text(z.string.user_availability_busy);
      case z.user.AvailabilityType.NONE:
        return z.l10n.text(z.string.user_availability_none);
      default:
    }
  };

  return {
    nameFromType,
  };
})();
