/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {User} from 'Repositories/entity/user';

export const filterUsersByQuery = (users: User[], query: string): User[] => {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery === '') {
    return users;
  }

  return users.filter(user => {
    const name = user.name().toLowerCase();
    const handle = user.handle?.toLowerCase() ?? '';

    return name.includes(normalizedQuery) || handle.includes(normalizedQuery);
  });
};

export const toggleUserInSelection = (selectedUsers: User[], user: User): User[] => {
  const isSelected = selectedUsers.some(selectedUser => selectedUser.id === user.id);

  if (isSelected) {
    return selectedUsers.filter(selectedUser => selectedUser.id !== user.id);
  }

  return [...selectedUsers, user];
};
