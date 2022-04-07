/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import React, {useCallback, useEffect, useState} from 'react';

import {container} from 'tsyringe';
import {debounce} from 'underscore';

import {partition} from 'Util/ArrayUtil';
import {sortByPriority} from 'Util/StringUtil';

import type {User} from '../entity/User';
import {SearchRepository} from '../search/SearchRepository';
import type {TeamRepository} from '../team/TeamRepository';
import {validateHandle} from '../user/UserHandleGenerator';

import {UserState} from '../user/UserState';
import {ConversationState} from '../conversation/ConversationState';
import {registerStaticReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {TeamState} from '../team/TeamState';

import UserList from './UserList';
import {t} from 'Util/LocalizerUtil';

export type UserListProps = Omit<React.ComponentProps<typeof UserList>, 'users' | 'selectedUsers'> & {
  conversationState?: ConversationState;
  observables: {
    filter?: ko.Observable<string>;
    highlightedUsers?: ko.Observable<User[]>;
    selected?: ko.ObservableArray<User>;
    users: ko.ObservableArray<User>;
  };
  searchRepository: SearchRepository;
  selfFirst?: boolean;
  teamRepository: TeamRepository;
  teamState?: TeamState;
  truncate?: boolean;
  userState?: UserState;
};

const UserSearchableList: React.FC<UserListProps> = props => {
  const {searchRepository, teamRepository, observables, selfFirst, ...userListProps} = props;
  const {userState = container.resolve(UserState), conversationState = container.resolve(ConversationState)} = props;

  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [remoteTeamMembers, setRemoteTeamMembers] = useState<User[]>([]);

  const selfInTeam = userState.self().inTeam();
  const {
    users,
    selected: selectedUsers,
    filter = '',
    highlightedUsers,
  } = useKoSubscribableChildren(observables, ['users', 'selected', 'filter', 'highlightedUsers']);

  /**
   * Try to load additional members from the backend.
   * This is needed for large teams (>= 2000 members)
   */
  const fetchMembersFromBackend = useCallback(
    debounce(async (query: string, isHandle: boolean, ignoreMembers: User[]) => {
      const resultUsers = await searchRepository!.searchByName(query, isHandle);
      const selfTeamId = userState.self().teamId;
      const foundMembers = resultUsers.filter(user => user.teamId === selfTeamId);
      const ignoreIds = ignoreMembers.map(member => member.id);
      const uniqueMembers = foundMembers.filter(member => !ignoreIds.includes(member.id));

      // We shouldn't show any members that have the 'external' role and are not already locally known.
      const nonExternalMembers = await teamRepository.filterExternals(uniqueMembers);
      setRemoteTeamMembers(nonExternalMembers);
    }, 300),
    [],
  );

  // Filter all list items if a filter is provided

  useEffect(() => {
    const connectedUsers = conversationState.connectedUsers();
    let resultUsers = users.slice();
    const normalizedQuery = SearchRepository.normalizeQuery(filter);
    if (normalizedQuery) {
      const trimmedQuery = filter.trim();
      const isHandle = trimmedQuery.startsWith('@') && validateHandle(normalizedQuery);
      if (searchRepository) {
        const SEARCHABLE_FIELDS = SearchRepository.CONFIG.SEARCHABLE_FIELDS;
        const properties = isHandle ? [SEARCHABLE_FIELDS.USERNAME] : undefined;
        resultUsers = searchRepository.searchUserInSet(normalizedQuery, users, properties);
      }
      resultUsers = resultUsers.filter(
        user =>
          user.isMe ||
          connectedUsers.includes(user) ||
          teamRepository.isSelfConnectedTo(user.id) ||
          user.username() === normalizedQuery,
      );
      if (searchRepository && selfInTeam) {
        fetchMembersFromBackend(trimmedQuery, isHandle, resultUsers);
      }
    } else {
      resultUsers = users.filter(
        user => user.isMe || connectedUsers.includes(user) || teamRepository.isSelfConnectedTo(user.id),
      );
    }

    if (!selfFirst) {
      setFilteredUsers(resultUsers);
      return;
    }

    // make sure the self user is the first one in the list
    const [selfUser, otherUsers] = partition(resultUsers, user => user.isMe);
    setFilteredUsers(selfUser.concat(otherUsers));
  }, [filter, users.length]);

  const foundUserEntities = () => {
    if (!remoteTeamMembers.length) {
      return filteredUsers;
    }
    const normalizedQuery = SearchRepository.normalizeQuery(filter);
    return [...filteredUsers, ...remoteTeamMembers].sort((userA, userB) =>
      sortByPriority(userA.name(), userB.name(), normalizedQuery),
    );
  };

  const toggleUserSelection = (user: User) => {
    if (selectedUsers.find(selectedUser => selectedUser.id === user.id)) {
      observables.selected.remove(user);
    } else {
      observables.selected.push(user);
    }
  };

  const userList = foundUserEntities();

  if (userList.length === 0) {
    return users.length === 0 ? (
      <div className="user-list__no-results" data-uie-name="status-all-added">
        {t('searchListEveryoneParticipates')}
      </div>
    ) : (
      <div className="user-list__no-results" data-uie-name="status-no-matches">
        {t('searchListNoMatches')}
      </div>
    );
  }
  return (
    <UserList
      {...userListProps}
      users={foundUserEntities()}
      selectedUsers={selectedUsers}
      highlightedUsers={highlightedUsers}
      onSelectUser={observables.selected ? toggleUserSelection : undefined}
    />
  );
};

export default UserSearchableList;

registerStaticReactComponent('user-list', UserSearchableList);
