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
import {AVATAR_SIZE} from 'Components/Avatar';
import {CSS_SQUARE} from 'Util/CSSMixin';

import {Availability as AvailabilityProp} from '@wireapp/protocol-messaging';

const availabilityStateColors: Partial<Record<AvailabilityProp.Type, string>> = {
  [AvailabilityProp.Type.AVAILABLE]: 'var(--green-500)',
  [AvailabilityProp.Type.AWAY]: 'var(--red-500)',
  [AvailabilityProp.Type.BUSY]: 'var(--amber-500)',
};

const getSquareIconSize = (): Partial<Record<AVATAR_SIZE, number>> => ({
  [AVATAR_SIZE.X_SMALL]: 6,
  [AVATAR_SIZE.SMALL]: 7,
  [AVATAR_SIZE.MEDIUM]: 10,
  [AVATAR_SIZE.LARGE]: 12,
});

export const iconStyles = (availabilityState: AvailabilityProp.Type, avatarSize: AVATAR_SIZE): CSSObject => {
  const squareIconSize = getSquareIconSize();

  return {
    ...CSS_SQUARE(squareIconSize?.[avatarSize] || 8),
    fill: availabilityStateColors[availabilityState],
    stroke: availabilityStateColors[availabilityState],
    borderRadius: '50%',
  };
};

export const AvailabilityIcon: CSSObject = {
  background: 'var(--app-bg)',
  border: '2px solid var(--app-bg)',
  borderRadius: '50%',
  display: 'grid',
  placeContent: 'center',
  position: 'absolute',
  bottom: '-2px',
  right: '-2px',
};
