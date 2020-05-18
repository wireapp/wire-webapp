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
import {WebAppEvents} from '@wireapp/webapp-events';
import {Availability} from '@wireapp/protocol-messaging';

import {t} from 'Util/LocalizerUtil';

import {Context, ContextMenuEntry} from './ContextMenu';

export const AvailabilityContextMenu = {
  show: (event: MouseEvent, method: string, elementName: string): void => {
    const entries: ContextMenuEntry[] = [
      {
        click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.NONE, method),
        label: t('userAvailabilityNone'),
      },
      {
        click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.AVAILABLE, method),
        label: t('userAvailabilityAvailable'),
      },
      {
        click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.BUSY, method),
        label: t('userAvailabilityBusy'),
      },
      {
        click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.AWAY, method),
        label: t('userAvailabilityAway'),
      },
    ];

    Context.from(event, entries, elementName);
  },
};
