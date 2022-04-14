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

import React, {useRef, useState} from 'react';

import ListWrapper from '../ListWrapper';
import {container} from 'tsyringe';
import {TeamState} from '../../../../team/TeamState';
import {UserState} from '../../../../user/UserState';
import UserInput from 'Components/UserInput';
import {t} from 'Util/LocalizerUtil';
import cx from 'classnames';
import {SearchRepository} from '../../../../search/SearchRepository';
import {generatePermissionHelpers} from '../../../../user/UserPermission';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {ConversationState} from '../../../../conversation/ConversationState';
import {TeamRepository} from '../../../../team/TeamRepository';
import {ConversationRepository} from '../../../../conversation/ConversationRepository';
import {Config} from '../../../../Config';
import {IntegrationRepository} from 'src/script/integration/IntegrationRepository';
import {ServicesTab} from './ServicesTab';
import {PeopleTab, SearchResultsData} from './PeopleTab';
import {MainViewModel} from 'src/script/view_model/MainViewModel';
import {UserRepository} from 'src/script/user/UserRepository';
import {User} from 'src/script/entity/User';
import {Conversation} from 'src/script/entity/Conversation';
import {ServiceEntity} from 'src/script/integration/ServiceEntity';

type StartUIProps = {
  conversationRepository: ConversationRepository;
  conversationState?: ConversationState;
  integrationRepository: IntegrationRepository;
  isFederated: boolean;
  mainViewModel: MainViewModel;
  onClose: () => void;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  teamState?: TeamState;
  userRepository: UserRepository;
  userState?: UserState;
};

const enum Tabs {
  PEOPLE,
  SERVICES,
}

const StartUI: React.FC<StartUIProps> = ({
  onClose,
  userState = container.resolve(UserState),
  teamState = container.resolve(TeamState),
  conversationState = container.resolve(ConversationState),
  conversationRepository,
  searchRepository,
  integrationRepository,
  teamRepository,
  mainViewModel,
  userRepository,
  isFederated,
}) => {
  const brandName = Config.getConfig().BRAND_NAME;
  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);
  const {
    canInviteTeamMembers,
    canSearchUnconnectedUsers,
    canManageServices,
    canChatWithServices,
    canCreateGuestRoom,
    canCreateGroupConversation,
  } = generatePermissionHelpers(selfUser.teamRole());

  const actions = mainViewModel.actions;
  const isTeam = teamState.isTeam();
  const teamName = teamState.teamName();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(Tabs.PEOPLE);

  const peopleSearchResults = useRef<SearchResultsData | undefined>(undefined);

  const openFirstConversation = (): void => {
    if (peopleSearchResults.current) {
      const {contacts, groups} = peopleSearchResults.current;
      if (contacts.length > 0) {
        openContact(contacts[0]);
        return;
      }
      if (groups.length > 0) {
        openConversation(groups[0]);
      }
    }
  };

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
  const openService = (service: ServiceEntity) => {
    mainViewModel.content.serviceModal.showService(service);
  };

  const openConversation = (conversation: Conversation): Promise<void> => {
    return actions.openGroupConversation(conversation).then(close);
  };

  const before = (
    <div id="start-ui-header" className={cx('start-ui-header', {'start-ui-header-integrations': isTeam})}>
      <div className="start-ui-header-user-input" data-uie-name="enter-search">
        <UserInput
          input={searchQuery}
          placeholder={isFederated ? t('searchPlaceholderFederation') : t('searchPlaceholder')}
          selectedUsers={[]}
          setInput={setSearchQuery}
          enter={openFirstConversation}
          forceDark
        />
      </div>
      {isTeam && canChatWithServices() && (
        <ul className="start-ui-list-tabs">
          <li className={`start-ui-list-tab ${activeTab === Tabs.PEOPLE ? 'active' : ''}`}>
            <button
              className="start-ui-list-tab-button"
              type="button"
              disabled={activeTab === Tabs.PEOPLE}
              onClick={() => setActiveTab(Tabs.PEOPLE)}
              data-uie-name="do-add-people"
            >
              {t('searchPeople')}
            </button>
          </li>
          <li className={`start-ui-list-tab ${activeTab === Tabs.SERVICES ? 'active' : ''}`}>
            <button
              className="start-ui-list-tab-button"
              type="button"
              disabled={activeTab === Tabs.SERVICES}
              onClick={() => setActiveTab(Tabs.SERVICES)}
              data-uie-name="do-add-services"
            >
              {t('searchServices')}
            </button>
          </li>
        </ul>
      )}
    </div>
  );

  const content =
    activeTab === Tabs.PEOPLE ? (
      <PeopleTab
        searchQuery={searchQuery}
        isTeam={isTeam}
        isFederated={isFederated}
        teamRepository={teamRepository}
        teamState={teamState}
        userState={userState}
        canSearchUnconnectedUsers={canSearchUnconnectedUsers()}
        conversationState={conversationState}
        searchRepository={searchRepository}
        conversationRepository={conversationRepository}
        canInviteTeamMembers={canInviteTeamMembers()}
        canCreateGroupConversation={canCreateGroupConversation()}
        canCreateGuestRoom={canCreateGuestRoom()}
        userRepository={userRepository}
        onClickContact={openContact}
        onClickConversation={openConversation}
        onClickUser={openOther}
        onSearchResults={searchResult => (peopleSearchResults.current = searchResult)}
      />
    ) : (
      <ServicesTab
        searchQuery={searchQuery}
        canManageServices={canManageServices()}
        integrationRepository={integrationRepository}
        onClickService={openService}
      />
    );

  const footer = !isTeam ? (
    <button
      className="start-ui-import"
      onClick={() => mainViewModel.content.inviteModal.show()}
      data-uie-name="show-invite-modal"
    >
      <span className="icon-invite start-ui-import-icon"></span>
      <span>{t('searchInvite', brandName)}</span>
    </button>
  ) : undefined;

  return (
    <ListWrapper
      id={'start-ui'}
      header={teamName}
      headerUieName="status-team-name-search"
      onClose={onClose}
      before={before}
      footer={footer}
    >
      {content}
    </ListWrapper>
  );
};

export default StartUI;
