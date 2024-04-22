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

import {CSSObject} from '@emotion/react';

import {Availability as AvailabilityProp} from '@wireapp/protocol-messaging';

import {CSS_SQUARE} from 'Util/CSSMixin';

const availabilityStateColors: Partial<Record<AvailabilityProp.Type, string>> = {
  [AvailabilityProp.Type.AVAILABLE]: 'var(--green-500)',
  [AvailabilityProp.Type.AWAY]: 'var(--red-500)',
  [AvailabilityProp.Type.BUSY]: 'var(--amber-500)',
};

export const iconStyles = (availabilityState: AvailabilityProp.Type): CSSObject => ({
  ...CSS_SQUARE(8),
  fill: availabilityStateColors[availabilityState],
  stroke: availabilityStateColors[availabilityState],
  borderRadius: '50%',
});

export const AvailabilityIcon: CSSObject = {
  background: 'var(--white)',
  borderRadius: '50%',
  height: '12px',
  width: '12px',
  display: 'grid',
  placeContent: 'center',
};
