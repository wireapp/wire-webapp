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

import {useEffect} from 'react';

import {useAppState} from './useAppState';

import {App} from '../main/app';
import {Multitasking, NotificationRepository} from '../notification/NotificationRepository';
import {PropertiesRepository} from '../properties/PropertiesRepository';

export const useInitializeApp = (
  notificationRepository: NotificationRepository,
  propertiesRepository: PropertiesRepository,
  multitasking: Multitasking,
) => {
  const {contentState} = useAppState();

  useEffect(() => {
    notificationRepository.setContentViewModelStates(contentState, multitasking);

    const redirect = localStorage.getItem(App.LOCAL_STORAGE_LOGIN_REDIRECT_KEY);

    if (redirect) {
      localStorage.removeItem(App.LOCAL_STORAGE_LOGIN_REDIRECT_KEY);
      window.location.replace(redirect);
    }

    const conversationRedirect = localStorage.getItem(App.LOCAL_STORAGE_LOGIN_CONVERSATION_KEY);

    if (conversationRedirect) {
      const {conversation, domain} = JSON.parse(conversationRedirect)?.data;
      localStorage.removeItem(App.LOCAL_STORAGE_LOGIN_CONVERSATION_KEY);
      window.location.replace(`#/conversation/${conversation}${domain ? `/${domain}` : ''}`);
    }

    propertiesRepository.checkPrivacyPermission().then(() => {
      setTimeout(() => notificationRepository.checkPermission(), App.CONFIG.NOTIFICATION_CHECK);
    });
  }, []);
};
