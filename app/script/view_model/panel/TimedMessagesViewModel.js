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

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.panel = z.viewModel.panel || {};

z.viewModel.panel.TimedMessagesViewModel = class TimedMessagesViewModel extends z.viewModel.panel.BasePanelViewModel {
  constructor(params) {
    super(params);

    const conversationRepository = params.repositories.conversation;

    this.currentMessageTimer = ko.observable(0);

    const currentMessageTimerSubscription = this.currentMessageTimer.suspendableSubscribe(value => {
      if (this.activeConversation()) {
        const finalValue = value === 0 ? null : value;
        this.activeConversation().globalMessageTimer(finalValue);
        conversationRepository.updateConversationMessageTimer(this.activeConversation(), finalValue);
      }
    });

    ko.pureComputed(() => {
      const hasGlobalMessageTimer = this.activeConversation() && this.activeConversation().hasGlobalMessageTimer();
      return hasGlobalMessageTimer ? this.activeConversation().messageTimer() : 0;
    }).subscribe(timer => {
      currentMessageTimerSubscription.suspend();
      this.currentMessageTimer(timer);
      currentMessageTimerSubscription.unsuspend();
    });

    const hasCustomTime = ko.pureComputed(() => {
      return !!this.currentMessageTimer() && !z.ephemeral.timings.VALUES.includes(this.currentMessageTimer());
    });

    this.messageTimes = ko.pureComputed(() => {
      const times = z.ephemeral.timings.VALUES;

      times.sort((timeA, timeB) => timeA - timeB);

      const mappedTimes = times.map(time => ({
        text: z.util.TimeUtil.formatDuration(time).text,
        value: time,
      }));

      if (hasCustomTime()) {
        mappedTimes.push({
          isCustom: true,
          text: z.util.TimeUtil.formatDuration(this.currentMessageTimer()).text,
          value: this.currentMessageTimer(),
        });
      }

      return mappedTimes;
    });

    this.isRendered = ko.observable(false).extend({notify: 'always'});

    this.shouldUpdateScrollbar = ko
      .pureComputed(() => this.isRendered())
      .extend({notify: 'always', rateLimit: {method: 'notifyWhenChangesStop', timeout: 0}});
  }

  getElementId() {
    return 'timed-messages';
  }
};
