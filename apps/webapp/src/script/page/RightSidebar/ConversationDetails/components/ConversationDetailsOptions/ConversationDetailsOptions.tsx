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

import {FC} from 'react';

import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data/';

import {Icon} from 'Components/Icon';
import {ReceiptModeToggle} from 'Components/toggle/ReceiptModeToggle';
import {t} from 'Util/LocalizerUtil';

import {ConversationDetailsOption} from './ConversationDetailsOption';

import {Conversation} from '../../../../../entity/Conversation';
import {PanelEntity, PanelState} from '../../../RightSidebar';

interface ConversationDetailsOptionsProps {
  activeConversation: Conversation;
  togglePanel: (state: PanelState, entity: PanelEntity, addMode?: boolean) => void;
  receiptMode: RECEIPT_MODE;
  guestOptionsText: string;
  notificationStatusText: string;
  servicesOptionsText: string;
  timedMessagesText: string;
  showOptionGuests: boolean;
  showOptionNotificationsGroup: boolean;
  showOptionReadReceipts: boolean;
  showOptionServices: boolean;
  showOptionTimedMessages: boolean;
  updateConversationReceiptMode: (receiptMode: RECEIPT_MODE) => void;
}

const ConversationDetailsOptions: FC<ConversationDetailsOptionsProps> = ({
  activeConversation,
  togglePanel,
  receiptMode,
  guestOptionsText,
  notificationStatusText,
  servicesOptionsText,
  showOptionGuests,
  showOptionNotificationsGroup,
  showOptionReadReceipts,
  showOptionServices,
  showOptionTimedMessages,
  timedMessagesText,
  updateConversationReceiptMode,
}) => {
  const openNotificationsPanel = () => togglePanel(PanelState.NOTIFICATIONS, activeConversation);

  const openTimedMessagePanel = () => togglePanel(PanelState.TIMED_MESSAGES, activeConversation);

  const openGuestPanel = () => togglePanel(PanelState.GUEST_OPTIONS, activeConversation);

  const openServicePanel = () => togglePanel(PanelState.SERVICES_OPTIONS, activeConversation);

  return (
    <>
      <h3 className="conversation-details__list-head">{t('conversationDetailsOptions')}</h3>

      <ul>
        {showOptionNotificationsGroup && (
          <ConversationDetailsOption
            className="conversation-details__notifications"
            onClick={openNotificationsPanel}
            dataUieName="go-notifications"
            icon={<Icon.Notification />}
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
            icon={<Icon.Timer />}
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
            icon={<Icon.Guest />}
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
            icon={<Icon.Service className="service-icon" />}
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
      </ul>
    </>
  );
};

export {ConversationDetailsOptions};
