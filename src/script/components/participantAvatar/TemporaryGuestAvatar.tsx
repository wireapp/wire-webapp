/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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
import {CSS_FILL_PARENT} from 'Util/CSSMixin';

import {User} from '../../entity/User';

import {AVATAR_SIZE, STATE, DIAMETER} from '../ParticipantAvatar';
import AvatarBackground from './AvatarBackground';
import AvatarInitials from './AvatarInitials';
import AvatarBadge from './AvatarBadge';
import AvatarBorder from './AvatarBorder';
import AvatarWrapper from './AvatarWrapper';
import {shouldShowBadge} from './UserAvatar';

export interface TemporaryGuestAvatarProps {
  noBadge?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  participant: User;
  size: AVATAR_SIZE;
  state: STATE;
}

const TemporaryGuestAvatar: React.FunctionComponent<TemporaryGuestAvatarProps> = ({
  size,
  participant,
  noBadge,
  state,
  onClick,
}) => {
  const borderScale = 0.9916;
  const finalBorderWidth = size === AVATAR_SIZE.X_LARGE ? 4 : 1;
  const remainingTime = participant.expirationRemaining();
  const normalizedRemainingTime = remainingTime / User.CONFIG.TEMPORARY_GUEST.LIFETIME;

  const borderWidth = (finalBorderWidth / DIAMETER[size]) * 32;
  const borderRadius = (16 - borderWidth / 2) * borderScale;
  const timerLength = borderRadius * Math.PI * 2;
  const timerOffset = timerLength * (normalizedRemainingTime - 1);

  return (
    <AvatarWrapper
      color="rgba(50,54,57,0.08)"
      title={participant.name()}
      size={size}
      onClick={onClick}
      data-uie-name="element-avatar-temporary-guest"
      data-uie-value={participant.id}
    >
      <AvatarBackground />
      <AvatarInitials color="var(--background)" size={size} initials={participant.initials()} />
      {!noBadge && shouldShowBadge(size, state) && <AvatarBadge state={state} />}
      <AvatarBorder />
      <svg
        css={{
          ...CSS_FILL_PARENT,
          position: 'absolute',
        }}
        data-uie-name="element-avatar-guest-expiration-circle"
        viewBox="0 0 32 32"
        stroke={participant.accent_color()}
      >
        <circle
          cx="16"
          cy="16"
          transform="rotate(-90 16 16)"
          fill="none"
          strokeDasharray={timerLength}
          strokeDashoffset={timerOffset}
          r={borderRadius}
          strokeWidth={borderWidth}
        />
      </svg>
    </AvatarWrapper>
  );
};

export default TemporaryGuestAvatar;
