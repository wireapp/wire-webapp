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

import {ChangeEvent, useState} from 'react';

import cx from 'classnames';
import {container} from 'tsyringe';

import {Icon} from 'Components/Icon';
import {ParticipantItem} from 'Components/list/ParticipantItem';
import {collapseButton, collapseIcon} from 'Components/UserList/UserList.styles';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isEnterKey, isSpaceKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import type {ConversationRepository} from '../../conversation/ConversationRepository';
import {ConversationState} from '../../conversation/ConversationState';
import type {Conversation} from '../../entity/Conversation';
import type {User} from '../../entity/User';
import {TeamState} from '../../team/TeamState';
import {UserState} from '../../user/UserState';
import {InViewport} from '../utils/InViewport';

export enum UserlistMode {
  COMPACT = 'UserlistMode.COMPACT',
  DEFAULT = 'UserlistMode.DEFAULT',
  OTHERS = 'UserlistMode.OTHERS',
}

export enum UserListSections {
  CONTACTS = 'UserListSections.CONTACTS',
  SELECTED_CONTACTS = 'UserListSections.SELECTED_CONTACTS',
}

const USER_CHUNK_SIZE = 64;

export interface UserListProps {
  conversation?: Conversation;
  conversationRepository: ConversationRepository;
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
  userState?: UserState;
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
  userState = container.resolve(UserState),
  teamState = container.resolve(TeamState),
  onSelectUser,
}: UserListProps) => {
  const [maxShownUsers, setMaxShownUsers] = useState(USER_CHUNK_SIZE);

  const [expandedFolders, setExpandedFolders] = useState<UserListSections[]>([
    UserListSections.CONTACTS,
    UserListSections.SELECTED_CONTACTS,
  ]);

  const hasMoreUsers = !truncate && users.length > maxShownUsers;

  const highlightedUserIds = highlightedUsers.map(user => user.id);
  const selfInTeam = userState.self().inTeam();
  const {self} = useKoSubscribableChildren(userState, ['self']);
  const {is_verified: isSelfVerified} = useKoSubscribableChildren(self, ['is_verified']);
  const isSelectEnabled = !!onSelectUser;

  // subscribe to roles changes in order to react to them
  useKoSubscribableChildren(conversation, ['roles']);

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

  const isSelected = (userEntity: User): boolean =>
    isSelectEnabled && selectedUsers.some(user => user.id === userEntity.id);

  let content;

  const showRoles = !!conversation;
  if (showRoles) {
    let members: User[] = [];
    let admins: User[] = [];
    let adminCount = 0;
    let memberCount = 0;

    users.forEach((userEntity: User) => {
      if (userEntity.isService) {
        return;
      }
      if (conversationRepository.conversationRoleRepository.isUserGroupAdmin(conversation, userEntity)) {
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
              {t('searchListAdmins', adminCount)}
            </h3>

            {admins.length > 0 && (
              <ul className={cx('search-list', cssClasses)} data-uie-name="list-admins">
                {admins.slice(0, maxShownUsers).map(user => (
                  <li key={user.id}>
                    <ParticipantItem
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
                      onClick={onClickOrKeyPressed}
                      onKeyDown={onUserKeyPressed}
                      showArrow={showArrow}
                    />
                  </li>
                ))}
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
              {t('searchListMembers', memberCount)}
            </h3>

            <ul className={cx('search-list', cssClasses)} data-uie-name="list-members">
              {members.slice(0, maxShownUsers - admins.length).map(user => (
                <li key={user.id}>
                  <ParticipantItem
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
                    onClick={onClickOrKeyPressed}
                    onKeyDown={onUserKeyPressed}
                    showArrow={showArrow}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </>
    );
  } else {
    const truncatedUsers = truncate ? users.slice(0, reducedUserCount) : users;
    const selectedUsers = truncatedUsers.filter(user => isSelected(user));

    const hasSelectedUsers = selectedUsers.length > 0;

    const toggleFolder = (folderName: UserListSections) => {
      setExpandedFolders(prevState =>
        prevState.includes(folderName) ? prevState.filter(name => folderName !== name) : [...prevState, folderName],
      );
    };

    const isSelectedContactsOpen = expandedFolders.includes(UserListSections.SELECTED_CONTACTS);
    const isContactsOpen = expandedFolders.includes(UserListSections.CONTACTS);

    const renderParticipantItem = (user: User, isLastItem: boolean = false) => (
      <li key={user.id}>
        <ParticipantItem
          noInteraction={noSelfInteraction && user.isMe}
          participant={user}
          noUnderline={isLastItem || noUnderline}
          highlighted={highlightedUserIds.includes(user.id)}
          customInfo={infos && infos[user.id]}
          canSelect={isSelectEnabled}
          isSelected={isSelected(user)}
          mode={mode}
          external={teamState.isExternal(user.id)}
          selfInTeam={selfInTeam}
          isSelfVerified={isSelfVerified}
          onClick={onClickOrKeyPressed}
          onKeyDown={onUserKeyPressed}
          showArrow={showArrow}
        />
      </li>
    );

    content = (
      <>
        {hasSelectedUsers && (
          <>
            <button onClick={() => toggleFolder(UserListSections.SELECTED_CONTACTS)} css={collapseButton}>
              <span css={collapseIcon(isSelectedContactsOpen)} aria-hidden="true">
                <Icon.Disclose width={16} height={16} />
              </span>

              {t('userListSelectedContacts', selectedUsers.length)}
            </button>

            <ul data-uie-name="selected-search-list">
              {isSelectedContactsOpen &&
                selectedUsers.map((user, index) => {
                  const isLastItem = index === selectedUsers.length - 1;

                  return renderParticipantItem(user, isLastItem);
                })}
            </ul>
          </>
        )}

        <button onClick={() => toggleFolder(UserListSections.CONTACTS)} css={collapseButton}>
          <span css={collapseIcon(isContactsOpen)} aria-hidden="true">
            <Icon.Disclose width={16} height={16} />
          </span>

          {t('userListContacts')}
        </button>

        <ul className={cx('search-list', cssClasses)} data-uie-name="search-list">
          {isContactsOpen &&
            truncatedUsers
              .slice(0, maxShownUsers)
              .filter(user => !isSelected(user))
              .map(user => renderParticipantItem(user))}
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
