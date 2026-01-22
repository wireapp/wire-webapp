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

import {ChangeEvent, useCallback, useMemo, useState} from 'react';

import cx from 'classnames';
import {container} from 'tsyringe';

import * as Icon from 'Components/Icon';
import {InViewport} from 'Components/InViewport';
import {collapseButton, collapseIcon} from 'Components/UserList/UserList.styles';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isEnterKey, isSpaceKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {UserListItem} from './components/UserListItem';

export enum UserlistMode {
  COMPACT = 'UserlistMode.COMPACT',
  DEFAULT = 'UserlistMode.DEFAULT',
  OTHERS = 'UserlistMode.OTHERS',
}

enum UserListSections {
  CONTACTS = 'UserListSections.CONTACTS',
  SELECTED_CONTACTS = 'UserListSections.SELECTED_CONTACTS',
}

const USER_CHUNK_SIZE = 64;

interface UserListProps {
  conversation?: Conversation;
  conversationRepository?: ConversationRepository;
  conversationState?: ConversationState;
  highlightedUsers?: User[];
  infos?: Record<string, string>;
  maxVisibleUsers?: number;
  mode?: UserlistMode;
  noSelfInteraction?: boolean;
  noUnderline?: boolean;
  showArrow?: boolean;
  onClick?: (userEntity: User, event: MouseEvent | KeyboardEvent | ChangeEvent) => void;
  onSelectUser?: (user: User) => void;
  reducedUserCount?: number;
  selectedUsers?: User[];
  showEmptyAdmin?: boolean;
  teamState?: TeamState;
  truncate?: boolean;
  users: User[];
  isSelectable?: boolean;
  selfUser: User;
  filterDeletedUsers?: boolean;
}

export const UserList = ({
  onClick,
  conversationRepository,
  users,
  infos,
  highlightedUsers = [],
  noUnderline = false,
  mode = UserlistMode.DEFAULT,
  conversation,
  truncate = false,
  selectedUsers = [],
  maxVisibleUsers = 7,
  reducedUserCount = 5,
  showEmptyAdmin = false,
  noSelfInteraction = false,
  showArrow = false,
  teamState = container.resolve(TeamState),
  isSelectable = false,
  onSelectUser,
  selfUser,
  filterDeletedUsers = true,
}: UserListProps) => {
  const [maxShownUsers, setMaxShownUsers] = useState(USER_CHUNK_SIZE);

  // filter out deleted users
  const filteredUsers = useMemo(
    () => (filterDeletedUsers ? users.filter(user => !user.isDeleted) : users),
    [users, filterDeletedUsers],
  );

  const [expandedFolders, setExpandedFolders] = useState<UserListSections[]>([UserListSections.CONTACTS]);

  const hasMoreUsers = !truncate && filteredUsers.length > maxShownUsers;

  const highlightedUserIds = highlightedUsers.map(user => user.id);
  const {is_verified: isSelfVerified} = useKoSubscribableChildren(selfUser, ['is_verified']);

  // subscribe to roles changes in order to react to them
  useKoSubscribableChildren(conversation!, ['roles']);

  const isCompactMode = mode === UserlistMode.COMPACT;
  const cssClasses = isCompactMode ? 'search-list-sm' : 'search-list-lg';

  const onUserKeyPressed = (userEntity: User, event: KeyboardEvent) => {
    if (isSpaceKey(event) || isEnterKey(event)) {
      onClickOrKeyPressed(userEntity, event);
    }
    return true;
  };

  const onClickOrKeyPressed = (userEntity: User, event: MouseEvent | KeyboardEvent | ChangeEvent) => {
    onSelectUser?.(userEntity);
    onClick?.(userEntity, event);
  };

  const renderListItem = useCallback(
    (user: User, isLastItem: boolean = false) => {
      const isSelected = (userEntity: User): boolean =>
        isSelectable && selectedUsers.some(user => user.id === userEntity.id);

      return (
        <li key={user.id}>
          <UserListItem
            groupId={conversation?.groupId}
            noInteraction={noSelfInteraction && user.isMe}
            user={user}
            noUnderline={isLastItem || noUnderline}
            isHighlighted={highlightedUserIds.includes(user.id)}
            customInfo={infos?.[user.id]}
            canSelect={isSelectable}
            isSelected={isSelected(user)}
            mode={mode}
            external={teamState.isExternal(user.id)}
            isSelfVerified={isSelfVerified}
            onClick={onClickOrKeyPressed}
            onKeyDown={onUserKeyPressed}
            showArrow={showArrow}
          />
        </li>
      );
    },
    [highlightedUserIds, isSelectable, isSelfVerified, mode, noSelfInteraction, selectedUsers, teamState],
  );

  let content;

  const showRoles = !!conversation;
  if (showRoles) {
    let members: User[] = [];
    let admins: User[] = [];
    let adminCount = 0;
    let memberCount = 0;

    filteredUsers.forEach((userEntity: User) => {
      if (userEntity.isService) {
        return;
      }
      if (conversationRepository?.conversationRoleRepository.isUserGroupAdmin(conversation, userEntity)) {
        admins.push(userEntity);
      } else {
        members.push(userEntity);
      }
    });
    adminCount = admins.length;
    memberCount = members.length;

    if (truncate && admins.length + members.length > maxVisibleUsers) {
      admins = admins.slice(0, reducedUserCount);
      members = members.slice(0, reducedUserCount - admins.length);
    }

    content = (
      <>
        {(admins.length > 0 || showEmptyAdmin) && (
          <>
            <h3 className="user-list__header" data-uie-name="label-conversation-admins">
              {t('searchListAdmins', {count: adminCount})}
            </h3>

            {admins.length > 0 && (
              <ul className={cx('search-list', cssClasses)} data-uie-name="list-admins">
                {admins.slice(0, maxShownUsers).map(user => renderListItem(user))}
              </ul>
            )}

            {!(admins.length > 0) && (
              <div className="user-list__no-admin" data-uie-name="status-no-admins">
                {t('searchListNoAdmins')}
              </div>
            )}
          </>
        )}

        {members.length > 0 && maxShownUsers > admins.length && (
          <>
            <h3 className="user-list__header" data-uie-name="label-conversation-members">
              {t('searchListMembers', {count: memberCount})}
            </h3>

            <ul className={cx('search-list', cssClasses)} data-uie-name="list-members">
              {members.slice(0, maxShownUsers - admins.length).map(user => renderListItem(user))}
            </ul>
          </>
        )}
      </>
    );
  } else {
    const truncatedUsers = truncate ? filteredUsers.slice(0, reducedUserCount) : filteredUsers;
    const isSelected = (userEntity: User): boolean =>
      isSelectable && !!selectedUsers?.some(user => user.id === userEntity.id);

    const selectedUsersCount = selectedUsers.length;
    const hasSelectedUsers = selectedUsersCount > 0;

    const toggleFolder = (folderName: UserListSections) => {
      setExpandedFolders(prevState =>
        prevState.includes(folderName) ? prevState.filter(name => folderName !== name) : [...prevState, folderName],
      );
    };

    const isSelectedContactsOpen = expandedFolders.includes(UserListSections.SELECTED_CONTACTS);
    const isContactsOpen = expandedFolders.includes(UserListSections.CONTACTS);

    content = (
      <>
        {isSelectable && hasSelectedUsers && (
          <>
            <button
              onClick={() => toggleFolder(UserListSections.SELECTED_CONTACTS)}
              css={collapseButton}
              data-uie-name="do-toggle-selected-search-list"
            >
              <span css={collapseIcon(isSelectedContactsOpen)} aria-hidden="true">
                <Icon.DiscloseIcon width={16} height={16} />
              </span>

              {t('userListSelectedContacts', {selectedContacts: selectedUsersCount})}
            </button>

            <ul
              data-uie-name="selected-search-list"
              data-uie-value={selectedUsersCount}
              className={cx('search-list', cssClasses)}
            >
              {isSelectedContactsOpen &&
                selectedUsers.map((user, index) => {
                  const isLastItem = index === selectedUsersCount - 1;

                  return renderListItem(user, isLastItem);
                })}
            </ul>
          </>
        )}

        {isSelectable && (
          <button
            onClick={() => toggleFolder(UserListSections.CONTACTS)}
            css={collapseButton}
            data-uie-name="do-toggle-search-list"
          >
            <span css={collapseIcon(isContactsOpen)} aria-hidden="true">
              <Icon.DiscloseIcon width={16} height={16} />
            </span>

            {t('userListContacts')}
          </button>
        )}

        <ul className={cx('search-list', cssClasses)} data-uie-name="search-list">
          {isContactsOpen &&
            truncatedUsers
              .slice(0, maxShownUsers)
              .filter(user => !isSelected(user))
              .map(user => renderListItem(user))}
        </ul>
      </>
    );
  }

  return (
    <>
      {content}

      {hasMoreUsers && (
        <InViewport
          onVisible={() => setMaxShownUsers(maxShownUsers + USER_CHUNK_SIZE)}
          key={`in-viewport-${Math.random()}`}
          style={{height: 10, transform: 'translateY(-60px)', width: 10}}
        />
      )}
    </>
  );
};
