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

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {showUserModal} from 'Components/Modals/UserModal';
import {User} from 'Repositories/entity/User';

import {avatarWrapperStyles, textStyles, wrapperStyles} from './CellsTableOwnerColumn.styles';

interface CellsTableOwnerColumnProps {
  owner: string;
  user: User | null;
}

export const CellsTableOwnerColumn = ({owner, user}: CellsTableOwnerColumnProps) => {
  if (!user) {
    return <span css={textStyles}>{owner}</span>;
  }

  return (
    <button css={wrapperStyles} onClick={() => showUserModal(user.qualifiedId)}>
      <div css={avatarWrapperStyles}>
        <Avatar participant={user} avatarSize={AVATAR_SIZE.XXX_SMALL} />
      </div>
      <span css={textStyles}>{user.name()}</span>
    </button>
  );
};
