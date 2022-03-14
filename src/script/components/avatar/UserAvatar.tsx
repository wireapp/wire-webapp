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

import {AVATAR_SIZE, STATE} from '../Avatar';
import AvatarBackground from './AvatarBackground';
import AvatarImage from './AvatarImage';
import AvatarInitials from './AvatarInitials';
import AvatarBadge from './AvatarBadge';
import AvatarBorder from './AvatarBorder';
import AvatarWrapper from './AvatarWrapper';

export interface UserAvatarProps extends React.HTMLProps<HTMLDivElement> {
  avatarSize: AVATAR_SIZE;
  noBadge?: boolean;
  noFilter?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  participant: User;
  state: STATE;
}

export const shouldShowBadge = (size: AVATAR_SIZE, state: STATE): boolean => {
  const isTooSmall = [AVATAR_SIZE.X_SMALL, AVATAR_SIZE.XX_SMALL, AVATAR_SIZE.XXX_SMALL].includes(size);
  const isBadgeState = [STATE.PENDING, STATE.BLOCKED].includes(state);
  return !isTooSmall && isBadgeState;
};

const UserAvatar: React.FunctionComponent<UserAvatarProps> = ({
  participant,
  avatarSize,
  noBadge,
  noFilter,
  state,
  onClick,
  ...props
}) => {
  const isImageGrey = !noFilter && [STATE.BLOCKED, STATE.IGNORED, STATE.PENDING, STATE.UNKNOWN].includes(state);
  const backgroundColor = state === STATE.UNKNOWN ? COLOR.GRAY : undefined;
  return (
    <AvatarWrapper
      avatarSize={avatarSize}
      color={participant.accent_color()}
      data-uie-name="element-avatar-user"
      data-uie-value={participant.id}
      data-uie-status={state}
      onClick={onClick}
      title={participant.name()}
      {...props}
    >
      <AvatarBackground backgroundColor={backgroundColor} />
      <AvatarInitials avatarSize={avatarSize} initials={participant.initials()} />
      <AvatarImage
        avatarSize={avatarSize}
        avatarAlt={participant.name()}
        backgroundColor={backgroundColor}
        isGrey={isImageGrey}
        mediumPicture={participant.mediumPictureResource()}
        previewPicture={participant.previewPictureResource()}
      />
      {!noBadge && shouldShowBadge(avatarSize, state) && <AvatarBadge state={state} />}
      {!isImageGrey && <AvatarBorder />}
    </AvatarWrapper>
  );
};

export default UserAvatar;
