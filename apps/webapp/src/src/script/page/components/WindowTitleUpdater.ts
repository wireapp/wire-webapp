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

import {useCallback, useEffect, useState} from 'react';

import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {ConversationState} from 'Repositories/conversation/ConversationState';
import {NOTIFICATION_HANDLING_STATE} from 'Repositories/event/NotificationHandlingState';
import {UserState} from 'Repositories/user/UserState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {Config} from '../../Config';
import {ContentState, useAppState} from '../useAppState';

const windowTitleLogger = getLogger('WindowTitlesViewModel');

const MIN_UNREAD_COUNT = 0;
const MIN_CONNECTION_REQUEST_COUNT = 1;

const useWindowTitle = () => {
  const userState = container.resolve(UserState);
  const conversationState = container.resolve(ConversationState);

  const contentState = useAppState(state => state.contentState);
  const setUnreadMessagesCount = useAppState(state => state.setUnreadMessagesCount);

  const [updateWindowTitle, setUpdateWindowTitle] = useState(false);

  const {connectRequests: connectionRequests} = useKoSubscribableChildren(userState, ['connectRequests']);
  const {activeConversation, unreadConversations} = useKoSubscribableChildren(conversationState, [
    'activeConversation',
    'unreadConversations',
  ]);

  const updateFavicon = useCallback(
    (unreadCount: number) => {
      setUnreadMessagesCount(unreadCount);

      const iconBadge = unreadCount ? '-badge' : '';
      const link: HTMLLinkElement =
        document.querySelector("link[rel*='shortcut icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = `/image/favicon${iconBadge}.ico`;
      document.getElementsByTagName('head')[0].appendChild(link);
    },
    [setUnreadMessagesCount],
  );

  const updateNotificationState = useCallback(
    (handlingNotifications: NOTIFICATION_HANDLING_STATE) => {
      const shouldUpdateWindowTitle = handlingNotifications === NOTIFICATION_HANDLING_STATE.WEB_SOCKET;
      const isStateChange = updateWindowTitle !== shouldUpdateWindowTitle;

      if (isStateChange) {
        setUpdateWindowTitle(shouldUpdateWindowTitle);
        windowTitleLogger.debug(`Set window title update state to '${updateWindowTitle}'`);
      }
    },
    [updateWindowTitle],
  );

  const initiateTitleUpdates = useCallback(() => {
    setUpdateWindowTitle(true);

    if (updateWindowTitle) {
      const unreadConversationsCount = unreadConversations.length;
      const connectionRequestsCount = connectionRequests.length;
      const unreadCount = connectionRequestsCount + unreadConversationsCount;
      let specificTitle = unreadCount > MIN_UNREAD_COUNT ? `(${unreadCount}) ` : '';

      amplify.publish(WebAppEvents.LIFECYCLE.UNREAD_COUNT, unreadCount);
      updateFavicon(unreadCount);

      switch (contentState) {
        case ContentState.CONNECTION_REQUESTS: {
          const multipleRequests = connectionRequestsCount > MIN_CONNECTION_REQUEST_COUNT;
          const requestsString = multipleRequests
            ? t('conversationsConnectionRequestMany', {number: connectionRequestsCount})
            : t('conversationsConnectionRequestOne');
          specificTitle += requestsString;
          break;
        }

        case ContentState.CONVERSATION: {
          if (activeConversation) {
            specificTitle += activeConversation.display_name();
          }
          break;
        }

        case ContentState.PREFERENCES_ABOUT: {
          specificTitle += t('preferencesAbout');
          break;
        }

        case ContentState.PREFERENCES_ACCOUNT: {
          specificTitle += t('preferencesAccount');
          break;
        }

        case ContentState.PREFERENCES_AV: {
          specificTitle += t('preferencesAV');
          break;
        }

        case ContentState.PREFERENCES_DEVICE_DETAILS: {
          specificTitle += t('preferencesDeviceDetails');
          break;
        }

        case ContentState.PREFERENCES_DEVICES: {
          specificTitle += t('preferencesDevices');
          break;
        }

        case ContentState.PREFERENCES_OPTIONS: {
          specificTitle += t('preferencesOptions');
          break;
        }

        default:
          break;
      }

      const isTitleSet = specificTitle !== '' && !specificTitle.endsWith(' ');
      window.document.title = `${specificTitle}${isTitleSet ? ' · ' : ''}${Config.getConfig().BRAND_NAME}`;
    }
  }, [
    activeConversation,
    connectionRequests.length,
    contentState,
    unreadConversations.length,
    updateFavicon,
    updateWindowTitle,
  ]);

  useEffect(() => {
    amplify.subscribe(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, updateNotificationState);
    initiateTitleUpdates();
  }, [initiateTitleUpdates, updateNotificationState]);
};

export function WindowTitleUpdater(): null {
  useWindowTitle();

  return null;
}
