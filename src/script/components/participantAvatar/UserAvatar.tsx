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
import {COLOR} from '@wireapp/react-ui-kit';

import {User} from '../../entity/User';
import {AssetRepository} from '../../assets/AssetRepository';

import {AVATAR_SIZE, STATE} from '../ParticipantAvatarComponent';
import AvatarBackground from './AvatarBackground';
import AvatarImage from './AvatarImage';
import AvatarInitials from './AvatarInitials';
import AvatarBadge from './AvatarBadge';
import AvatarBorder from './AvatarBorder';

export interface UserAvatarProps {
  assetRepository: AssetRepository;
  noBadge?: boolean;
  noFilter?: boolean;
  participant: User;
  size: AVATAR_SIZE;
  state: STATE;
}

export const shouldShowBadge = (size: AVATAR_SIZE, state: STATE): boolean => {
  const isTooSmall = [AVATAR_SIZE.X_SMALL, AVATAR_SIZE.XX_SMALL, AVATAR_SIZE.XXX_SMALL].includes(size);
  const isBadgeState = [STATE.PENDING, STATE.BLOCKED].includes(state);
  return !isTooSmall && isBadgeState;
};

const UserAvatar: React.FunctionComponent<UserAvatarProps> = ({
  assetRepository,
  participant,
  size,
  noBadge,
  noFilter,
  state,
}) => {
  const isImageGrey = !noFilter && [STATE.BLOCKED, STATE.IGNORED, STATE.PENDING, STATE.UNKNOWN].includes(state);
  return (
    <>
      <AvatarBackground backgroundColor={state === STATE.UNKNOWN ? COLOR.GRAY : undefined} />
      <AvatarInitials size={size} initials={participant.initials()} />
      <AvatarImage assetRepository={assetRepository} participant={participant} size={size} isGrey={isImageGrey} />
      {!noBadge && shouldShowBadge(size, state) && <AvatarBadge state={state} />}
      {!isImageGrey && <AvatarBorder />}
    </>
  );
};

export default UserAvatar;
