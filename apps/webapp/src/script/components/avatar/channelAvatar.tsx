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

import type {FunctionComponent} from 'react';

import {CSSObject} from '@emotion/react';

import {ChannelIcon} from '../../uiKit/dataDisplay/icon/channelIcon';
import {LockClosedIcon} from '../../uiKit/dataDisplay/icon/lockClosedIcon';
import {getChannelAvatarColors} from '../../util/avatarUtil';
import {CSS_SQUARE} from '../../util/cssMixin';

type ChannelAvatarSize = 'small' | 'large';

const channelAvatarSizeInPixels = 28;
const smallChannelAvatarSizeInPixels = 16;
const smallChannelAvatarBorderWidthInPixels = 0.5;
const channelAvatarBorderRadiusInPixels = 8;
const smallChannelAvatarBorderRadiusInPixels = 4;
const channelAvatarContentSizeInPixels = 26;
const channelAvatarContentBorderRadiusInPixels = 7;

const channelAvatarContainerCss = ({border, size}: {border: string; size: ChannelAvatarSize}): CSSObject => {
  return {
    ...CSS_SQUARE(size === 'small' ? smallChannelAvatarSizeInPixels : channelAvatarSizeInPixels),
    border: `${size === 'small' ? smallChannelAvatarBorderWidthInPixels : 1}px solid var(--${border})`,
    borderRadius: size === 'small' ? smallChannelAvatarBorderRadiusInPixels : channelAvatarBorderRadiusInPixels,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: size === 'small' ? 'hidden' : 'visible',
  };
};

const channelAvatarIconCss = ({
  color,
  background,
  size,
}: {
  color: string;
  background: string;
  size: ChannelAvatarSize;
}): CSSObject => {
  return {
    ...CSS_SQUARE(size === 'small' ? '100%' : channelAvatarContentSizeInPixels),
    backgroundColor: `var(--${background})`,
    color: `var(--${color})`,
    display: 'flex',
    flexWrap: 'wrap',
    overflow: 'hidden',
    borderRadius: size === 'small' ? 0 : channelAvatarContentBorderRadiusInPixels,
    justifyContent: 'center',
    alignContent: 'center',
  };
};

const channelAvatarLockIconCss: CSSObject = {
  color: 'var(--app-bg-secondary)',
  backgroundColor: 'var(--main-color)',
  position: 'absolute',
  width: '14px',
  height: '14px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: '3px',
  top: '18px',
  left: '18px',
};

const channelIconWidthInPixels = 16;
const smallChannelIconWidthInPixels = 10;

interface ChannelAvatarProps {
  className?: string;
  conversationID?: string;
  isLocked?: boolean;
  size?: ChannelAvatarSize;
}

export const ChannelAvatar: FunctionComponent<ChannelAvatarProps> = ({
  conversationID,
  className,
  isLocked = true,
  size = 'large',
}: ChannelAvatarProps) => {
  const colorPalette = getChannelAvatarColors(conversationID);
  return (
    <div className={className} css={channelAvatarContainerCss({border: colorPalette.border, size})}>
      <div
        css={channelAvatarIconCss({color: colorPalette.color, background: colorPalette.background, size})}
        data-uie-name="group-avatar-box-wrapper"
      >
        <ChannelIcon width={size === 'small' ? smallChannelIconWidthInPixels : channelIconWidthInPixels} />
      </div>
      {isLocked && (
        <div css={channelAvatarLockIconCss}>
          <LockClosedIcon />
        </div>
      )}
    </div>
  );
};
