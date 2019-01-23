/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {t} from 'utils/LocalizerUtil';
import ko from 'knockout';

export default class WindowTitleViewModel {
  static get TITLE_DEBOUNCE() {
    return 250;
  }

  constructor(mainViewModel, repositories) {
    this.initiateTitleUpdates = this.initiateTitleUpdates.bind(this);

    this.contentState = mainViewModel.content.state;
    this.conversationRepository = repositories.conversation;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('WindowTitleViewModel', z.config.LOGGER.OPTIONS);

    this.updateWindowTitle = ko.observable(false);

    amplify.subscribe(z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, this.setUpdateState.bind(this));
    amplify.subscribe(z.event.WebApp.LIFECYCLE.LOADED, this.initiateTitleUpdates);
  }

  initiateTitleUpdates() {
    amplify.unsubscribe(z.event.WebApp.LIFECYCLE.LOADED, this.initiateTitleUpdates);

    this.logger.info('Starting to update window title');
    this.updateWindowTitle(true);

    ko.computed(() => {
      if (this.updateWindowTitle()) {
        const connectionRequests = this.userRepository.connect_requests().length;

        const unreadConversations = this.conversationRepository
          .conversations_unarchived()
          .filter(conversationEntity => {
            const {
              allMessages: unreadMessages,
              selfMentions: unreadSelfMentions,
              selfReplies: unreadSelfReplies,
            } = conversationEntity.unreadState();

            const isIgnored = conversationEntity.isRequest() || conversationEntity.showNotificationsNothing();

            if (isIgnored) {
              return false;
            }

            return conversationEntity.showNotificationsMentionsAndReplies()
              ? unreadSelfMentions.length || unreadSelfReplies.length
              : unreadMessages.length > 0 || conversationEntity.hasJoinableCall();
          }).length;

        const unreadCount = connectionRequests + unreadConversations;

        let specificTitle = unreadCount > 0 ? `(${unreadCount}) ` : '';

        amplify.publish(z.event.WebApp.LIFECYCLE.UNREAD_COUNT, unreadCount);

        switch (this.contentState()) {
          case z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS: {
            const multipleRequests = connectionRequests > 1;
            const requestsString = multipleRequests
              ? t('conversationsConnectionRequestMany', connectionRequests)
              : t('conversationsConnectionRequestOne', connectionRequests);
            specificTitle += requestsString;
            break;
          }

          case z.viewModel.ContentViewModel.STATE.CONVERSATION: {
            if (this.conversationRepository.active_conversation()) {
              specificTitle += this.conversationRepository.active_conversation().display_name();
            }
            break;
          }

          case z.viewModel.ContentViewModel.STATE.PREFERENCES_ABOUT: {
            specificTitle += t('preferencesAbout');
            break;
          }

          case z.viewModel.ContentViewModel.STATE.PREFERENCES_ACCOUNT: {
            specificTitle += t('preferencesAccount');
            break;
          }

          case z.viewModel.ContentViewModel.STATE.PREFERENCES_AV: {
            specificTitle += t('preferencesAV');
            break;
          }

          case z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS: {
            specificTitle += t('preferencesDeviceDetails');
            break;
          }

          case z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICES: {
            specificTitle += t('preferencesDevices');
            break;
          }

          case z.viewModel.ContentViewModel.STATE.PREFERENCES_OPTIONS: {
            specificTitle += t('preferencesOptions');
            break;
          }

          default:
            break;
        }

        const isTitleSet = specificTitle !== '' && !specificTitle.endsWith(' ');
        window.document.title = `${specificTitle}${isTitleSet ? ' · ' : ''}${t('wire')}`;
      }
    }).extend({rateLimit: WindowTitleViewModel.TITLE_DEBOUNCE});
  }

  setUpdateState(handlingNotifications) {
    const updateWindowTitle = handlingNotifications === z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    const isStateChange = this.updateWindowTitle() !== updateWindowTitle;
    if (isStateChange) {
      this.updateWindowTitle(updateWindowTitle);
      this.logger.debug(`Set window title update state to '${this.updateWindowTitle()}'`);
    }
  }
}
