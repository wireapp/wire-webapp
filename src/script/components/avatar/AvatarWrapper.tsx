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

import {CSS_SQUARE} from 'Util/CSSMixin';

import {DIAMETER, AVATAR_SIZE} from '../Avatar';

export interface AvatarWrapperProps extends React.HTMLProps<HTMLDivElement> {
  avatarSize: AVATAR_SIZE;
  color: string;
}

const AvatarWrapper: React.FunctionComponent<AvatarWrapperProps> = ({color, avatarSize, ...props}) => (
  <div
    css={{
      ...CSS_SQUARE(DIAMETER[avatarSize]),
      color,
      display: 'inline-block',
      overflow: 'hidden',
      position: 'relative',
      transform: 'translateZ(0)',
      userSelect: 'none',
    }}
    {...props}
  />
);

export default AvatarWrapper;
