/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {CSSObject} from '@emotion/serialize';

import {Availability} from '@wireapp/protocol-messaging';

import * as Icon from 'Components/Icon';
import {CSS_SQUARE} from 'Util/CSSMixin';

const iconStyles: CSSObject = {
  ...CSS_SQUARE(10),
  fill: 'currentColor',
  margin: '0 6px 1px 0',
  minWidth: 10,
  stroke: 'currentColor',
};

export const availabilityStatus: {
  [key: string]: any;
} = {
  [Availability.Type.AVAILABLE]: (
    <Icon.AvailabilityAvailableIcon
      css={{...iconStyles, fill: 'var(--green-500)', stroke: 'var(--green-500)'}}
      data-uie-name="status-availability-icon"
      data-uie-value="available"
    />
  ),
  [Availability.Type.BUSY]: (
    <Icon.AvailabilityBusyIcon
      css={{...iconStyles, fill: 'var(--amber-500)', stroke: 'var(--amber-500)'}}
      data-uie-name="status-availability-icon"
      data-uie-value="busy"
    />
  ),
  [Availability.Type.AWAY]: (
    <Icon.AvailabilityAwayIcon
      css={{...iconStyles, fill: 'var(--red-500)', stroke: 'var(--red-500)'}}
      data-uie-name="status-availability-icon"
      data-uie-value="away"
    />
  ),
  [Availability.Type.NONE]: null,
};

type AvailabilityTransaltionValues = `availability.${'available' | 'busy' | 'away' | 'none'}`;

export const availabilityTranslationKeys: Record<Availability.Type, AvailabilityTransaltionValues> = {
  [Availability.Type.AVAILABLE]: 'availability.available',
  [Availability.Type.BUSY]: 'availability.busy',
  [Availability.Type.AWAY]: 'availability.away',
  [Availability.Type.NONE]: 'availability.none',
};
