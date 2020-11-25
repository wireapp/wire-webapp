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

import ko from 'knockout';

import {partition} from 'Util/ArrayUtil';
import {sortByPriority} from 'Util/StringUtil';

import type {ConversationRepository} from '../conversation/ConversationRepository';
import type {Conversation} from '../entity/Conversation';
import type {User} from '../entity/User';
import {SearchRepository} from '../search/SearchRepository';
import type {TeamRepository} from '../team/TeamRepository';
import {viewportObserver} from '../ui/viewportObserver';
import {validateHandle} from '../user/UserHandleGenerator';

import 'Components/list/participantItem';
import {UserState} from '../user/UserState';
import {container} from 'tsyringe';
import {ConversationState} from '../conversation/ConversationState';

export enum UserlistMode {
  COMPACT = 'UserlistMode.COMPACT',
  DEFAULT = 'UserlistMode.DEFAULT',
  OTHERS = 'UserlistMode.OTHERS',
}

const USER_CHUNK_SIZE = 64;

interface UserListParams {
  arrow: boolean;
  click: (userEntity: User, event: MouseEvent) => void;
  conversation: ko.Observable<Conversation>;
  conversationRepository: ConversationRepository;
  conversationState?: ConversationState;
  filter: ko.Observable<string>;
  highlightedUsers: () => User[];
  infos: Record<string, string>;
  maxVisibleUsers: number;
  mode: UserlistMode;
  noSelfInteraction: boolean;
  noUnderline: boolean;
  reducedUserCount: number;
  searchRepository: SearchRepository;
  selected: ko.ObservableArray<User>;
  selfFirst: boolean;
  showEmptyAdmin: boolean;
  skipSearch: boolean;
  teamRepository: TeamRepository;
  truncate: boolean;
  user: ko.Observable<User[]>;
  userState?: UserState;
}

const listTemplate = (data: string, uieName: string = ''): string => `
  <div class="search-list" data-bind="
      css: cssClasses(),
      foreach: {data: ${data}, as: 'user', noChildContext: true }"
      ${uieName ? ` data-uie-name="${uieName}"` : ''}>
    <!-- ko if: noSelfInteraction && user.isMe -->
      <participant-item
        params="participant: user, customInfo: infos && infos()[user.id], canSelect: isSelectEnabled, isSelected: isSelected(user), mode: mode, external: teamRepository.isExternal(user.id), selfInTeam: selfInTeam, isSelfVerified: isSelfVerified"
        data-bind="css: {'no-underline': noUnderline, 'highlighted': highlightedUserIds.includes(user.id), 'no-interaction': true}">
      </participant-item>
    <!-- /ko -->
    <!-- ko ifnot: noSelfInteraction && user.isMe -->
      <participant-item
        params="participant: user, customInfo: infos && infos()[user.id], canSelect: isSelectEnabled, isSelected: isSelected(user), mode: mode, external: teamRepository.isExternal(user.id), selfInTeam: selfInTeam, isSelfVerified: isSelfVerified"
        data-bind="click: (viewmodel, event) => onUserClick(user, event), css: {'no-underline': noUnderline, 'show-arrow': arrow, 'highlighted': highlightedUserIds.includes(user.id)}">
      </participant-item>
    <!-- /ko -->
  </div>
`;

ko.components.register('user-list', {
  template: `
    <!-- ko if: showRoles() -->
      <!-- ko if: adminUsers().length > 0 || showEmptyAdmin -->
        <div class="user-list__header" data-bind="text: t('searchListAdmins', adminCount())" data-uie-name="label-conversation-admins"></div>
        <!-- ko if: adminUsers().length > 0 -->
          ${listTemplate('adminUsers().slice(0, maxShownUsers())', 'list-admins')}
        <!-- /ko -->
        <!-- ko ifnot: adminUsers().length > 0 -->
          <div class="user-list__no-admin" data-bind="text: t('searchListNoAdmins')" data-uie-name="status-no-admins"></div>
        <!-- /ko -->
      <!-- /ko -->
      <!-- ko if: memberUsers().length > 0 && maxShownUsers() > adminUsers().length -->
        <div class="user-list__header" data-bind="text: t('searchListMembers', memberCount())" data-uie-name="label-conversation-members"></div>
        ${listTemplate('memberUsers().slice(0, maxShownUsers() - adminUsers().length)', 'list-members')}
      <!-- /ko -->
    <!-- /ko -->

    <!-- ko ifnot: showRoles() -->
    ${listTemplate('foundUserEntities().slice(0, maxShownUsers())')}
    <!-- /ko -->

    <!-- ko if: foundUserEntities().length > maxShownUsers() -->
      <div data-bind="template: {afterRender: attachLazyTrigger}"><div style="height: 100px"></div></div>
    <!-- /ko -->

    <!-- ko if: typeof filter === 'function' -->
      <!-- ko if: userEntities().length === 0 -->
        <div class="user-list__no-results" data-bind="text: t('searchListEveryoneParticipates')" data-uie-name="status-all-added"></div>
      <!-- /ko -->

      <!-- ko if: userEntities().length > 0 && foundUserEntities().length === 0 -->
        <div class="user-list__no-results" data-bind="text: t('searchListNoMatches')" data-uie-name="status-no-matches"></div>
      <!-- /ko -->
    <!-- /ko -->
  `,
  viewModel: function ({
    click,
    filter = ko.observable(''),
    skipSearch = false,
    selected: selectedUsers,
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
  }: UserListParams): void {
    this.userState = userState;
    this.conversationState = conversationState;

    this.filter = filter;
    this.mode = mode;
    this.teamRepository = teamRepository;
    this.userEntities = userEntities;
    this.infos = infos;
    this.highlightedUserIds = highlightedUsers().map(user => user.id);
    this.isSelectEnabled = typeof selectedUsers === 'function';
    this.noUnderline = noUnderline;
    this.arrow = arrow;
    this.selfInTeam = userState.self().inTeam();
    this.isSelfVerified = userState.self().is_verified;
    this.showRoles = ko.pureComputed(() => !!conversation);
    this.showEmptyAdmin = showEmptyAdmin;
    this.noSelfInteraction = noSelfInteraction;
    this.maxShownUsers = ko.observable(USER_CHUNK_SIZE);
    this.lazyTriggerElement = null;
    this.adminCount = ko.observable(0);
    this.memberCount = ko.observable(0);

    const isCompactMode = mode === UserlistMode.COMPACT;

    this.cssClasses = ko.pureComputed(() => (isCompactMode ? 'search-list-sm' : 'search-list-lg'));

    this.onUserClick = (userEntity: User, event: MouseEvent) => {
      if (this.isSelectEnabled) {
        if (this.isSelected(userEntity)) {
          selectedUsers.remove(userEntity);
        } else {
          selectedUsers.push(userEntity);
        }
      }
      if (typeof click === 'function') {
        click(userEntity, event);
      }
    };

    const remoteTeamMembers = ko.observable([]);

    /**
     * Try to load additional members from the backend.
     * This is needed for large teams (>= 2000 members)
     */
    async function fetchMembersFromBackend(query: string, isHandle: boolean, ignoreMembers: User[]) {
      const resultUsers = await searchRepository.search_by_name(query, isHandle);
      const selfTeamId = userState.self().teamId;
      const foundMembers = resultUsers.filter(user => user.teamId === selfTeamId);
      const ignoreIds = ignoreMembers.map(member => member.id);
      const uniqueMembers = foundMembers.filter(member => !ignoreIds.includes(member.id));

      // We shouldn't show any members that have the 'external' role and are not already locally known.
      const nonExternalMembers = await teamRepository.filterExternals(uniqueMembers);
      remoteTeamMembers(nonExternalMembers);
    }

    // Filter all list items if a filter is provided
    const filteredUserEntities = ko.pureComputed(() => {
      const connectedUsers = this.conversationState.connectedUsers();
      let resultUsers = userEntities();
      const normalizedQuery = SearchRepository.normalizeQuery(filter());
      if (normalizedQuery) {
        const trimmedQuery = filter().trim();
        const isHandle = trimmedQuery.startsWith('@') && validateHandle(normalizedQuery);
        if (!skipSearch) {
          const SEARCHABLE_FIELDS = SearchRepository.CONFIG.SEARCHABLE_FIELDS;
          const properties = isHandle ? [SEARCHABLE_FIELDS.USERNAME] : undefined;
          resultUsers = searchRepository.searchUserInSet(normalizedQuery, userEntities(), properties);
        }
        resultUsers = resultUsers.filter(
          user =>
            user.isMe ||
            connectedUsers.includes(user) ||
            teamRepository.isSelfConnectedTo(user.id) ||
            user.username() === normalizedQuery,
        );
        if (!skipSearch && this.selfInTeam) {
          fetchMembersFromBackend(trimmedQuery, isHandle, resultUsers);
        }
      } else {
        resultUsers = userEntities().filter(
          user => user.isMe || connectedUsers.includes(user) || teamRepository.isSelfConnectedTo(user.id),
        );
      }

      if (!selfFirst) {
        return resultUsers;
      }

      // make sure the self user is the first one in the list
      const [selfUser, otherUsers] = partition(resultUsers, user => user.isMe);
      return selfUser.concat(otherUsers);
    });

    this.foundUserEntities = ko.pureComputed(() => {
      if (!remoteTeamMembers().length) {
        return filteredUserEntities();
      }
      const normalizedQuery = SearchRepository.normalizeQuery(filter());
      return [...filteredUserEntities(), ...remoteTeamMembers()].sort((userA, userB) =>
        sortByPriority(userA.name(), userB.name(), normalizedQuery),
      );
    });

    this.isSelected = (userEntity: User): boolean => this.isSelectEnabled && selectedUsers().includes(userEntity);

    this.attachLazyTrigger = ([element]: [HTMLElement]): void => {
      viewportObserver.trackElement(
        element,
        (isInViewport: boolean) => {
          if (isInViewport) {
            this.maxShownUsers(this.maxShownUsers() + USER_CHUNK_SIZE);
          }
        },
        false,
        undefined,
      );
      this.lazyTriggerElement = element;
    };

    this.dispose = () => {
      if (this.lazyTriggerElement) {
        viewportObserver.removeElement(this.lazyTriggerElement);
      }
    };

    this.memberUsers = ko.observable<User[]>([]);
    this.adminUsers = ko.observable<User[]>([]);
    this.users = ko.observable<User[]>([]);

    const filteredUsersSubscription = ko.computed(() => {
      const users = filteredUserEntities();
      if (conversation?.()) {
        const members: User[] = [];
        const admins: User[] = [];
        users.forEach((userEntity: User) => {
          if (userEntity.isService) {
            return;
          }
          if (conversationRepository.conversationRoleRepository.isUserGroupAdmin(conversation(), userEntity)) {
            admins.push(userEntity);
          } else {
            members.push(userEntity);
          }
        });
        this.adminCount(admins.length);
        this.memberCount(members.length);

        if (truncate && admins.length + members.length > maxVisibleUsers) {
          this.adminUsers(admins.slice(0, reducedUserCount));
          this.memberUsers(members.slice(0, reducedUserCount - admins.length));
        } else {
          this.adminUsers(admins);
          this.memberUsers(members);
        }
      } else if (truncate && users.length > maxVisibleUsers) {
        this.users(users.slice(0, reducedUserCount));
      } else {
        this.users(users);
      }
    });

    this.dispose = () => {
      filteredUsersSubscription.dispose();
    };
  },
});
