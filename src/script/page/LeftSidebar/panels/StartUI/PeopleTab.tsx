import React, {useState} from 'react';
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

type SearchResultsData = {contacts: User[]; groups: Conversation[]; others: User[]};

export const PeopleTab: React.FC<{
  canCreateGroupConversation: boolean;
  canCreateGuestRoom: boolean;
  canInviteTeamMembers: boolean;
  canSearchUnconnectedUsers: boolean;
  close: () => void;
  conversationRepository: ConversationRepository;
  conversationState: ConversationState;
  isTeam: boolean;
  mainViewModel: MainViewModel;
  searchQuery: string;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  teamState: TeamState;
  userState: UserState;
}> = ({
  close,
  searchQuery,
  isTeam,
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
}) => {
  const actions = mainViewModel.actions;
  const getLocalUsers = () => {
    return isTeam ? teamState.teamUsers() : userState.connectedUsers();
  };
  const [results, setResults] = useState<SearchResultsData>({contacts: getLocalUsers(), groups: [], others: []});

  const searchOnFederatedDomain = () => '';

  const manageTeamUrl = getManageTeamUrl('client_landing');
  const showTopPeople = false;

  const getTopPeople = () => {
    return conversationRepository
      .getMostActiveConversations()
      .then(conversationEntities => {
        return conversationEntities
          .filter(conversation => conversation.is1to1())
          .slice(0, 6)
          .map(conversation => conversation.participating_user_ids()[0]);
      })
      .then(userIds => this.userRepository.getUsersById(userIds))
      .then(userEntities => userEntities.filter(userEntity => !userEntity.isBlocked()));
  };

  useDebounce(
    async () => {
      const allLocalUsers = getLocalUsers();

      const query = SearchRepository.normalizeQuery(searchQuery);
      if (!query) {
        setResults({...results, contacts: allLocalUsers});
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
        const userEntities = await searchRepository.searchByName(query, isHandle);
        setResults({...localSearchResults, others: userEntities});
      }
    },
    300,
    [searchQuery],
  );

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
      {searchQuery.length === 0 && (
        <>
          <ul className="start-ui-list left-list-items">
            {canInviteTeamMembers && !!manageTeamUrl && (
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
          {showTopPeople && (
            <div className="start-ui-list-top-people" data-uie-name="status-top-people">
              <h3 className="start-ui-list-header start-ui-list-header-top-people">{t('searchTopPeople')}</h3>
              <div className="search-list-theme-black">
                <TopPeople users={topUsers} clickOnUser={openContact} />
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
            <UserList
              //className="search-list-theme-black"
              onClick={user => openContact(user)}
              conversationRepository={conversationRepository}
              mode={UserlistMode.COMPACT}
              users={results.contacts}
            />
          </div>
        )}
        {results.groups.length > 0 && (
          <div className="start-ui-groups">
            {isTeam ? (
              <h3 className="start-ui-list-header">{t('searchTeamGroups')}</h3>
            ) : (
              <h3 className="start-ui-list-header">{t('searchGroups')}</h3>
            )}
            <GroupList groups={results.groups} click={openConversation} />
          </div>
        )}
        {results.others.length > 0 && (
          <div className="others">
            <h3 className="start-ui-list-header">
              {searchOnFederatedDomain() ? t('searchOthersFederation', searchOnFederatedDomain()) : t('searchOthers')}
            </h3>
            <UserList
              //className="search-list-theme-black"
              users={results.others}
              onClick={openOther}
              mode={UserlistMode.OTHERS}
              conversationRepository={conversationRepository}
            />
          </div>
        )}
      </div>
    </div>
  );
  /*
            <!-- ko if: showNoMatches() -->
              <!-- ko if: showOnlyConnectedUsers() -->
                <people-icon className="start-ui-no-contacts__icon"></people-icon>
              <!-- /ko -->
              <!-- ko ifnot: showOnlyConnectedUsers() -->
                <div className="start-ui-no-contacts" data-bind="text: t('searchNoContactsOnWire', brandName)"></div>
              <!-- /ko -->
            <!-- /ko -->

            <!-- ko if: showFederatedDomainNotAvailable() -->
              <div className="start-ui-fed-domain-unavailable">
                <div className="start-ui-fed-domain-unavailable__head" data-bind="text: 'Connect with other domain'"></div>
                <span className="start-ui-fed-domain-unavailable__text" data-bind="text: t('searchFederatedDomainNotAvailable')"></span>
                <!-- FIXME: re-enable when federation article is available
                <a className="start-ui-fed-domain-unavailable__link" rel="nofollow noopener noreferrer" target="_blank" data-bind="attr: {href: ''}, text: t('searchFederatedDomainNotAvailableLearnMore')"></a>
                -->
              </div>
            <!-- /ko -->

            <!-- ko if: !showFederatedDomainNotAvailable() && showNoSearchResults() -->
              <!-- ko if: showOnlyConnectedUsers() -->
                <div className="start-ui-no-search-results__content">
                  <message-icon className="start-ui-no-search-results__icon"></message-icon>
                  <div className="start-ui-no-search-results__text" data-bind="text: t('searchNoMatchesPartner')" data-uie-name="label-no-search-result"></div>
                </div>
              <!-- /ko -->
              <!-- ko ifnot: showOnlyConnectedUsers() -->
                <!-- ko if: $root.isFederated -->
                  <div className="start-ui-fed-wrapper">
                    <profile-icon className="start-ui-fed-wrapper__icon"></profile-icon>
                    <div className="start-ui-fed-wrapper__text" data-bind="text: t('searchTrySearchFederation')"></div>
                    <div className="start-ui-fed-wrapper__button">
                      <button type="button" data-bind="click: () => {}, text: t('searchTrySearchLearnMore')" data-uie-name="do-search-learn-more" />
                    </div>
                  </div>
                <!-- /ko -->
                <!-- ko ifnot: $root.isFederated -->
                  <div className="start-ui-no-search-results" data-bind="text: t('searchTrySearch')"></div>
                <!-- /ko -->
              <!-- /ko -->
            <!-- /ko -->

  */
};
