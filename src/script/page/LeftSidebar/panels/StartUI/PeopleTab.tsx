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
import {noop} from 'underscore';
import GroupList from './components/GroupList';
import {Conversation} from 'src/script/entity/Conversation';

type SearchResultsData = {contacts: User[]; groups: Conversation[]; others: User[]};

export const PeopleTab: React.FC<{
  canSearchUnconnectedUsers: boolean;
  conversationRepository: ConversationRepository;
  conversationState: ConversationState;
  isTeam: boolean;
  searchQuery: string;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  teamState: TeamState;
  userState: UserState;
}> = ({
  searchQuery,
  isTeam,
  teamRepository,
  teamState,
  userState,
  canSearchUnconnectedUsers,
  conversationState,
  searchRepository,
  conversationRepository,
}) => {
  const [results, setResults] = useState<SearchResultsData>({contacts: [], groups: [], others: []});

  useDebounce(
    async () => {
      const allLocalUsers = isTeam ? teamState.teamUsers() : userState.connectedUsers();

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

  return (
    <div>
      <div className="start-ui-list-search-results">
        {results.contacts?.length > 0 && (
          <div className="contacts">
            {isTeam ? (
              <h3 className="start-ui-list-header start-ui-list-header-contacts">{t('searchContacts')}</h3>
            ) : (
              <h3 className="start-ui-list-header start-ui-list-header-connections">{t('searchConnections')}</h3>
            )}
            <UserList
              //className="search-list-theme-black"
              onClick={noop}
              conversationRepository={conversationRepository}
              mode={UserlistMode.COMPACT}
              users={results.contacts}
            />
          </div>
        )}
        {results.groups?.length > 0 && (
          <div className="start-ui-groups">
            {isTeam ? (
              <h3 className="start-ui-list-header">{t('searchTeamGroups')}</h3>
            ) : (
              <h3 className="start-ui-list-header">{t('searchGroups')}</h3>
            )}
            <GroupList groups={results.groups} click={noop} />
          </div>
        )}
        {results.others?.length > 0 && (
          <div className="others">
            <h3 className="start-ui-list-header">
              {false && searchOnFederatedDomain()
                ? t('searchOthersFederation', searchOnFederatedDomain())
                : t('searchOthers')}
            </h3>
            <UserList
              //className="search-list-theme-black"
              users={results.others ?? []}
              onClick={noop}
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

            <!-- ko ifnot: showSearchResults() -->
              <ul className="start-ui-list left-list-items">
                <!-- ko if: showInviteMember() && !!manageTeamUrl -->
                <li className="left-list-item">
                  <button className="left-list-item-button" type="button" data-bind="click: clickOpenManageTeam" data-uie-name="do-invite-member">
                    <span className="left-column-icon icon-envelope"></span>
                    <span className="center-column" data-bind="text: t('searchMemberInvite')"></span>
                  </button>
                </li>
                <!-- /ko -->
                <!-- ko if: z.userPermission().canCreateGroupConversation() -->
                <li className="left-list-item" >
                  <button className="left-list-item-button" type="button" data-bind="click: clickOnCreateGroup" data-uie-name="go-create-group">
                    <group-icon className="left-column-icon"></group-icon>
                    <span className="center-column" data-bind="text: t('searchCreateGroup')"></span>
                  </button>
                </li>
                <!-- /ko -->
                <!-- ko if: z.userPermission().canCreateGuestRoom() && showCreateGuestRoom() -->
                <li className="left-list-item">
                  <button className="left-list-item-button" type="button" data-bind="click: clickOnCreateGuestRoom" data-uie-name="do-create-guest-room">
                    <guest-icon className="left-column-icon"></guest-icon>
                    <span className="center-column" data-bind="text: t('searchCreateGuestRoom')"></span>
                  </button>
                </li>
                <!-- /ko -->
              </ul>
              <!-- ko if: showTopPeople() -->
                <div className="start-ui-list-top-people" data-uie-name="status-top-people">
                  <h3 className="start-ui-list-header start-ui-list-header-top-people" data-bind="text: t('searchTopPeople')"></h3>
                  <top-people className="search-list-theme-black" params="users: topUsers, clickOnUser: clickOnContact"></top-people>
                </div>
              <!-- /ko -->
              <!-- ko if: showContacts() -->
                <div className="start-ui-list-contacts" data-uie-name="status-contacts">
                  <!-- ko if: isTeam() -->
                    <h3 className="start-ui-list-header start-ui-list-header-contacts" data-bind="text: t('searchContacts')"></h3>
                  <!-- /ko -->
                  <!-- ko ifnot: isTeam() -->
                    <h3 className="start-ui-list-header" data-bind="text: t('searchConnections')"></h3>
                  <!-- /ko -->
                  <!-- ko if: isVisible() -->
                    <user-list className="search-list-theme-black" params="user: contacts(), click: clickOnContact, searchRepository: searchRepository, teamRepository: teamRepository, conversationRepository: conversationRepository"></user-list>
                  <!-- /ko -->
                </div>
              <!-- /ko -->
            <!-- /ko -->
  */
};
