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

import {COLOR} from '@wireapp/react-ui-kit';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {AvatarBackground} from './AvatarBackground';
import {AvatarBadge} from './AvatarBadge';
import {AvatarBorder} from './AvatarBorder';
import {AvatarImage} from './AvatarImage';
import {AvatarInitials} from './AvatarInitials';
import {AvatarWrapper} from './AvatarWrapper';

import {User} from '../../entity/User';

import {AVATAR_SIZE, STATE} from '.';

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
}

export const shouldShowBadge = (size: AVATAR_SIZE, state: STATE): boolean => {
  const isTooSmall = [AVATAR_SIZE.X_SMALL, AVATAR_SIZE.XX_SMALL, AVATAR_SIZE.XXX_SMALL].includes(size);
  const isBadgeState = [STATE.PENDING, STATE.BLOCKED].includes(state);
  return !isTooSmall && isBadgeState;
};

const UserAvatar: React.FunctionComponent<UserAvatarProps> = ({
  participant,
  avatarSize,
  avatarAlt = '',
  noBadge,
  noFilter,
  isResponsive = false,
  state,
  onAvatarInteraction,
  ...props
}) => {
  const isImageGrey = !noFilter && [STATE.BLOCKED, STATE.IGNORED, STATE.PENDING, STATE.UNKNOWN].includes(state);
  const backgroundColor = state === STATE.UNKNOWN ? COLOR.GRAY : undefined;
  const {
    mediumPictureResource,
    previewPictureResource,
    accent_color: accentColor,
    name,
    initials,
  } = useKoSubscribableChildren(participant, [
    'mediumPictureResource',
    'previewPictureResource',
    'accent_color',
    'name',
    'initials',
  ]);
  const avatarImgAlt = avatarAlt ? avatarAlt : `${t('userProfileImageAlt')} ${name}`;

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
      {!noBadge && shouldShowBadge(avatarSize, state) && <AvatarBadge state={state} />}

      {!isImageGrey && <AvatarBorder />}
    </AvatarWrapper>
  );
};

export {UserAvatar};
