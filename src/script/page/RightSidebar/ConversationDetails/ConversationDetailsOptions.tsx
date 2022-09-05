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
import {FC} from 'react';

import Icon from 'Components/Icon';
import ReceiptModeToggle from 'Components/toggle/ReceiptModeToggle';

import {t} from 'Util/LocalizerUtil';

import {PanelParams, PanelViewModel} from '../../../view_model/PanelViewModel';
import {Conversation} from '../../../entity/Conversation';

interface ConversationDetailsOptionsProps {
  activeConversation: Conversation;
  togglePanel: (state: string, params: PanelParams) => void;
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
  const onNotificationsClick = () => togglePanel(PanelViewModel.STATE.NOTIFICATIONS, {entity: activeConversation});

  const onTimedMessagesClick = () => togglePanel(PanelViewModel.STATE.TIMED_MESSAGES, {entity: activeConversation});

  const onGuestOptionsClick = () => togglePanel(PanelViewModel.STATE.GUEST_OPTIONS, {entity: activeConversation});

  const onServiceOptionsClick = () => togglePanel(PanelViewModel.STATE.SERVICES_OPTIONS, {entity: activeConversation});

  return (
    <>
      <div className="conversation-details__list-head">{t('conversationDetailsOptions')}</div>

      <ul>
        {showOptionNotificationsGroup && (
          <li className="conversation-details__notifications">
            <button
              className="panel__action-item"
              onClick={onNotificationsClick}
              data-uie-name="go-notifications"
              type="button"
            >
              <Icon.Notification className="panel__action-item__icon" />
              <span className="panel__action-item__summary">
                <span className="panel__action-item__text">{t('conversationDetailsActionNotifications')}</span>

                <span className="panel__action-item__status" data-uie-name="status-notifications">
                  {notificationStatusText}
                </span>
              </span>

              <Icon.ChevronRight className="chevron-right-icon" />
            </button>
          </li>
        )}

        {showOptionTimedMessages && (
          <li className="conversation-details__timed-messages">
            <button
              className="panel__action-item"
              onClick={onTimedMessagesClick}
              data-uie-name="go-timed-messages"
              type="button"
            >
              <Icon.Timer className="panel__action-item__icon" />

              <span className="panel__action-item__summary">
                <span className="panel__action-item__text">{t('conversationDetailsActionTimedMessages')}</span>

                <span className="panel__action-item__status" data-uie-name="status-timed-messages">
                  {timedMessagesText}
                </span>
              </span>

              <Icon.ChevronRight className="chevron-right-icon" />
            </button>
          </li>
        )}

        {showOptionGuests && (
          <li className="conversation-details__guest-options">
            <button
              className="panel__action-item"
              onClick={onGuestOptionsClick}
              data-uie-name="go-guest-options"
              type="button"
            >
              <Icon.Guest className="panel__action-item__icon" />

              <span className="panel__action-item__summary">
                <span className="panel__action-item__text">{t('conversationDetailsActionGuestOptions')}</span>

                <span className="panel__action-item__status" data-uie-name="status-allow-guests">
                  {guestOptionsText}
                </span>
              </span>

              <Icon.ChevronRight className="chevron-right-icon" />
            </button>
          </li>
        )}

        {showOptionServices && (
          <li className="conversation-details__services-options">
            <button
              className="panel__action-item"
              onClick={onServiceOptionsClick}
              data-uie-name="go-services-options"
              type="button"
            >
              <Icon.Service className="panel__action-item__icon service-icon" />

              <span className="panel__action-item__summary">
                <span className="panel__action-item__text">{t('conversationDetailsActionServicesOptions')}</span>

                <span className="panel__action-item__status" data-uie-name="status-allow-services">
                  {servicesOptionsText}
                </span>
              </span>

              <Icon.ChevronRight className="chevron-right-icon" />
            </button>
          </li>
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

export default ConversationDetailsOptions;
