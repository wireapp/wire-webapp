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

import {FC} from 'react';

import {CSS_FILL_PARENT} from 'Util/CSSMixin';
import {getFirstChar} from 'Util/StringUtil';

import {AVATAR_SIZE, INITIALS_SIZE, DIAMETER} from '.';

interface AvatarInitialsProps {
  avatarSize: AVATAR_SIZE;
  initials: string;
  color?: string;
  isResponsive?: boolean;
}

const AvatarInitials: FC<AvatarInitialsProps> = ({avatarSize, initials, color = '#fff', isResponsive = false}) => (
  <div
    css={{
      ...CSS_FILL_PARENT,
      color,
      fontSize: isResponsive ? `${INITIALS_SIZE[avatarSize] / 16}rem` : `${INITIALS_SIZE[avatarSize]}px`,
      lineHeight: isResponsive ? `${DIAMETER[avatarSize] / 16}rem` : `${DIAMETER[avatarSize]}px`,
      textAlign: 'center',
      userSelect: 'none',
    }}
    data-uie-name="element-avatar-initials"
  >
    {avatarSize === AVATAR_SIZE.X_SMALL ? getFirstChar(initials) : initials}
  </div>
);

export {AvatarInitials};
