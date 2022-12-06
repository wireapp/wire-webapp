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

import {FC, useMemo, useState} from 'react';

import cx from 'classnames';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {Icon} from 'Components/Icon';
import {SearchInput} from 'Components/SearchInput';
import {ServiceList} from 'Components/ServiceList';
import {UserSearchableList} from 'Components/UserSearchableList';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {safeWindowOpen} from 'Util/SanitizationUtil';
import {sortUsersByPriority} from 'Util/StringUtil';

import {ConversationRepository} from '../../../conversation/ConversationRepository';
import {Conversation} from '../../../entity/Conversation';
import {User} from '../../../entity/User';
import {getManageServicesUrl} from '../../../externalRoute';
import {IntegrationRepository} from '../../../integration/IntegrationRepository';
import {ServiceEntity} from '../../../integration/ServiceEntity';
import {SearchRepository} from '../../../search/SearchRepository';
import {TeamRepository} from '../../../team/TeamRepository';
import {TeamState} from '../../../team/TeamState';
import {initFadingScrollbar} from '../../../ui/fadingScrollbar';
import {generatePermissionHelpers} from '../../../user/UserPermission';
import {UserState} from '../../../user/UserState';
import {PanelHeader} from '../PanelHeader';
import {PanelEntity, PanelState} from '../RightSidebar';

const ENABLE_ADD_ACTIONS_LENGTH = 0;
const ENABLE_IS_SEARCHING_LENGTH = 0;

enum PARTICIPANTS_STATE {
  ADD_PEOPLE = 'ADD_PEOPLE',
  ADD_SERVICE = 'ADD_SERVICE',
}

interface AddParticipantsProps {
  activeConversation: Conversation;
  onBack: () => void;
  onClose: () => void;
  conversationRepository: ConversationRepository;
  integrationRepository: IntegrationRepository;
  searchRepository: SearchRepository;
  togglePanel: (panel: PanelState, entity: PanelEntity, addMode?: boolean) => void;
  teamRepository: TeamRepository;
  teamState: TeamState;
  userState: UserState;
}
const AddParticipants: FC<AddParticipantsProps> = ({
  activeConversation,
  onBack,
  onClose,
  conversationRepository,
  integrationRepository,
  searchRepository,
  togglePanel,
  teamRepository,
  teamState,
  userState,
}) => {
  const {
    firstUserEntity,
    inTeam,
    isGroup,
    isGuestAndServicesRoom,
    isServicesRoom,
    isTeamOnly,
    participating_user_ids: participatingUserIds,
  } = useKoSubscribableChildren(activeConversation, [
    'firstUserEntity',
    'inTeam',
    'isGroup',
    'isGuestAndServicesRoom',
    'isServicesRoom',
    'isTeamOnly',
    'participating_user_ids',
  ]);
  const {isTeam, teamMembers, teamUsers} = useKoSubscribableChildren(teamState, ['isTeam', 'teamMembers', 'teamUsers']);
  const {connectedUsers, self: selfUser} = useKoSubscribableChildren(userState, ['connectedUsers', 'self']);
  const {teamRole} = useKoSubscribableChildren(selfUser, ['teamRole']);
  const {services} = useKoSubscribableChildren(integrationRepository, ['services']);

  const {canManageServices} = generatePermissionHelpers(teamRole);

  const [currentState, setCurrentState] = useState<PARTICIPANTS_STATE>(PARTICIPANTS_STATE.ADD_PEOPLE);
  const isAddPeopleState = currentState === PARTICIPANTS_STATE.ADD_PEOPLE;
  const isAddServiceState = currentState === PARTICIPANTS_STATE.ADD_SERVICE;

  const [searchInput, setSearchInput] = useState<string>('');
  const [selectedContacts, setSelectedContacts] = useState<User[]>([]);

  const [isInitialServiceSearch, setIsInitialServiceSearch] = useState<boolean>(true);
  const contacts = useMemo(() => {
    let users: User[] = [];

    if (isTeam) {
      const isTeamOrServices = isTeamOnly || isServicesRoom;
      users = isTeamOrServices ? teamMembers.sort(sortUsersByPriority) : teamUsers;
    } else {
      users = connectedUsers;
    }

    return users.filter(userEntity => !participatingUserIds.find(userId => matchQualifiedIds(userEntity, userId)));
  }, [connectedUsers, isServicesRoom, isTeam, isTeamOnly, participatingUserIds, teamMembers, teamUsers]);

  const enabledAddAction = selectedContacts.length > ENABLE_ADD_ACTIONS_LENGTH;

  const headerText = selectedContacts.length
    ? t('addParticipantsHeaderWithCounter', selectedContacts.length)
    : t('addParticipantsHeader');

  const showIntegrations = useMemo(() => {
    const isServicesEnabled = isServicesRoom || isGuestAndServicesRoom;
    const isService = !!firstUserEntity?.isService;
    const allowIntegrations = isGroup || isService;

    return isTeam && allowIntegrations && inTeam && !isTeamOnly && isServicesEnabled;
  }, [firstUserEntity?.isService, inTeam, isGroup, isGuestAndServicesRoom, isServicesRoom, isTeam, isTeamOnly]);

  const manageServicesUrl = getManageServicesUrl('client_landing');
  const isSearching = searchInput.length > ENABLE_IS_SEARCHING_LENGTH;

  const onAddPeople = () => setCurrentState(PARTICIPANTS_STATE.ADD_PEOPLE);

  const searchServices = async (value: string) => {
    await integrationRepository.searchForServices(value);
    setIsInitialServiceSearch(false);
  };

  const onAddServices = async () => {
    setCurrentState(PARTICIPANTS_STATE.ADD_SERVICE);

    await searchServices(searchInput);
  };

  const openManageServices = () => {
    if (manageServicesUrl) {
      safeWindowOpen(manageServicesUrl);
    }
  };

  const onServiceSelect = (entity: ServiceEntity) => togglePanel(PanelState.GROUP_PARTICIPANT_SERVICE, entity, true);

  const addUsers = async () => {
    const userEntities = selectedContacts.slice();

    await conversationRepository.addUsers(activeConversation, userEntities);
  };

  const onAddParticipants = async () => {
    await addUsers();
    onBack();
  };

  const onSearchInput = async (value: string) => {
    if (isAddServiceState) {
      await searchServices(value);
    }
    setSearchInput(value);
  };

  return (
    <div id="add-participants" className="add-participants panel__page">
      <PanelHeader
        showBackArrow
        goBackUie="go-back-add-participants"
        onGoBack={onBack}
        onClose={onClose}
        title={headerText}
        titleDataUieName="status-people-selected"
      />

      <div className="panel__content panel__content--fill">
        <SearchInput
          input={searchInput}
          setInput={onSearchInput}
          selectedUsers={selectedContacts}
          setSelectedUsers={setSelectedContacts}
          placeholder={t('addParticipantsSearchPlaceholder')}
        />

        {showIntegrations && (
          <div className="panel__tabs">
            <div
              role="button"
              tabIndex={0}
              className={cx('panel__tab', {'panel__tab--active': isAddPeopleState})}
              onClick={onAddPeople}
              onKeyDown={event => handleKeyDown(event, onAddPeople)}
              data-uie-name="do-add-people"
            >
              {t('addParticipantsTabsPeople')}
            </div>

            <div
              role="button"
              tabIndex={0}
              className={cx('panel__tab', {'panel__tab--active': isAddServiceState})}
              onClick={onAddServices}
              onKeyDown={event => handleKeyDown(event, onAddServices)}
              data-uie-name="do-add-services"
            >
              {t('addParticipantsTabsServices')}
            </div>
          </div>
        )}

        <div className="add-participants__list panel__content" ref={initFadingScrollbar}>
          {isAddPeopleState && (
            <UserSearchableList
              users={contacts}
              onUpdateSelectedUsers={setSelectedContacts}
              filter={searchInput}
              selected={selectedContacts}
              searchRepository={searchRepository}
              teamRepository={teamRepository}
              conversationRepository={conversationRepository}
            />
          )}

          {isAddServiceState && (
            <>
              {!!services.length && (
                <>
                  {canManageServices() && !!manageServicesUrl && (
                    <ul className="panel-manage-services left-list-items">
                      <li
                        role="presentation"
                        tabIndex={0}
                        className="left-list-item left-list-item-clickable"
                        onClick={openManageServices}
                        onKeyDown={event => handleKeyDown(event, openManageServices)}
                        data-uie-name="go-manage-services"
                      >
                        <div className="left-column-icon left-column-icon-dark">
                          <Icon.Service />
                        </div>

                        <div className="column-center">{t('addParticipantsManageServices')}</div>
                      </li>
                    </ul>
                  )}

                  <ServiceList
                    services={services}
                    click={onServiceSelect}
                    arrow
                    noUnderline
                    isSearching={isSearching}
                  />
                </>
              )}

              {!services.length && !isInitialServiceSearch && (
                <div className="search__no-services">
                  <Icon.Service className="search__no-services__icon" />

                  {canManageServices() && !!manageServicesUrl && (
                    <>
                      <div className="search__no-services__info" data-uie-name="label-no-services-enabled-manager">
                        {t('addParticipantsNoServicesManager')}
                      </div>

                      <Button
                        variant={ButtonVariant.TERTIARY}
                        type="button"
                        tabIndex={0}
                        onClick={openManageServices}
                        onKeyDown={event => handleKeyDown(event, openManageServices)}
                        data-uie-name="go-enable-services"
                        style={{marginTop: '1em'}}
                      >
                        {t('addParticipantsManageServicesNoResults')}
                      </Button>
                    </>
                  )}

                  {!canManageServices() && (
                    <div className="search__no-services__info" data-uie-name="label-no-services-enabled">
                      {t('addParticipantsNoServicesMember')}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {isAddPeopleState && (
          <div className="add-participants__footer">
            <Button type="button" disabled={!enabledAddAction} onClick={onAddParticipants} data-uie-name="do-create">
              {t('addParticipantsConfirmLabel')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export {AddParticipants};
