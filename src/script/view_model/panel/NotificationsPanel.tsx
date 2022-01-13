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

import React, {useState} from 'react';
import {container} from 'tsyringe';

import {t} from 'Util/LocalizerUtil';
import useEffectRef from 'Util/useEffectRef';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';

import {useFadingScrollbar} from '../../ui/fadingScrollbar';
import {NOTIFICATION_STATE, getNotificationText} from '../../conversation/NotificationSetting';
import {ViewModelRepositories} from '../MainViewModel';
import PanelHeader from './PanelHeader';
import {ConversationState} from '../../conversation/ConversationState';

export interface NotificationsPanelProps {
  conversationState?: ConversationState;
  onClose: () => void;
  onGoBack: () => void;
  repositories: ViewModelRepositories;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  onGoBack,
  onClose,
  repositories,
  conversationState = container.resolve(ConversationState),
}) => {
  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);
  const {notificationState} = useKoSubscribableChildren(activeConversation, ['notificationState']);

  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  useFadingScrollbar(scrollbarRef);

  const [settings] = useState(
    Object.values(NOTIFICATION_STATE).map(status => ({
      text: getNotificationText(status),
      value: status,
    })),
  );

  return (
    <>
      <PanelHeader
        onGoBack={onGoBack}
        onClose={onClose}
        goBackUie="go-back-notification-options"
        title={t('notificationSettingsTitle')}
      />
      <div className="panel__content" ref={setScrollbarRef}>
        {settings.map(({text, value}) => (
          <label
            key={value}
            className="panel__action-item panel__action-item__option"
            data-uie-name="item-notification-option"
          >
            <input
              type="radio"
              name="notification-settings"
              value={value}
              checked={notificationState === value}
              onChange={() => repositories.conversation.setNotificationState(activeConversation, value)}
            />
            <span>{text}</span>
          </label>
        ))}
        <div className="panel__info-text notification-settings__disclaimer">{t('notificationSettingsDisclaimer')}</div>
      </div>
    </>
  );
};

export default NotificationsPanel;

registerReactComponent('notifications-panel', {
  component: NotificationsPanel,
  template: '<div data-bind="react: {onGoBack, onClose, repositories}"></div>',
});
