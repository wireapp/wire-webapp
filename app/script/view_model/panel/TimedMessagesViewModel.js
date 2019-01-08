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

import BasePanelViewModel from './BasePanelViewModel';

export default class TimedMessagesViewModel extends BasePanelViewModel {
  constructor(params) {
    super(params);

    this.timedMessageChange = this.timedMessageChange.bind(this);

    this.conversationRepository = params.repositories.conversation;

    this.currentMessageTimer = ko.observable(0);

    ko.pureComputed(() => {
      const hasGlobalMessageTimer = this.activeConversation() && this.activeConversation().hasGlobalMessageTimer();
      return hasGlobalMessageTimer ? this.activeConversation().messageTimer() : 0;
    }).subscribe(timer => {
      this.currentMessageTimer(timer);
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

  timedMessageChange(viewModel, event) {
    if (this.activeConversation()) {
      const timer = parseInt(event.target.value, 10);
      const finalTimer = timer === 0 ? null : timer;
      this.activeConversation().globalMessageTimer(finalTimer);
      this.conversationRepository.updateConversationMessageTimer(this.activeConversation(), finalTimer);
    }
  }

  getElementId() {
    return 'timed-messages';
  }
}
