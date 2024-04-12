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

import {ReactNode} from 'react';

import {Availability as AvailabilityProp} from '@wireapp/protocol-messaging';

import {Icon} from 'Components/Icon';

import * as styles from './Availability.styles';

const availabilityIconBaseProps = {
  className: 'availability-state-icon',
  css: styles.iconStyles,
  'data-uie-name': 'status-availability-icon',
};

const availabilityIconRenderer: Record<AvailabilityProp.Type, ReactNode> = {
  [AvailabilityProp.Type.AVAILABLE]: (
    <Icon.AvailabilityAvailable {...availabilityIconBaseProps} data-uie-value="available" />
  ),
  [AvailabilityProp.Type.AWAY]: <Icon.AvailabilityAway {...availabilityIconBaseProps} data-uie-value="away" />,
  [AvailabilityProp.Type.BUSY]: <Icon.AvailabilityBusy {...availabilityIconBaseProps} data-uie-value="busy" />,
  [AvailabilityProp.Type.NONE]: null,
};

interface AvailabilityIconProps {
  availability: AvailabilityProp.Type;
}

export const AvailabilityIcon = ({availability}: AvailabilityIconProps) => (
  <div css={styles.AvailabilityIcon}>{availabilityIconRenderer[availability]}</div>
);
