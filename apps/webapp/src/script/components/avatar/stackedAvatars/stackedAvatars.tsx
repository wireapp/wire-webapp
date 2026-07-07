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

import {Avatar, AVATAR_SIZE} from 'Components/avatar';
import type {User} from 'Repositories/entity/User';

import {getStackedAvatarDisplay} from './getStackedAvatarDisplay';
import {avatarItemStyles, overflowCountStyles, wrapperStyles} from './stackedAvatars.styles';

interface StackedAvatarsProps {
  participants: User[];
  avatarSize?: AVATAR_SIZE;
  avatarRingColor?: string;
  className?: string;
  dataUieName?: string;
}

export const StackedAvatars = ({
  participants,
  avatarSize = AVATAR_SIZE.X_SMALL,
  avatarRingColor = 'var(--text-input-background)',
  className,
  dataUieName = 'stacked-avatars',
}: StackedAvatarsProps) => {
  const {visibleCount, overflowCount} = getStackedAvatarDisplay(participants.length);
  const visibleParticipants = participants.slice(0, visibleCount);

  if (visibleParticipants.length === 0) {
    return null;
  }

  return (
    <div css={wrapperStyles} className={className} data-uie-name={dataUieName}>
      {visibleParticipants.map((participant, index) => (
        <div key={participant.id} css={avatarItemStyles(index, avatarRingColor)}>
          <Avatar
            participant={participant}
            avatarSize={avatarSize}
            hideAvailabilityStatus
            noBadge
            className="cursor-default"
          />
        </div>
      ))}
      {overflowCount > 0 && <span css={overflowCountStyles}>+{overflowCount}</span>}
    </div>
  );
};
