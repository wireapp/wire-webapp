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

import React, {useEffect, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {UserList} from 'Components/UserList';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import type {User} from 'Repositories/entity/User';
import {SearchRepository} from 'Repositories/search/SearchRepository';
import type {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {container} from 'tsyringe';
import {useDebouncedCallback} from 'use-debounce';
import {partition} from 'Util/ArrayUtil';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {sortByPriority} from 'Util/StringUtil';

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
  selfUser: User;
  dataUieName?: string;
  /** will prevent showing those users in the list */
  excludeUsers?: QualifiedId[];
  /** will do an extra request to the server when user types in (otherwise will only lookup given local users) */
  allowRemoteSearch?: boolean;
  filterRemoteTeamUsers?: boolean;
};

export const UserSearchableList = ({
  onUpdateSelectedUsers,
  filterRemoteTeamUsers = false,
  dataUieName = '',
  filter = '',
  highlightedUsers,
  selected: selectedUsers,
  allowRemoteSearch,
  selfUser,
  users,
  teamState = container.resolve(TeamState),
  ...props
}: UserListProps) => {
  const {searchRepository, teamRepository, selfFirst, ...userListProps} = props;
  const {conversationState = container.resolve(ConversationState)} = props;

  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [remoteTeamMembers, setRemoteTeamMembers] = useState<User[]>([]);

  const filteredSelectedUsers = selectedUsers ? searchRepository.searchUserInSet(filter, selectedUsers) : undefined;

  const selfInTeam = teamState.isInTeam(selfUser);

  /**
   * Try to load additional members from the backend.
   * This is needed for large teams (>= 2000 members)
   */
  const fetchMembersFromBackend = useDebouncedCallback(async (query: string, ignoreMembers: User[]) => {
    const resultUsers = await searchRepository.searchByName(query, selfUser.teamId);
    const selfTeamId = selfUser.teamId;
    const foundMembers = resultUsers.filter(user => user.teamId === selfTeamId);
    const ignoreIds = ignoreMembers.map(member => member.id);
    const uniqueMembers = foundMembers.filter(member => !ignoreIds.includes(member.id));

    // We shouldn't show any members that have the 'external' role and are not already locally known.
    const nonExternalMembers = await teamRepository.filterExternals(uniqueMembers);
    setRemoteTeamMembers(
      filterRemoteTeamUsers ? await teamRepository.filterRemoteDomainUsers(nonExternalMembers) : nonExternalMembers,
    );
  }, 300);

  // Filter all list items if a filter is provided

  useEffect(() => {
    const setUsers = async (users: User[]) => {
      setFilteredUsers(filterRemoteTeamUsers ? await teamRepository.filterRemoteDomainUsers(users) : users);
    };

    const {query: normalizedQuery} = searchRepository.normalizeQuery(filter);
    const results = searchRepository
      .searchUserInSet(filter, users)
      .filter(
        user =>
          user.isMe ||
          conversationState.hasConversationWith(user) ||
          teamRepository.isSelfConnectedTo(user.id) ||
          user.username() === normalizedQuery,
      );

    if (normalizedQuery !== '' && selfInTeam && allowRemoteSearch) {
      fetchMembersFromBackend(filter, results);
    }

    if (!selfFirst) {
      void setUsers(results);
      return;
    }

    // make sure the self user is the first one in the list
    const [selfUser, otherUsers] = partition(results, user => user.isMe);

    const concatUsers = selfUser.concat(otherUsers);
    void setUsers(concatUsers);
  }, [filter, users.length]);

  const foundUserEntities = () => {
    if (!remoteTeamMembers.length) {
      return filteredUsers;
    }
    const {query: normalizedQuery} = searchRepository.normalizeQuery(filter);
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
          selectedUsers={filteredSelectedUsers}
          highlightedUsers={highlightedUsers}
          onSelectUser={toggleUserSelection}
          selfUser={selfUser}
        />
      )}
    </div>
  );
};
