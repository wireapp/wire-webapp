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

import type {ReactNode, MouseEvent, KeyboardEvent} from 'react';

import {CSS_SQUARE} from 'Util/CSSMixin';

import {DIAMETER, AVATAR_SIZE} from '.';

interface AvatarWrapperProps {
  avatarSize: AVATAR_SIZE;
  color: string;
  isResponsive?: boolean;
  children?: ReactNode;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  title?: string;
}

const AvatarWrapper = ({color, avatarSize, isResponsive = false, ...props}: AvatarWrapperProps) => {
  const avatarDiameter = isResponsive ? `${DIAMETER[avatarSize] / 16}rem` : DIAMETER[avatarSize];
  return (
    <div
      css={{
        ...CSS_SQUARE(avatarDiameter),
        color,
        display: 'inline-block',
        position: 'relative',
        transform: 'translateZ(0)',
        userSelect: 'none',
      }}
      role="button"
      {...props}
    />
  );
};

export {AvatarWrapper};
