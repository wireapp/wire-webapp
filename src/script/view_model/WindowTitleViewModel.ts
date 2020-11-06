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

import ko from 'knockout';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';

import {getLogger, Logger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';

import {Config} from '../Config';
import {NOTIFICATION_HANDLING_STATE} from '../event/NotificationHandlingState';
import {ContentViewModel} from './ContentViewModel';
import type {MainViewModel} from './MainViewModel';
import {container} from 'tsyringe';
import {UserState} from '../user/UserState';
import {ConversationState} from '../conversation/ConversationState';

export class WindowTitleViewModel {
  contentState: ko.Observable<string>;
  logger: Logger;
  updateWindowTitle: ko.Observable<boolean>;

  static get TITLE_DEBOUNCE() {
    return 250;
  }

  constructor(
    mainViewModel: MainViewModel,
    private readonly userState = container.resolve(UserState),
    private readonly conversationState = container.resolve(ConversationState),
  ) {
    this.contentState = mainViewModel.content.state;
    this.logger = getLogger('WindowTitleViewModel');

    this.updateWindowTitle = ko.observable(false);

    amplify.subscribe(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, this.setUpdateState);
    amplify.subscribe(WebAppEvents.LIFECYCLE.LOADED, this.initiateTitleUpdates);
  }

  initiateTitleUpdates = () => {
    amplify.unsubscribe(WebAppEvents.LIFECYCLE.LOADED, this.initiateTitleUpdates);

    this.logger.info('Starting to update window title');
    this.updateWindowTitle(true);

    ko.computed(() => {
      if (this.updateWindowTitle()) {
        const connectionRequests = this.userState.connectRequests().length;

        const unreadConversations = this.conversationState
          .conversations_unarchived()
          .filter(conversationEntity => conversationEntity.hasUnread()).length;

        const unreadCount = connectionRequests + unreadConversations;

        let specificTitle = unreadCount > 0 ? `(${unreadCount}) ` : '';

        amplify.publish(WebAppEvents.LIFECYCLE.UNREAD_COUNT, unreadCount);

        switch (this.contentState()) {
          case ContentViewModel.STATE.CONNECTION_REQUESTS: {
            const multipleRequests = connectionRequests > 1;
            const requestsString = multipleRequests
              ? t('conversationsConnectionRequestMany', connectionRequests)
              : t('conversationsConnectionRequestOne', connectionRequests);
            specificTitle += requestsString;
            break;
          }

          case ContentViewModel.STATE.CONVERSATION: {
            if (this.conversationState.activeConversation()) {
              specificTitle += this.conversationState.activeConversation().display_name();
            }
            break;
          }

          case ContentViewModel.STATE.PREFERENCES_ABOUT: {
            specificTitle += t('preferencesAbout');
            break;
          }

          case ContentViewModel.STATE.PREFERENCES_ACCOUNT: {
            specificTitle += t('preferencesAccount');
            break;
          }

          case ContentViewModel.STATE.PREFERENCES_AV: {
            specificTitle += t('preferencesAV');
            break;
          }

          case ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS: {
            specificTitle += t('preferencesDeviceDetails');
            break;
          }

          case ContentViewModel.STATE.PREFERENCES_DEVICES: {
            specificTitle += t('preferencesDevices');
            break;
          }

          case ContentViewModel.STATE.PREFERENCES_OPTIONS: {
            specificTitle += t('preferencesOptions');
            break;
          }

          default:
            break;
        }

        const isTitleSet = specificTitle !== '' && !specificTitle.endsWith(' ');
        window.document.title = `${specificTitle}${isTitleSet ? ' · ' : ''}${Config.getConfig().BRAND_NAME}`;
      }
    }).extend({rateLimit: WindowTitleViewModel.TITLE_DEBOUNCE});
  };

  setUpdateState = (handlingNotifications: NOTIFICATION_HANDLING_STATE) => {
    const updateWindowTitle = handlingNotifications === NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    const isStateChange = this.updateWindowTitle() !== updateWindowTitle;
    if (isStateChange) {
      this.updateWindowTitle(updateWindowTitle);
      this.logger.debug(`Set window title update state to '${this.updateWindowTitle()}'`);
    }
  };
}
