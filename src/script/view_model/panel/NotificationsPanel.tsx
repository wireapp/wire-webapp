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

import React, {useState, useRef, useEffect, FC} from 'react';
import {container} from 'tsyringe';

import {t} from 'Util/LocalizerUtil';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';

import {initFadingScrollbar} from '../../ui/fadingScrollbar';
import {NOTIFICATION_STATE, getNotificationText} from '../../conversation/NotificationSetting';
import {ViewModelRepositories} from '../MainViewModel';
import PanelHeader from './PanelHeader';
import {ConversationState} from '../../conversation/ConversationState';
import PreferencesRadio from '../../page/MainContent/panels/preferences/components/PreferencesRadio';
import {KEY} from 'Util/KeyboardUtil';

const PANEL_HEADER_BTN_TABINDEX = 2;

export interface NotificationsPanelProps {
  conversationState?: ConversationState;
  onClose: () => void;
  onGoBack: () => void;
  repositories: ViewModelRepositories;
}

const NotificationsPanel: FC<NotificationsPanelProps> = ({
  onGoBack,
  onClose,
  repositories,
  conversationState = container.resolve(ConversationState),
}) => {
  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);
  const {notificationState} = useKoSubscribableChildren(activeConversation!, ['notificationState']);
  const saveOptionNotificationPreference = (value: number) => {
    repositories.conversation.setNotificationState(activeConversation!, value);
  };

  const [settings] = useState(
    Object.values(NOTIFICATION_STATE).map(status => ({
      label: getNotificationText(status),
      value: status,
    })),
  );

  const [tabIndex, setTabIndex] = useState(-1);
  const [btnFocus, setBtnFocus] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (btnFocus) {
      btnRef.current?.focus();
    }
  }, [btnFocus]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === KEY.TAB && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      setTabIndex(PANEL_HEADER_BTN_TABINDEX);
      setBtnFocus(true);
    }
  };

  return (
    <>
      <PanelHeader
        onGoBack={onGoBack}
        onClose={onClose}
        goBackUie="go-back-notification-options"
        goBackTitle={t('accessibility.conversation.goBack')}
        title={t('notificationSettingsTitle')}
        closeBtnTitle={t('accessibility.closeNotificationsLabel')}
        tabIndex={tabIndex}
        ref={btnRef}
        handleBlur={() => setBtnFocus(false)}
      />
      <div className="panel__content" ref={initFadingScrollbar}>
        <fieldset className="notification-section">
          <PreferencesRadio
            name="preferences-options-notifications"
            selectedValue={notificationState}
            onChange={saveOptionNotificationPreference}
            options={settings}
          />
        </fieldset>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions*/}
        <div
          className="panel__info-text notification-settings__disclaimer"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          {t('notificationSettingsDisclaimer')}
        </div>
      </div>
    </>
  );
};

export default NotificationsPanel;

registerReactComponent('notifications-panel', NotificationsPanel);
