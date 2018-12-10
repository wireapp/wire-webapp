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
    const userRepository = params.repositories.user;

    this.states = {
      LIKES: 'likes',
      NO_LIKES: 'no-likes',
      NO_RECEIPTS: 'no-receipts',
      RECEIPTS: 'receipts',
      RECEIPTS_OFF: 'receipts-off',
    };

    const formatTime = time => moment(time).format('DD.MM.YY, HH:MM');

    this.isMe = ko.pureComputed(() => this.message() && this.message().user().is_me);

    this.state = ko.pureComputed(() => {
      if (this.isMe() && this.isReceiptsOpen()) {
        if (!this.message().expectsReadConfirmation) {
          return this.states.RECEIPTS_OFF;
        }
        return this.receiptUsers().length ? this.states.RECEIPTS : this.states.NO_RECEIPTS;
      }
      return this.likeUsers().length ? this.states.LIKES : this.states.NO_LIKES;
    });

    this.receiptUsers = ko.observableArray();
    this.receiptTimes = ko.observable({});
    this.likeUsers = ko.observableArray();

    this.receipts = ko.pureComputed(() => (this.message() && this.message().readReceipts()) || []);

    this.receipts.subscribe(receipts => {
      const userIds = receipts.map(({userId}) => userId);
      userRepository.get_users_by_id(userIds).then(users => this.receiptUsers(users));
      const receiptTimes = receipts.reduce(
        (times, {userId, time}) => Object.assign(times, {[userId]: formatTime(time)}),
        {}
      );
      this.receiptTimes(receiptTimes);
    });

    this.likes = ko.pureComputed(() => {
      const reactions = this.message() && this.message().reactions();
      return reactions ? Object.keys(reactions) : [];
    });

    this.likes.subscribe(likeIds => {
      userRepository.get_users_by_id(likeIds).then(users => this.likeUsers(users));
    });

    this.sentFooter = ko.pureComputed(() => {
      return this.message() && formatTime(this.message().timestamp());
    });

    this.receiptCountString = ko.pureComputed(() =>
      this.receiptUsers().length ? ` (${this.receiptUsers().length})` : ''
    );

    this.likeCountString = ko.pureComputed(() => {
      const likeUsers = this.likeUsers().length;
      return likeUsers ? ` (${likeUsers})` : '';
    });

    this.editedFooter = ko.pureComputed(() => {
      return this.message() && !isNaN(this.message().edited_timestamp) && formatTime(this.message().edited_timestamp);
    });

    this.shouldUpdateScrollbar = ko
      .computed(() => {
        this.receiptUsers();
        this.likeUsers();
        this.isReceiptsOpen();
        this.isVisible();
      })
      .extend({notify: 'always', rateLimit: 100});
  }

  clickOnReceipts() {
    this.isReceiptsOpen(true);
  }

  clickOnLikes() {
    this.isReceiptsOpen(false);
  }

  getEntityId() {
    return this.message().id;
  }

  initView({entity: messageView, showLikes}) {
    this.isReceiptsOpen(!showLikes);
    this.message(messageView.message);
  }

  getElementId() {
    return 'message-details';
  }
}
