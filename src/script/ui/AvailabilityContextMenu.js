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

import {t} from 'Util/LocalizerUtil';

import {AvailabilityType} from '../user/AvailabilityType';
import {WebAppEvents} from '../event/WebApp';
import {Context} from '../ui/ContextMenu';

export const AvailabilityContextMenu = {
  show: (event, method, elementName) => {
    const entries = [
      {
        click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, AvailabilityType.NONE, method),
        label: t('userAvailabilityNone'),
      },
      {
        click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, AvailabilityType.AVAILABLE, method),
        label: t('userAvailabilityAvailable'),
      },
      {
        click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, AvailabilityType.BUSY, method),
        label: t('userAvailabilityBusy'),
      },
      {
        click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, AvailabilityType.AWAY, method),
        label: t('userAvailabilityAway'),
      },
    ];

    Context.from(event, entries, elementName);
  },
};
