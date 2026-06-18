/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {Conversation as BackendConversation} from '@wireapp/api-client/lib/conversation';
import type {QualifiedId} from '@wireapp/api-client/lib/user';

import {ClientEvent} from 'Repositories/event/Client';
import type {EventService} from 'Repositories/event/EventService';
import type {EventRecord, StorageService} from 'Repositories/storage';
import {StatusType} from 'src/script/message/StatusType';

import {MessageCategory} from '../../message/MessageCategory';
import type {APIClient} from '../../service/apiClientSingleton';
import type {Core} from '../../service/coreSingleton';
import {ConversationService} from './ConversationService';
import {decryptDescription, encryptDescription} from './descriptionCrypto';

jest.mock('./descriptionCrypto', () => ({
  decryptDescription: jest.fn(),
  encryptDescription: jest.fn(),
}));

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

  describe('conversation description', () => {
    const conversationId: QualifiedId = {id: 'conv-id', domain: 'wire.com'};
    const groupId = 'group-id';
    const secret = btoa('12345678901234567890123456789012');

    const makeService = (conversationApi: Record<string, jest.Mock>) => {
      const apiClient = {
        api: {conversation: conversationApi},
      } as unknown as APIClient;
      const core = {
        service: {mls: {exportSecretKey: jest.fn().mockResolvedValue(secret)}},
      } as unknown as Core;

      return {service: new ConversationService({} as EventService, {} as StorageService, apiClient, core), core};
    };

    it('fetches and decrypts the encrypted conversation description', async () => {
      const getConversationDescription = jest.fn().mockResolvedValue({version: 7, ciphertext: 'ciphertext'});
      const {service, core} = makeService({getConversationDescription});
      jest.mocked(decryptDescription).mockResolvedValueOnce('decrypted description');

      const result = await service.getConversationDescription(conversationId, groupId);

      expect(result).toEqual({version: 7, description: 'decrypted description'});
      expect(getConversationDescription).toHaveBeenCalledWith(conversationId);
      expect(core.service?.mls?.exportSecretKey).toHaveBeenCalledWith(groupId, 32);
      expect(decryptDescription).toHaveBeenCalledWith('ciphertext', expect.any(Uint8Array));
    });

    it('fetches current version before updating the encrypted conversation description', async () => {
      const getConversationDescription = jest.fn().mockResolvedValue({version: 7, ciphertext: 'current-ciphertext'});
      const putConversationDescription = jest.fn().mockResolvedValue(undefined);
      const {service, core} = makeService({getConversationDescription, putConversationDescription});
      jest.mocked(encryptDescription).mockResolvedValueOnce('new-ciphertext');

      const result = await service.updateConversationDescription(conversationId, groupId, 'new description', 3);

      expect(result).toEqual({version: 8});
      expect(getConversationDescription).toHaveBeenCalledWith(conversationId);
      expect(core.service?.mls?.exportSecretKey).toHaveBeenCalledWith(groupId, 32);
      expect(encryptDescription).toHaveBeenCalledWith('new description', expect.any(Uint8Array));
      expect(putConversationDescription).toHaveBeenCalledWith(conversationId, {
        base_version: 7,
        ciphertext: 'new-ciphertext',
      });
    });
  });

  describe('getSafeConversationById', () => {
    const conversationId: QualifiedId = {id: 'conv-id', domain: 'wire.com'};

    const makeService = (getConversation: jest.Mock) => {
      const apiClient = {
        api: {conversation: {getConversation}},
      } as unknown as APIClient;
      return new ConversationService(
        {} as unknown as EventService,
        {} as unknown as StorageService,
        apiClient,
        {} as unknown as Core,
      );
    };

    it('resolves to Ok carrying the backend response when the fetch succeeds', async () => {
      const conversation = {epoch: 3} as unknown as BackendConversation;
      const getConversation = jest.fn().mockResolvedValue(conversation);
      const service = makeService(getConversation);

      const task = service.getSafeConversationById(conversationId);
      const settled = await task;

      expect(settled.isOk).toBe(true);
      expect(settled.match({Ok: c => c, Err: () => null})).toEqual(conversation);
      expect(getConversation).toHaveBeenCalledWith(conversationId);
    });

    it('resolves to Err carrying the original error when the fetch rejects', async () => {
      const error = new Error('network');
      const getConversation = jest.fn().mockRejectedValue(error);
      const service = makeService(getConversation);

      const settled = await service.getSafeConversationById(conversationId);

      expect(settled.isErr).toBe(true);
      expect(settled.match({Ok: () => null, Err: e => e})).toBe(error);
    });

    it('does not throw on rejection (the failure stays in the data model)', async () => {
      const getConversation = jest.fn().mockRejectedValue(new Error('boom'));
      const service = makeService(getConversation);

      await expect(service.getSafeConversationById(conversationId)).resolves.toBeDefined();
    });
  });
});
