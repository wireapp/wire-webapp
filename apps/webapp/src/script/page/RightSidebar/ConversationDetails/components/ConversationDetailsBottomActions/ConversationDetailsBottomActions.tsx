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

import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

interface ConversationDetailsBottomActionsProps {
  isDeviceActionEnabled: boolean;
  showDevices: () => void;
  showNotifications: () => void;
  showOptionNotifications1To1?: boolean;
  notificationStatusText?: string;
}

const ConversationDetailsBottomActions = ({
  isDeviceActionEnabled = false,
  showDevices,
  showNotifications,
  showOptionNotifications1To1 = false,
  notificationStatusText = '',
}: ConversationDetailsBottomActionsProps) => {
  const renderConversationDetailsActions = showOptionNotifications1To1 || isDeviceActionEnabled;

  if (!renderConversationDetailsActions) {
    return null;
  }

  return (
    <ul className="conversation-details__bottom-actions">
      {isDeviceActionEnabled && (
        <li className="conversation-details__devices">
          <button className="panel__action-item" onClick={showDevices} data-uie-name="go-devices" type="button">
            <span className="panel__action-item__icon">
              <Icon.DevicesIcon />
            </span>

            <span className="panel__action-item__text">{t('conversationDetailsActionDevices')}</span>

            <Icon.ChevronRight className="chevron-right-icon" />
          </button>
        </li>
      )}

      {showOptionNotifications1To1 && (
        <li className="conversation-details__notifications">
          <button
            className="panel__action-item"
            onClick={showNotifications}
            data-uie-name="go-notifications"
            type="button"
          >
            <span className="panel__action-item__icon">
              <Icon.NotificationIcon />
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
    </ul>
  );
};

export {ConversationDetailsBottomActions};
