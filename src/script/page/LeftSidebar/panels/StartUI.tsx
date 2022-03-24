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

import React, {useState} from 'react';

import ListWrapper from './ListWrapper';
import {container} from 'tsyringe';
import {TeamState} from '../../../team/TeamState';
import {UserState} from '../../../user/UserState';
import UserInput from 'Components/UserInput';
import {t} from 'Util/LocalizerUtil';
import cx from 'classnames';
import useDebounce from '../../../hooks/useDebounce';
import {SearchRepository} from '../../../search/SearchRepository';
import {generatePermissionHelpers} from '../../../user/UserPermission';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {validateHandle} from '../../../user/UserHandleGenerator';
import {ConversationState} from '../../../conversation/ConversationState';
import {TeamRepository} from '../../../team/TeamRepository';
import {ConversationRepository} from '../../../conversation/ConversationRepository';
import {User} from '../../../entity/User';
import {Config} from '../../../Config';

type StartUIProps = {
  conversationRepository: ConversationRepository;
  conversationState?: ConversationState;
  onClose: () => void;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  teamState?: TeamState;
  userState?: UserState;
};

type SearchResultsData = {contacts?: User[]; groups?: unknown[]; others?: User[]};

const SearchResults: React.FC<{results: SearchResultsData}> = ({results}) => {
  return <div> Search Results</div>;
  /*
        <!-- ko if: peopleTabActive() -->
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

          <!-- ko if: showSearchResults() -->
            <div className="start-ui-list-search-results">
              <div className="contacts" data-bind="visible: searchResults.contacts().length > 0">
                <!-- ko if: isTeam() -->
                  <h3 className="start-ui-list-header start-ui-list-header-contacts" data-bind="text: t('searchContacts')"></h3>
                <!-- /ko -->
                <!-- ko ifnot: isTeam() -->
                  <h3 className="start-ui-list-header start-ui-list-header-connections" data-bind="text: t('searchConnections')"></h3>
                <!-- /ko -->
                <user-list className="search-list-theme-black" params="user: searchResults.contacts, filter: searchInput, skipSearch: true, click: clickOnContact, searchRepository: searchRepository, teamRepository: teamRepository, conversationRepository: conversationRepository"></user-list>
              </div>
              <div className="start-ui-groups" data-bind="visible: searchResults.groups().length > 0">
                <!-- ko if: isTeam() -->
                  <h3 className="start-ui-list-header" data-bind="text: t('searchTeamGroups')"></h3>
                <!-- /ko -->
                <!-- ko ifnot: isTeam() -->
                  <h3 className="start-ui-list-header" data-bind="text: t('searchGroups')"></h3>
                <!-- /ko -->
                <group-list params="groups: searchResults.groups, click: clickOnConversation"></group-list>
              </div>
              <div className="others" data-bind="visible: searchResults.others().length > 0">
                <h3 className="start-ui-list-header" data-bind="text: searchOnFederatedDomain() ? t('searchOthersFederation', searchOnFederatedDomain()) : t('searchOthers')"></h3>
                <user-list className="search-list-theme-black" params="user: searchResults.others, click: clickOnOther, mode: UserlistMode.OTHERS, searchRepository: searchRepository, teamRepository: teamRepository, conversationRepository: conversationRepository"></user-list>
              </div>
            </div>
          <!-- /ko -->
        <!-- /ko -->

        <!-- ko ifnot: peopleTabActive() -->
          <!-- ko if: services().length -->
            <!-- ko if: z.userPermission().canManageServices() && !!manageServicesUrl -->
              <ul className="start-ui-manage-services left-list-items">
                <li className="left-list-item">
                  <button
                    className="left-list-item-button"
                    type="button"
                    data-bind="click: clickOpenManageServices"
                    data-uie-name="go-manage-services"
                  >
                    <service-icon className="left-column-icon"></service-icon>
                    <span className="center-column" data-bind="text: t('searchManageServices')"></span>
                  </button>
                </li>
              </ul>
            <!-- /ko -->
            <service-list params="services: services, click: clickOnOther, isSearching: isSearching, noUnderline: true, arrow: true"></service-list>
          <!-- /ko -->
          <!-- ko if: !services().length && !isInitialServiceSearch() -->
            <div className="search__no-services">
              <service-icon className="search__no-services__icon"></service-icon>
              <!-- ko if: z.userPermission().canManageServices() && !!manageServicesUrl -->
                <div className="search__no-services__info" data-bind="text: t('searchNoServicesManager')" data-uie-name="label-no-services-enabled-manager"></div>
                <button
                  className="search__no-services__manage-button"
                  type="button"
                  data-bind="click: clickOpenManageServices, text: t('searchManageServicesNoResults')"
                  data-uie-name="go-enable-services"
                ></button>
              <!-- /ko -->
              <!-- ko ifnot: z.userPermission().canManageServices() -->
                <div className="search__no-services__info" data-bind="text: t('searchNoServicesMember')" data-uie-name="label-no-services-enabled"></div>
              <!-- /ko -->
            </div>
          <!-- /ko -->
        <!-- /ko -->
*/
};

const StartUI: React.FC<StartUIProps> = ({
  onClose,
  userState = container.resolve(UserState),
  teamState = container.resolve(TeamState),
  conversationState = container.resolve(ConversationState),
  conversationRepository,
  searchRepository,
  teamRepository,
}) => {
  const brandName = Config.getConfig().BRAND_NAME;
  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);
  const {canInviteTeamMembers, canSearchUnconnectedUsers} = generatePermissionHelpers();

  const [searchResults, setSearchResults] = useState<SearchResultsData>({});
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const isTeam = teamState.isTeam();
  const teamName = teamState.teamName();
  const teamSize = teamState.teamSize();

  useDebounce(
    async () => {
      if (input.length === 0) {
        return;
      }
      const query = SearchRepository.normalizeQuery(input);
      if (!query) {
        return;
      }

      const searchRemote = canSearchUnconnectedUsers(selfUser.teamRole());
      setLoading(true);
      // Contacts, groups and others
      const trimmedQuery = input.trim();
      const isHandle = trimmedQuery.startsWith('@') && validateHandle(query);

      const allLocalUsers = isTeam ? teamState.teamUsers() : userState.connectedUsers();

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
      };
      setSearchResults(localSearchResults);
      if (searchRemote) {
        const userEntities = await searchRepository.searchByName(query, isHandle);
        setSearchResults({...localSearchResults, others: userEntities});
      }

      setLoading(false);
    },
    300,
    [input],
  );

  const isFederated = false; //TODO

  const before = (
    <div id="start-ui-header" className={cx('start-ui-header', {'start-ui-header-integrations': isTeam})}>
      <div className="start-ui-header-user-input" data-uie-name="enter-search">
        <UserInput
          input={input}
          placeholder={isFederated ? t('searchPlaceholderFederation') : t('searchPlaceholder')}
          selectedUsers={[]}
          setInput={setInput}
          setSelectedUsers={users => {
            //console.log('TODO', users);
          }}
        />
      </div>
      {isTeam && z.userPermission().canChatWithServices() && (
        <ul className="start-ui-list-tabs">
          <li className="start-ui-list-tab" data-bind="css: {'active' : peopleTabActive()}">
            <button
              className="start-ui-list-tab-button"
              type="button"
              data-bind="click: clickOnShowPeople,  disable: peopleTabActive()"
              data-uie-name="do-add-people"
            >
              {t('searchPeople')}
            </button>
          </li>
          <li className="start-ui-list-tab" data-bind="css: {'active' : !peopleTabActive()},">
            <button
              className="start-ui-list-tab-button"
              type="button"
              data-bind="click: clickOnShowServices,  enable: peopleTabActive()"
              data-uie-name="do-add-services"
            >
              {t('searchServices')}
            </button>
          </li>
        </ul>
      )}
    </div>
  );

  const content = loading ? (
    <div className="start-ui-list-spinner">
      <span className="icon-spinner spin"></span>
    </div>
  ) : (
    <SearchResults results={searchResults} />
  );

  const footer = canInviteTeamMembers(selfUser.teamRole()) ? (
    <button className="start-ui-import" data-bind="click: clickToShowInviteModal" data-uie-name="show-invite-modal">
      <span className="icon-invite start-ui-import-icon"></span>
      <span>{t('searchInvite', brandName)}</span>
    </button>
  ) : null;

  return (
    <ListWrapper id={'start-ui'} header={teamName} onClose={onClose} before={before} footer={footer}>
      {content}
      {/*
  <div className="left-list-center start-ui-list-wrapper" data-bind="css: {'split-view': showNoContacts()}">
    <div className="start-ui-list" data-bind="antiscroll: shouldUpdateScrollbar, bordered_list: teamName">
    {content}
    </div>
  </div>

  <!-- ko if: showNoContacts() -->
    <div className="start-ui-import-container"></div>
  <!-- /ko -->

*/}
    </ListWrapper>
  );
};

export default StartUI;
