import React, {useEffect, useRef, useState} from 'react';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {BackendErrorLabel} from '@wireapp/api-client/src/http';
import {TeamState} from '../../../../team/TeamState';
import {UserState} from '../../../../user/UserState';
import {t} from 'Util/LocalizerUtil';
import useDebounce from '../../../../hooks/useDebounce';
import {SearchRepository} from '../../../../search/SearchRepository';
import {validateHandle} from '../../../../user/UserHandleGenerator';
import {ConversationState} from '../../../../conversation/ConversationState';
import {TeamRepository} from '../../../../team/TeamRepository';
import {ConversationRepository} from '../../../../conversation/ConversationRepository';
import {User} from '../../../../entity/User';
import UserList, {UserlistMode} from 'Components/UserList';
import GroupList from './components/GroupList';
import {Conversation} from 'src/script/entity/Conversation';
import {MainViewModel} from 'src/script/view_model/MainViewModel';
import Icon from 'Components/Icon';
import TopPeople from './components/TopPeople';
import {getManageTeamUrl} from '../../../../externalRoute';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import {safeWindowOpen} from 'Util/SanitizationUtil';
import {UserRepository} from 'src/script/user/UserRepository';
import {isBackendError} from 'Util/TypePredicateUtil';
import {getLogger} from 'Util/Logger';
import {partition} from 'underscore';
import {sortByPriority} from 'Util/StringUtil';

type SearchResultsData = {contacts: User[]; groups: Conversation[]; others: User[]};

export const PeopleTab: React.FC<{
  canCreateGroupConversation: boolean;
  canCreateGuestRoom: boolean;
  canInviteTeamMembers: boolean;
  canSearchUnconnectedUsers: boolean;
  close: () => void;
  conversationRepository: ConversationRepository;
  conversationState: ConversationState;
  isFederated: boolean;
  isTeam: boolean;
  mainViewModel: MainViewModel;
  searchQuery: string;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  teamState: TeamState;
  userRepository: UserRepository;
  userState: UserState;
}> = ({
  close,
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
  mainViewModel,
  userRepository,
}) => {
  const logger = getLogger('PeopleSearch');
  const actions = mainViewModel.actions;
  const getLocalUsers = () => {
    return isTeam ? teamState.teamUsers() : userState.connectedUsers();
  };
  const [results, setResults] = useState<SearchResultsData>({contacts: getLocalUsers(), groups: [], others: []});
  const [topPeople, setTopPeople] = useState<User[]>([]);
  const teamSize = teamState.teamSize();
  const [hasFederationError, setHasFederationError] = useState(false);
  const currentSearchQuery = useRef('');

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
    const knownContactIds = searchResults.contacts.map(({id}) => id);
    const newContacts = contacts.filter(({id}) => !knownContactIds.includes(id));
    const nonExternalContacts = await teamRepository.filterExternals(newContacts);
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
      const allLocalUsers = getLocalUsers();

      const query = SearchRepository.normalizeQuery(searchQuery);
      if (!query) {
        setResults({contacts: allLocalUsers, groups: [], others: []});
        return;
      }

      const searchRemote = canSearchUnconnectedUsers;
      // Contacts, groups and others
      const trimmedQuery = searchQuery.trim();
      const isHandle = trimmedQuery.startsWith('@') && validateHandle(query);

      const localSearchSources = searchRemote ? conversationState.connectedUsers() : allLocalUsers;

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
      if (searchRemote) {
        try {
          const userEntities = await searchRepository.searchByName(query, isHandle);
          const results = userState.self().inTeam()
            ? await organizeTeamSearchResults(userEntities, localSearchResults, query)
            : {...localSearchResults, others: userEntities};

          if (currentSearchQuery.current === searchQuery) {
            // Only update the results if the query that has been processed correspond to the current search query
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
    };
  }, [searchQuery]);

  const openContact = async (user: User) => {
    const conversationEntity = await actions.getOrCreate1to1Conversation(user);
    actions.open1to1Conversation(conversationEntity);
  };

  const openOther = (user: User) => {
    if (user.isOutgoingRequest()) {
      return openContact(user);
    }
    return mainViewModel.content.userModal.showUser(user);
  };

  const openConversation = (conversation: Conversation): Promise<void> => {
    return actions.openGroupConversation(conversation).then(close);
  };

  return (
    <div>
      {!hasResults && (
        <>
          {!canSearchUnconnectedUsers ? (
            <span className="start-ui-no-contacts__icon">
              <Icon.People />
            </span>
          ) : (
            <div className="start-ui-no-contacts" data-bind="text: t('searchNoContactsOnWire', brandName)"></div>
          )}
        </>
      )}

      {hasFederationError && (
        <div className="start-ui-fed-domain-unavailable">
          <div className="start-ui-fed-domain-unavailable__head">{t('searchConnectWithOtherDomain')}</div>
          <span className="start-ui-fed-domain-unavailable__text">{t('searchFederatedDomainNotAvailable')}</span>
          {/*FIXME: re-enable when federation article is available
                <a className="start-ui-fed-domain-unavailable__link" rel="nofollow noopener noreferrer" target="_blank" data-bind="attr: {href: ''}, text: t('searchFederatedDomainNotAvailableLearnMore')"></a>
            */}
        </div>
      )}

      {!hasFederationError && !hasResults && (
        <>
          {!canSearchUnconnectedUsers && (
            <div className="start-ui-no-search-results__content">
              <span className="start-ui-no-search-results__icon">
                <Icon.Message />
              </span>
              <div
                className="start-ui-no-search-results__text"
                data-bind="text: t('searchNoMatchesPartner')"
                data-uie-name="label-no-search-result"
              ></div>
            </div>
          )}
          {isFederated ? (
            <div className="start-ui-fed-wrapper">
              <span className="start-ui-fed-wrapper__icon">
                <Icon.Profile />
              </span>
              <div className="start-ui-fed-wrapper__text">{t('searchTrySearchFederation')}</div>
              <div className="start-ui-fed-wrapper__button">
                {/*FIXME: re-enable when federation article is available
                <button type="button" data-bind="click: () => {}" data-uie-name="do-search-learn-more">
                  {t('searchTrySearchLearnMore')}
                </button>
          */}
              </div>
            </div>
          ) : (
            <div className="start-ui-no-search-results">{t('searchTrySearch')}</div>
          )}
        </>
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
                  <span className="center-column">{t('searchMemberInvite')}</span>
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
                  <span className="center-column">{t('searchCreateGroup')}</span>
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
                  <span className="center-column">{t('searchCreateGuestRoom')}</span>
                </button>
              </li>
            )}
          </ul>
          {topPeople.length > 0 && (
            <div className="start-ui-list-top-people" data-uie-name="status-top-people">
              <h3 className="start-ui-list-header start-ui-list-header-top-people">{t('searchTopPeople')}</h3>
              <div className="search-list-theme-black">
                <div className="top-people">
                  <TopPeople users={topPeople} clickOnUser={openContact} />
                </div>
              </div>
            </div>
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
                onClick={user => openContact(user)}
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
              <GroupList groups={results.groups} click={openConversation} />
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
                onClick={openOther}
                mode={UserlistMode.OTHERS}
                conversationRepository={conversationRepository}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
