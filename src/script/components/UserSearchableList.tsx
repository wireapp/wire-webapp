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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {container} from 'tsyringe';
import {debounce} from 'underscore';

import {partition} from 'Util/ArrayUtil';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {sortByPriority} from 'Util/StringUtil';

import {UserList} from './UserList';

import {ConversationState} from '../conversation/ConversationState';
import type {User} from '../entity/User';
import {SearchRepository} from '../search/SearchRepository';
import type {TeamRepository} from '../team/TeamRepository';
import {TeamState} from '../team/TeamState';
import {validateHandle} from '../user/UserHandleGenerator';
import {UserState} from '../user/UserState';

export type UserListProps = React.ComponentProps<typeof UserList> & {
  conversationState?: ConversationState;
  highlightedUsers?: User[];
  users: User[];
  filter?: string;
  selected?: User[];
  onUpdateSelectedUsers?: (updatedUsers: User[]) => void;
  searchRepository: SearchRepository;
  selfFirst?: boolean;
  teamRepository: TeamRepository;
  teamState?: TeamState;
  truncate?: boolean;
  userState?: UserState;
  dataUieName?: string;
  /** will prevent showing those users in the list */
  excludeUsers?: QualifiedId[];
  /** will do an extra request to the server when user types in (otherwise will only lookup given local users) */
  allowRemoteSearch?: boolean;
};

const UserSearchableList: React.FC<UserListProps> = ({
  onUpdateSelectedUsers,
  dataUieName = '',
  filter = '',
  highlightedUsers,
  selected: selectedUsers,
  allowRemoteSearch,
  users,
  ...props
}) => {
  const {searchRepository, teamRepository, selfFirst, ...userListProps} = props;
  const {userState = container.resolve(UserState), conversationState = container.resolve(ConversationState)} = props;

  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [remoteTeamMembers, setRemoteTeamMembers] = useState<User[]>([]);

  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);
  const {inTeam: selfInTeam} = useKoSubscribableChildren(selfUser, ['inTeam']);

  /**
   * Try to load additional members from the backend.
   * This is needed for large teams (>= 2000 members)
   */
  const fetchMembersFromBackend = useCallback(
    debounce(async (query: string, isHandle: boolean, ignoreMembers: User[]) => {
      const resultUsers = await searchRepository!.searchByName(query, isHandle);
      const selfTeamId = selfUser.teamId;
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
      const SEARCHABLE_FIELDS = SearchRepository.CONFIG.SEARCHABLE_FIELDS;
      const properties = isHandle ? [SEARCHABLE_FIELDS.USERNAME] : undefined;
      resultUsers = searchRepository.searchUserInSet(normalizedQuery, users, properties);
      resultUsers = resultUsers.filter(
        user =>
          user.isMe ||
          connectedUsers.includes(user) ||
          teamRepository.isSelfConnectedTo(user.id) ||
          user.username() === normalizedQuery,
      );
      if (selfInTeam && allowRemoteSearch) {
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

  const toggleUserSelection = selectedUsers
    ? (user: User) => {
        if (selectedUsers.find(selectedUser => selectedUser.id === user.id)) {
          onUpdateSelectedUsers?.([...selectedUsers].filter(selectedUser => selectedUser.id !== user.id));
        } else {
          onUpdateSelectedUsers?.([...selectedUsers, user]);
        }
      }
    : undefined;

  const userList = foundUserEntities().filter(
    user => !props.excludeUsers?.some(excludeId => matchQualifiedIds(user.qualifiedId, excludeId)),
  );
  const isEmptyUserList = userList.length === 0;
  const isSearching = filter.length > 0;
  const noResultsDataUieName = !isSearching ? 'status-all-added' : 'status-no-matches';
  const noResultsTranslationText = !isSearching ? 'searchListEveryoneParticipates' : 'searchListNoMatches';

  return (
    <div className="user-list-wrapper" data-uie-name={dataUieName} role="list">
      {isEmptyUserList ? (
        <p className="user-list__no-results" data-uie-name={noResultsDataUieName}>
          {t(noResultsTranslationText)}
        </p>
      ) : (
        <UserList
          {...userListProps}
          users={userList}
          selectedUsers={selectedUsers}
          highlightedUsers={highlightedUsers}
          onSelectUser={toggleUserSelection}
        />
      )}
    </div>
  );
};

export {UserSearchableList};
