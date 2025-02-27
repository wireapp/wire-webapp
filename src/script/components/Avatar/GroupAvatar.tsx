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

import {CSS_SQUARE, CSS_FLEX_CENTER} from 'Util/CSSMixin';

import type {User} from '../../entity/User';

export interface GroupAvatarProps {
  className?: string;
  users: User[];
}

export const GroupAvatar: React.FC<GroupAvatarProps> = ({users, className}) => {
  const slicedUsers = users.slice(0, 4);

  return (
    <div
      className={className}
      css={{
        ...CSS_SQUARE(32),
        border: '1px solid var(--text-input-placeholder)',
        borderRadius: 6,
      }}
    >
      <div
        css={{
          ...CSS_SQUARE(28),
          backgroundColor: 'var(--app-bg)',
          borderRadius: 5,
          display: 'flex',
          flexWrap: 'wrap',
          margin: 1,
          overflow: 'hidden',
        }}
        data-uie-name="group-avatar-box-wrapper"
      >
        {slicedUsers.map(user => (
          <div
            key={user.id}
            className="group-avatar-box"
            css={{
              ...CSS_FLEX_CENTER,
              ...CSS_SQUARE(14),
              color: user.accent_color(),
              flex: '0 0 auto',
              fontSize: 9,
              fontWeight: 900,
            }}
          >
            {Array.from(user.initials())[0]}
          </div>
        ))}
      </div>
    </div>
  );
};
