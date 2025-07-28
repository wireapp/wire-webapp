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

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import cx from 'classnames';
import {container} from 'tsyringe';

import {showInviteModal} from 'Components/Modals/InviteModal';
import {showServiceModal} from 'Components/Modals/ServiceModal';
import {showUserModal} from 'Components/Modals/UserModal';
import {SearchInput} from 'Components/SearchInput';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {User} from 'Repositories/entity/User';
import {IntegrationRepository} from 'Repositories/integration/IntegrationRepository';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {SearchRepository} from 'Repositories/search/SearchRepository';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {generatePermissionHelpers} from 'Repositories/user/UserPermission';
import {UserRepository} from 'Repositories/user/UserRepository';
import {UserState} from 'Repositories/user/UserState';
import {SidebarTabs, useSidebarStore} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {MainViewModel} from 'src/script/view_model/MainViewModel';
import {t} from 'Util/LocalizerUtil';

import {PeopleTab, SearchResultsData} from './PeopleTab';
import {ServicesTab} from './ServicesTab';

import {Config} from '../../../../Config';
import {ListWrapper} from '../ListWrapper';

type StartUIProps = {
  conversationRepository: ConversationRepository;
  conversationState?: ConversationState;
  integrationRepository: IntegrationRepository;
  isFederated: boolean;
  mainViewModel: MainViewModel;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  selfUser: User;
  teamState?: TeamState;
  userRepository: UserRepository;
  userState?: UserState;
};

const enum Tabs {
  PEOPLE,
  SERVICES,
}

const StartUI: React.FC<StartUIProps> = ({
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
  selfUser,
}) => {
  const brandName = Config.getConfig().BRAND_NAME;
  const {canInviteTeamMembers, canSearchUnconnectedUsers, canManageServices, canChatWithServices} =
    generatePermissionHelpers(selfUser.teamRole());

  useEffect(() => {
    void conversationRepository.loadMissingConversations();
  }, [conversationRepository]);

  const actions = mainViewModel.actions;
  const isTeam = teamState.isTeam();
  const defaultProtocol = teamState.teamFeatures()?.mls?.config.defaultProtocol;
  const areServicesSupportedByProtocol = defaultProtocol !== ConversationProtocol.MLS;
  const showServiceTab = isTeam && canChatWithServices() && areServicesSupportedByProtocol;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(Tabs.PEOPLE);

  const {setCurrentTab: setCurrentSidebarTab} = useSidebarStore();

  const peopleSearchResults = useRef<SearchResultsData | undefined>(undefined);

  const openFirstConversation = async (): Promise<void> => {
    if (peopleSearchResults.current) {
      const {contacts} = peopleSearchResults.current;
      if (contacts.length > 0) {
        return openContact(contacts[0]);
      }
    }
  };

  const openContact = async (user: User) => {
    const isSameTeam = user.teamId && selfUser.teamId && user.teamId === selfUser.teamId;
    const has1to1Conversation = conversationState.has1to1ConversationWithUser(user.qualifiedId);

    if (isSameTeam && !has1to1Conversation) {
      return showUserModal({domain: user.domain, id: user.id});
    }

    const conversationEntity = await actions.getOrCreate1to1Conversation(user);
    setCurrentSidebarTab(SidebarTabs.RECENT);
    return actions.open1to1Conversation(conversationEntity);
  };

  const openOther = (user: User) => {
    if (user.isOutgoingRequest()) {
      return openContact(user);
    }

    return showUserModal({domain: user.domain, id: user.id});
  };

  const openService = (service: ServiceEntity) => {
    showServiceModal({
      actionsViewModel: mainViewModel.actions,
      integrationRepository: integrationRepository,
      service: service,
    });
  };

  const openInviteModal = () => showInviteModal({selfUser});

  const before = (
    <div id="start-ui-header" className={cx('start-ui-header', {'start-ui-header-integrations': isTeam})}>
      <div className="start-ui-header-user-input" data-uie-name="enter-search">
        <SearchInput
          input={searchQuery}
          placeholder={t('searchPeopleOnlyPlaceholder')}
          setInput={setSearchQuery}
          onEnter={openFirstConversation}
          forceDark
        />
      </div>
      {showServiceTab && (
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
      <>
        <h2 className="visually-hidden">{t('conversationFooterContacts')}</h2>

        <PeopleTab
          searchQuery={searchQuery}
          isTeam={isTeam}
          isFederated={isFederated}
          teamRepository={teamRepository}
          teamState={teamState}
          selfUser={selfUser}
          userState={userState}
          canSearchUnconnectedUsers={canSearchUnconnectedUsers()}
          conversationState={conversationState}
          searchRepository={searchRepository}
          conversationRepository={conversationRepository}
          canInviteTeamMembers={canInviteTeamMembers()}
          userRepository={userRepository}
          onClickContact={openContact}
          onClickUser={openOther}
          onSearchResults={searchResult => (peopleSearchResults.current = searchResult)}
        />
      </>
    ) : (
      <ServicesTab
        searchQuery={searchQuery}
        canManageServices={canManageServices()}
        integrationRepository={integrationRepository}
        onClickService={openService}
      />
    );

  const footer = !isTeam ? (
    <button className="start-ui-import" onClick={openInviteModal} data-uie-name="show-invite-modal">
      <span className="icon-invite start-ui-import-icon"></span>
      <span>{t('searchInvite', {brandName})}</span>
    </button>
  ) : undefined;

  return (
    <ListWrapper
      id="start-ui"
      headerUieName="status-team-name-search"
      before={before}
      footer={footer}
      hasHeader={false}
    >
      {content}
    </ListWrapper>
  );
};

export {StartUI};
