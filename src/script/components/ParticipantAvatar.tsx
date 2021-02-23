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
import {AssetRepository} from '../assets/AssetRepository';
import {registerReactComponent} from 'Util/ComponentUtil';

import UserAvatar from './participantAvatar/UserAvatar';
import ServiceAvatar from './participantAvatar/ServiceAvatar';
import TemporaryGuestAvatar from './participantAvatar/TemporaryGuestAvatar';

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

export interface ParticipantAvatarProps extends React.HTMLProps<HTMLDivElement> {
  assetRepository: AssetRepository;
  avatarSize?: AVATAR_SIZE;
  noBadge?: boolean;
  noFilter?: boolean;
  onAvatarClick?: (participant: User, target: Node) => void;
  participant: User;
}

const ParticipantAvatar: React.FunctionComponent<ParticipantAvatarProps> = ({
  assetRepository,
  participant,
  onAvatarClick,
  noBadge = false,
  noFilter = false,
  avatarSize = AVATAR_SIZE.LARGE,
  ...props
}) => {
  const isUser = participant instanceof User && !participant.isService && !participant.isTemporaryGuest();
  const isService = participant instanceof ServiceEntity || participant.isService;
  const isTemporaryGuest = !isService && participant.isTemporaryGuest();

  const avatarState = (() => {
    switch (true) {
      case isService:
        return STATE.NONE;
      case participant.isMe:
        return STATE.SELF;
      case participant.isTeamMember():
        return STATE.NONE;
      case participant.isBlocked():
        return STATE.BLOCKED;
      case participant.isRequest():
        return STATE.PENDING;
      case participant.isIgnored():
        return STATE.IGNORED;
      case participant.isCanceled() || participant.isUnknown():
        return STATE.UNKNOWN;
      default:
        return STATE.NONE;
    }
  })();

  const clickHandler = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (typeof onAvatarClick === 'function') {
      onAvatarClick(participant, event.currentTarget.parentNode);
    }
  };

  if (isUser) {
    return (
      <UserAvatar
        assetRepository={assetRepository}
        avatarSize={avatarSize}
        noBadge={noBadge}
        noFilter={noFilter}
        onClick={clickHandler}
        participant={participant}
        state={avatarState}
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
    <ServiceAvatar
      assetRepository={assetRepository}
      avatarSize={avatarSize}
      onClick={clickHandler}
      participant={participant}
      {...props}
    />
  );
};

export default ParticipantAvatar;

registerReactComponent<ParticipantAvatarProps>('participant-avatar', {
  component: ParticipantAvatar,
  injected: {assetRepository: AssetRepository},
  optionalParams: ['avatarSize', 'onClick', 'noBadge', 'noFilter'],
  template:
    '<span data-bind="react: {assetRepository, participant: ko.unwrap(participant), avatarSize: size, onAvatarClick: onClick, noBadge, noFilter}"></span>',
});
