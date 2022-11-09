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

import {useEffect, useMemo} from 'react';

import {amplify} from 'amplify';

import {Runtime} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {iterateItem} from 'Util/ArrayUtil';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {ShowConversationOptions} from './AppMain';
import {PanelState} from './RightSidebar';
import {useAppMainState} from './state';
import {ContentState, ListState, useAppState} from './useAppState';

import {ConversationState} from '../conversation/ConversationState';
import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';
import {ActionsViewModel} from '../view_model/ActionsViewModel';

export const useInitSubscriptions = (
  actionsView: ActionsViewModel,
  connectRequests: User[],
  conversationState: ConversationState,
  isProAccount: boolean,
  onArchive: (conversation: Conversation) => void,
  showConversation: (
    conversation: Conversation | string,
    options?: ShowConversationOptions,
    domain?: string | null,
  ) => void,
  switchContent: (contentState: ContentState) => void,
) => {
  const {activeConversation, conversations_unarchived: unarchivedConversations} = useKoSubscribableChildren(
    conversationState,
    ['activeConversation', 'conversations_unarchived'],
  );

  const {contentState, listState} = useAppState();
  const {goTo} = useAppMainState(state => state.rightSidebar);

  const visibleListItems = useMemo(() => {
    const isStatePreferences = listState === ListState.PREFERENCES;

    if (isStatePreferences) {
      const preferenceItems = [
        ContentState.PREFERENCES_ACCOUNT,
        ContentState.PREFERENCES_DEVICES,
        ContentState.PREFERENCES_OPTIONS,
        ContentState.PREFERENCES_AV,
      ];

      if (!Runtime.isDesktopApp()) {
        preferenceItems.push(ContentState.PREFERENCES_ABOUT);
      }

      return preferenceItems;
    }

    const hasConnectRequests = !!connectRequests.length;
    const states: (string | Conversation)[] = hasConnectRequests ? [ContentState.CONNECTION_REQUESTS] : [];

    return states.concat(unarchivedConversations);
  }, [connectRequests.length, listState, unarchivedConversations]);

  const clickToClear = (conversationEntity = activeConversation): void => {
    if (conversationEntity) {
      actionsView.clearConversation(conversationEntity);
    }
  };

  const onToggleMute = (conversationEntity = activeConversation): void => {
    if (conversationEntity) {
      actionsView.toggleMuteConversation(conversationEntity);
    }
  };

  const changeNotificationSetting = () => {
    if (isProAccount) {
      goTo(PanelState.NOTIFICATIONS, {entity: activeConversation});
    } else {
      onToggleMute();
    }
  };

  const iterateActiveConversation = (reverse: boolean) => {
    const isStateRequests = contentState === ContentState.CONNECTION_REQUESTS;
    const activeConversationItem = isStateRequests ? ContentState.CONNECTION_REQUESTS : activeConversation;
    const nextItem = iterateItem(visibleListItems, activeConversationItem, reverse);
    const isConnectionRequestItem = nextItem === ContentState.CONNECTION_REQUESTS;

    if (isConnectionRequestItem) {
      return switchContent(ContentState.CONNECTION_REQUESTS);
    }

    if (nextItem) {
      showConversation(nextItem);
    }
  };

  const iterateActivePreference = (reverse: boolean) => {
    let activePreference = contentState;
    const isDeviceDetails = activePreference === ContentState.PREFERENCES_DEVICE_DETAILS;

    if (isDeviceDetails) {
      activePreference = ContentState.PREFERENCES_DEVICES;
    }

    const nextPreference = iterateItem(visibleListItems, activePreference, reverse) as ContentState;

    if (nextPreference) {
      switchContent(nextPreference);
    }
  };

  const iterateActiveItem = (reverse = false) => {
    const isStatePreferences = listState === ListState.PREFERENCES;

    return isStatePreferences ? iterateActivePreference(reverse) : iterateActiveConversation(reverse);
  };

  const goToNext = () => iterateActiveItem(true);

  const goToPrevious = () => iterateActiveItem(false);

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.SHOW, showConversation);

    amplify.subscribe(WebAppEvents.SHORTCUT.NEXT, goToNext);
    amplify.subscribe(WebAppEvents.SHORTCUT.PREV, goToPrevious);
    amplify.subscribe(WebAppEvents.SHORTCUT.ARCHIVE, onArchive);
    amplify.subscribe(WebAppEvents.SHORTCUT.DELETE, clickToClear);
    amplify.subscribe(WebAppEvents.SHORTCUT.NOTIFICATIONS, changeNotificationSetting);
    amplify.subscribe(WebAppEvents.SHORTCUT.SILENCE, changeNotificationSetting); // todo: deprecated - remove when user base of wrappers version >= 3.4 is large enough
  }, []);
};
