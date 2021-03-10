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

import ko from 'knockout';
import React, {useEffect, useState} from 'react';

import {User} from '../entity/User';
import {ServiceEntity} from '../integration/ServiceEntity';
import {registerReactComponent, useKoSubscribable} from 'Util/ComponentUtil';

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
  const [avatarState, setAvatarState] = useState(STATE.NONE);
  const user = participant as User;

  const isTemporaryGuest = useKoSubscribable(user.isTemporaryGuest ?? ko.observable(false));
  const isTeamMember = useKoSubscribable(user.isTeamMember ?? ko.observable(false));
  const isBlocked = useKoSubscribable(user.isBlocked ?? ko.observable(false));
  const isRequest = useKoSubscribable(user.isRequest ?? ko.observable(false));
  const isIgnored = useKoSubscribable(user.isIgnored ?? ko.observable(false));
  const isCanceled = useKoSubscribable(user.isCanceled ?? ko.observable(false));
  const isUnknown = useKoSubscribable(user.isUnknown ?? ko.observable(false));
  const isMe = user.isMe;

  const clickHandler = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    onAvatarClick?.(participant, event.currentTarget.parentNode);
  };

  useEffect(() => {
    if (isMe) {
      setAvatarState(STATE.SELF);
    } else if (isTeamMember) {
      setAvatarState(STATE.NONE);
    } else if (isBlocked) {
      setAvatarState(STATE.BLOCKED);
    } else if (isRequest) {
      setAvatarState(STATE.PENDING);
    } else if (isIgnored) {
      setAvatarState(STATE.IGNORED);
    } else if (isCanceled || isUnknown) {
      setAvatarState(STATE.UNKNOWN);
    }
  }, [participant, isTemporaryGuest, isTeamMember, isBlocked, isRequest, isIgnored, isCanceled, isUnknown]);

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

  if (isTemporaryGuest) {
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

registerReactComponent('participant-avatar', {
  component: Avatar,
  optionalParams: ['avatarSize', 'onAvatarClick', 'noBadge', 'noFilter'],
  template:
    '<span data-bind="react: {participant: ko.unwrap(participant), avatarSize: size, onAvatarClick, noBadge, noFilter}"></span>',
});
