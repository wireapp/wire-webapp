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

z.viewModel.panel.TimedMessagesViewModel = class TimedMessagesViewModel {
  static get MESSAGE_TIMES() {
    return [
      1000 * 10,
      1000 * 60 * 5,
      1000 * 60 * 60,
      1000 * 60 * 60 * 24,
      1000 * 60 * 60 * 24 * 7,
      1000 * 60 * 60 * 24 * 28,
    ];
  }

  constructor(mainViewModel, panelViewModel, repositories) {
    this.panelViewModel = panelViewModel;
    this.isVisible = this.panelViewModel.timedMessagesVisible;
    this.conversationRepository = repositories.conversation;
    this.conversationEntity = this.conversationRepository.active_conversation;
    this.messageTimes = ko.observableArray(
      TimedMessagesViewModel.MESSAGE_TIMES.map(time => ({
        text: z.util.formatTime(time),
        value: time,
      }))
    );

    this.isRendered = ko.observable(false).extend({notify: 'always'});

    this.currentMessageTimer = ko.pureComputed(() => {
      return this.conversationEntity().hasGlobalMessageTimer() ? this.conversationEntity().messageTimer() : 0;
    });

    this.shouldUpdateScrollbar = ko
      .pureComputed(() => this.isRendered())
      .extend({notify: 'always', rateLimit: {method: 'notifyWhenChangesStop', timeout: 0}});

    this.clickOnMessageTime = this.clickOnMessageTime.bind(this);
    this.clickOnMessageTimeOff = this.clickOnMessageTimeOff.bind(this);
  }

  clickOnBack() {
    this.panelViewModel.switchState(z.viewModel.PanelViewModel.STATE.CONVERSATION_DETAILS, true);
  }

  clickOnClose() {
    this.panelViewModel.closePanel();
  }

  clickOnMessageTime({value}) {
    this.conversationEntity().globalMessageTimer(value);
    this.clickOnBack();
  }

  clickOnMessageTimeOff() {
    this.conversationEntity().globalMessageTimer(0);
    this.clickOnBack();
  }
};
