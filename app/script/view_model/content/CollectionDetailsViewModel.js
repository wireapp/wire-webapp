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
window.z.viewModel.content = z.viewModel.content || {};

// Parent: z.viewModel.ContentViewModel
z.viewModel.content.CollectionDetailsViewModel = class CollectionDetailsViewModel {
  constructor() {
    this.itemAdded = this.itemAdded.bind(this);
    this.itemRemoved = this.itemRemoved.bind(this);
    this.removedFromView = this.removedFromView.bind(this);
    this.setConversation = this.setConversation.bind(this);

    this.logger = new z.util.Logger('z.viewModel.CollectionDetailsViewModel', z.config.LOGGER.OPTIONS);

    this.template = ko.observable();
    this.conversationEntity = ko.observable();

    this.items = ko.observableArray();

    this.lastMessageTimestamp = undefined;
  }

  setConversation(conversationEntity, category, items) {
    amplify.subscribe(z.event.WebApp.CONVERSATION.MESSAGE.ADDED, this.itemAdded);
    amplify.subscribe(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, this.itemRemoved);
    this.template(category);
    this.conversationEntity(conversationEntity);
    z.util.ko_push_deferred(this.items, items);
  }

  itemAdded(messageEntity) {
    const isExpectedId = this.conversationEntity().id === messageEntity.conversation_id;
    if (isExpectedId) {
      switch (this.template()) {
        case 'images': {
          const isImage = messageEntity.category & z.message.MessageCategory.IMAGE;
          const isGif = messageEntity.category & z.message.MessageCategory.GIF;
          if (isImage && !isGif) {
            this.items.push(messageEntity);
          }
          break;
        }

        case 'files': {
          const isFile = messageEntity.category & z.message.MessageCategory.FILE;
          if (isFile) {
            this.items.push(messageEntity);
          }
          break;
        }

        case 'links':
          const isLinkPreview = messageEntity.category & z.message.MessageCategory.LINK_PREVIEW;
          if (isLinkPreview) {
            this.items.push(messageEntity);
          }
          break;

        default:
          break;
      }
    }
  }

  itemRemoved(removedMessageId) {
    this.items.remove(messageEntity => messageEntity.id === removedMessageId);
    if (!this.items().length) {
      this.clickOnBackButton();
    }
  }

  removedFromView() {
    amplify.unsubscribe(z.event.WebApp.CONVERSATION.MESSAGE.ADDED, this.itemAdded);
    amplify.unsubscribe(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, this.itemRemoved);
    this.lastMessageTimestamp = undefined;
    this.conversationEntity(null);
    this.items.removeAll();
  }

  clickOnBackButton() {
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.COLLECTION);
  }

  clickOnImage(messageEntity) {
    amplify.publish(z.event.WebApp.CONVERSATION.DETAIL_VIEW.SHOW, messageEntity, this.items(), 'collection');
  }

  shouldShowHeader(messageEntity) {
    if (!this.lastMessageTimestamp) {
      this.lastMessageTimestamp = messageEntity.timestamp();
      return true;
    }

    // We passed today
    const isSameDay = moment(messageEntity.timestamp()).is_same_day(this.lastMessageTimestamp);
    const wasToday = moment(this.lastMessageTimestamp).is_today();
    if (!isSameDay && wasToday) {
      this.lastMessageTimestamp = messageEntity.timestamp();
      return true;
    }

    // We passed the month
    const isSameMonth = moment(messageEntity.timestamp()).is_same_month(this.lastMessageTimestamp);
    if (!isSameMonth) {
      this.lastMessageTimestamp = messageEntity.timestamp();
      return true;
    }
  }

  getTitleForHeader(messageEntity) {
    const messageDate = moment(messageEntity.timestamp());
    if (messageDate.is_today()) {
      return z.l10n.text(z.string.conversationToday);
    }

    return messageDate.is_current_year() ? messageDate.format('MMMM') : messageDate.format('MMMM Y');
  }
};
