/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {User} from 'Repositories/entity/User';

interface InputBarAvatarProps {
  selfUser: User;
}

export const InputBarAvatar = ({selfUser}: InputBarAvatarProps) => {
  return (
    <div className="input-bar-avatar">
      <Avatar
        className="cursor-default"
        participant={selfUser}
        avatarSize={AVATAR_SIZE.X_SMALL}
        hideAvailabilityStatus
      />
    </div>
  );
};
