/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {ChannelIcon, LockClosedIcon} from '@wireapp/react-ui-kit';

import {getChannelAvatarColors} from 'Util/avatarUtil';

import {channelAvatarContainerCss, channelAvatarIconCss, channelAvatarLockIconCss} from './ChannelAvatar.styles';

export interface ChannelAvatarProps {
  className?: string;
  conversationID?: string;
  isLocked?: boolean;
}

export const ChannelAvatar = ({conversationID, className, isLocked = true}: ChannelAvatarProps) => {
  const colorPalette = getChannelAvatarColors(conversationID);
  return (
    <div className={className} css={channelAvatarContainerCss(colorPalette.border)}>
      <div
        css={channelAvatarIconCss(colorPalette.color, colorPalette.background)}
        data-uie-name="group-avatar-box-wrapper"
      >
        <ChannelIcon />
      </div>
      {isLocked && (
        <div css={channelAvatarLockIconCss}>
          <LockClosedIcon />
        </div>
      )}
    </div>
  );
};
