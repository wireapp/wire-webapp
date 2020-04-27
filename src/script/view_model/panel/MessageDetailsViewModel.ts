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
import {amplify} from 'amplify';

import {t} from 'Util/LocalizerUtil';
import {formatLocale} from 'Util/TimeUtil';

import {BasePanelViewModel, PanelViewModelProps} from './BasePanelViewModel';
import {WebAppEvents} from '../../event/WebApp';
import {SuperType} from '../../message/SuperType';
import {Message, ReadReceipt} from '../../entity/message/Message';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {TeamRepository} from '../../team/TeamRepository';
import {User} from '../../entity/User';
import {ContentMessage} from '../../entity/message/ContentMessage';

export class MessageDetailsViewModel extends BasePanelViewModel {
  messageId: ko.Observable<string>;
  isReceiptsOpen: ko.Observable<boolean>;
  conversationRepository: ConversationRepository;
  teamRepository: TeamRepository;
  states: Record<string, string>;
  message: ko.PureComputed<ContentMessage>;
  state: ko.PureComputed<string>;
  receiptUsers: ko.ObservableArray<User>;
  likeUsers: ko.ObservableArray<User>;
  receiptTimes: ko.Observable<Record<string, string>>;
  receipts: ko.PureComputed<ReadReceipt[]>;
  sentFooter: ko.PureComputed<string>;
  supportsLikes: ko.PureComputed<boolean>;
  supportsReceipts: ko.PureComputed<boolean>;
  likes: ko.PureComputed<string[]>;
  receiptsTitle: ko.PureComputed<string>;
  likesTitle: ko.PureComputed<string>;
  showTabs: ko.PureComputed<boolean>;
  editedFooter: ko.PureComputed<string>;
  panelTitle: ko.PureComputed<string>;

  constructor(params: PanelViewModelProps) {
    super(params);

    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, (oldId: string, updatedMessageEntity: Message) => {
      // listen for any changes to local message entities.
      // if the id of the message being viewed has changed, we store the new ID.
      if (oldId === this.messageId()) {
        this.messageId(updatedMessageEntity.id);
      }
    });

    this.isReceiptsOpen = ko.observable(true);
    this.messageId = ko.observable();

    const userRepository = params.repositories.user;
    this.conversationRepository = params.repositories.conversation;
    this.teamRepository = params.repositories.team;

    this.states = {
      LIKES: 'likes',
      NO_LIKES: 'no-likes',
      NO_RECEIPTS: 'no-receipts',
      RECEIPTS: 'receipts',
      RECEIPTS_OFF: 'receipts-off',
    };

    const formatTime = (time: string | number | Date) => formatLocale(time, 'P, p');

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

    const sortUsers = (userA: User, userB: User): number =>
      userA.name().localeCompare(userB.name(), undefined, {sensitivity: 'base'});

    this.receipts.subscribe(receipts => {
      const userIds = receipts.map(({userId}) => userId);
      userRepository.getUsersById(userIds).then((users: User[]) => this.receiptUsers(users.sort(sortUsers)));
      const receiptTimes = receipts.reduce((times, {userId, time}) => {
        times[userId] = formatTime(time);
        return times;
      }, {} as Record<string, string>);
      this.receiptTimes(receiptTimes);
    });

    this.sentFooter = ko.pureComputed(() => {
      return this.message() ? formatTime(this.message().timestamp()) : '';
    });

    const formatUserCount = (users: User[]): string => (users.length ? ` (${users.length})` : '');

    this.supportsReceipts = ko.pureComputed(() => {
      const isMe = this.message() && this.message().user().isMe;
      const isTeamConversation = !!this.activeConversation().team_id;
      return isMe && isTeamConversation;
    });

    this.supportsLikes = ko.pureComputed(() => {
      if (!this.message()) {
        return false;
      }
      const isPing = this.message().super_type === SuperType.PING;
      const isEphemeral = this.message().is_ephemeral();
      return !isPing && !isEphemeral;
    });

    this.likes = ko.pureComputed(() => {
      const reactions = this.supportsLikes() && this.message().reactions();
      return reactions ? Object.keys(reactions) : [];
    });

    this.likes.subscribe(likeIds => {
      userRepository.getUsersById(likeIds).then(users => this.likeUsers(users.sort(sortUsers)));
    });

    this.receiptsTitle = ko.pureComputed(() => {
      return t('messageDetailsTitleReceipts', formatUserCount(this.receiptUsers()));
    });

    this.likesTitle = ko.pureComputed(() => {
      return t('messageDetailsTitleLikes', formatUserCount(this.likeUsers()));
    });

    this.showTabs = ko.pureComputed(() => this.supportsReceipts() && this.supportsLikes());

    this.editedFooter = ko.pureComputed(() => {
      return this.message()?.edited_timestamp?.() && formatTime(this.message().edited_timestamp());
    });

    this.panelTitle = ko.pureComputed(() => {
      if (!this.supportsReceipts()) {
        return this.likesTitle();
      }
      if (!this.supportsLikes()) {
        return this.receiptsTitle();
      }
      return t('messageDetailsTitle');
    });
  }

  clickOnReceipts(): void {
    this.isReceiptsOpen(true);
  }

  clickOnLikes(): void {
    this.isReceiptsOpen(false);
  }

  getEntityId(): string {
    return this.messageId();
  }

  initView({entity: {id}, showLikes}: {entity: Message; showLikes: boolean}): void {
    this.isReceiptsOpen(!showLikes);
    this.messageId(id);
  }

  getElementId(): string {
    return 'message-details';
  }
}
