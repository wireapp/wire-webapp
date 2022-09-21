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

import {RECEIPT_MODE} from '@wireapp/api-client/src/conversation/data/';
import {FC, useEffect, useRef, useState} from 'react';

import Icon from 'Components/Icon';
import ServiceDetails from 'Components/panel/ServiceDetails';
import ServiceList from 'Components/ServiceList';
import PanelActions from 'Components/panel/PanelActions';
import UserSearchableList from 'Components/UserSearchableList';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {sortUsersByPriority} from 'Util/StringUtil';
import {formatDuration} from 'Util/TimeUtil';

import UserConversationDetails from './components/UserConversationDetails/UserConversationDetails';
import ConversationDetailsBottomActions from './components/ConversationDetailsBottomActions/ConversationDetailsBottomActions';
import ConversationDetailsOptions from './components/ConversationDetailsOptions/ConversationDetailsOptions';
import ConversationDetailsHeader from './components/ConversationDetailsHeader/ConversationDetailsHeader';
import getConversationActions from './utils/getConversationActions';

import PanelHeader from '../PanelHeader';

import {ConversationRepository} from '../../../conversation/ConversationRepository';
import {ConversationVerificationState} from '../../../conversation/ConversationVerificationState';
import {getNotificationText} from '../../../conversation/NotificationSetting';
import {Conversation} from '../../../entity/Conversation';
import {User} from '../../../entity/User';
import {isServiceEntity} from '../../../guards/Service';
import {ServiceEntity} from '../../../integration/ServiceEntity';
import {IntegrationRepository} from '../../../integration/IntegrationRepository';
import {SearchRepository} from '../../../search/SearchRepository';
import {TeamRepository} from '../../../team/TeamRepository';
import {TeamState} from '../../../team/TeamState';
import {Shortcut} from '../../../ui/Shortcut';
import {ShortcutType} from '../../../ui/ShortcutType';
import {UserState} from '../../../user/UserState';
import {ActionsViewModel} from '../../../view_model/ActionsViewModel';
import {PanelParams, PanelViewModel} from '../../../view_model/PanelViewModel';
import {initFadingScrollbar} from '../../../ui/fadingScrollbar';

const CONFIG = {
  MAX_USERS_VISIBLE: 1,
  REDUCED_USERS_COUNT: 5,
};

interface ConversationDetailsProps {
  onClose: () => void;
  showDevices: (entity: User) => void;
  togglePanel: (panel: string, params: PanelParams) => void;
  actionsViewModel: ActionsViewModel;
  activeConversation: Conversation;
  conversationRepository: ConversationRepository;
  integrationRepository: IntegrationRepository;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  teamState: TeamState;
  userState: UserState;
  isFederated?: boolean;
}

const ConversationDetails: FC<ConversationDetailsProps> = ({
  onClose,
  showDevices,
  togglePanel,
  actionsViewModel,
  activeConversation,
  conversationRepository,
  integrationRepository,
  searchRepository,
  teamRepository,
  teamState,
  userState,
  isFederated = false,
}) => {
  const panelContentRef = useRef<HTMLDivElement>(null);

  const [selectedService, setSelectedService] = useState<ServiceEntity>();
  const [allUsersCount, setAllUsersCount] = useState<number>(0);
  const [userParticipants, setUserParticipants] = useState<User[]>([]);
  const [serviceParticipants, setServiceParticipants] = useState<ServiceEntity[]>([]);

  const roleRepository = conversationRepository.conversationRoleRepository;

  const {
    isMutable,
    showNotificationsNothing,
    verification_state: verificationState,
    isGroup,
    removed_from_conversation: removedFromConversation,
    display_name: displayName,
    notificationState,
    hasGlobalMessageTimer,
    globalMessageTimer,
    isTeamOnly: isConversationTeamOnly,
    isServicesRoom: isConversationServicesRoomOnly,
    isGuestAndServicesRoom,
    receiptMode,
    is1to1,
    isRequest,
    participating_user_ets: participatingUserEts,
    firstUserEntity: firstParticipant,
  } = useKoSubscribableChildren(activeConversation, [
    'isMutable',
    'showNotificationsNothing',
    'verification_state',
    'isGroup',
    'removed_from_conversation',
    'display_name',
    'notificationState',
    'hasGlobalMessageTimer',
    'globalMessageTimer',
    'isTeamOnly',
    'isServicesRoom',
    'isGuestAndServicesRoom',
    'receiptMode',
    'is1to1',
    'isRequest',
    'participating_user_ets',
    'firstUserEntity',
  ]);

  const teamId = activeConversation.team_id;

  const {isTeam, classifiedDomains, team} = useKoSubscribableChildren(teamState, [
    'isTeam',
    'classifiedDomains',
    'team',
  ]);

  const {self: selfUser, isActivatedAccount} = useKoSubscribableChildren(userState, ['self', 'isActivatedAccount']);
  const {is_verified: isSelfVerified, teamRole} = useKoSubscribableChildren(selfUser, ['is_verified', 'teamRole']);

  const isActiveGroupParticipant = isGroup && !removedFromConversation;

  const showOptionGuests = isActiveGroupParticipant && !!teamId && roleRepository.canToggleGuests(activeConversation);
  const hasAdvancedNotifications = isMutable && isTeam;
  const showOptionNotificationsGroup = hasAdvancedNotifications && isGroup;
  const showOptionTimedMessages = isActiveGroupParticipant && roleRepository.canToggleTimeout(activeConversation);
  const showOptionServices = isActiveGroupParticipant && !!teamId && roleRepository.canToggleGuests(activeConversation);
  const showOptionReadReceipts = !!teamId && roleRepository.canToggleReadReceipts(activeConversation);

  const showSectionOptions =
    showOptionGuests || showOptionNotificationsGroup || showOptionTimedMessages || showOptionServices;
  const showTopActions = isActiveGroupParticipant || showSectionOptions;

  const showActionAddParticipants = isActiveGroupParticipant && roleRepository.canAddParticipants(activeConversation);

  const showOptionNotifications1To1 = hasAdvancedNotifications && !isGroup;

  const hasTimer = hasGlobalMessageTimer;

  const isTeamOnly = isConversationTeamOnly || isConversationServicesRoomOnly;
  const isServicesRoom = isConversationServicesRoomOnly || isGuestAndServicesRoom;

  const guestOptionsText = isTeamOnly ? t('conversationDetailsOff') : t('conversationDetailsOn');
  const servicesOptionsText = isServicesRoom ? t('conversationDetailsOn') : t('conversationDetailsOff');
  const notificationStatusText = notificationState ? getNotificationText(notificationState) : '';
  const timedMessagesText =
    hasTimer && globalMessageTimer ? formatDuration(globalMessageTimer).text : t('ephemeralUnitsNone');

  const showActionMute = isMutable && !isTeam;
  const isVerified = verificationState === ConversationVerificationState.VERIFIED;

  const canRenameGroup = roleRepository.canRenameGroup(activeConversation);
  const hasReceiptsEnabled = conversationRepository.expectReadReceipt(activeConversation);

  const toggleMute = () => actionsViewModel.toggleMuteConversation(activeConversation);

  const openParticipantDevices = () => {
    showDevices(firstParticipant);
  };

  const updateConversationName = (conversationName: string) => {
    conversationRepository.renameConversation(activeConversation, conversationName);
  };

  const openAddParticipants = () => {
    togglePanel(PanelViewModel.STATE.ADD_PARTICIPANTS, {entity: activeConversation});
  };

  const showService = (serviceEntity: ServiceEntity) =>
    togglePanel(PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE, {entity: serviceEntity});

  const showAllParticipants = () =>
    togglePanel(PanelViewModel.STATE.CONVERSATION_PARTICIPANTS, {entity: activeConversation});

  const showNotifications = () => togglePanel(PanelViewModel.STATE.NOTIFICATIONS, {entity: activeConversation});

  const updateConversationReceiptMode = (receiptMode: RECEIPT_MODE) =>
    conversationRepository.updateConversationReceiptMode(activeConversation, {receipt_mode: receiptMode});

  const isSingleUserMode = is1to1 || isRequest;

  const isServiceMode = isSingleUserMode && firstParticipant.isService;

  const getService = async () => {
    const serviceEntity = await integrationRepository.getServiceFromUser(firstParticipant);

    if (serviceEntity) {
      setSelectedService(serviceEntity);
      integrationRepository.addProviderNameToParticipant(serviceEntity);
    }
  };

  const conversationActions = getConversationActions(
    activeConversation,
    actionsViewModel,
    conversationRepository,
    teamRole,
    isServiceMode,
    isTeam,
  );

  useEffect(() => {
    if (isTeam && isSingleUserMode) {
      teamRepository.updateTeamMembersByIds(team, [firstParticipant.id], true);
    }
  }, []);

  useEffect(() => {
    getService();
  }, [firstParticipant, integrationRepository]);

  useEffect(() => {
    const users: User[] = participatingUserEts.flatMap(user => {
      const isUser = !isServiceEntity(user);
      return isUser ? [user] : [];
    });

    const services: ServiceEntity[] = participatingUserEts.flatMap(service => {
      const isService = isServiceEntity(service);
      return isService ? [service] : [];
    });

    setServiceParticipants(services);

    if (!removedFromConversation) {
      users.push(selfUser);
      users.sort(sortUsersByPriority);
    }

    const usersCount = users.length;
    const exceedsMaxUserCount = usersCount > CONFIG.MAX_USERS_VISIBLE;
    setAllUsersCount(exceedsMaxUserCount ? usersCount : 0);
    setUserParticipants(users);
  }, [activeConversation, participatingUserEts.length, removedFromConversation, selfUser]);

  initFadingScrollbar(panelContentRef.current);

  return (
    <div id="conversation-details" className="panel__page conversation-details panel__page--visible">
      <PanelHeader
        isReverse
        showBackArrow={false}
        onClose={onClose}
        showActionMute={showActionMute}
        showNotificationsNothing={showNotificationsNothing}
        onToggleMute={toggleMute}
      />

      <div className="panel__content" ref={panelContentRef}>
        {isSingleUserMode && isServiceMode && selectedService && <ServiceDetails service={selectedService} />}

        {isSingleUserMode && !isServiceMode && firstParticipant && (
          <UserConversationDetails
            firstParticipant={firstParticipant}
            isVerified={isVerified}
            isSelfVerified={isSelfVerified}
            isFederated={isFederated}
            badge={teamRepository.getRoleBadge(firstParticipant.id)}
            classifiedDomains={classifiedDomains}
            onDevicesClick={openParticipantDevices}
          />
        )}

        {!isSingleUserMode && (
          <>
            <ConversationDetailsHeader
              isActiveGroupParticipant={isActiveGroupParticipant}
              canRenameGroup={canRenameGroup}
              displayName={displayName}
              updateConversationName={updateConversationName}
              isGroup={isGroup}
              userParticipants={userParticipants}
              serviceParticipants={serviceParticipants}
              allUsersCount={allUsersCount}
              isTeam={isTeam}
            />

            {showTopActions && showActionAddParticipants && (
              <div className="conversation-details__participant-options">
                <button
                  className="panel__action-item"
                  type="button"
                  title={t('tooltipConversationDetailsAddPeople', Shortcut.getShortcutTooltip(ShortcutType.ADD_PEOPLE))}
                  onClick={openAddParticipants}
                  data-uie-name="go-add-people"
                >
                  <Icon.Plus className="panel__action-item__icon" />
                  <span className="panel__action-item__text">{t('conversationDetailsActionAddParticipants')}</span>
                  <Icon.ChevronRight className="chevron-right-icon" />
                </button>
              </div>
            )}

            <div className="conversation-details__participants">
              {isGroup && (
                <>
                  {!!userParticipants.length && (
                    <>
                      <UserSearchableList
                        data-uie-name="list-users"
                        users={userParticipants}
                        onClick={showDevices}
                        noUnderline
                        searchRepository={searchRepository}
                        teamRepository={teamRepository}
                        conversationRepository={conversationRepository}
                        conversation={activeConversation}
                        truncate
                        showEmptyAdmin
                        selfFirst={false}
                        noSelfInteraction
                      />

                      {allUsersCount > 0 && (
                        <button
                          type="button"
                          className="panel__action-item panel__action-item--no-border"
                          onClick={showAllParticipants}
                          data-uie-name="go-conversation-participants"
                        >
                          <Icon.People className="panel__action-item__icon" />
                          <span className="panel__action-item__text">
                            {t('conversationDetailsActionConversationParticipants', allUsersCount)}
                          </span>
                          <Icon.ChevronRight className="chevron-right-icon" />
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {showTopActions && showSectionOptions && (
              <ConversationDetailsOptions
                activeConversation={activeConversation}
                togglePanel={togglePanel}
                receiptMode={receiptMode}
                guestOptionsText={guestOptionsText}
                notificationStatusText={notificationStatusText}
                servicesOptionsText={servicesOptionsText}
                showOptionGuests={showOptionGuests}
                showOptionNotificationsGroup={showOptionNotificationsGroup}
                showOptionReadReceipts={showOptionReadReceipts}
                showOptionServices={showOptionServices}
                showOptionTimedMessages={showOptionTimedMessages}
                timedMessagesText={timedMessagesText}
                updateConversationReceiptMode={updateConversationReceiptMode}
              />
            )}

            {!!serviceParticipants.length && (
              <div className="conversation-details__participants">
                <div className="conversation-details__list-head">{t('conversationDetailsServices')}</div>

                <ServiceList
                  services={serviceParticipants}
                  click={showService}
                  noUnderline
                  arrow
                  data-uie-name="list-services"
                />
              </div>
            )}
          </>
        )}

        {isActivatedAccount && (
          <>
            <ConversationDetailsBottomActions
              showNotifications={showNotifications}
              notificationStatusText={notificationStatusText}
              showOptionNotifications1To1={showOptionNotifications1To1}
              isSingleUserMode={isSingleUserMode}
              hasReceiptsEnabled={hasReceiptsEnabled}
            />

            <PanelActions items={conversationActions} />
          </>
        )}
      </div>
    </div>
  );
};

export default ConversationDetails;
