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

import React, {useEffect, useRef, useState} from 'react';

import {BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {amplify} from 'amplify';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {partition} from 'underscore';

import {WebAppEvents} from '@wireapp/webapp-events';

import {Icon} from 'Components/Icon';
import {UserList, UserlistMode} from 'Components/UserList';
import {Conversation} from 'src/script/entity/Conversation';
import {UserRepository} from 'src/script/user/UserRepository';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {safeWindowOpen} from 'Util/SanitizationUtil';
import {sortByPriority} from 'Util/StringUtil';
import {isBackendError} from 'Util/TypePredicateUtil';

import {GroupList} from './components/GroupList';
import {TopPeople} from './components/TopPeople';

import {ConversationRepository} from '../../../../conversation/ConversationRepository';
import {ConversationState} from '../../../../conversation/ConversationState';
import {User} from '../../../../entity/User';
import {getManageTeamUrl} from '../../../../externalRoute';
import {useDebounce} from '../../../../hooks/useDebounce';
import {SearchRepository} from '../../../../search/SearchRepository';
import {TeamRepository} from '../../../../team/TeamRepository';
import {TeamState} from '../../../../team/TeamState';
import {validateHandle} from '../../../../user/UserHandleGenerator';
import {UserState} from '../../../../user/UserState';

export type SearchResultsData = {contacts: User[]; groups: Conversation[]; others: User[]};

export const PeopleTab: React.FC<{
  canCreateGroupConversation: boolean;
  canCreateGuestRoom: boolean;
  canInviteTeamMembers: boolean;
  canSearchUnconnectedUsers: boolean;
  conversationRepository: ConversationRepository;
  conversationState: ConversationState;
  isFederated: boolean;
  isTeam: boolean;
  onClickContact: (user: User) => void;
  onClickConversation: (conversation: Conversation) => void;
  onClickUser: (user: User) => void;
  onSearchResults: (results: SearchResultsData | undefined) => void;
  searchQuery: string;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  teamState: TeamState;
  userRepository: UserRepository;
  userState: UserState;
}> = ({
  searchQuery,
  isTeam,
  isFederated,
  teamRepository,
  teamState,
  userState,
  canInviteTeamMembers,
  canSearchUnconnectedUsers,
  canCreateGroupConversation,
  canCreateGuestRoom,
  conversationState,
  searchRepository,
  conversationRepository,
  userRepository,
  onClickContact,
  onClickConversation,
  onClickUser,
  onSearchResults,
}) => {
  const logger = getLogger('PeopleSearch');
  const [topPeople, setTopPeople] = useState<User[]>([]);
  const teamSize = teamState.teamSize();
  const [hasFederationError, setHasFederationError] = useState(false);
  const currentSearchQuery = useRef('');

  const {connectedUsers} = useKoSubscribableChildren(conversationState, ['connectedUsers']);
  const getLocalUsers = (unfiltered?: boolean) => {
    const contacts = () => {
      if (isTeam) {
        return unfiltered
          ? teamState.teamUsers()
          : teamState
              .teamUsers()
              .filter(user => connectedUsers.includes(user) || teamRepository.isSelfConnectedTo(user.id));
      }
      return userState.connectedUsers();
    };

    if (!canSearchUnconnectedUsers) {
      return connectedUsers;
    }
    return contacts().filter(user => user.isAvailable());
  };
  const [results, setResults] = useState<SearchResultsData>({contacts: getLocalUsers(), groups: [], others: []});
  const searchOnFederatedDomain = () => '';
  const hasResults = results.contacts.length + results.groups.length + results.others.length > 0;

  const manageTeamUrl = getManageTeamUrl('client_landing');

  const organizeTeamSearchResults = async (
    remoteUsers: User[],
    searchResults: SearchResultsData,
    query: string,
  ): Promise<SearchResultsData> => {
    const selfTeamId = userState.self().teamId;
    const [contacts, others] = partition(remoteUsers, user => user.teamId === selfTeamId);
    const nonExternalContacts = await teamRepository.filterExternals(contacts);
    return {
      ...searchResults,
      contacts: [...searchResults.contacts, ...nonExternalContacts].sort((userA, userB) =>
        sortByPriority(userA.name(), userB.name(), query),
      ),
      others: others,
    };
  };

  const getTopPeople = () => {
    return conversationRepository
      .getMostActiveConversations()
      .then(conversationEntities => {
        return conversationEntities
          .filter(conversation => conversation.is1to1())
          .slice(0, 6)
          .map(conversation => conversation.participating_user_ids()[0]);
      })
      .then(userIds => userRepository.getUsersById(userIds))
      .then(userEntities => userEntities.filter(user => !user.isBlocked()));
  };

  useEffect(() => {
    if (!isTeam) {
      getTopPeople().then(setTopPeople);
    }
  }, []);

  useDebounce(
    async () => {
      setHasFederationError(false);
      const query = SearchRepository.normalizeQuery(searchQuery);
      if (!query) {
        setResults({contacts: getLocalUsers(), groups: [], others: []});
        onSearchResults(undefined);
        return;
      }
      const localSearchSources = getLocalUsers(true);

      // Contacts, groups and others
      const trimmedQuery = searchQuery.trim();
      const isHandle = trimmedQuery.startsWith('@') && validateHandle(query);

      const SEARCHABLE_FIELDS = SearchRepository.CONFIG.SEARCHABLE_FIELDS;
      const searchFields = isHandle ? [SEARCHABLE_FIELDS.USERNAME] : undefined;

      // If the user typed a domain, we will just ignore it when searchng for the user locally
      const [domainFreeQuery] = query.split('@');
      const contactResults = searchRepository.searchUserInSet(domainFreeQuery, localSearchSources, searchFields);
      const connectedUsers = conversationState.connectedUsers();
      const filteredResults = contactResults.filter(
        user => connectedUsers.includes(user) || teamRepository.isSelfConnectedTo(user.id) || user.username() === query,
      );

      const localSearchResults: SearchResultsData = {
        contacts: filteredResults,
        groups: conversationRepository.getGroupsByName(query, isHandle),
        others: [],
      };
      setResults(localSearchResults);
      onSearchResults(localSearchResults);
      if (canSearchUnconnectedUsers) {
        try {
          const userEntities = await searchRepository.searchByName(query, isHandle);
          const localUserIds = localSearchResults.contacts.map(({id}) => id);
          const onlyRemoteUsers = userEntities.filter(user => !localUserIds.includes(user.id));
          const results = userState.self().inTeam()
            ? await organizeTeamSearchResults(onlyRemoteUsers, localSearchResults, query)
            : {...localSearchResults, others: onlyRemoteUsers};

          if (currentSearchQuery.current === searchQuery) {
            // Only update the results if the query that has been processed correspond to the current search query
            onSearchResults(results);
            setResults(results);
          }
        } catch (error) {
          if (isBackendError(error)) {
            if (error.code === HTTP_STATUS.UNPROCESSABLE_ENTITY) {
              return setHasFederationError(true);
            }
            if (error.code === HTTP_STATUS.BAD_REQUEST && error.label === BackendErrorLabel.FEDERATION_NOT_ALLOWED) {
              return logger.warn(`Error searching for contacts: ${error.message}`);
            }
          }
          logger.error(`Error searching for contacts: ${(error as any).message}`, error);
        }
      }
    },
    300,
    [searchQuery],
  );

  useEffect(() => {
    // keep track of the most up to date value of the search query (in order to cancel outdated queries)
    currentSearchQuery.current = searchQuery;
    return () => {
      currentSearchQuery.current = '';
      onSearchResults(undefined);
    };
  }, [searchQuery]);

  return (
    <>
      {hasFederationError && (
        <div className="start-ui-fed-domain-unavailable">
          <div className="start-ui-fed-domain-unavailable__head">{t('searchConnectWithOtherDomain')}</div>
          <span className="start-ui-fed-domain-unavailable__text">{t('searchFederatedDomainNotAvailable')}</span>
          {/*@todo: re-enable when federation article is available
                <a className="start-ui-fed-domain-unavailable__link" rel="nofollow noopener noreferrer" target="_blank" data-bind="attr: {href: ''}, text: t('searchFederatedDomainNotAvailableLearnMore')"></a>
            */}
        </div>
      )}

      {searchQuery.length === 0 && (
        <>
          <ul className="start-ui-list left-list-items">
            {teamSize === 1 && canInviteTeamMembers && !!manageTeamUrl && (
              <li className="left-list-item">
                <button
                  className="left-list-item-button"
                  type="button"
                  onClick={() => safeWindowOpen(manageTeamUrl)}
                  data-uie-name="do-invite-member"
                >
                  <span className="left-column-icon icon-envelope"></span>
                  <span className="column-center">{t('searchMemberInvite')}</span>
                </button>
              </li>
            )}
            {canCreateGroupConversation && (
              <li className="left-list-item">
                <button
                  className="left-list-item-button"
                  type="button"
                  onClick={() => amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'start_ui')}
                  data-uie-name="go-create-group"
                >
                  <span className="left-column-icon">
                    <Icon.Group />
                  </span>
                  <span className="column-center">{t('searchCreateGroup')}</span>
                </button>
              </li>
            )}
            {canCreateGuestRoom && (
              <li className="left-list-item">
                <button
                  className="left-list-item-button"
                  type="button"
                  onClick={() =>
                    conversationRepository.createGuestRoom().then(conversation => {
                      amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversation, {});
                    })
                  }
                  data-uie-name="do-create-guest-room"
                >
                  <span className="left-column-icon">
                    <Icon.Guest />
                  </span>
                  <span className="column-center">{t('searchCreateGuestRoom')}</span>
                </button>
              </li>
            )}
          </ul>
          {topPeople.length > 0 && (
            <div className="start-ui-list-top-people" data-uie-name="status-top-people">
              <h3 className="start-ui-list-header start-ui-list-header-top-people">{t('searchTopPeople')}</h3>
              <div className="search-list-theme-black">
                <div className="top-people">
                  <TopPeople users={topPeople} clickOnUser={onClickContact} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {!hasFederationError && !hasResults && (
        <>
          {!canSearchUnconnectedUsers ? (
            <div className="start-ui-no-search-results__content">
              <span className="start-ui-no-search-results__icon">
                <Icon.Message />
              </span>
              <p className="start-ui-no-search-results__text" data-uie-name="label-no-search-result">
                {t('searchNoMatchesPartner')}
              </p>
            </div>
          ) : isFederated ? (
            <div className="start-ui-fed-wrapper">
              <span className="start-ui-fed-wrapper__icon">
                <Icon.Profile />
              </span>
              <div className="start-ui-fed-wrapper__text">{t('searchTrySearchFederation')}</div>
              <div className="start-ui-fed-wrapper__button">
                {/*@todo: re-enable when federation article is available
                <button type="button" data-bind="click: () => {}" data-uie-name="do-search-learn-more">
                  {t('searchTrySearchLearnMore')}
                </button>
          */}
              </div>
            </div>
          ) : (
            <p className="start-ui-no-search-results">{t('searchTrySearch')}</p>
          )}
        </>
      )}
      <div className="start-ui-list-search-results">
        {results.contacts.length > 0 && (
          <div className="contacts">
            {isTeam ? (
              <h3 className="start-ui-list-header start-ui-list-header-contacts">{t('searchContacts')}</h3>
            ) : (
              <h3 className="start-ui-list-header start-ui-list-header-connections">{t('searchConnections')}</h3>
            )}
            <div className="search-list-theme-black">
              <UserList
                onClick={user => onClickContact(user)}
                conversationRepository={conversationRepository}
                mode={UserlistMode.COMPACT}
                users={results.contacts}
              />
            </div>
          </div>
        )}
        {results.groups.length > 0 && (
          <div className="start-ui-groups">
            {isTeam ? (
              <h3 className="start-ui-list-header">{t('searchTeamGroups')}</h3>
            ) : (
              <h3 className="start-ui-list-header">{t('searchGroups')}</h3>
            )}
            <div className="group-list">
              <GroupList groups={results.groups} click={onClickConversation} />
            </div>
          </div>
        )}
        {results.others.length > 0 && (
          <div className="others">
            <h3 className="start-ui-list-header">
              {searchOnFederatedDomain() ? t('searchOthersFederation', searchOnFederatedDomain()) : t('searchOthers')}
            </h3>
            <div className="search-list-theme-black">
              <UserList
                users={results.others}
                onClick={onClickUser}
                mode={UserlistMode.OTHERS}
                conversationRepository={conversationRepository}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};
