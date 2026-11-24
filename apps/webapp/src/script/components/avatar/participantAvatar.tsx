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

import {
  HTMLProps,
  MouseEvent as ReactMouseEvent,
  KeyboardEvent as ReactKeyBoardEvent,
  type FunctionComponent,
} from 'react';

import {AVATAR_SIZE, STATE} from './avatar';
import {PlaceholderAvatar} from './placeholderAvatar';
import {ServiceAvatar} from './serviceAvatar';
import {TemporaryGuestAvatar} from './temporaryGuestAvatar';
import {UserAvatar} from './userAvatar';

import {isAppOrServiceEntity} from '../../guards/Service';
import {User} from '../../repositories/entity/User';
import {ServiceEntity} from '../../repositories/integration/ServiceEntity';
import {useKoSubscribableChildren} from '../../util/componentUtil';
import {handleKeyDown, isKeyboardEvent, KEY} from '../../util/keyboardUtil';

interface AvatarProps extends HTMLProps<HTMLDivElement> {
  participant: User | ServiceEntity;
  avatarSize?: AVATAR_SIZE;
  avatarAlt?: string;
  noBadge?: boolean;
  noFilter?: boolean;
  isResponsive?: boolean;
  onAvatarClick?: (participant: User | ServiceEntity) => void;
  hideAvailabilityStatus?: boolean;
  hideProfilePicture?: boolean;
}

const Avatar: FunctionComponent<AvatarProps> = ({
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
  ): void => {
    const parentNode = event.currentTarget.parentNode;
    if (parentNode !== null) {
      if (isKeyboardEvent(event)) {
        handleKeyDown({
          event,
          callback: () => {
            return onAvatarClick?.(participant);
          },
          keys: [KEY.ENTER, KEY.SPACE],
        });
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

  if (isAppOrServiceEntity(participant)) {
    return (
      <ServiceAvatar avatarSize={avatarSize} participant={participant} onClick={handleAvatarInteraction} {...props} />
    );
  }

  if (!participant.isAvailable()) {
    return (
      <PlaceholderAvatar
        {...props}
        avatarSize={avatarSize}
        onClick={() => {
          return onAvatarClick?.(participant);
        }}
      />
    );
  }

  const isMe = participant.isMe;

  let avatarState = STATE.NONE;

  if (isMe) {
    avatarState = STATE.SELF;
  } else if (isTeamMember === true) {
    avatarState = STATE.NONE;
  } else if (isBlocked === true) {
    avatarState = STATE.BLOCKED;
  } else if (isRequest === true) {
    avatarState = STATE.PENDING;
  } else if (isIgnored === true) {
    avatarState = STATE.IGNORED;
  } else if (isCanceled === true || isUnknown === true) {
    avatarState = STATE.UNKNOWN;
  }

  if (isTemporaryGuest === true) {
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
