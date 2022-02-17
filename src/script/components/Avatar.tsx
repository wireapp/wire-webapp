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

import {User} from '../entity/User';
import {ServiceEntity} from '../integration/ServiceEntity';
import {registerStaticReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';

import UserAvatar from './avatar/UserAvatar';
import ServiceAvatar from './avatar/ServiceAvatar';
import TemporaryGuestAvatar from './avatar/TemporaryGuestAvatar';

export enum AVATAR_SIZE {
  LARGE = 'avatar-l',
  MEDIUM = 'avatar-m',
  SMALL = 'avatar-s',
  X_LARGE = 'avatar-xl',
  X_SMALL = 'avatar-xs',
  XX_SMALL = 'avatar-xxs',
  XXX_SMALL = 'avatar-xxxs',
}

export enum STATE {
  BLOCKED = 'blocked',
  IGNORED = 'ignored',
  NONE = '',
  PENDING = 'pending',
  SELECTED = 'selected',
  SELF = 'self',
  UNKNOWN = 'unknown',
}

export const DIAMETER = {
  [AVATAR_SIZE.LARGE]: 72,
  [AVATAR_SIZE.MEDIUM]: 40,
  [AVATAR_SIZE.SMALL]: 28,
  [AVATAR_SIZE.X_LARGE]: 200,
  [AVATAR_SIZE.X_SMALL]: 24,
  [AVATAR_SIZE.XX_SMALL]: 20,
  [AVATAR_SIZE.XXX_SMALL]: 16,
};

export const INITIALS_SIZE = {
  [AVATAR_SIZE.LARGE]: '24px',
  [AVATAR_SIZE.MEDIUM]: '16px',
  [AVATAR_SIZE.SMALL]: '11px',
  [AVATAR_SIZE.X_LARGE]: '32px',
  [AVATAR_SIZE.X_SMALL]: '11px',
  [AVATAR_SIZE.XX_SMALL]: '11px',
  [AVATAR_SIZE.XXX_SMALL]: '8px',
};

export interface AvatarProps extends React.HTMLProps<HTMLDivElement> {
  avatarSize?: AVATAR_SIZE;
  noBadge?: boolean;
  noFilter?: boolean;
  onAvatarClick?: (participant: User | ServiceEntity, target: Node) => void;
  participant: User | ServiceEntity;
}

const Avatar: React.FunctionComponent<AvatarProps> = ({
  avatarSize = AVATAR_SIZE.LARGE,
  noBadge = false,
  noFilter = false,
  onAvatarClick,
  participant,
  ...props
}) => {
  const user = useKoSubscribableChildren(participant as User, [
    'isTemporaryGuest',
    'isTeamMember',
    'isBlocked',
    'isRequest',
    'isIgnored',
    'isCanceled',
    'isUnknown',
  ]);
  const isMe = (participant as User).isMe;

  const clickHandler = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    onAvatarClick?.(participant, event.currentTarget.parentNode);
  };

  if (participant instanceof ServiceEntity || participant.isService) {
    return (
      <ServiceAvatar
        avatarSize={avatarSize}
        participant={participant as ServiceEntity}
        onClick={clickHandler}
        {...props}
      />
    );
  }

  let avatarState = STATE.NONE;

  if (isMe) {
    avatarState = STATE.SELF;
  } else if (user.isTeamMember) {
    avatarState = STATE.NONE;
  } else if (user.isBlocked) {
    avatarState = STATE.BLOCKED;
  } else if (user.isRequest) {
    avatarState = STATE.PENDING;
  } else if (user.isIgnored) {
    avatarState = STATE.IGNORED;
  } else if (user.isCanceled || user.isUnknown) {
    avatarState = STATE.UNKNOWN;
  }

  if (user.isTemporaryGuest) {
    return (
      <TemporaryGuestAvatar
        avatarSize={avatarSize}
        noBadge={noBadge}
        onClick={clickHandler}
        participant={participant}
        state={avatarState}
        {...props}
      />
    );
  }

  return (
    <UserAvatar
      avatarSize={avatarSize}
      noBadge={noBadge}
      noFilter={noFilter}
      onClick={clickHandler}
      participant={participant}
      state={avatarState}
      {...props}
    />
  );
};

export default Avatar;
registerStaticReactComponent('participant-avatar', Avatar);
