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

z.viewModel.panel.TimedMessagesViewModel = class TimedMessagesViewModel extends z.viewModel.panel.BasePanelViewModel {
  constructor(params) {
    super(params);

    this.clickOnMessageTime = this.clickOnMessageTime.bind(this);
    this.clickOnMessageTimeOff = this.clickOnMessageTime.bind(this, {value: null});

    const conversation = params.repositories.conversation;
    this.conversationRepository = conversation;

    this.logger = new z.util.Logger('z.viewModel.panel.TimedMessagesViewModel', z.config.LOGGER.OPTIONS);

    this.messageTimes = ko.pureComputed(() => {
      const times = z.ephemeral.timings.VALUES;
      const currentTime = this.currentMessageTimer();

      times.sort((timeA, timeB) => timeA - timeB);

      const mappedTimes = times.map(time => ({
        text: z.util.TimeUtil.formatDuration(time).text,
        value: time,
      }));

      if (currentTime && !times.includes(currentTime)) {
        mappedTimes.push({
          isCustom: true,
          text: z.util.TimeUtil.formatDuration(currentTime).text,
          value: currentTime,
        });
      }

      return mappedTimes;
    });

    this.isRendered = ko.observable(false).extend({notify: 'always'});

    this.currentMessageTimer = ko.pureComputed(() => {
      return this.activeConversation().hasGlobalMessageTimer() ? this.activeConversation().messageTimer() : 0;
    });

    this.shouldUpdateScrollbar = ko
      .pureComputed(() => this.isRendered())
      .extend({notify: 'always', rateLimit: {method: 'notifyWhenChangesStop', timeout: 0}});
  }

  getElementId() {
    return 'timed-messages';
  }

  clickOnMessageTime({value}) {
    const activeConversation = this.activeConversation();
    activeConversation.globalMessageTimer(value);
    this.conversationRepository.updateConversationMessageTimer(activeConversation, value);
  }
};
