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

import {CSS_FILL_PARENT, CSS_FLEX_CENTER, CSS_ICON} from 'Util/CSSMixin';

import {STATE} from '.';

interface AvatarBadgeProps {
  state: STATE;
  iconSize?: string;
}

const AvatarBadge: React.FunctionComponent<AvatarBadgeProps> = ({state, iconSize = '16px'}) => {
  const icons: Record<string, string> = {
    [STATE.PENDING]: '\\e165',
    [STATE.BLOCKED]: '\\e104',
  };

  const defaultBackgroundColor = 'rgba(0, 0, 0, .56)';
  const backgroundColor: Record<string, string> = {
    [STATE.BLOCKED]: 'var(--white)',
  };

  const defaultColor = 'var(--white)';
  const color: Record<string, string> = {
    [STATE.BLOCKED]: 'var(--gray-70)',
  };

  return (
    <div
      css={{
        ...CSS_FILL_PARENT,
        ...CSS_FLEX_CENTER,
        '&::before': {
          ...CSS_ICON(icons[state], iconSize),
        },
        backgroundColor: backgroundColor[state] || defaultBackgroundColor,
        borderRadius: '50%',
        color: color[state] || defaultColor,
      }}
      data-uie-name="element-avatar-user-badge-icon"
      data-uie-value={state}
    />
  );
};

export {AvatarBadge};
