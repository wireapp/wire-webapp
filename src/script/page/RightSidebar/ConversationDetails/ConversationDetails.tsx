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

import {forwardRef, useEffect, useMemo, useState} from 'react';

import {CONVERSATION_ACCESS, CONVERSATION_CELLS_STATE} from '@wireapp/api-client/lib/conversation';
import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data/';

import {TabIndex} from '@wireapp/react-ui-kit';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import * as Icon from 'Components/Icon';
import {ConversationProtocolDetails} from 'Components/panel/ConversationProtocolDetails/ConversationProtocolDetails';
import {EnrichedFields} from 'Components/panel/EnrichedFields';
import {ServiceDetails} from 'Components/panel/ServiceDetails';
import {UserDetails} from 'Components/panel/UserDetails';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationVerificationState} from 'Repositories/conversation/ConversationVerificationState';
import {getNotificationText} from 'Repositories/conversation/NotificationSetting';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {IntegrationRepository} from 'Repositories/integration/IntegrationRepository';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {sortUsersByPriority} from 'Util/StringUtil';
import {formatDuration} from 'Util/TimeUtil';

import {ConversationDetailsHeader} from './components/ConversationDetailsHeader';
import {ConversationDetailsOptions} from './components/ConversationDetailsOptions';
import {ConversationDetailsParticipants} from './components/ConversationDetailsParticipants';

import {isServiceEntity} from '../../../guards/Service';
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
      isSelfUserRemoved,
      notificationState,
      hasGlobalMessageTimer,
      globalMessageTimer,
      isTeamOnly: isConversationTeamOnly,
      isServicesRoom: isConversationServicesRoomOnly,
      isGuestAndServicesRoom,
      is1to1,
      isRequest,
      participating_user_ets: participatingUserEts,
      firstUserEntity: firstParticipant,
      isGroupOrChannel,
      cellsState,
    } = useKoSubscribableChildren(activeConversation, [
      'isMutable',
      'showNotificationsNothing',
      'verification_state',
      'isSelfUserRemoved',
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
      'isGroupOrChannel',
      'cellsState',
    ]);

    const {isTemporaryGuest} = useKoSubscribableChildren(firstParticipant!, ['isTemporaryGuest']);

    const {isTeam, classifiedDomains, team, isSelfDeletingMessagesEnforced, getEnforcedSelfDeletingMessagesTimeout} =
      useKoSubscribableChildren(teamState, [
        'isTeam',
        'classifiedDomains',
        'isSelfDeletingMessagesEnforced',
        'getEnforcedSelfDeletingMessagesTimeout',
        'team',
      ]);

    const isActiveGroupParticipant = isGroupOrChannel && !isSelfUserRemoved;

    const showActionAddParticipants = isActiveGroupParticipant && roleRepository.canAddParticipants(activeConversation);

    const hasTimer = hasGlobalMessageTimer;

    const isTeamOnly = isConversationTeamOnly || isConversationServicesRoomOnly;
    const isServicesRoom = isConversationServicesRoomOnly || isGuestAndServicesRoom;

    const guestOptionsText = isTeamOnly ? t('conversationDetailsOff') : t('conversationDetailsOn');
    const servicesOptionsText = isServicesRoom ? t('conversationDetailsOn') : t('conversationDetailsOff');
    const isChannelPublic = activeConversation.accessModes?.includes(CONVERSATION_ACCESS.LINK);

    const isCellsConversation = !!cellsState && cellsState !== CONVERSATION_CELLS_STATE.DISABLED;

    const notificationStatusText = getNotificationText(notificationState);
    function getTimedMessagesText(): string {
      if (isSelfDeletingMessagesEnforced) {
        return formatDuration(getEnforcedSelfDeletingMessagesTimeout).text;
      }
      if (hasTimer && globalMessageTimer) {
        return formatDuration(globalMessageTimer).text;
      }
      if (isCellsConversation) {
        return t('cells.selfDeletingMessage.info');
      }
      return t('ephemeralUnitsNone');
    }

    const timedMessagesText = getTimedMessagesText();

    const showActionMute = isMutable && !isTeam;
    const isVerified = verificationState === ConversationVerificationState.VERIFIED;

    const canRenameGroup = roleRepository.canRenameGroup(activeConversation);

    const userParticipants = useMemo(() => {
      const filteredUsers: User[] = participatingUserEts.flatMap(user => {
        const isUser = !isServiceEntity(user);
        return isUser ? [user] : [];
      });

      if (!isSelfUserRemoved) {
        return [...filteredUsers, selfUser].sort(sortUsersByPriority);
      }

      return filteredUsers;
    }, [participatingUserEts, isSelfUserRemoved, selfUser]);

    const usersCount = userParticipants.length;
    const exceedsMaxUserCount = usersCount > CONFIG.MAX_USERS_VISIBLE;
    const allUsersCount = exceedsMaxUserCount ? usersCount : 0;

    const serviceParticipants: ServiceEntity[] = participatingUserEts.flatMap(service => {
      const isService = isServiceEntity(service);
      return isService ? [service] : [];
    });

    const toggleMute = () => actionsViewModel.toggleMuteConversation(activeConversation);

    const updateConversationName = (conversationName: string) =>
      conversationRepository.renameConversation(activeConversation, conversationName);

    const openAddParticipants = () => togglePanel(PanelState.ADD_PARTICIPANTS, activeConversation);

    const showUser = (userEntity: User) => togglePanel(PanelState.GROUP_PARTICIPANT_USER, userEntity);

    const showService = async (entity: ServiceEntity) => {
      const serviceEntity = await integrationRepository.getServiceFromUser(entity);

      if (serviceEntity) {
        togglePanel(PanelState.GROUP_PARTICIPANT_SERVICE, serviceEntity);
      }
    };

    const showAllParticipants = () => togglePanel(PanelState.CONVERSATION_PARTICIPANTS, activeConversation);

    const updateConversationReceiptMode = (receiptMode: RECEIPT_MODE) =>
      conversationRepository.updateConversationReceiptMode(activeConversation, {receipt_mode: receiptMode});

    const isSingleUserMode = is1to1 || isRequest;
    const isServiceMode = isSingleUserMode && firstParticipant!.isService;

    useEffect(() => {
      void conversationRepository.refreshUnavailableParticipants(activeConversation);
    }, [activeConversation, conversationRepository]);

    useEffect(() => {
      if (team.id && isSingleUserMode) {
        void teamRepository.updateTeamMembersByIds(team.id, [firstParticipant!.id], true);
      }
    }, [firstParticipant, isSingleUserMode, team, teamRepository]);

    useEffect(() => {
      const getService = async () => {
        if (firstParticipant) {
          const serviceEntity = await integrationRepository.getServiceFromUser(firstParticipant);

          if (serviceEntity) {
            setSelectedService(serviceEntity);
            await integrationRepository.addProviderNameToParticipant(serviceEntity);
          }
        }
      };

      void getService();
    }, [firstParticipant, integrationRepository]);

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
                groupId={activeConversation.groupId}
                participant={firstParticipant}
                isVerified={isVerified}
                badge={teamRepository.getRoleBadge(firstParticipant.id)}
                classifiedDomains={classifiedDomains}
              />

              <EnrichedFields
                user={firstParticipant}
                showDomain={isFederated}
                showAvailability={isTeam && !isTemporaryGuest && teamState.isInTeam(firstParticipant)}
              />
            </>
          )}

          {!isSingleUserMode && (
            <>
              <ConversationDetailsHeader
                isActiveGroupParticipant={isActiveGroupParticipant}
                canRenameGroup={canRenameGroup}
                updateConversationName={updateConversationName}
                userParticipants={userParticipants}
                serviceParticipants={serviceParticipants}
                allUsersCount={allUsersCount}
                isTeam={isTeam}
                conversation={activeConversation}
              />

              {showActionAddParticipants && (
                <div className="conversation-details__participant-options">
                  <button
                    className="panel__action-item"
                    type="button"
                    title={t('tooltipConversationDetailsAddPeople', {
                      shortcut: Shortcut.getShortcutTooltip(ShortcutType.ADD_PEOPLE),
                    })}
                    onClick={openAddParticipants}
                    data-uie-name="go-add-people"
                  >
                    <span className="panel__action-item__icon">
                      <Icon.PlusIcon />
                    </span>

                    <span className="panel__action-item__text">{t('conversationDetailsActionAddParticipants')}</span>

                    <Icon.ChevronRight className="chevron-right-icon" />
                  </button>
                </div>
              )}

              {isGroupOrChannel && (!!userParticipants.length || !!serviceParticipants.length) && (
                <ConversationDetailsParticipants
                  activeConversation={activeConversation}
                  allUsersCount={allUsersCount}
                  conversationRepository={conversationRepository}
                  selfUser={selfUser}
                  serviceParticipants={serviceParticipants}
                  showAllParticipants={showAllParticipants}
                  showService={showService}
                  showUser={showUser}
                  userParticipants={userParticipants}
                />
              )}
            </>
          )}

          <ConversationDetailsOptions
            actionsViewModel={actionsViewModel}
            activeConversation={activeConversation}
            conversationRepository={conversationRepository}
            togglePanel={togglePanel}
            guestOptionsText={guestOptionsText}
            notificationStatusText={notificationStatusText}
            roleRepository={conversationRepository.conversationRoleRepository}
            selfUser={selfUser}
            servicesOptionsText={servicesOptionsText}
            teamState={teamState}
            timedMessagesText={timedMessagesText}
            updateConversationReceiptMode={updateConversationReceiptMode}
            isChannelPublic={isChannelPublic}
          />

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
