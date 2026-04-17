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

import {ClientEvent} from 'Repositories/event/Client';
import type {EventService} from 'Repositories/event/EventService';
import type {EventRecord, StorageService} from 'Repositories/storage';
import {StatusType} from 'src/script/message/StatusType';

import {MessageCategory} from '../../message/MessageCategory';
import type {APIClient} from '../../service/APIClientSingleton';
import type {Core} from '../../service/CoreSingleton';
import {ConversationService} from './ConversationService';

type EventServiceLike = Pick<EventService, 'loadEventsWithCategory'>;

describe('ConversationService', () => {
  describe('searchInConversation', () => {
    it('matches multipart message text content', async () => {
      const multipartEvent: EventRecord = {
        primary_key: 'primary-key',
        category: MessageCategory.TEXT,
        conversation: 'conversation-id',
        from: 'user-id',
        time: new Date(0).toISOString(),
        id: 'event-id',
        type: ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD,
        data: {attachments: [{}], text: {content: 'i am sending a file'}},
        status: StatusType.SENT,
        ephemeral_expires: false,
      };

      const loadEventsWithCategory = jest
        .fn<
          ReturnType<EventServiceLike['loadEventsWithCategory']>,
          Parameters<EventServiceLike['loadEventsWithCategory']>
        >()
        .mockResolvedValue([multipartEvent]);
      const eventService: EventServiceLike = {loadEventsWithCategory};

      const conversationService = new ConversationService(
        eventService,
        {} as unknown as StorageService,
        {} as unknown as APIClient,
        {} as unknown as Core,
      );

      expect(await conversationService.searchInConversation('conversation-id', 'sending a file')).toEqual([
        multipartEvent,
      ]);
      expect(await conversationService.searchInConversation('conversation-id', 'unrelated')).toEqual([]);
    });

    it('matches composite message text items', async () => {
      const compositeEvent: EventRecord = {
        primary_key: 'primary-key',
        category: MessageCategory.TEXT,
        conversation: 'conversation-id',
        from: 'user-id',
        time: new Date(0).toISOString(),
        id: 'event-id',
        type: ClientEvent.CONVERSATION.COMPOSITE_MESSAGE_ADD,
        data: {items: [{button: {id: '', text: ''}, text: {sender: '', content: 'composite caption'}}]},
        ephemeral_expires: false,
      };

      const loadEventsWithCategory = jest
        .fn<
          ReturnType<EventServiceLike['loadEventsWithCategory']>,
          Parameters<EventServiceLike['loadEventsWithCategory']>
        >()
        .mockResolvedValue([compositeEvent]);
      const eventService: EventServiceLike = {loadEventsWithCategory};

      const conversationService = new ConversationService(
        eventService,
        {} as unknown as StorageService,
        {} as unknown as APIClient,
        {} as unknown as Core,
      );
      expect(await conversationService.searchInConversation('conversation-id', 'caption')).toEqual([compositeEvent]);
      expect(await conversationService.searchInConversation('conversation-id', 'unrelated')).toEqual([]);
    });
  });
});
