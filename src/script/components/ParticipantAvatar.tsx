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

export interface ParticipantAvatarProps {
  assetRepository: AssetRepository;
  clickHandler?: (participant: User, target: Node) => void;
  noBadge?: boolean;
  noFilter?: boolean;
  participant: User;
  size?: AVATAR_SIZE;
}

const ParticipantAvatar: React.FunctionComponent<ParticipantAvatarProps> = ({
  assetRepository,
  participant,
  clickHandler,
  noBadge = false,
  noFilter = false,
  size = AVATAR_SIZE.LARGE,
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

  const onClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (typeof clickHandler === 'function') {
      clickHandler(participant, (event.currentTarget as Node).parentNode);
    }
  };

  if (isUser) {
    return (
      <UserAvatar
        size={size}
        assetRepository={assetRepository}
        noBadge={noBadge}
        noFilter={noFilter}
        participant={participant}
        state={avatarState}
        onClick={onClick}
      />
    );
  }

  if (isTemporaryGuest) {
    return (
      <TemporaryGuestAvatar
        noBadge={noBadge}
        participant={participant}
        state={avatarState}
        size={size}
        onClick={onClick}
      />
    );
  }

  return <ServiceAvatar assetRepository={assetRepository} size={size} participant={participant} onClick={onClick} />;
};

export default ParticipantAvatar;

registerReactComponent('participant-avatar', {
  component: ParticipantAvatar,
  injected: {assetRepository: AssetRepository},
  optionalParams: ['size', 'click', 'noBadge', 'noFilter'],
  template:
    '<span data-bind="react: {assetRepository, participant: ko.unwrap(participant), size, clickHandler: click, noBadge, noFilter}"></span>',
});
