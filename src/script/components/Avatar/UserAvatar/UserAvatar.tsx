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

import React, {MouseEvent as ReactMouseEvent, KeyboardEvent as ReactKeyBoardEvent} from 'react';

import {container} from 'tsyringe';

import {Availability as AvailabilityType} from '@wireapp/protocol-messaging';
import {COLOR} from '@wireapp/react-ui-kit';

import {AvailabilityIcon} from 'Components/AvailabilityIcon';
import {useUserName} from 'Components/UserName';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {AVATAR_SIZE, STATE} from '../Avatar';
import {AvatarBackground} from '../AvatarBackground';
import {AvatarBadge} from '../AvatarBadge';
import {AvatarBorder} from '../AvatarBorder';
import {AvatarImage} from '../AvatarImage';
import {AvatarInitials} from '../AvatarInitials';
import {AvatarWrapper} from '../AvatarWrapper';

export interface UserAvatarProps extends React.HTMLProps<HTMLDivElement> {
  avatarSize: AVATAR_SIZE;
  avatarAlt?: string;
  noBadge?: boolean;
  noFilter?: boolean;
  isResponsive?: boolean;
  onAvatarInteraction?: (
    event: ReactMouseEvent<HTMLDivElement, MouseEvent> | ReactKeyBoardEvent<HTMLDivElement>,
  ) => void;
  participant: User;
  state: STATE;
  hideAvailabilityStatus?: boolean;
  teamState?: TeamState;
}

export const shouldShowBadge = (size: AVATAR_SIZE, state: STATE): boolean => {
  const isTooSmall = [AVATAR_SIZE.XX_SMALL, AVATAR_SIZE.XXX_SMALL].includes(size);
  const isBadgeState = [STATE.PENDING, STATE.BLOCKED].includes(state);
  return !isTooSmall && isBadgeState;
};

const getIconSize = (size: AVATAR_SIZE): string => {
  if (size === AVATAR_SIZE.X_LARGE) {
    return '116px';
  }

  return '16px';
};

export const UserAvatar = ({
  participant,
  avatarSize,
  avatarAlt = '',
  noBadge,
  noFilter,
  isResponsive = false,
  state,
  onAvatarInteraction,
  hideAvailabilityStatus = false,
  teamState = container.resolve(TeamState),
  ...props
}: UserAvatarProps) => {
  const isImageGrey = !noFilter && [STATE.BLOCKED, STATE.IGNORED, STATE.PENDING, STATE.UNKNOWN].includes(state);
  const isBlocked = state === STATE.BLOCKED;
  const backgroundColor = state === STATE.UNKNOWN ? COLOR.GRAY : undefined;
  const name = useUserName(participant);
  const {
    availability,
    mediumPictureResource,
    previewPictureResource,
    accent_color: accentColor,
    initials,
  } = useKoSubscribableChildren(participant, [
    'availability',
    'mediumPictureResource',
    'previewPictureResource',
    'accent_color',
    'initials',
  ]);

  const avatarImgAlt = avatarAlt ? avatarAlt : `${t('userProfileImageAlt')} ${name}`;

  const hasAvailabilityState = typeof availability === 'number' && availability !== AvailabilityType.Type.NONE;

  return (
    <AvatarWrapper
      avatarSize={avatarSize}
      color={accentColor}
      data-uie-name="element-avatar-user"
      data-uie-value={participant.id}
      data-uie-status={state}
      onClick={onAvatarInteraction}
      onKeyDown={onAvatarInteraction}
      title={name}
      isResponsive={isResponsive}
      {...props}
    >
      <AvatarBackground backgroundColor={backgroundColor} />

      {initials && <AvatarInitials avatarSize={avatarSize} initials={initials} />}
      <AvatarImage
        avatarSize={avatarSize}
        avatarAlt={avatarImgAlt}
        backgroundColor={backgroundColor}
        isGrey={isImageGrey}
        mediumPicture={mediumPictureResource}
        previewPicture={previewPictureResource}
      />
      {!noBadge && shouldShowBadge(avatarSize, state) && (
        <AvatarBadge state={state} iconSize={getIconSize(avatarSize)} />
      )}

      {(!isImageGrey || isBlocked) && <AvatarBorder isTransparent={!isBlocked} />}

      {!hideAvailabilityStatus && hasAvailabilityState && (
        <AvailabilityIcon availability={availability} avatarSize={avatarSize} />
      )}
    </AvatarWrapper>
  );
};
