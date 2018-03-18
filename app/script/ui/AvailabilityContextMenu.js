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
window.z.ui = z.ui || {};

z.ui.AvailabilityContextMenu = {
  show: (event, method, elementName) => {
    const entries = [
      {
        click: () => amplify.publish(z.event.WebApp.USER.SET_AVAILABILITY, z.user.AvailabilityType.NONE, method),
        label: z.l10n.text(z.string.userAvailabilityNone),
        title: z.l10n.text(z.string.userAvailabilityNone),
      },
      {
        click: () => amplify.publish(z.event.WebApp.USER.SET_AVAILABILITY, z.user.AvailabilityType.AVAILABLE, method),
        label: z.l10n.text(z.string.userAvailabilityAvailable),
        title: z.l10n.text(z.string.userAvailabilityAvailable),
      },
      {
        click: () => amplify.publish(z.event.WebApp.USER.SET_AVAILABILITY, z.user.AvailabilityType.BUSY, method),
        label: z.l10n.text(z.string.userAvailabilityBusy),
        title: z.l10n.text(z.string.userAvailabilityBusy),
      },
      {
        click: () => amplify.publish(z.event.WebApp.USER.SET_AVAILABILITY, z.user.AvailabilityType.AWAY, method),
        label: z.l10n.text(z.string.userAvailabilityAway),
        title: z.l10n.text(z.string.userAvailabilityAway),
      },
    ];

    z.ui.Context.from(event, entries, elementName);
  },
};
