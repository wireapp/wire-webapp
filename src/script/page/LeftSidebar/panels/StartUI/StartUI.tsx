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

import cx from 'classnames';
import {container} from 'tsyringe';

import {showInviteModal} from 'Components/Modals/InviteModal';
import {showServiceModal} from 'Components/Modals/ServiceModal';
import {showUserModal} from 'Components/Modals/UserModal';
import {SearchInput} from 'Components/SearchInput';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {IntegrationRepository} from 'src/script/integration/IntegrationRepository';
import {ServiceEntity} from 'src/script/integration/ServiceEntity';
import {UserRepository} from 'src/script/user/UserRepository';
import {MainViewModel} from 'src/script/view_model/MainViewModel';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {PeopleTab, SearchResultsData} from './PeopleTab';
import {ServicesTab} from './ServicesTab';

import {Config} from '../../../../Config';
import {ConversationRepository} from '../../../../conversation/ConversationRepository';
import {ConversationState} from '../../../../conversation/ConversationState';
import {SearchRepository} from '../../../../search/SearchRepository';
import {TeamRepository} from '../../../../team/TeamRepository';
import {TeamState} from '../../../../team/TeamState';
import {generatePermissionHelpers} from '../../../../user/UserPermission';
import {UserState} from '../../../../user/UserState';
import {ListWrapper} from '../ListWrapper';

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

  useEffect(() => {
    void conversationRepository.loadMissingConversations();
  }, [conversationRepository]);

  const actions = mainViewModel.actions;
  const isTeam = teamState.isTeam();
  const teamName = teamState.teamName();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(Tabs.PEOPLE);

  const peopleSearchResults = useRef<SearchResultsData | undefined>(undefined);

  const openFirstConversation = async (): Promise<void> => {
    if (peopleSearchResults.current) {
      const {contacts, groups} = peopleSearchResults.current;
      if (contacts.length > 0) {
        return openContact(contacts[0]);
      }
      if (groups.length > 0) {
        return openConversation(groups[0]);
      }
    }
  };

  const openContact = async (user: User) => {
    const conversationEntity = await actions.getOrCreate1to1Conversation(user);
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

  const openInviteModal = () => showInviteModal({selfUser: userState.self()});

  const openConversation = async (conversation: Conversation): Promise<void> => {
    await actions.openGroupConversation(conversation);
    onClose();
  };

  const before = (
    <div id="start-ui-header" className={cx('start-ui-header', {'start-ui-header-integrations': isTeam})}>
      <div className="start-ui-header-user-input" data-uie-name="enter-search">
        <SearchInput
          input={searchQuery}
          placeholder={t('searchPeoplePlaceholder')}
          selectedUsers={[]}
          setInput={setSearchQuery}
          onEnter={openFirstConversation}
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
      <>
        <h2 className="visually-hidden">{t('conversationFooterContacts')}</h2>

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
      <span>{t('searchInvite', brandName)}</span>
    </button>
  ) : undefined;

  return (
    <ListWrapper
      id="start-ui"
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

export {StartUI};
