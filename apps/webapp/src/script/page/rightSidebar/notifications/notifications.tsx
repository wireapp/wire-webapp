/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {useMemo, FC} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit';

import {FadingScrollbar} from 'Components/fadingscrollbar';
import {RadioGroup} from 'Components/radio';
import {NOTIFICATION_STATE, getNotificationText} from 'Repositories/conversation/notificationsetting';
import {Conversation} from 'Repositories/entity/conversation';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';

import {ViewModelRepositories} from '../../../viewModel/mainviewmodel';
import {PanelHeader} from '../panelheader';

interface NotificationsProps {
  activeConversation: Conversation;
  onClose: () => void;
  onGoBack: () => void;
  repositories: ViewModelRepositories;
}

const Notifications: FC<NotificationsProps> = ({activeConversation, onGoBack, onClose, repositories}) => {
  const {translate} = useApplicationContext();
  const {notificationState} = useKoSubscribableChildren(activeConversation, ['notificationState']);
  const saveOptionNotificationPreference = (value: number) => {
    void repositories.conversation.setNotificationState(activeConversation, value);
  };

  const settings = useMemo(
    () =>
      Object.values(NOTIFICATION_STATE).map(status => ({
        label: getNotificationText(status, translate),
        value: status,
      })),
    [translate],
  );

  return (
    <div id="notification-settings" className="panel__page notification-settings">
      <PanelHeader
        onGoBack={onGoBack}
        onClose={onClose}
        goBackUie="go-back-notification-options"
        goBackTitle={translate('accessibility.conversation.goBack')}
        title={translate('notificationSettingsTitle')}
        closeBtnTitle={translate('accessibility.closeNotificationsLabel')}
      />

      <FadingScrollbar className="panel__content">
        <fieldset className="notification-section">
          <RadioGroup
            ariaLabelledBy={translate('notificationSettingsTitle')}
            name="preferences-options-notifications"
            selectedValue={notificationState}
            onChange={saveOptionNotificationPreference}
            options={settings}
          />
        </fieldset>

        <p className="panel__info-text notification-settings__disclaimer" tabIndex={TabIndex.FOCUSABLE}>
          {translate('notificationSettingsDisclaimer')}
        </p>
      </FadingScrollbar>
    </div>
  );
};

export {Notifications};
