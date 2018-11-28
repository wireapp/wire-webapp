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

'use strict';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.panel = z.viewModel.panel || {};

z.viewModel.panel.NotificationsViewModel = class NotificationsViewModel extends z.viewModel.panel.BasePanelViewModel {
  constructor(params) {
    super(params);

    const conversationRepository = params.repositories.conversation;

    this.settings = Object.values(z.conversation.NotificationSetting.STATE).map(status => ({
      text: z.conversation.NotificationSetting.getText(status),
      value: status,
    }));

    this.currentNotificationSetting = ko.observable();

    const currentNotificationSettingSubscription = this.currentNotificationSetting.suspendableSubscribe(value => {
      if (this.activeConversation()) {
        conversationRepository.setNotificationState(this.activeConversation(), value);
      }
    });

    ko.pureComputed(() => {
      return this.activeConversation() && this.activeConversation().notificationState();
    }).subscribe(setting => {
      currentNotificationSettingSubscription.suspend();
      this.currentNotificationSetting(setting);
      currentNotificationSettingSubscription.unsuspend();
    });

    this.isRendered = ko.observable(false).extend({notify: 'always'});

    this.shouldUpdateScrollbar = ko
      .pureComputed(() => this.isRendered())
      .extend({notify: 'always', rateLimit: {method: 'notifyWhenChangesStop', timeout: 0}});
  }

  getElementId() {
    return 'notification-settings';
  }
};
