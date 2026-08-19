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

import {getStackedAvatarDisplay} from 'Components/avatar';
import type {User} from 'Repositories/entity/User';

import {ParticipantAvatarTooltip} from './participantAvatarTooltip';
import {overflowCountStyles, wrapperStyles} from './stackedAvatars.styles';

import {AVATAR_SIZE} from '../avatar';

interface StackedAvatarsProps {
  participants: User[];
  getParticipantLabel?: (participant: User, name: string) => string;
  avatarSize?: AVATAR_SIZE;
  avatarRingColor?: string;
  className?: string;
  dataUieName?: string;
}

export const StackedAvatars = ({
  participants,
  getParticipantLabel,
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
        <ParticipantAvatarTooltip
          key={`${participant.id}-${participant.domain}`}
          participant={participant}
          getLabel={name => getParticipantLabel?.(participant, name) ?? name}
          index={index}
          avatarSize={avatarSize}
          avatarRingColor={avatarRingColor}
        />
      ))}
      {overflowCount > 0 && <span css={overflowCountStyles}>+{overflowCount}</span>}
    </div>
  );
};
