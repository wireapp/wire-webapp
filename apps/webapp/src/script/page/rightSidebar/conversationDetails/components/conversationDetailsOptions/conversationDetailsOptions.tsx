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

import {type ReactElement} from 'react';

import {isUndefined} from '@sindresorhus/is';
import {CONVERSATION_CELLS_STATE} from '@wireapp/api-client/lib/conversation';
import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data/';
import {amplify} from 'amplify';

import {CollectionIcon, HideIcon, HistoryIcon, LockClosedIcon, UnlockedIcon} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {
  CELLS_SELF_USER_DRIVE_ROLE,
  getSelfUserDriveRole,
} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import * as Icon from 'Components/icon';
import {PanelActions} from 'Components/panel/panelActions';
import {ReceiptModeToggle} from 'Components/toggle/ReceiptModeToggle';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationRoleRepository} from 'Repositories/conversation/ConversationRoleRepository';
import {isGroupMLSConversation} from 'Repositories/conversation/ConversationSelectors';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {viewerPermissionFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {replaceReactComponents} from 'Util/localizerUtil/reactLocalizerUtil';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';

import {ConversationDetailsOption} from './conversationDetailsOption';

import {ActionsViewModel} from '../../../../../view_model/ActionsViewModel';
import {PanelEntity, PanelState} from '../../../rightSidebar';
import {getConversationActions} from '../../utils/getConversationActions';
import {ConversationDetailsBottomActions} from '../conversationDetailsBottomActions';

interface ConversationDetailsOptionsProps {
  actionsViewModel: ActionsViewModel;
  activeConversation: Conversation;
  conversationRepository: ConversationRepository;
  togglePanel: (state: PanelState, entity: PanelEntity, addMode?: boolean, direction?: 'left' | 'right') => void;
  guestOptionsText: string;
  notificationStatusText: string;
  roleRepository: ConversationRoleRepository;
  servicesOptionsText: string;
  timedMessagesText: string;
  selfUser: User;
  teamState: TeamState;
  updateConversationReceiptMode: (receiptMode: RECEIPT_MODE) => void;
  isChannelPublic?: boolean;
}

interface ConversationDetailsOptionsContentProps extends ConversationDetailsOptionsProps {
  readonly firstParticipant?: User;
  readonly isParticipantBlocked?: boolean;
}

interface ConversationDetailsOptionsWithParticipantProps extends ConversationDetailsOptionsProps {
  readonly firstParticipant: User;
}

function ConversationDetailsOptions(props: ConversationDetailsOptionsProps): ReactElement {
  const {firstUserEntity: firstParticipant} = useKoSubscribableChildren(props.activeConversation, ['firstUserEntity']);

  if (isUndefined(firstParticipant)) {
    return <ConversationDetailsOptionsContent {...props} />;
  }

  return <ConversationDetailsOptionsWithParticipant {...props} firstParticipant={firstParticipant} />;
}

function ConversationDetailsOptionsWithParticipant({
  firstParticipant,
  ...props
}: ConversationDetailsOptionsWithParticipantProps): ReactElement {
  const {isBlocked: isParticipantBlocked} = useKoSubscribableChildren(firstParticipant, ['isBlocked']);

  return (
    <ConversationDetailsOptionsContent
      {...props}
      firstParticipant={firstParticipant}
      isParticipantBlocked={isParticipantBlocked}
    />
  );
}

function ConversationDetailsOptionsContent({
  actionsViewModel,
  activeConversation,
  conversationRepository,
  togglePanel,
  guestOptionsText,
  notificationStatusText,
  roleRepository,
  selfUser,
  servicesOptionsText,
  timedMessagesText,
  teamState,
  updateConversationReceiptMode,
  isChannelPublic,
  firstParticipant,
  isParticipantBlocked,
}: ConversationDetailsOptionsContentProps): ReactElement {
  const {isFeatureToggleEnabled, translate} = useApplicationContext();
  const {isMutable, receiptMode, is1to1, isRequest, isSelfUserRemoved, isChannel, isGroupOrChannel, cellsState} =
    useKoSubscribableChildren(activeConversation, [
      'isMutable',
      'receiptMode',
      'is1to1',
      'isRequest',
      'isSelfUserRemoved',
      'isChannel',
      'isGroupOrChannel',
      'cellsState',
    ]);
  const {isSelfDeletingMessagesEnabled, isTeam} = useKoSubscribableChildren(teamState, [
    'isSelfDeletingMessagesEnabled',
    'isTeam',
  ]);
  const {isChannelsHistorySharingEnabled, isChannelsEnabled} = useChannelsFeatureFlag();
  const {isActivatedAccount, teamRole} = useKoSubscribableChildren(selfUser, ['isActivatedAccount', 'teamRole']);

  const teamId = activeConversation.teamId;

  const isSingleUserMode = is1to1 || isRequest;
  const isServiceMode = isSingleUserMode && !isUndefined(firstParticipant) && firstParticipant.isService;

  const conversationActions = getConversationActions({
    conversationEntity: activeConversation,
    actionsViewModel,
    conversationRepository,
    teamRole,
    isServiceMode,
    isTeam,
    isParticipantBlocked,
    translate,
  });

  const isActiveGroupParticipant = isGroupOrChannel && !isSelfUserRemoved;
  const isTeamConversation = !!teamId;
  const isCellsConversation = !!cellsState && cellsState !== CONVERSATION_CELLS_STATE.DISABLED;
  const isViewerPermissionFeatureEnabled = isFeatureToggleEnabled(viewerPermissionFeatureToggleName);
  const selfUserDriveRole = getSelfUserDriveRole({conversationTeamId: teamId, selfUserTeamId: selfUser.teamId});
  const showOptionGuests = isActiveGroupParticipant && isTeamConversation;
  const showOptionNotificationsGroup = isMutable && isGroupOrChannel;
  const showOptionTimedMessages = isActiveGroupParticipant && isSelfDeletingMessagesEnabled;
  const showOptionServices = isActiveGroupParticipant && isTeamConversation;
  const showOptionNotifications1To1 = isMutable && !isGroupOrChannel;
  const showOptionReadReceipts = isTeamConversation && !isGroupMLSConversation(activeConversation);
  const showChannelOptions = isChannel && isChannelsEnabled;

  const hasReceiptsEnabled = conversationRepository.expectReadReceipt(activeConversation);

  const canEditGuests = roleRepository.canToggleGuests(activeConversation);
  const canEditTimeout = roleRepository.canToggleTimeout(activeConversation) && !isCellsConversation;
  const canEditReadReceipts = roleRepository.canToggleReadReceipts(activeConversation);

  const openNotificationsPanel = () => togglePanel(PanelState.NOTIFICATIONS, activeConversation);

  const openTimedMessagePanel = () => togglePanel(PanelState.TIMED_MESSAGES, activeConversation);

  const openSharedDrivePanel = () => togglePanel(PanelState.SHARED_DRIVE, activeConversation);

  const openGuestPanel = () => togglePanel(PanelState.GUEST_OPTIONS, activeConversation);

  const openServicePanel = () => togglePanel(PanelState.SERVICES_OPTIONS, activeConversation);

  const showNotifications = () => togglePanel(PanelState.NOTIFICATIONS, activeConversation);

  const openAccessPanel = () => togglePanel(PanelState.ACCESS, activeConversation);

  const openConversationHistoryPanel = () => togglePanel(PanelState.CONVERSATION_HISTORY, activeConversation);

  const openParticipantDevices = () => {
    if (isUndefined(firstParticipant)) {
      throw new Error('Cannot open participant devices without a participant');
    }
    togglePanel(PanelState.PARTICIPANT_DEVICES, firstParticipant, false, 'left');
  };

  const getSharedDriveStatusTranslationKey = () => {
    if (!isViewerPermissionFeatureEnabled) {
      return 'conversationDetailsActionCellsOption';
    }

    return selfUserDriveRole === CELLS_SELF_USER_DRIVE_ROLE.EDITOR
      ? 'cells.sharedDriveAccess.editorAccess'
      : 'cells.sharedDriveAccess.viewerAccess';
  };

  return (
    <div className="conversation-details__options">
      {isGroupOrChannel && (
        <h3 className="conversation-details__list-head">{translate('conversationDetailsOptions')}</h3>
      )}

      <ul>
        {showChannelOptions && (
          <>
            <ConversationDetailsOption
              className="conversation-details__access"
              onClick={openAccessPanel}
              dataUieName="go-access"
              icon={isChannelPublic ? <UnlockedIcon /> : <LockClosedIcon width={14} height={14} />}
              title={translate('conversationAccessTitle')}
              statusUieName="status-access"
              statusText={
                isChannelPublic
                  ? translate('createConversationAccessOptionPublic')
                  : translate('createConversationAccessOptionPrivate')
              }
            />

            {isChannelsHistorySharingEnabled && (
              <ConversationDetailsOption
                className="conversation-details__conversation-history"
                onClick={openConversationHistoryPanel}
                dataUieName="go-conversation-history"
                icon={<HistoryIcon />}
                title={translate('conversationHistoryTitle')}
                statusUieName="status-conversation-history"
                statusText={translate('conversationHistoryOptionDay')}
              />
            )}
          </>
        )}

        {showOptionNotificationsGroup && (
          <ConversationDetailsOption
            className="conversation-details__notifications"
            onClick={openNotificationsPanel}
            dataUieName="go-notifications"
            icon={<Icon.NotificationIcon />}
            title={translate('conversationDetailsActionNotifications')}
            statusUieName="status-notifications"
            statusText={notificationStatusText}
          />
        )}

        {isCellsConversation && (
          <ConversationDetailsOption
            className="conversation-details__cells-info"
            dataUieName={isViewerPermissionFeatureEnabled ? 'go-shared-drive' : 'cells-info'}
            icon={<CollectionIcon />}
            onClick={isViewerPermissionFeatureEnabled ? openSharedDrivePanel : undefined}
            title={translate('conversationDetailsActionCellsTitle')}
            statusUieName="status-cells-info"
            statusText={translate(getSharedDriveStatusTranslationKey())}
            disabled={!isViewerPermissionFeatureEnabled}
          />
        )}

        {showOptionTimedMessages && (
          <ConversationDetailsOption
            className="conversation-details__timed-messages"
            onClick={canEditTimeout ? openTimedMessagePanel : undefined}
            dataUieName="go-timed-messages"
            icon={<Icon.TimerIcon />}
            title={
              isCellsConversation
                ? translate('conversationDetailsActionTimedMessagesDisabled')
                : translate('conversationDetailsActionTimedMessages')
            }
            statusUieName="status-timed-messages"
            statusText={timedMessagesText}
            disabled={!canEditTimeout}
          />
        )}

        {showOptionGuests && (
          <ConversationDetailsOption
            className="conversation-details__guest-options"
            onClick={canEditGuests ? openGuestPanel : undefined}
            dataUieName="go-guest-options"
            icon={<Icon.GuestIcon />}
            title={translate('conversationDetailsActionGuestOptions')}
            statusUieName="status-allow-guests"
            statusText={guestOptionsText}
            disabled={!canEditGuests}
          />
        )}

        {showOptionServices && (
          <ConversationDetailsOption
            className="conversation-details__services-options"
            onClick={canEditGuests ? openServicePanel : undefined}
            dataUieName="go-services-options"
            icon={<Icon.ServiceIcon className="service-icon" />}
            title={translate('conversationDetailsActionAppsOptions')}
            statusUieName="status-allow-services"
            statusText={servicesOptionsText}
            disabled={!canEditGuests}
          />
        )}

        {showOptionReadReceipts && (
          <li className="conversation-details__read-receipts">
            <ReceiptModeToggle
              receiptMode={receiptMode}
              onReceiptModeChanged={updateConversationReceiptMode}
              disabled={!canEditReadReceipts}
            />
          </li>
        )}

        {isActivatedAccount && (
          <>
            <ConversationDetailsBottomActions
              isDeviceActionEnabled={
                !!(
                  isSingleUserMode &&
                  firstParticipant &&
                  (firstParticipant.isConnected() || teamState.isInTeam(firstParticipant))
                )
              }
              showDevices={openParticipantDevices}
              showNotifications={showNotifications}
              notificationStatusText={notificationStatusText}
              showOptionNotifications1To1={showOptionNotifications1To1}
            />

            {isSingleUserMode && (
              <div className="panel__info-item" data-uie-name="label-1to1-read-receipts">
                <span className="panel__info-item__icon">{hasReceiptsEnabled ? <Icon.ReadIcon /> : <HideIcon />}</span>

                <span>
                  <p className="panel__action-item__status-title">
                    {hasReceiptsEnabled
                      ? translate('conversationDetails1to1ReceiptsHeadEnabled')
                      : translate('conversationDetails1to1ReceiptsHeadDisabled')}
                  </p>
                  <p className="panel__action-item__status">{translate('conversationDetails1to1ReceiptsFirst')}</p>
                  <p className="panel__action-item__status">
                    {replaceReactComponents(translate('conversationDetails1to1ReceiptsSecond'), [
                      {
                        start: '[button]',
                        end: '[/button]',
                        render: text => (
                          <button
                            className="button-reset-default"
                            css={{
                              textDecoration: 'underline',
                            }}
                            key={text}
                            onClick={() => amplify.publish(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT)}
                          >
                            {text}
                          </button>
                        ),
                      },
                    ])}
                  </p>
                </span>
              </div>
            )}

            <PanelActions items={conversationActions} />
          </>
        )}
      </ul>
    </div>
  );
}

export {ConversationDetailsOptions};
