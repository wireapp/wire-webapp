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

import {iterateItem} from 'Util/ArrayUtil';
import {KEY} from 'Util/KeyboardUtil';
import {formatLocale} from 'Util/TimeUtil';

import {WebAppEvents} from '../event/WebApp';
import {Modal} from '../ui/Modal';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};

z.viewModel.ImageDetailViewViewModel = class ImageDetailViewViewModel {
  constructor(mainViewModel, repositories) {
    this.beforeHideCallback = this.beforeHideCallback.bind(this);
    this.hideCallback = this.hideCallback.bind(this);
    this.messageAdded = this.messageAdded.bind(this);
    this.messageExpired = this.messageExpired.bind(this);
    this.messageRemoved = this.messageRemoved.bind(this);

    this.elementId = 'detail-view';
    this.mainViewModel = mainViewModel;
    this.conversationRepository = repositories.conversation;

    this.actionsViewModel = this.mainViewModel.actions;
    this.source = undefined;

    this.imageModal = undefined;
    this.imageSrc = ko.observable();
    this.imageVisible = ko.observable(false);

    this.conversationEntity = ko.observable();
    this.items = ko.observableArray();
    this.messageEntity = ko.observable();
    this.messageEntity.subscribe(messageEntity => {
      if (messageEntity) {
        const conversationId = messageEntity.conversation_id;
        const isExpectedId = this.conversationEntity() ? conversationId === this.conversationEntity().id : false;
        if (!isExpectedId) {
          this.conversationRepository
            .get_conversation_by_id(conversationId)
            .then(conversationEntity => this.conversationEntity(conversationEntity));
        }
      }
    });

    amplify.subscribe(WebAppEvents.CONVERSATION.DETAIL_VIEW.SHOW, this.show.bind(this));

    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  beforeHideCallback() {
    this.imageVisible(false);
  }

  hideCallback() {
    $(document).off('keydown.lightbox');
    window.URL.revokeObjectURL(this.imageSrc());

    this.imageSrc(undefined);
    this.items.removeAll();
    this.messageEntity(undefined);
    this.source = undefined;

    amplify.unsubscribe(WebAppEvents.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, this.messageExpired);
    amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.ADDED, this.messageAdded);
    amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, this.messageRemoved);
  }

  show(messageEntity, messageEntities, source) {
    this.items(messageEntities);
    this.messageEntity(messageEntity);
    this.source = source;

    amplify.subscribe(WebAppEvents.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, this.messageExpired);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.ADDED, this.messageAdded);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, this.messageRemoved);

    if (!this.imageModal) {
      this.imageModal = new Modal('#detail-view', this.hideCallback, this.beforeHideCallback);
    }

    this.imageModal.show();

    this._loadImage();
    $(document).on('keydown.lightbox', keyboardEvent => {
      switch (keyboardEvent.key) {
        case KEY.ESC: {
          this.clickOnClose();
          break;
        }

        case KEY.ARROW_DOWN:
        case KEY.ARROW_RIGHT: {
          this.clickOnShowNext(this, keyboardEvent);
          break;
        }

        case KEY.ARROW_LEFT:
        case KEY.ARROW_UP: {
          this.clickOnShowPrevious(this, keyboardEvent);
          break;
        }

        default:
          break;
      }
    });
  }

  messageAdded(messageEntity) {
    const isCurrentConversation = this.conversationEntity().id === messageEntity.conversation;
    if (isCurrentConversation) {
      this.items.push(messageEntity);
    }
  }

  messageExpired(messageEntity) {
    this.messageRemoved(messageEntity.id, messageEntity.conversation_id);
  }

  messageRemoved(messageId, conversationId) {
    const isCurrentConversation = this.conversationEntity().id === conversationId;
    if (isCurrentConversation) {
      const isVisibleMessage = this.messageEntity().id === messageId;
      if (isVisibleMessage) {
        return this.imageModal.hide();
      }

      this.items.remove(messageEntity => messageEntity.id === messageId);
    }
  }

  formatTimestamp(timestamp) {
    return formatLocale(timestamp, 'P p');
  }

  _loadImage() {
    this.imageVisible(false);
    this.messageEntity()
      .get_first_asset()
      .resource()
      .load()
      .then(blob => {
        if (blob) {
          this.imageSrc(window.URL.createObjectURL(blob));
          this.imageVisible(true);
        }
      });
  }

  clickOnClose() {
    this.imageModal.hide();
  }

  clickOnDownload() {
    this.messageEntity().download();
  }

  clickOnLike() {
    this.conversationRepository.toggle_like(this.conversationEntity(), this.messageEntity());
  }

  clickOnReply() {
    amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REPLY, this.messageEntity());
    this.imageModal.hide();
  }

  clickOnShowNext(imageDetailViewViewModel, event) {
    event.stopPropagation();
    this._iterateImage(true);
  }

  clickOnShowPrevious(imageDetailViewViewModel, event) {
    event.stopPropagation();
    this._iterateImage(false);
  }

  _iterateImage(reverse) {
    const messageEntity = iterateItem(this.items(), this.messageEntity(), reverse);

    if (messageEntity) {
      this.messageEntity(messageEntity);
      this._loadImage();
    }
  }
};
