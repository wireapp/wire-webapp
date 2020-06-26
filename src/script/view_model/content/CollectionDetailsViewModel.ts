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

import {getLogger, Logger} from 'Util/Logger';
import {isToday, isThisYear, isSameDay, isSameMonth, formatLocale} from 'Util/TimeUtil';
import {t} from 'Util/LocalizerUtil';
import {koPushDeferred} from 'Util/util';
import {amplify} from 'amplify';
import ko from 'knockout';

import {WebAppEvents} from '@wireapp/webapp-events';
import {MessageCategory} from '../../message/MessageCategory';
import {ContentViewModel} from '../ContentViewModel';
import {Conversation} from '../../entity/Conversation';
import {ContentMessage} from '../../entity/message/ContentMessage';

// Parent: ContentViewModel
export class CollectionDetailsViewModel {
  logger: Logger;
  template: ko.Observable<string>;
  conversationEntity: ko.Observable<Conversation>;
  items: ko.ObservableArray<ContentMessage>;
  lastMessageTimestamp: any;
  MessageCategory: typeof MessageCategory;

  constructor() {
    this.itemAdded = this.itemAdded.bind(this);
    this.itemRemoved = this.itemRemoved.bind(this);
    this.messageRemoved = this.messageRemoved.bind(this);
    this.removedFromView = this.removedFromView.bind(this);
    this.setConversation = this.setConversation.bind(this);

    this.logger = getLogger('CollectionDetailsViewModel');

    this.template = ko.observable();
    this.conversationEntity = ko.observable();

    this.items = ko.observableArray();

    this.lastMessageTimestamp = undefined;
    this.MessageCategory = MessageCategory;
  }

  setConversation(conversationEntity: Conversation, category: string, items: ContentMessage[]) {
    amplify.subscribe(WebAppEvents.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, this.messageRemoved);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.ADDED, this.itemAdded);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, this.itemRemoved);
    this.template(category);
    this.conversationEntity(conversationEntity);
    koPushDeferred(this.items, items);
  }

  itemAdded(messageEntity: ContentMessage) {
    const isCurrentConversation = this.conversationEntity().id === messageEntity.conversation_id;
    if (isCurrentConversation) {
      switch (this.template()) {
        case 'images': {
          const isImage = messageEntity.category & MessageCategory.IMAGE;
          const isGif = messageEntity.category & MessageCategory.GIF;
          if (isImage && !isGif) {
            this.items.push(messageEntity);
          }
          break;
        }

        case 'files': {
          const isFile = messageEntity.category & MessageCategory.FILE;
          if (isFile) {
            this.items.push(messageEntity);
          }
          break;
        }

        case 'links':
          const isLinkPreview = messageEntity.category & MessageCategory.LINK_PREVIEW;
          if (isLinkPreview) {
            this.items.push(messageEntity);
          }
          break;

        default:
          break;
      }
    }
  }

  itemRemoved(messageId: string, conversationId: string) {
    const isCurrentConversation = this.conversationEntity().id === conversationId;
    if (isCurrentConversation) {
      this.items.remove(messageEntity => messageEntity.id === messageId);
      if (!this.items().length) {
        this.clickOnBackButton();
      }
    }
  }

  messageRemoved(messageEntity: ContentMessage) {
    this.itemRemoved(messageEntity.id, messageEntity.conversation_id);
  }

  removedFromView() {
    amplify.unsubscribe(WebAppEvents.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, this.messageRemoved);
    amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.ADDED, this.itemAdded);
    amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, this.itemRemoved);
    this.lastMessageTimestamp = undefined;
    this.conversationEntity(null);
    this.items.removeAll();
  }

  clickOnBackButton() {
    amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.COLLECTION);
  }

  clickOnImage(messageEntity: ContentMessage) {
    amplify.publish(WebAppEvents.CONVERSATION.DETAIL_VIEW.SHOW, messageEntity, this.items(), 'collection');
  }

  shouldShowHeader(messageEntity: ContentMessage) {
    if (!this.lastMessageTimestamp) {
      this.lastMessageTimestamp = messageEntity.timestamp();
      return true;
    }

    // We passed today
    const sameDay = isSameDay(messageEntity.timestamp(), this.lastMessageTimestamp);
    const wasToday = isToday(this.lastMessageTimestamp);
    if (!sameDay && wasToday) {
      this.lastMessageTimestamp = messageEntity.timestamp();
      return true;
    }

    // We passed the month
    const sameMonth = isSameMonth(messageEntity.timestamp(), this.lastMessageTimestamp);
    if (!sameMonth) {
      this.lastMessageTimestamp = messageEntity.timestamp();
      return true;
    }

    return false;
  }

  getTitleForHeader(messageEntity: ContentMessage) {
    const messageDate = messageEntity.timestamp();
    if (isToday(messageDate)) {
      return t('conversationToday');
    }
    return isThisYear(messageDate) ? formatLocale(messageDate, 'MMMM') : formatLocale(messageDate, 'MMMM y');
  }
}
