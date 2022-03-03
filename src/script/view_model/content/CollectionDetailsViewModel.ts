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

import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import ko from 'knockout';

import {ContentMessage} from '../../entity/message/ContentMessage';
import {Conversation} from '../../entity/Conversation';

// Parent: ContentViewModel
export class CollectionDetailsViewModel {
  category: ko.Observable<string> = ko.observable();
  messages: ko.Observable<ContentMessage[]> = ko.observable();
  conversation: ko.Observable<Conversation> = ko.observable();

  readonly setConversation = (conversationEntity: Conversation, category: string, items: ContentMessage[]) => {
    this.conversation(conversationEntity);
    this.category(category);
    this.messages(items);
  };

  clickOnImage(messageEntity: ContentMessage) {
    amplify.publish(WebAppEvents.CONVERSATION.DETAIL_VIEW.SHOW, messageEntity, this.items(), 'collection');
  }
}
