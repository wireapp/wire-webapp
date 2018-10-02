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
    this.settings = Object.values(z.conversation.NotificationSetting.STATE).map(status => ({
      text: z.conversation.NotificationSetting.getText(status),
      value: status,
    }));

    this.logger = new z.util.Logger('z.viewModel.panel.GroupParticipantServiceViewModel', z.config.LOGGER.OPTIONS);

    this.clickOnNotificationSetting = this.clickOnNotificationSetting.bind(this);
    this.conversationRepository = this.repositories.conversation;

    this.isRendered = ko.observable(false).extend({notify: 'always'});

    this.currentNotificationSetting = ko.pureComputed(() => {
      return z.conversation.NotificationSetting.STATE.EVERYTHING;
    });

    this.shouldUpdateScrollbar = ko
      .pureComputed(() => this.isRendered())
      .extend({notify: 'always', rateLimit: {method: 'notifyWhenChangesStop', timeout: 0}});
  }

  getElementId() {
    return 'notification-settings';
  }

  clickOnNotificationSetting({value}) {
    this.logger.log(`Notification setting clicked: ${value}`);
    this.onGoBack();
  }
};
