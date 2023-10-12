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

import {forwardRef, useCallback, useEffect, useMemo, useState} from 'react';

import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data/';
import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {Icon} from 'Components/Icon';
import {ConversationProtocolDetails} from 'Components/panel/ConversationProtocolDetails/ConversationProtocolDetails';
import {EnrichedFields} from 'Components/panel/EnrichedFields';
import {PanelActions} from 'Components/panel/PanelActions';
import {ServiceDetails} from 'Components/panel/ServiceDetails';
import {UserDetails} from 'Components/panel/UserDetails';
import {ServiceList} from 'Components/ServiceList/ServiceList';
import {UserSearchableList} from 'Components/UserSearchableList';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {sortUsersByPriority} from 'Util/StringUtil';
import {formatDuration} from 'Util/TimeUtil';

import {ConversationDetailsBottomActions} from './components/ConversationDetailsBottomActions';
import {ConversationDetailsHeader} from './components/ConversationDetailsHeader';
import {ConversationDetailsOptions} from './components/ConversationDetailsOptions';
import {getConversationActions} from './utils/getConversationActions';

import {ConversationRepository} from '../../../conversation/ConversationRepository';
import {ConversationVerificationState} from '../../../conversation/ConversationVerificationState';
import {getNotificationText} from '../../../conversation/NotificationSetting';
import {Conversation} from '../../../entity/Conversation';
import {User} from '../../../entity/User';
import {isServiceEntity} from '../../../guards/Service';
import {IntegrationRepository} from '../../../integration/IntegrationRepository';
import {ServiceEntity} from '../../../integration/ServiceEntity';
import {SearchRepository} from '../../../search/SearchRepository';
import {TeamRepository} from '../../../team/TeamRepository';
import {TeamState} from '../../../team/TeamState';
import {Shortcut} from '../../../ui/Shortcut';
import {ShortcutType} from '../../../ui/ShortcutType';
import {ActionsViewModel} from '../../../view_model/ActionsViewModel';
import {PanelHeader} from '../PanelHeader';
import {PanelEntity, PanelState} from '../RightSidebar';

const CONFIG = {
  MAX_USERS_VISIBLE: 7,
  REDUCED_USERS_COUNT: 5,
};

interface ConversationDetailsProps {
  onClose?: () => void;
  togglePanel?: (panel: PanelState, entity: PanelEntity, addMode?: boolean, direction?: 'left' | 'right') => void;
  actionsViewModel: ActionsViewModel;
  activeConversation: Conversation;
  conversationRepository: ConversationRepository;
  integrationRepository: IntegrationRepository;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  teamState: TeamState;
  selfUser: User;
  isFederated?: boolean;
}

const ConversationDetails = forwardRef<HTMLDivElement, ConversationDetailsProps>(
  (
    {
      onClose = () => {},
      togglePanel = () => {},
      actionsViewModel,
      activeConversation,
      conversationRepository,
      integrationRepository,
      searchRepository,
      teamRepository,
      teamState,
      selfUser,
      isFederated = false,
    },
    ref,
  ) => {
    const [selectedService, setSelectedService] = useState<ServiceEntity>();

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

    const {
      isTeam,
      classifiedDomains,
      team,
      isSelfDeletingMessagesEnabled,
      isSelfDeletingMessagesEnforced,
      getEnforcedSelfDeletingMessagesTimeout,
    } = useKoSubscribableChildren(teamState, [
      'isTeam',
      'classifiedDomains',
      'isSelfDeletingMessagesEnabled',
      'isSelfDeletingMessagesEnforced',
      'getEnforcedSelfDeletingMessagesTimeout',
      'team',
    ]);

    const {
      is_verified: isSelfVerified,
      teamRole,
      isActivatedAccount,
    } = useKoSubscribableChildren(selfUser, ['is_verified', 'teamRole', 'isActivatedAccount']);

    const isActiveGroupParticipant = isGroup && !removedFromConversation;

    const showOptionGuests = isActiveGroupParticipant && !!teamId && roleRepository.canToggleGuests(activeConversation);
    const hasAdvancedNotifications = isMutable && isTeam;
    const showOptionNotificationsGroup = hasAdvancedNotifications && isGroup;
    const showOptionTimedMessages =
      isActiveGroupParticipant && roleRepository.canToggleTimeout(activeConversation) && isSelfDeletingMessagesEnabled;
    const showOptionServices =
      isActiveGroupParticipant && !!teamId && roleRepository.canToggleGuests(activeConversation);
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

    const notificationStatusText = getNotificationText(notificationState);
    const timedMessagesText = isSelfDeletingMessagesEnforced
      ? formatDuration(getEnforcedSelfDeletingMessagesTimeout).text
      : hasTimer && globalMessageTimer
      ? formatDuration(globalMessageTimer).text
      : t('ephemeralUnitsNone');

    const showActionMute = isMutable && !isTeam;
    const isVerified = verificationState === ConversationVerificationState.VERIFIED;

    const canRenameGroup = roleRepository.canRenameGroup(activeConversation);
    const hasReceiptsEnabled = conversationRepository.expectReadReceipt(activeConversation);

    const userParticipants = useMemo(() => {
      const filteredUsers: User[] = participatingUserEts.flatMap(user => {
        const isUser = !isServiceEntity(user);
        return isUser ? [user] : [];
      });

      if (!removedFromConversation) {
        return [...filteredUsers, selfUser].sort(sortUsersByPriority);
      }

      return filteredUsers;
    }, [participatingUserEts, removedFromConversation, selfUser]);

    const usersCount = userParticipants.length;
    const exceedsMaxUserCount = usersCount > CONFIG.MAX_USERS_VISIBLE;
    const allUsersCount = exceedsMaxUserCount ? usersCount : 0;

    const serviceParticipants: ServiceEntity[] = participatingUserEts.flatMap(service => {
      const isService = isServiceEntity(service);
      return isService ? [service] : [];
    });

    const toggleMute = () => actionsViewModel.toggleMuteConversation(activeConversation);

    const openParticipantDevices = () => togglePanel(PanelState.PARTICIPANT_DEVICES, firstParticipant, false, 'left');

    const updateConversationName = (conversationName: string) =>
      conversationRepository.renameConversation(activeConversation, conversationName);

    const openAddParticipants = () => togglePanel(PanelState.ADD_PARTICIPANTS, activeConversation);

    const showUser = (userEntity: User) => togglePanel(PanelState.GROUP_PARTICIPANT_USER, userEntity);

    const showService = async (entity: ServiceEntity) => {
      const serviceEntity = await integrationRepository.getServiceFromUser(entity);

      if (serviceEntity) {
        togglePanel(PanelState.GROUP_PARTICIPANT_SERVICE, {...serviceEntity, id: entity.id});
      }
    };

    const showAllParticipants = () => togglePanel(PanelState.CONVERSATION_PARTICIPANTS, activeConversation);

    const showNotifications = () => togglePanel(PanelState.NOTIFICATIONS, activeConversation);

    const updateConversationReceiptMode = (receiptMode: RECEIPT_MODE) =>
      conversationRepository.updateConversationReceiptMode(activeConversation, {receipt_mode: receiptMode});

    const isSingleUserMode = is1to1 || isRequest;

    const isServiceMode = isSingleUserMode && firstParticipant.isService;

    const getService = useCallback(async () => {
      if (firstParticipant) {
        const serviceEntity = await integrationRepository.getServiceFromUser(firstParticipant);

        if (serviceEntity) {
          setSelectedService(serviceEntity);
          await integrationRepository.addProviderNameToParticipant(serviceEntity);
        }
      }
    }, [firstParticipant]);

    const conversationActions = getConversationActions(
      activeConversation,
      actionsViewModel,
      conversationRepository,
      teamRole,
      isServiceMode,
      isTeam,
    );

    useEffect(() => {
      conversationRepository.refreshUnavailableParticipants(activeConversation);
    }, [activeConversation, conversationRepository]);

    useEffect(() => {
      if (isTeam && isSingleUserMode) {
        teamRepository.updateTeamMembersByIds(team, [firstParticipant.id], true);
      }
    }, [firstParticipant, isSingleUserMode, isTeam, team, teamRepository]);

    useEffect(() => {
      getService();
    }, [getService]);

    return (
      <div
        id="conversation-details"
        className="panel__page conversation-details"
        ref={ref}
        tabIndex={TabIndex.FOCUSABLE}
      >
        <h2 className="visually-hidden">{t('tooltipConversationInfo')}</h2>

        <PanelHeader
          isReverse
          showBackArrow={false}
          onClose={onClose}
          showActionMute={showActionMute}
          showNotificationsNothing={showNotificationsNothing}
          onToggleMute={toggleMute}
        />

        <FadingScrollbar className="panel__content">
          {isSingleUserMode && isServiceMode && selectedService && <ServiceDetails service={selectedService} />}

          {isSingleUserMode && !isServiceMode && firstParticipant && (
            <>
              <UserDetails
                participant={firstParticipant}
                isVerified={isVerified}
                isSelfVerified={isSelfVerified}
                badge={teamRepository.getRoleBadge(firstParticipant.id)}
                classifiedDomains={classifiedDomains}
              />

              <EnrichedFields user={firstParticipant} showDomain={isFederated} />
            </>
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
                conversationProtocol={activeConversation.protocol}
              />

              {showTopActions && showActionAddParticipants && (
                <div className="conversation-details__participant-options">
                  <button
                    className="panel__action-item"
                    type="button"
                    title={t(
                      'tooltipConversationDetailsAddPeople',
                      Shortcut.getShortcutTooltip(ShortcutType.ADD_PEOPLE),
                    )}
                    onClick={openAddParticipants}
                    data-uie-name="go-add-people"
                  >
                    <span className="panel__action-item__icon">
                      <Icon.Plus />
                    </span>

                    <span className="panel__action-item__text">{t('conversationDetailsActionAddParticipants')}</span>

                    <Icon.ChevronRight className="chevron-right-icon" />
                  </button>
                </div>
              )}

              <div className="conversation-details__participants">
                {isGroup && !!userParticipants.length && (
                  <>
                    <UserSearchableList
                      dataUieName="list-users"
                      users={userParticipants}
                      onClick={showUser}
                      noUnderline
                      searchRepository={searchRepository}
                      teamRepository={teamRepository}
                      conversationRepository={conversationRepository}
                      conversation={activeConversation}
                      truncate
                      showEmptyAdmin
                      selfFirst={false}
                      selfUser={selfUser}
                      noSelfInteraction
                    />

                    {allUsersCount > 0 && (
                      <button
                        type="button"
                        className="panel__action-item panel__action-item--no-border"
                        onClick={showAllParticipants}
                        data-uie-name="go-conversation-participants"
                      >
                        <span className="panel__action-item__icon">
                          <Icon.People />
                        </span>

                        <span className="panel__action-item__text">
                          {t('conversationDetailsActionConversationParticipants', allUsersCount)}
                        </span>

                        <Icon.ChevronRight className="chevron-right-icon" />
                      </button>
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
                  <h3 className="conversation-details__list-head">{t('conversationDetailsServices')}</h3>

                  <ServiceList
                    services={serviceParticipants}
                    onServiceClick={showService}
                    dataUieName="list-services"
                  />
                </div>
              )}
            </>
          )}

          {isActivatedAccount && (
            <>
              <ConversationDetailsBottomActions
                isDeviceActionEnabled={
                  !!(
                    isSingleUserMode &&
                    firstParticipant &&
                    (firstParticipant.isConnected() || firstParticipant.inTeam())
                  )
                }
                showDevices={openParticipantDevices}
                showNotifications={showNotifications}
                notificationStatusText={notificationStatusText}
                showOptionNotifications1To1={showOptionNotifications1To1}
              />

              {isSingleUserMode && (
                <div className="conversation-details__read-receipts" data-uie-name="label-1to1-read-receipts">
                  <strong className="panel__info-text panel__info-text--head panel__info-text--margin-bottom">
                    {hasReceiptsEnabled
                      ? t('conversationDetails1to1ReceiptsHeadEnabled')
                      : t('conversationDetails1to1ReceiptsHeadDisabled')}
                  </strong>

                  <p className="panel__info-text panel__info-text--margin-bottom">
                    {t('conversationDetails1to1ReceiptsFirst')}
                  </p>

                  <p className="panel__info-text panel__info-text--margin">
                    {t('conversationDetails1to1ReceiptsSecond')}
                  </p>
                </div>
              )}

              <PanelActions items={conversationActions} />
            </>
          )}

          <ConversationProtocolDetails
            protocol={activeConversation.protocol}
            cipherSuite={activeConversation.cipherSuite}
          />
        </FadingScrollbar>
      </div>
    );
  },
);

ConversationDetails.displayName = 'ConversationDetails';

export {ConversationDetails};
