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
import {registerReactComponent} from 'Util/ComponentUtil';

import type {User} from '../../entity/User';

export interface GroupAvatarProps {
  users: User[];
}

const GroupAvatar: React.FC<GroupAvatarProps> = ({users}) => {
  const slicedUsers = users.slice(0, 4);

  return (
    <div className="group-avatar-box-wrapper" data-uie-name="group-avatar-box-wrapper">
      {slicedUsers.map(user => (
        <div key={user.id} className="group-avatar-box" css={{color: user.accent_color()}}>
          {Array.from(user.initials())[0]}
        </div>
      ))}
    </div>
  );
};

export default GroupAvatar;

registerReactComponent('group-avatar', {
  component: GroupAvatar,
  template: '<div class="group-avatar" data-bind="react: {users: ko.unwrap(users)}"></div>',
});
