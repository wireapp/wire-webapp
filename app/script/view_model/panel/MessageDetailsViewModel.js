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

    amplify.subscribe(z.event.WebApp.CONVERSATION.MESSAGE.UPDATED, (oldId, updatedMessageEntity) => {
      // listen for any changes to local message entities.
      // if the id of the message being viewed has changed, we store the new ID.
      if (oldId === this.messageId()) {
        this.messageId(updatedMessageEntity.id);
      }
    });

    this.isReceiptsOpen = ko.observable(true);
    this.messageId = ko.observable();

    const userRepository = params.repositories.user;

    this.states = {
      LIKES: 'likes',
      NO_LIKES: 'no-likes',
      NO_RECEIPTS: 'no-receipts',
      RECEIPTS: 'receipts',
      RECEIPTS_OFF: 'receipts-off',
    };

    const formatTime = time => moment(time).format('DD.MM.YY, HH:mm');

    this.message = ko.pureComputed(() => {
      if (!this.isVisible()) {
        return;
      }

      const visibleMessage = this.activeConversation()
        .messages_unordered()
        .find(({id}) => id === this.messageId());
      if (visibleMessage) {
        return visibleMessage;
      }
    });

    this.state = ko.pureComputed(() => {
      if (this.supportsReceipts() && this.isReceiptsOpen()) {
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

    const sortUsers = (userA, userB) => (userA.name() > userB.name() ? 1 : -1);

    this.receipts.subscribe(receipts => {
      const userIds = receipts.map(({userId}) => userId);
      userRepository.get_users_by_id(userIds).then(users => this.receiptUsers(users.sort(sortUsers)));
      const receiptTimes = receipts.reduce(
        (times, {userId, time}) => Object.assign(times, {[userId]: formatTime(time)}),
        {}
      );
      this.receiptTimes(receiptTimes);
    });

    this.sentFooter = ko.pureComputed(() => {
      return this.message() ? formatTime(this.message().timestamp()) : '';
    });

    const formatUserCount = users => (users.length ? ` (${users.length})` : '');

    this.supportsReceipts = ko.pureComputed(() => {
      const isMe = this.message() && this.message().user().is_me;
      const isTeamConversation = !!this.activeConversation().team_id;
      return isMe && isTeamConversation;
    });

    this.supportsLikes = ko.pureComputed(() => {
      if (!this.message()) {
        return false;
      }
      const isPing = this.message().super_type === z.message.SuperType.PING;
      const isEphemeral = this.message().is_ephemeral();
      return !isPing && !isEphemeral;
    });

    this.likes = ko.pureComputed(() => {
      const reactions = this.supportsLikes() && this.message().reactions();
      return reactions ? Object.keys(reactions) : [];
    });

    this.likes.subscribe(likeIds => {
      userRepository.get_users_by_id(likeIds).then(users => this.likeUsers(users.sort(sortUsers)));
    });

    this.receiptsTitle = ko.pureComputed(() => {
      return z.l10n.text(z.string.messageDetailsTitleReceipts, formatUserCount(this.receiptUsers()));
    });

    this.likesTitle = ko.pureComputed(() => {
      return z.l10n.text(z.string.messageDetailsTitleLikes, formatUserCount(this.likeUsers()));
    });

    this.showTabs = ko.pureComputed(() => this.supportsReceipts() && this.supportsLikes());

    this.editedFooter = ko.pureComputed(() => {
      return (
        this.message() &&
        this.message().edited_timestamp &&
        this.message().edited_timestamp() &&
        formatTime(this.message().edited_timestamp())
      );
    });

    this.panelTitle = ko.pureComputed(() => {
      if (!this.supportsReceipts()) {
        return this.likesTitle();
      }
      if (!this.supportsLikes()) {
        return this.receiptsTitle();
      }
      return z.l10n.text(z.string.messageDetailsTitle);
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
    return this.messageId();
  }

  initView({entity: {id}, showLikes}) {
    this.isReceiptsOpen(!showLikes);
    this.messageId(id);
  }

  getElementId() {
    return 'message-details';
  }
}
