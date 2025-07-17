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

import {HTMLProps, MouseEvent as ReactMouseEvent, KeyboardEvent as ReactKeyBoardEvent} from 'react';

import {User} from 'Repositories/entity/User';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown, isKeyboardEvent, KEY} from 'Util/KeyboardUtil';

import {PlaceholderAvatar} from './PlaceholderAvatar';
import {ServiceAvatar} from './ServiceAvatar';
import {TemporaryGuestAvatar} from './TemporaryGuestAvatar';
import {UserAvatar} from './UserAvatar';

import {isServiceEntity} from '../../guards/Service';

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
  [AVATAR_SIZE.LARGE]: 24,
  [AVATAR_SIZE.MEDIUM]: 16,
  [AVATAR_SIZE.SMALL]: 11,
  [AVATAR_SIZE.X_LARGE]: 32,
  [AVATAR_SIZE.X_SMALL]: 11,
  [AVATAR_SIZE.XX_SMALL]: 11,
  [AVATAR_SIZE.XXX_SMALL]: 8,
};

export interface AvatarProps extends HTMLProps<HTMLDivElement> {
  participant: User | ServiceEntity;
  avatarSize?: AVATAR_SIZE;
  avatarAlt?: string;
  noBadge?: boolean;
  noFilter?: boolean;
  isResponsive?: boolean;
  onAvatarClick?: (participant: User | ServiceEntity) => void;
  hideAvailabilityStatus?: boolean;
}

const Avatar = ({
  avatarSize = AVATAR_SIZE.LARGE,
  noBadge = false,
  noFilter = false,
  onAvatarClick,
  participant,
  isResponsive = false,
  ...props
}: AvatarProps) => {
  const handleAvatarInteraction = (
    event: ReactMouseEvent<HTMLDivElement, MouseEvent> | ReactKeyBoardEvent<HTMLDivElement>,
  ) => {
    const parentNode = event.currentTarget.parentNode;
    if (parentNode) {
      if (isKeyboardEvent(event)) {
        handleKeyDown({event, callback: () => onAvatarClick?.(participant), keys: [KEY.ENTER, KEY.SPACE]});
        return;
      }
      onAvatarClick?.(participant);
    }
  };

  const {isTemporaryGuest, isTeamMember, isBlocked, isRequest, isIgnored, isCanceled, isUnknown} =
    // @ts-ignore
    useKoSubscribableChildren(participant, [
      'isTemporaryGuest',
      'isTeamMember',
      'isBlocked',
      'isRequest',
      'isIgnored',
      'isCanceled',
      'isUnknown',
    ]);

  if (isServiceEntity(participant)) {
    return (
      <ServiceAvatar avatarSize={avatarSize} participant={participant} onClick={handleAvatarInteraction} {...props} />
    );
  }

  if (!participant.isAvailable()) {
    return <PlaceholderAvatar {...props} avatarSize={avatarSize} onClick={() => onAvatarClick?.(participant)} />;
  }

  const isMe = participant?.isMe;

  let avatarState = STATE.NONE;

  if (isMe) {
    avatarState = STATE.SELF;
  } else if (isTeamMember) {
    avatarState = STATE.NONE;
  } else if (isBlocked) {
    avatarState = STATE.BLOCKED;
  } else if (isRequest) {
    avatarState = STATE.PENDING;
  } else if (isIgnored) {
    avatarState = STATE.IGNORED;
  } else if (isCanceled || isUnknown) {
    avatarState = STATE.UNKNOWN;
  }

  if (isTemporaryGuest) {
    return (
      <TemporaryGuestAvatar
        avatarSize={avatarSize}
        noBadge={noBadge}
        onClick={handleAvatarInteraction}
        participant={participant}
        isResponsive={isResponsive}
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
      onAvatarInteraction={handleAvatarInteraction}
      participant={participant}
      isResponsive={isResponsive}
      state={avatarState}
      {...props}
    />
  );
};

export {Avatar};
