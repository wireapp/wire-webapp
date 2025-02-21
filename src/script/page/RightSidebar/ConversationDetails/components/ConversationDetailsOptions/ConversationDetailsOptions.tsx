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

import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data/';
import {amplify} from 'amplify';

import {HideIcon} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import * as Icon from 'Components/Icon';
import {PanelActions} from 'Components/panel/PanelActions';
import {ReceiptModeToggle} from 'Components/toggle/ReceiptModeToggle';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {replaceReactComponents} from 'Util/LocalizerUtil/ReactLocalizerUtil';

import {ConversationDetailsOption} from './ConversationDetailsOption';

import {ConversationRepository} from '../../../../../conversation/ConversationRepository';
import {ConversationRoleRepository} from '../../../../../conversation/ConversationRoleRepository';
import {isMLSConversation} from '../../../../../conversation/ConversationSelectors';
import {Conversation} from '../../../../../entity/Conversation';
import {User} from '../../../../../entity/User';
import {TeamState} from '../../../../../team/TeamState';
import {ActionsViewModel} from '../../../../../view_model/ActionsViewModel';
import {PanelEntity, PanelState} from '../../../RightSidebar';
import {getConversationActions} from '../../utils/getConversationActions';
import {ConversationDetailsBottomActions} from '../ConversationDetailsBottomActions';

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
}

const ConversationDetailsOptions = ({
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
}: ConversationDetailsOptionsProps) => {
  const {
    isMutable,
    isGroup,
    receiptMode,
    is1to1,
    isRequest,
    isSelfUserRemoved,
    firstUserEntity: firstParticipant,
  } = useKoSubscribableChildren(activeConversation, [
    'isMutable',
    'isGroup',
    'receiptMode',
    'is1to1',
    'isRequest',
    'isSelfUserRemoved',
    'firstUserEntity',
  ]);
  const {isSelfDeletingMessagesEnabled, isTeam} = useKoSubscribableChildren(teamState, [
    'isSelfDeletingMessagesEnabled',
    'isTeam',
  ]);
  const {isActivatedAccount, teamRole} = useKoSubscribableChildren(selfUser, ['isActivatedAccount', 'teamRole']);
  const {isBlocked: isParticipantBlocked} = useKoSubscribableChildren(firstParticipant!, ['isBlocked']);

  const teamId = activeConversation.teamId;

  const isSingleUserMode = is1to1 || isRequest;
  const isServiceMode = isSingleUserMode && firstParticipant!.isService;

  const conversationActions = getConversationActions({
    conversationEntity: activeConversation,
    actionsViewModel,
    conversationRepository,
    teamRole,
    isServiceMode,
    isTeam,
    isParticipantBlocked,
  });

  const isActiveGroupParticipant = isGroup && !isSelfUserRemoved;

  const showOptionGuests = isActiveGroupParticipant && !!teamId && roleRepository.canToggleGuests(activeConversation);
  const showOptionNotificationsGroup = isMutable && isGroup;
  const showOptionTimedMessages =
    isActiveGroupParticipant && roleRepository.canToggleTimeout(activeConversation) && isSelfDeletingMessagesEnabled;
  const showOptionServices =
    isActiveGroupParticipant &&
    !!teamId &&
    roleRepository.canToggleGuests(activeConversation) &&
    !isMLSConversation(activeConversation);
  const showOptionNotifications1To1 = isMutable && !isGroup;
  const showOptionReadReceipts = !!teamId && roleRepository.canToggleReadReceipts(activeConversation);

  const hasReceiptsEnabled = conversationRepository.expectReadReceipt(activeConversation);

  const openNotificationsPanel = () => togglePanel(PanelState.NOTIFICATIONS, activeConversation);

  const openTimedMessagePanel = () => togglePanel(PanelState.TIMED_MESSAGES, activeConversation);

  const openGuestPanel = () => togglePanel(PanelState.GUEST_OPTIONS, activeConversation);

  const openServicePanel = () => togglePanel(PanelState.SERVICES_OPTIONS, activeConversation);

  const showNotifications = () => togglePanel(PanelState.NOTIFICATIONS, activeConversation);

  const openParticipantDevices = () => togglePanel(PanelState.PARTICIPANT_DEVICES, firstParticipant!, false, 'left');

  return (
    <div className="conversation-details__options">
      {isGroup && <h3 className="conversation-details__list-head">{t('conversationDetailsOptions')}</h3>}

      <ul>
        {showOptionNotificationsGroup && (
          <ConversationDetailsOption
            className="conversation-details__notifications"
            onClick={openNotificationsPanel}
            dataUieName="go-notifications"
            icon={<Icon.NotificationIcon />}
            title={t('conversationDetailsActionNotifications')}
            statusUieName="status-notifications"
            statusText={notificationStatusText}
          />
        )}

        {showOptionTimedMessages && (
          <ConversationDetailsOption
            className="conversation-details__timed-messages"
            onClick={openTimedMessagePanel}
            dataUieName="go-timed-messages"
            icon={<Icon.TimerIcon />}
            title={t('conversationDetailsActionTimedMessages')}
            statusUieName="status-timed-messages"
            statusText={timedMessagesText}
          />
        )}

        {showOptionGuests && (
          <ConversationDetailsOption
            className="conversation-details__guest-options"
            onClick={openGuestPanel}
            dataUieName="go-guest-options"
            icon={<Icon.GuestIcon />}
            title={t('conversationDetailsActionGuestOptions')}
            statusUieName="status-allow-guests"
            statusText={guestOptionsText}
          />
        )}

        {showOptionServices && (
          <ConversationDetailsOption
            className="conversation-details__services-options"
            onClick={openServicePanel}
            dataUieName="go-services-options"
            icon={<Icon.ServiceIcon className="service-icon" />}
            title={t('conversationDetailsActionServicesOptions')}
            statusUieName="status-allow-services"
            statusText={servicesOptionsText}
          />
        )}

        {showOptionReadReceipts && (
          <li className="conversation-details__read-receipts">
            <ReceiptModeToggle receiptMode={receiptMode} onReceiptModeChanged={updateConversationReceiptMode} />
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
                      ? t('conversationDetails1to1ReceiptsHeadEnabled')
                      : t('conversationDetails1to1ReceiptsHeadDisabled')}
                  </p>
                  <p className="panel__action-item__status">{t('conversationDetails1to1ReceiptsFirst')}</p>
                  <p className="panel__action-item__status">
                    {replaceReactComponents(t('conversationDetails1to1ReceiptsSecond'), [
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
};

export {ConversationDetailsOptions};
