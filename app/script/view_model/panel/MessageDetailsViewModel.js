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
import moment from 'moment';

export default class MessageDetailsViewModel extends BasePanelViewModel {
  constructor(params) {
    super(params);
    this.isReceiptsOpen = ko.observable(true);
    this.message = ko.observable();
    this.conversation = ko.observable();
    const userRepository = params.repositories.user;

    this.states = {
      LIKES: 'likes',
      NO_LIKES: 'no-likes',
      NO_RECEIPTS: 'no-receipts',
      RECEIPTS: 'receipts',
      RECEIPTS_OFF: 'receipts-off',
    };

    this.state = ko.pureComputed(() => {
      if (this.isReceiptsOpen()) {
        if (!this.conversation().expectsReadConfirmation()) {
          return this.states.RECEIPTS_OFF;
        }
        return this.receiptUsers().length ? this.states.RECEIPTS : this.states.NO_RECEIPTS;
      }
      return this.likeUsers().length ? this.states.LIKES : this.states.NO_LIKES;
    });

    this.receiptUsers = ko.observableArray();
    this.receiptTimes = ko.observableArray();

    this.receipts = ko.pureComputed(() => (this.message() && this.message().readReceipts()) || []);

    this.receipts.subscribe(receipts => {
      const userIds = receipts.map(({userId}) => userId);
      userRepository.get_users_by_id(userIds).then(users => this.receiptUsers(users));
      const receiptTimes = receipts.reduce(
        (times, {userId, time}) => Object.assign(times, {[userId]: moment(time).format('DD.MM.YY, HH:MM')}),
        {}
      );
      this.receiptTimes(receiptTimes);
    });

    this.likes = ko.pureComputed(() => {
      return (this.message() && Object.keys(this.message().reactions())) || [];
    });

    this.likeUsers = ko.pureComputed(() => {
      const users = this.conversation() ? this.conversation().participating_user_ets() : [];
      return this.likes()
        .map(userId => users.find(({id}) => id === userId))
        .filter(user => user);
    });

    const formatTime = time => moment(time).format('DD.MM.YY, HH:MM');

    this.sentFooter = ko.pureComputed(() => {
      return this.message() && formatTime(this.message().timestamp());
    });

    this.editedFooter = ko.pureComputed(() => {
      return this.message() && !isNaN(this.message().edited_timestamp) && formatTime(this.message().edited_timestamp);
    });
  }

  clickOnReceipts() {
    this.isReceiptsOpen(true);
  }

  clickOnLikes() {
    this.isReceiptsOpen(false);
  }

  initView(messageView) {
    this.isReceiptsOpen(true);
    this.message(messageView.message);
    this.conversation(messageView.conversation());
  }

  getElementId() {
    return 'message-details';
  }
}
