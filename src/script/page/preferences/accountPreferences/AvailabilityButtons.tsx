/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React from 'react';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import {Availability} from '@wireapp/protocol-messaging';

import {t} from 'Util/LocalizerUtil';
import {ContextMenuEntry} from '../../../ui/ContextMenu';

interface AvailabilityInputProps {
  availability: Availability.Type;
}

const AvailabilityButtons: React.FC<AvailabilityInputProps> = ({availability}) => {
  const entries: ContextMenuEntry[] = [
    {
      availability: Availability.Type.AVAILABLE,
      click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.AVAILABLE),
      label: t('userAvailabilityAvailable'),
    },
    {
      availability: Availability.Type.BUSY,
      click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.BUSY),
      label: t('userAvailabilityBusy'),
    },
    {
      availability: Availability.Type.AWAY,
      click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.AWAY),
      label: t('userAvailabilityAway'),
    },
    {
      availability: Availability.Type.NONE,
      click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.NONE),
      label: t('userAvailabilityNone'),
    },
  ];

  return (
    <div>
      {entries.map(item => (
        <button
          key={item.availability}
          style={{background: availability === item.availability && 'red'}}
          type="button"
          onClick={() => item.click()}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default AvailabilityButtons;
