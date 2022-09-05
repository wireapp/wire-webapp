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
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import cx from 'classnames';
import {FC, useEffect, useState} from 'react';

import ServiceDetails from 'Components/panel/ServiceDetails';
import Icon from 'Components/Icon';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {Conversation} from '../../../entity/Conversation';
import {ServiceEntity} from '../../../integration/ServiceEntity';
import {ConversationVerificationState} from '../../../conversation/ConversationVerificationState';
import {ConversationRepository} from '../../../conversation/ConversationRepository';
import {User} from '../../../entity/User';
import {Shortcut} from '../../../ui/Shortcut';
import {ShortcutType} from '../../../ui/ShortcutType';
import UserSearchableList from 'Components/UserSearchableList';
import {getNotificationText} from '../../../conversation/NotificationSetting';
import {formatDuration} from 'Util/TimeUtil';
import ServiceList from 'Components/ServiceList';
import PanelActions, {MenuItem} from 'Components/panel/PanelActions';
import PanelHeader from '../PanelHeader';
import {ActionsViewModel} from '../../../view_model/ActionsViewModel';
import {IntegrationRepository} from '../../../integration/IntegrationRepository';
import {ConversationRoleRepository} from '../../../conversation/ConversationRoleRepository';
import {SearchRepository} from '../../../search/SearchRepository';
import {TeamRepository} from '../../../team/TeamRepository';
import {UserState} from '../../../user/UserState';
import {TeamState} from '../../../team/TeamState';
import {PanelViewModel} from '../../../view_model/PanelViewModel';
import {sortUsersByPriority} from 'Util/StringUtil';
import {isServiceEntity} from '../../../guards/Service';
import UserConversationDetails from './UserConversationDetails';
import ConversationDetailsBottomActions from './ConversationDetailsBottomActions';
import ConversationDetailsOptions from './ConversationDetailsOptions';
import ConversationDetailsHeader from './ConversationDetailsHeader';
import * as UserPermission from '../../../user/UserPermission';

const CONFIG = {
  MAX_USERS_VISIBLE: 7,
  REDUCED_USERS_COUNT: 5,
};

interface ConversationDetailsProps {
  actionsViewModel: ActionsViewModel;
  activeConversation: Conversation;
  conversationRepository: ConversationRepository;
  integrationRepository: IntegrationRepository;
  panelViewModel: PanelViewModel;
  roleRepository: ConversationRoleRepository;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  teamState: TeamState;
  userState: UserState;
  isFederated?: boolean;
  isVisible?: boolean;
}

const ConversationDetails: FC<ConversationDetailsProps> = ({
  actionsViewModel,
  activeConversation,
  conversationRepository,
  integrationRepository,
  panelViewModel,
  roleRepository,
  searchRepository,
  teamRepository,
  teamState,
  userState,
  isFederated = false,
  isVisible = false,
}) => {
  const [selectedService, setSelectedService] = useState<ServiceEntity>();

  const [allUsersCount, setAllUsersCount] = useState<number>(0);
  const [userParticipants, setUserParticipants] = useState<User[]>([]);
  const [serviceParticipants, setServiceParticipants] = useState<ServiceEntity[]>([]);

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
  ]);

  const firstParticipant = activeConversation.firstUserEntity();
  const teamId = activeConversation.team_id;

  const {isTeam, classifiedDomains, team} = useKoSubscribableChildren(teamState, [
    'isTeam',
    'classifiedDomains',
    'team',
  ]);

  const {self: selfUser, isActivatedAccount} = useKoSubscribableChildren(userState, ['self', 'isActivatedAccount']);
  const {is_verified: isSelfVerified, teamRole} = useKoSubscribableChildren(selfUser, ['is_verified', 'teamRole']);

  const userPermissions = UserPermission.generatePermissionHelpers(teamRole);
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

  const clickToToggleMute = () => actionsViewModel.toggleMuteConversation(activeConversation);

  const onClose = () => panelViewModel.closePanel();

  const onDevicesClick = () =>
    panelViewModel.togglePanel(PanelViewModel.STATE.PARTICIPANT_DEVICES, {entity: firstParticipant});

  const updateConversationName = (conversationName: string) => {
    conversationRepository.renameConversation(activeConversation, conversationName);
  };

  const onAddParticipants = () =>
    panelViewModel.togglePanel(PanelViewModel.STATE.ADD_PARTICIPANTS, {entity: activeConversation});

  const onShowUserClick = (userEntity: User) =>
    panelViewModel.togglePanel(PanelViewModel.STATE.GROUP_PARTICIPANT_USER, {entity: userEntity});

  const onShowService = (serviceEntity: ServiceEntity) =>
    panelViewModel.togglePanel(PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE, {entity: serviceEntity});

  const onShowAllClick = () =>
    panelViewModel.togglePanel(PanelViewModel.STATE.CONVERSATION_PARTICIPANTS, {entity: activeConversation});

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

  const getConversationActions = (conversationEntity: Conversation): MenuItem[] => {
    if (!conversationEntity) {
      return [];
    }

    const is1to1Action = conversationEntity.is1to1();
    const isSingleUser = is1to1Action || conversationEntity.isRequest();
    const firstUser = conversationEntity.firstUserEntity();

    const allMenuElements = [
      {
        condition: userPermissions.canCreateGroupConversation() && is1to1Action && !isServiceMode,
        item: {
          click: () =>
            amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'conversation_details', firstParticipant),
          icon: 'group-icon',
          identifier: 'go-create-group',
          label: t('conversationDetailsActionCreateGroup'),
        },
      },
      {
        condition: true,
        item: {
          click: () => actionsViewModel.archiveConversation(activeConversation),
          icon: 'archive-icon',
          identifier: 'do-archive',
          label: t('conversationDetailsActionArchive'),
        },
      },
      {
        condition: conversationEntity.isRequest(),
        item: {
          click: () => {
            const userEntity = activeConversation.firstUserEntity();
            const nextConversationEntity = conversationRepository.getNextConversation(activeConversation);

            actionsViewModel.cancelConnectionRequest(userEntity, true, nextConversationEntity);
          },
          icon: 'close-icon',
          identifier: 'do-cancel-request',
          label: t('conversationDetailsActionCancelRequest'),
        },
      },
      {
        condition: conversationEntity.isClearable(),
        item: {
          click: () => actionsViewModel.clearConversation(activeConversation),
          icon: 'eraser-icon',
          identifier: 'do-clear',
          label: t('conversationDetailsActionClear'),
        },
      },
      {
        condition: isSingleUser && (firstUser?.isConnected() || firstUser?.isRequest()),
        item: {
          click: () => {
            const userEntity = activeConversation.firstUserEntity();
            const nextConversationEntity = conversationRepository.getNextConversation(activeConversation);

            actionsViewModel.blockUser(userEntity, true, nextConversationEntity);
          },
          icon: 'block-icon',
          identifier: 'do-block',
          label: t('conversationDetailsActionBlock'),
        },
      },
      {
        condition: conversationEntity.isLeavable() && roleRepository.canLeaveGroup(conversationEntity),
        item: {
          click: () => actionsViewModel.leaveConversation(activeConversation),
          icon: 'leave-icon',
          identifier: 'do-leave',
          label: t('conversationDetailsActionLeave'),
        },
      },
      {
        condition:
          !isSingleUser &&
          isTeam &&
          roleRepository.canDeleteGroup(conversationEntity) &&
          conversationEntity.isCreatedBySelf(),
        item: {
          click: () => actionsViewModel.deleteConversation(activeConversation),
          icon: 'delete-icon',
          identifier: 'do-delete',
          label: t('conversationDetailsActionDelete'),
        },
      },
    ];

    return allMenuElements.filter(menuElement => menuElement.condition).map(menuElement => menuElement.item);
  };

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

  return (
    <div
      id="conversation-details"
      className={cx('panel__page conversation-details', {'panel__page--visible': isVisible})}
    >
      <PanelHeader
        className="panel__header--reverse"
        onClose={onClose}
        showActionMute={showActionMute}
        showNotificationsNothing={showNotificationsNothing}
        onToggleMute={clickToToggleMute}
      />

      <div className="panel__content" data-bind="fadingscrollbar">
        {isSingleUserMode && isServiceMode && selectedService && <ServiceDetails service={selectedService} />}

        {isSingleUserMode && !isServiceMode && firstParticipant && (
          <UserConversationDetails
            firstParticipant={firstParticipant}
            isVerified={isVerified}
            isSelfVerified={isSelfVerified}
            isFederated={isFederated}
            badge={teamRepository.getRoleBadge(firstParticipant.id)}
            classifiedDomains={classifiedDomains}
            onDevicesClick={onDevicesClick}
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
                  onClick={onAddParticipants}
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
                        onClick={onShowUserClick}
                        noUnderline
                        // arrow
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
                          data-bind="click: clickOnShowAll"
                          onClick={onShowAllClick}
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
                togglePanel={panelViewModel.togglePanel}
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
                  click={onShowService}
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
              notificationStatusText={notificationStatusText}
              showOptionNotifications1To1={showOptionNotifications1To1}
              isSingleUserMode={isSingleUserMode}
              hasReceiptsEnabled={hasReceiptsEnabled}
            />

            <PanelActions items={getConversationActions(activeConversation)} />
          </>
        )}
      </div>
    </div>
  );
};

export default ConversationDetails;

registerReactComponent('conversation-details', ConversationDetails);
