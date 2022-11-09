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

import {Context} from '@wireapp/api-client/lib/auth';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {showUserModal} from 'Components/Modals/UserModal';

import {ShowConversationOptions} from './AppMain';
import {ContentState, ListState} from './useAppState';

import {Conversation} from '../entity/Conversation';
import {Router} from '../router/Router';
import {initializeRouter} from '../router/routerBindings';

export const useInitializeRouter = (
  apiContext: Context,
  showConversation: (
    conversation: Conversation | string,
    options?: ShowConversationOptions,
    domain?: string | null,
  ) => void,
  switchContent: (contentState: ContentState) => void,
  switchList: (listState: ListState) => void,
  openPreferencesAccount: () => void,
) => {
  const openPreferencesAbout = () => {
    switchList(ListState.PREFERENCES);
    switchContent(ContentState.PREFERENCES_ABOUT);
  };

  const openPreferencesAudioVideo = () => {
    switchList(ListState.PREFERENCES);
    switchContent(ContentState.PREFERENCES_AV);
  };

  const openPreferencesDevices = () => {
    switchList(ListState.PREFERENCES);
    switchContent(ContentState.PREFERENCES_DEVICES);
  };

  const openPreferencesOptions = () => {
    switchList(ListState.PREFERENCES);
    switchContent(ContentState.PREFERENCES_OPTIONS);
  };

  const openStartUI = () => {
    switchList(ListState.START_UI);
  };

  useEffect(() => {
    const router = new Router({
      '/conversation/:conversationId(/:domain)': (conversationId: string, domain: string = apiContext.domain ?? '') => {
        showConversation(conversationId, {}, domain);
      },
      '/preferences/about': () => openPreferencesAbout(),
      '/preferences/account': () => openPreferencesAccount(),
      '/preferences/av': () => openPreferencesAudioVideo(),
      '/preferences/devices': () => openPreferencesDevices(),
      '/preferences/options': () => openPreferencesOptions(),
      '/user/:userId(/:domain)': (userId: string, domain: string = apiContext.domain ?? '') => {
        showUserModal({domain, id: userId}, () => router.navigate('/'));
      },
    });

    initializeRouter(router);
    container.registerInstance(Router, router);

    amplify.subscribe(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT, openPreferencesAccount);
    amplify.subscribe(WebAppEvents.PREFERENCES.MANAGE_DEVICES, openPreferencesDevices);
    amplify.subscribe(WebAppEvents.PREFERENCES.SHOW_AV, openPreferencesAudioVideo);
    amplify.subscribe(WebAppEvents.SEARCH.SHOW, openStartUI);
  }, []);
};
