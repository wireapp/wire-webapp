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

import {GroupIcon} from '@wireapp/react-ui-kit';

import {CSS_SQUARE} from 'Util/CSSMixin';

export interface GroupAvatarProps {
  className?: string;
}

export const GroupAvatar: React.FC<GroupAvatarProps> = ({className}) => {
  return (
    <div
      className={className}
      css={{
        ...CSS_SQUARE(32),
        border: '1px solid var(--border-color)',
        borderRadius: 6,
      }}
    >
      <div
        css={{
          ...CSS_SQUARE(28),
          backgroundColor: 'var(--group-icon-bg)',
          borderRadius: 5,
          display: 'flex',
          flexWrap: 'wrap',
          margin: 1,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        data-uie-name="group-avatar-box-wrapper"
      >
        <GroupIcon />
      </div>
    </div>
  );
};
