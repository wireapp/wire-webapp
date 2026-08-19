/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {Tooltip} from '@wireapp/react-ui-kit';

import {Avatar, AVATAR_SIZE} from 'Components/avatar';
import {useUserName} from 'Components/UserName';
import type {User} from 'Repositories/entity/User';

import {avatarItemStyles} from './stackedAvatars.styles';

interface ParticipantAvatarTooltipProps {
  participant: User;
  getLabel?: (name: string) => string;
  index?: number;
  avatarSize: AVATAR_SIZE;
  avatarRingColor?: string;
}

export const ParticipantAvatarTooltip = ({
  participant,
  getLabel,
  index = 0,
  avatarSize,
  avatarRingColor,
}: ParticipantAvatarTooltipProps) => {
  const name = useUserName(participant);
  const label = getLabel ? getLabel(name) : name;

  return (
    <Tooltip body={label} css={avatarRingColor ? avatarItemStyles(index, avatarRingColor) : undefined}>
      <Avatar
        participant={participant}
        aria-label={label}
        // Prevent the avatar's native tooltip from duplicating the custom tooltip above.
        title={undefined}
        avatarSize={avatarSize}
        hideAvailabilityStatus
        noBadge
        className="cursor-default"
      />
    </Tooltip>
  );
};
