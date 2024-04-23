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

import {AVATAR_SIZE} from 'Components/Avatar';
import {Icon} from 'Components/Icon';

import * as styles from './Availability.styles';

const availabilityIconBaseProps = {
  'data-uie-name': 'status-availability-icon',
};

const availabilityIconRenderer: Record<AvailabilityProp.Type, (avatarSize: AVATAR_SIZE) => ReactNode> = {
  [AvailabilityProp.Type.AVAILABLE]: avatarSize => (
    <Icon.AvailabilityAvailable
      {...availabilityIconBaseProps}
      css={styles.iconStyles(AvailabilityProp.Type.AVAILABLE, avatarSize)}
      data-uie-value="available"
    />
  ),
  [AvailabilityProp.Type.AWAY]: avatarSize => (
    <Icon.AvailabilityAway
      {...availabilityIconBaseProps}
      css={styles.iconStyles(AvailabilityProp.Type.AWAY, avatarSize)}
      data-uie-value="away"
    />
  ),
  [AvailabilityProp.Type.BUSY]: avatarSize => (
    <Icon.AvailabilityBusy
      {...availabilityIconBaseProps}
      css={styles.iconStyles(AvailabilityProp.Type.BUSY, avatarSize)}
      data-uie-value="busy"
    />
  ),
  [AvailabilityProp.Type.NONE]: () => null,
};

interface AvailabilityIconProps {
  availability: AvailabilityProp.Type;
  avatarSize: AVATAR_SIZE;
}

export const AvailabilityIcon = ({availability, avatarSize}: AvailabilityIconProps) => (
  <div css={styles.AvailabilityIcon} data-uie-name="status-availability" data-uie-value={availability}>
    {availabilityIconRenderer[availability](avatarSize)}
  </div>
);
