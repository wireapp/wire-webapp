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

import Icon from 'Components/Icon';

import {t} from 'Util/LocalizerUtil';

interface ConversationDetailsBottomActionsProps {
  showNotifications: () => void;
  showOptionNotifications1To1?: boolean;
  isSingleUserMode?: boolean;
  hasReceiptsEnabled?: boolean;
  notificationStatusText?: string;
}

const ConversationDetailsBottomActions: FC<ConversationDetailsBottomActionsProps> = ({
  showNotifications,
  showOptionNotifications1To1 = false,
  isSingleUserMode = false,
  hasReceiptsEnabled = false,
  notificationStatusText = '',
}) => {
  return (
    <ul className="conversation-details__bottom-actions">
      {showOptionNotifications1To1 && (
        <li className="conversation-details__notifications">
          <button
            className="panel__action-item"
            onClick={showNotifications}
            data-uie-name="go-notifications"
            type="button"
          >
            <span className="panel__action-item__icon">
              <Icon.Notification />
            </span>

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

      {isSingleUserMode && (
        <li className="conversation-details__read-receipts" data-uie-name="label-1to1-read-receipts">
          <p className="panel__info-text panel__info-text--head panel__info-text--margin-bottom">
            {hasReceiptsEnabled
              ? t('conversationDetails1to1ReceiptsHeadEnabled')
              : t('conversationDetails1to1ReceiptsHeadDisabled')}
          </p>

          <p className="panel__info-text panel__info-text--margin-bottom">
            {t('conversationDetails1to1ReceiptsFirst')}
          </p>

          <p className="panel__info-text panel__info-text--margin">{t('conversationDetails1to1ReceiptsSecond')}</p>
        </li>
      )}
    </ul>
  );
};

export default ConversationDetailsBottomActions;
