/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import React, {Fragment, useEffect, useState} from 'react';
import cx from 'classnames';

import {container} from 'tsyringe';

import {t} from 'Util/LocalizerUtil';
import {partition} from 'Util/ArrayUtil';
import {sortByPriority} from 'Util/StringUtil';

import type {ConversationRepository} from '../conversation/ConversationRepository';
import type {Conversation} from '../entity/Conversation';
import type {User} from '../entity/User';
import {SearchRepository} from '../search/SearchRepository';
import type {TeamRepository} from '../team/TeamRepository';
import {useViewPortObserver} from '../ui/viewportObserver';
import {validateHandle} from '../user/UserHandleGenerator';

import {UserState} from '../user/UserState';
import {ConversationState} from '../conversation/ConversationState';
import {registerReactComponent, useKoSubscribable} from 'Util/ComponentUtil';
import ParticipantItem from 'Components/list/ParticipantItem';
import {TeamState} from '../team/TeamState';

export enum UserlistMode {
  COMPACT = 'UserlistMode.COMPACT',
  DEFAULT = 'UserlistMode.DEFAULT',
  OTHERS = 'UserlistMode.OTHERS',
}

const USER_CHUNK_SIZE = 64;

export interface UserListProps {
  addToSelected: (user: User) => void;
  arrow: boolean;
  click: (userEntity: User) => void;
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  conversationState?: ConversationState;
  filter: string;
  highlightedUsers: () => User[];
  infos: Record<string, string>;
  maxVisibleUsers: number;
  mode: UserlistMode;
  noSelfInteraction: boolean;
  noUnderline: boolean;
  reducedUserCount: number;
  removeFromSelected: (user: User) => void;
  searchRepository: SearchRepository;
  selected: User[];
  selfFirst: boolean;
  showEmptyAdmin: boolean;
  skipSearch: boolean;
  teamRepository: TeamRepository;
  teamState: TeamState;
  truncate: boolean;
  user: User[];
  userState?: UserState;
}

const UserList: React.FC<UserListProps> = ({
  click,
  filter = '',
  skipSearch = false,
  selected: selectedUsers,
  addToSelected,
  removeFromSelected,
  searchRepository,
  teamRepository,
  conversationRepository,
  user: userEntities,
  infos,
  highlightedUsers = () => [],
  noUnderline = false,
  arrow = false,
  mode = UserlistMode.DEFAULT,
  conversation,
  truncate = false,
  maxVisibleUsers = 7,
  reducedUserCount = 5,
  showEmptyAdmin = false,
  selfFirst = true,
  noSelfInteraction = false,
  userState = container.resolve(UserState),
  conversationState = container.resolve(ConversationState),
  teamState = container.resolve(TeamState),
}) => {
  const [maxShownUsers, setMaxShownUsers] = useState(USER_CHUNK_SIZE);
  const [adminCount, setAdminCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [remoteTeamMembers, setRemoteTeamMembers] = useState([]);
  const [memberUsers, setMemberUsers] = useState<User[]>([]);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUserEntities, setFilteredUserEntities] = useState<User[]>([]);

  const highlightedUserIds = highlightedUsers().map(user => user.id);
  const isSelectEnabled = typeof selectedUsers === 'function';
  const selfInTeam = userState.self().inTeam();
  const isSelfVerified = useKoSubscribable(userState.self().is_verified);
  const showRoles = !!conversation;
  const isCompactMode = mode === UserlistMode.COMPACT;
  const cssClasses = isCompactMode ? 'search-list-sm' : 'search-list-lg';

  const onUserClick = (userEntity: User) => {
    if (isSelectEnabled) {
      if (isSelected(userEntity)) {
        removeFromSelected(userEntity);
      } else {
        addToSelected(userEntity);
      }
    }
    if (typeof click === 'function') {
      click(userEntity);
    }
  };

  /**
   * Try to load additional members from the backend.
   * This is needed for large teams (>= 2000 members)
   */
  async function fetchMembersFromBackend(query: string, isHandle: boolean, ignoreMembers: User[]) {
    const resultUsers = await searchRepository.searchByName(query, isHandle);
    const selfTeamId = userState.self().teamId;
    const foundMembers = resultUsers.filter(user => user.teamId === selfTeamId);
    const ignoreIds = ignoreMembers.map(member => member.id);
    const uniqueMembers = foundMembers.filter(member => !ignoreIds.includes(member.id));

    // We shouldn't show any members that have the 'external' role and are not already locally known.
    const nonExternalMembers = await teamRepository.filterExternals(uniqueMembers);
    setRemoteTeamMembers(nonExternalMembers);
  }

  // Filter all list items if a filter is provided
  useEffect(() => {
    const connectedUsers = conversationState.connectedUsers();
    let resultUsers = userEntities.slice();
    const normalizedQuery = SearchRepository.normalizeQuery(filter);
    if (normalizedQuery) {
      const trimmedQuery = filter.trim();
      const isHandle = trimmedQuery.startsWith('@') && validateHandle(normalizedQuery);
      if (!skipSearch) {
        const SEARCHABLE_FIELDS = SearchRepository.CONFIG.SEARCHABLE_FIELDS;
        const properties = isHandle ? [SEARCHABLE_FIELDS.USERNAME] : undefined;
        resultUsers = searchRepository.searchUserInSet(normalizedQuery, userEntities, properties);
      }
      resultUsers = resultUsers.filter(
        user =>
          user.isMe ||
          connectedUsers.includes(user) ||
          teamRepository.isSelfConnectedTo(user.id) ||
          user.username() === normalizedQuery,
      );
      if (!skipSearch && selfInTeam) {
        fetchMembersFromBackend(trimmedQuery, isHandle, resultUsers);
      }
    } else {
      resultUsers = userEntities.filter(
        user => user.isMe || connectedUsers.includes(user) || teamRepository.isSelfConnectedTo(user.id),
      );
    }

    if (!selfFirst) {
      setFilteredUserEntities(resultUsers);
      return;
    }

    // make sure the self user is the first one in the list
    const [selfUser, otherUsers] = partition(resultUsers, user => user.isMe);
    setFilteredUserEntities(selfUser.concat(otherUsers));
  }, [filter]);

  const foundUserEntities = () => {
    if (!remoteTeamMembers.length) {
      return filteredUserEntities;
    }
    const normalizedQuery = SearchRepository.normalizeQuery(filter);
    return [...filteredUserEntities, ...remoteTeamMembers].sort((userA, userB) =>
      sortByPriority(userA.name(), userB.name(), normalizedQuery),
    );
  };

  const isSelected = (userEntity: User): boolean =>
    isSelectEnabled && selectedUsers.some(user => user.id === userEntity.id);

  const [isInViewport, viewportElementRef] = useViewPortObserver();

  useEffect(() => {
    if (isInViewport) {
      setMaxShownUsers(maxShownUsers + USER_CHUNK_SIZE);
    }
  }, [isInViewport]);

  useEffect(() => {
    const filteredUsers = filteredUserEntities.slice(0);
    if (conversation) {
      const members: User[] = [];
      const admins: User[] = [];
      filteredUsers.forEach((userEntity: User) => {
        if (userEntity.isService) {
          return;
        }
        if (conversationRepository.conversationRoleRepository.isUserGroupAdmin(conversation, userEntity)) {
          admins.push(userEntity);
        } else {
          members.push(userEntity);
        }
      });
      setAdminCount(admins.length);
      setMemberCount(members.length);

      if (truncate && admins.length + members.length > maxVisibleUsers) {
        setAdminUsers(admins.slice(0, reducedUserCount));
        setMemberUsers(members.slice(0, reducedUserCount - admins.length));
      } else {
        setAdminUsers(admins);
        setMemberUsers(members);
      }
    } else if (truncate && users.length > maxVisibleUsers) {
      setUsers(filteredUsers.slice(0, reducedUserCount));
    } else {
      setUsers(filteredUsers);
    }
  }, [filteredUserEntities]);

  return (
    <Fragment>
      {showRoles && (
        <Fragment>
          {(adminUsers.length > 0 || showEmptyAdmin) && (
            <Fragment>
              <div className="user-list__header" data-uie-name="label-conversation-admins">
                {t('searchListAdmins', adminCount)}
              </div>
              {adminUsers.length > 0 && (
                <div className={cx('search-list', cssClasses)} data-uie-name="list-admins">
                  {adminUsers.slice(0, maxShownUsers).map(user => (
                    <ParticipantItem
                      key={user.id}
                      noInteraction={noSelfInteraction && user.isMe}
                      participant={user}
                      noUnderline={noUnderline}
                      highlighted={highlightedUserIds.includes(user.id)}
                      customInfo={infos && infos[user.id]}
                      canSelect={isSelectEnabled}
                      isSelected={isSelected(user)}
                      mode={mode}
                      external={teamState.isExternal(user.id)}
                      selfInTeam={selfInTeam}
                      isSelfVerified={isSelfVerified}
                      onClick={noSelfInteraction && user.isMe ? onUserClick : undefined}
                    />
                  ))}
                </div>
              )}
              {!(adminUsers.length > 0) && (
                <div className="user-list__no-admin" data-uie-name="status-no-admins">
                  {t('searchListNoAdmins')}
                </div>
              )}
            </Fragment>
          )}
          {memberUsers.length > 0 && maxShownUsers > adminUsers.length && (
            <Fragment>
              <div className="user-list__header" data-uie-name="label-conversation-members">
                {t('searchListMembers', memberCount)}
              </div>
              <div className={cx('search-list', cssClasses)} data-uie-name="list-members">
                {memberUsers.slice(0, maxShownUsers - adminUsers.length).map(user => (
                  <ParticipantItem
                    key={user.id}
                    noInteraction={noSelfInteraction && user.isMe}
                    participant={user}
                    noUnderline={noUnderline}
                    highlighted={highlightedUserIds.includes(user.id)}
                    customInfo={infos && infos[user.id]}
                    canSelect={isSelectEnabled}
                    isSelected={isSelected(user)}
                    mode={mode}
                    external={teamState.isExternal(user.id)}
                    selfInTeam={selfInTeam}
                    isSelfVerified={isSelfVerified}
                    onClick={noSelfInteraction && user.isMe ? onUserClick : undefined}
                  />
                ))}
              </div>
            </Fragment>
          )}
        </Fragment>
      )}

      {!showRoles && (
        <div className={cx('search-list', cssClasses)}>
          {foundUserEntities()
            .slice(0, maxShownUsers)
            .map(user => (
              <ParticipantItem
                key={user.id}
                noInteraction={noSelfInteraction && user.isMe}
                participant={user}
                noUnderline={noUnderline}
                highlighted={highlightedUserIds.includes(user.id)}
                customInfo={infos && infos[user.id]}
                canSelect={isSelectEnabled}
                isSelected={isSelected(user)}
                mode={mode}
                external={teamState.isExternal(user.id)}
                selfInTeam={selfInTeam}
                isSelfVerified={isSelfVerified}
                onClick={noSelfInteraction && user.isMe ? onUserClick : undefined}
              />
            ))}
        </div>
      )}

      {foundUserEntities().length > maxShownUsers && (
        <div ref={viewportElementRef}>
          <div css={{height: 100}}></div>
        </div>
      )}

      {typeof filter === 'function' && (
        <Fragment>
          {userEntities.length === 0 && (
            <div className="user-list__no-results" data-uie-name="status-all-added">
              {t('searchListEveryoneParticipates')}
            </div>
          )}

          {userEntities.length > 0 && foundUserEntities().length === 0 && (
            <div className="user-list__no-results" data-uie-name="status-no-matches">
              {t('searchListNoMatches')}
            </div>
          )}
        </Fragment>
      )}
    </Fragment>
  );
};

export default UserList;

registerReactComponent('user-list', {
  bindings:
    'user: ko.unwrap(‍user), selected: ko.unwrap(‍selected), addToSelected: selected, removeFromSelected: selected, filter: ko.unwrap(‍filter), conversation: ko.unwrap(‍conversation), ‍infos: ko.unwrap(‍infos), arrow, userState, teamState, conversationState, ‍click, ‍conversationRepository, ‍highlightedUsers, ‍maxVisibleUsers, ‍mode, ‍noSelfInteraction, ‍noUnderline, ‍reducedUserCount, ‍searchRepository, ‍selfFirst, ‍showEmptyAdmin, ‍skipSearch, ‍teamRepository, ‍truncate',
  component: UserList,
});
