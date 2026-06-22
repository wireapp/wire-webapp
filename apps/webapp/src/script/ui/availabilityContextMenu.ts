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

import {amplify} from 'amplify';

import {Availability} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {ContextMenuEntry, showContextMenu} from './contextMenu';

type AvailabilityLabels = {
  readonly none: string;
  readonly available: string;
  readonly busy: string;
  readonly away: string;
};

export const AvailabilityContextMenu = {
  show: (event: MouseEvent, elementName: string, labels: AvailabilityLabels): void => {
    const entries: ContextMenuEntry[] = [
      {
        click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.NONE),
        label: labels.none,
      },
      {
        click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.AVAILABLE),
        label: labels.available,
      },
      {
        click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.BUSY),
        label: labels.busy,
      },
      {
        click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.AWAY),
        label: labels.away,
      },
    ];

    showContextMenu({event, entries, identifier: elementName});
  },
};
