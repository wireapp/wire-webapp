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
import {PeopleTab} from './PeopleTab';
import {MainViewModel} from 'src/script/view_model/MainViewModel';
import {UserRepository} from 'src/script/user/UserRepository';

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

  const isTeam = teamState.isTeam();
  const teamName = teamState.teamName();
  const teamSize = teamState.teamSize();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(Tabs.PEOPLE);

  const before = (
    <div id="start-ui-header" className={cx('start-ui-header', {'start-ui-header-integrations': isTeam})}>
      <div className="start-ui-header-user-input" data-uie-name="enter-search">
        <UserInput
          input={searchQuery}
          placeholder={isFederated ? t('searchPlaceholderFederation') : t('searchPlaceholder')}
          selectedUsers={[]}
          setInput={setSearchQuery}
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
        close={onClose}
        mainViewModel={mainViewModel}
        canInviteTeamMembers={canInviteTeamMembers()}
        canCreateGroupConversation={canCreateGroupConversation()}
        canCreateGuestRoom={canCreateGuestRoom()}
        userRepository={userRepository}
      />
    ) : (
      <ServicesTab
        searchQuery={searchQuery}
        canManageServices={canManageServices()}
        integrationRepository={integrationRepository}
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
    <ListWrapper id={'start-ui'} header={teamName} onClose={onClose} before={before} footer={footer}>
      {content}
    </ListWrapper>
  );
};

export default StartUI;
