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

import {APIClient} from '@wireapp/api-client';
import {ClientClassification, ClientType} from '@wireapp/api-client/src/client';
import {ConversationProtocol} from '@wireapp/api-client/src/conversation';
import {LegalHoldStatus} from '@wireapp/protocol-messaging';
import {MemoryEngine} from '@wireapp/store-engine';
import {ConversationService, PayloadBundleSource, PayloadBundleState, PayloadBundleType} from '../';

import {CryptographyService} from '../../cryptography';
import * as PayloadHelper from '../../test/PayloadHelper';
import {LinkPreviewUploadedContent, MentionContent, QuoteContent} from '../content';
import {MessageTargetMode} from './ConversationService.types';
import {MessageBuilder} from '../message/MessageBuilder';
import {OtrMessage} from '../message/OtrMessage';
import {NotificationService} from '../../notification/NotificationService';
import type {MLSService} from '../../mls';
import * as messageSender from '../message/messageSender';

const mockedMLSService = {
  encryptMessage: () => {},
} as unknown as MLSService;

describe('ConversationService', () => {
  beforeAll(() => {
    jest.spyOn(messageSender, 'sendMessage').mockImplementation(fn => fn());
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
  });

  function buildConversationService(federated?: boolean) {
    const client = new APIClient({urls: APIClient.BACKEND.STAGING});
    jest.spyOn(client.api.conversation, 'postMlsMessage').mockReturnValue(
      Promise.resolve({
        events: [],
        time: new Date().toISOString(),
      }),
    );
    jest.spyOn(client.api.user, 'postListClients').mockReturnValue(
      Promise.resolve({
        qualified_user_map: {
          'test-domain': {
            'test-id-1': [{class: ClientClassification.DESKTOP, id: 'test-client-id-1-user-1'}],
            'test-id-2': [
              {class: ClientClassification.DESKTOP, id: 'test-client-id-1-user-2'},
              {class: ClientClassification.PHONE, id: 'test-client-id-2-user-2'},
            ],
          },
        },
      }),
    );

    client.context = {
      clientType: ClientType.NONE,
      userId: PayloadHelper.getUUID(),
      clientId: PayloadHelper.getUUID(),
    };
    return new ConversationService(
      client,
      new CryptographyService(client, new MemoryEngine(), {useQualifiedIds: false, nbPrekeys: 1}),
      {
        useQualifiedIds: federated,
      },
      {
        commitPendingProposals: () => Promise.resolve(),
      } as unknown as NotificationService,
      mockedMLSService,
    );
  }

  describe('"send PROTEUS"', () => {
    const baseMessage = {
      conversation: PayloadHelper.getUUID(),
      from: PayloadHelper.getUUID(),
      id: PayloadHelper.getUUID(),
      timestamp: 0,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
    };
    const messages: OtrMessage[] = [
      {...baseMessage, type: PayloadBundleType.TEXT, content: {text: 'test'}},
      {
        ...baseMessage,
        type: PayloadBundleType.CONFIRMATION,
        content: {type: 1, firstMessageId: PayloadHelper.getUUID()},
      },
      {...baseMessage, type: PayloadBundleType.PING, content: {hotKnock: false}},
    ];
    messages.forEach(payloadBundle => {
      it(`calls callbacks when sending '${payloadBundle.type}' message is starting and successful`, async () => {
        const conversationService = buildConversationService();
        const sentTime = new Date().toISOString();
        const onStart = jest.fn().mockReturnValue(Promise.resolve(true));
        const onSuccess = jest.fn();

        jest.spyOn(conversationService as any, 'sendGenericMessage').mockReturnValue(Promise.resolve({time: sentTime}));
        // const onReconnect = jest.fn().mockReturnValue(getServerAddress());

        const promise = conversationService.send({
          protocol: ConversationProtocol.PROTEUS,
          onStart,
          onSuccess,
          payload: payloadBundle,
        });

        expect(onStart).toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
        await promise;
        expect(onSuccess).toHaveBeenCalledWith(jasmine.any(Object), sentTime);
      });
    });

    describe('targetted messages', () => {
      const message: OtrMessage = {...baseMessage, type: PayloadBundleType.TEXT, content: {text: 'test'}};
      it('fails if no userIds are given', done => {
        const conversationService = buildConversationService();
        conversationService
          .send({
            protocol: ConversationProtocol.PROTEUS,
            payload: message,
            targetMode: MessageTargetMode.USERS,
          })
          .catch(error => {
            expect(error.message).toContain('no userIds are given');
            done();
          });
      });

      [{user1: ['client1'], user2: ['client11', 'client12']}, ['user1', 'user2']].forEach(recipients => {
        it(`forwards the list of users to report (${JSON.stringify(recipients)})`, async () => {
          const conversationService = buildConversationService();
          jest
            .spyOn(conversationService as any, 'getRecipientsForConversation')
            .mockReturnValue(Promise.resolve({} as any));
          jest.spyOn(conversationService['messageService'], 'sendMessage').mockReturnValue(Promise.resolve({} as any));
          await conversationService.send({
            protocol: ConversationProtocol.PROTEUS,
            payload: message,
            targetMode: MessageTargetMode.USERS,
            userIds: recipients,
          });

          expect(conversationService['messageService'].sendMessage).toHaveBeenCalledWith(
            jasmine.any(String),
            jasmine.any(Object),
            jasmine.any(Uint8Array),
            jasmine.objectContaining({reportMissing: ['user1', 'user2']}),
          );
        });
      });

      [
        {domain1: {user1: ['client1'], user2: ['client11', 'client12']}, domain2: {user3: ['client1']}},
        [
          {id: 'user1', domain: 'domain1'},
          {id: 'user2', domain: 'domain1'},
          {id: 'user3', domain: 'domain2'},
        ],
      ].forEach(recipients => {
        it(`forwards the list of users to report for federated message (${JSON.stringify(recipients)})`, async () => {
          const conversationService = buildConversationService(true);
          jest
            .spyOn(conversationService as any, 'getQualifiedRecipientsForConversation')
            .mockReturnValue(Promise.resolve({} as any));
          jest
            .spyOn(conversationService['messageService'], 'sendFederatedMessage')
            .mockReturnValue(Promise.resolve({} as any));
          await conversationService.send({
            protocol: ConversationProtocol.PROTEUS,
            conversationDomain: 'domain1',
            payload: message,
            targetMode: MessageTargetMode.USERS,
            userIds: recipients,
          });

          expect(conversationService['messageService'].sendFederatedMessage).toHaveBeenCalledWith(
            jasmine.any(String),
            jasmine.any(Object),
            jasmine.any(Uint8Array),
            jasmine.objectContaining({
              reportMissing: [
                {id: 'user1', domain: 'domain1'},
                {id: 'user2', domain: 'domain1'},
                {id: 'user3', domain: 'domain2'},
              ],
            }),
          );
        });
      });

      [{user1: ['client1'], user2: ['client11', 'client12']}, ['user1', 'user2']].forEach(recipients => {
        it(`ignores all missing user/client pair if targetMode is USER_CLIENTS`, async () => {
          const conversationService = buildConversationService(true);
          jest
            .spyOn(conversationService as any, 'getRecipientsForConversation')
            .mockReturnValue(Promise.resolve({} as any));
          jest.spyOn(conversationService['messageService'], 'sendMessage').mockReturnValue(Promise.resolve({} as any));
          await conversationService.send({
            protocol: ConversationProtocol.PROTEUS,
            payload: message,
            targetMode: MessageTargetMode.USERS_CLIENTS,
            userIds: recipients,
          });

          expect(conversationService['messageService'].sendMessage).toHaveBeenCalledWith(
            jasmine.any(String),
            jasmine.any(Object),
            jasmine.any(Uint8Array),
            jasmine.objectContaining({reportMissing: false}),
          );
        });
      });

      [
        {domain1: {user1: ['client1'], user2: ['client11', 'client12']}, domain2: {user3: ['client1']}},
        [
          {id: 'user1', domain: 'domain1'},
          {id: 'user2', domain: 'domain1'},
          {id: 'user3', domain: 'domain2'},
        ],
      ].forEach(recipients => {
        it(`ignores all missing user/client pair if targetMode is USER_CLIENTS on federated env`, async () => {
          const conversationService = buildConversationService(true);
          jest
            .spyOn(conversationService as any, 'getQualifiedRecipientsForConversation')
            .mockReturnValue(Promise.resolve({} as any));
          jest
            .spyOn(conversationService['messageService'], 'sendFederatedMessage')
            .mockReturnValue(Promise.resolve({} as any));
          await conversationService.send({
            protocol: ConversationProtocol.PROTEUS,
            conversationDomain: 'domain1',
            payload: message,
            targetMode: MessageTargetMode.USERS_CLIENTS,
            userIds: recipients,
          });

          expect(conversationService['messageService'].sendFederatedMessage).toHaveBeenCalledWith(
            jasmine.any(String),
            jasmine.any(Object),
            jasmine.any(Uint8Array),
            jasmine.objectContaining({
              reportMissing: false,
            }),
          );
        });
      });
    });

    it(`cancels message sending if onStart returns false`, async () => {
      const conversationService = buildConversationService();
      jest.spyOn(conversationService as any, 'sendGenericMessage');
      const message: OtrMessage = {...baseMessage, type: PayloadBundleType.TEXT, content: {text: 'test'}};
      const onStart = jest.fn().mockReturnValue(Promise.resolve(false));
      const onSuccess = jest.fn();
      const payloadBundle = await conversationService.send({
        onStart,
        onSuccess,
        protocol: ConversationProtocol.PROTEUS,
        payload: message,
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(conversationService['sendGenericMessage']).not.toHaveBeenCalled();
      expect(payloadBundle.state).toBe(PayloadBundleState.CANCELLED);
    });

    it(`does not call onSuccess when message was canceled`, async () => {
      const conversationService = buildConversationService();
      jest
        .spyOn(conversationService as any, 'sendGenericMessage')
        .mockReturnValue(Promise.resolve({time: '', errored: true}));
      const message: OtrMessage = {...baseMessage, type: PayloadBundleType.TEXT, content: {text: 'test'}};
      const onSuccess = jest.fn();
      const payloadBundle = await conversationService.send({
        onSuccess,
        payload: message,
        protocol: ConversationProtocol.PROTEUS,
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(payloadBundle.state).toBe(PayloadBundleState.CANCELLED);
    });
  });

  describe('"send MLS"', () => {
    const groupId = PayloadHelper.getUUID();
    const baseMessage = {
      conversation: PayloadHelper.getUUID(),
      from: PayloadHelper.getUUID(),
      id: PayloadHelper.getUUID(),
      timestamp: 0,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
    };
    const messages: OtrMessage[] = [
      {...baseMessage, type: PayloadBundleType.TEXT, content: {text: 'test'}},
      {
        ...baseMessage,
        type: PayloadBundleType.CONFIRMATION,
        content: {type: 1, firstMessageId: PayloadHelper.getUUID()},
      },
      {...baseMessage, type: PayloadBundleType.PING, content: {hotKnock: false}},
      {
        ...baseMessage,
        type: PayloadBundleType.ASSET_IMAGE,
        content: generateImage(),
      },
    ];
    messages.forEach(payload => {
      it(`calls callbacks when sending '${payload.type}' message is starting and successful`, async () => {
        const conversationService = buildConversationService();
        const onStart = jest.fn().mockReturnValue(Promise.resolve(true));
        const onSuccess = jest.fn();
        const promise = conversationService.send({
          protocol: ConversationProtocol.MLS,
          groupId,
          onStart,
          onSuccess,
          payload,
        });

        expect(onStart).toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
        await promise;
        expect(onSuccess).toHaveBeenCalledWith(jasmine.any(Object), new Date(0).toISOString());
      });
    });
  });

  describe('fetchAllParticipantsClients', () => {
    it('gives the members and clients of a federated conversation', async () => {
      const members = {
        'test-domain': {
          ['test-id-1']: ['test-client-id-1-user-1'],
          ['test-id-2']: ['test-client-id-1-user-2', 'test-client-id-2-user-2'],
        },
      };
      const conversationService = buildConversationService(true);
      jest.spyOn(conversationService as any, 'getConversationQualifiedMembers').mockReturnValue([
        {domain: 'test-domain', id: 'test-id-1'},
        {domain: 'test-domain', id: 'test-id-2'},
      ]);

      const fetchedMembers = await conversationService.fetchAllParticipantsClients('convid');
      expect(fetchedMembers).toEqual(members);
    });
  });

  describe('getAllParticipantsClients', () => {
    it('gives the members and clients of a federated conversation', async () => {
      const members = {
        user1: ['client1', 'client2'],
        user2: ['client1', 'client2'],
        user3: ['client1', 'client2'],
      };
      const conversationService = buildConversationService(true);
      jest
        .spyOn(conversationService['messageService'], 'sendMessage')
        .mockImplementation((_client, _recipients, _text, options) => {
          options?.onClientMismatch?.({missing: members, deleted: {}, redundant: {}, time: ''});
          return {} as any;
        });
      const fetchedMembers = await conversationService.getAllParticipantsClients('convid');

      expect(fetchedMembers).toEqual(members);
    });

    it('gives the members and clients of a federated conversation', async () => {
      const members = {
        domain1: {user1: ['client1', 'client2']},
        domain2: {user2: ['client1', 'client2'], user3: ['client1', 'client2']},
      };
      const conversationService = buildConversationService(true);
      jest
        .spyOn(conversationService['messageService'], 'sendFederatedMessage')
        .mockImplementation((_client, _recipients, _text, options) => {
          options?.onClientMismatch?.({missing: members, deleted: {}, redundant: {}, failed_to_send: {}, time: ''});
          return {} as any;
        });
      const fetchedMembers = await conversationService.getAllParticipantsClients('convid', 'domain1');

      expect(fetchedMembers).toEqual(members);
    });
  });

  describe('"createText"', () => {
    it('adds link previews correctly', async () => {
      const url = 'http://example.com';

      const permanentUrl = url;
      const summary = 'Summary';
      const text = url;
      const title = 'Title';
      const tweet = {
        author: 'Author',
        username: 'Username',
      };
      const urlOffset = 0;

      const linkPreview = {
        permanentUrl,
        summary,
        title,
        tweet,
        url,
        urlOffset,
      };
      const textMessage = MessageBuilder.createText({conversationId: '', from: '', text})
        .withLinkPreviews([linkPreview])
        .build();

      expect(textMessage.content.text).toEqual(text);
      expect(textMessage.content.linkPreviews).toEqual(jasmine.any(Array));
      expect(textMessage.content.linkPreviews!.length).toBe(1);

      expect(textMessage.content.linkPreviews![0]).toEqual(
        jasmine.objectContaining({
          permanentUrl,
          summary,
          title,
          tweet,
          url,
          urlOffset,
        }),
      );
    });

    it('does not add link previews', () => {
      const text = 'Hello, world!';
      const textMessage = MessageBuilder.createText({conversationId: '', from: '', text}).build();

      expect(textMessage.content.linkPreviews).toBeUndefined();
    });

    it('uploads link previews', async () => {
      const url = 'http://example.com';
      const text = url;
      const urlOffset = 0;

      const linkPreview: LinkPreviewUploadedContent = {
        url,
        urlOffset,
        imageUploaded: generateImage(),
      };
      const textMessage = MessageBuilder.createText({conversationId: '', from: '', text})
        .withLinkPreviews([linkPreview])
        .build();

      expect(textMessage.content.linkPreviews).toEqual(jasmine.any(Array));
      expect(textMessage.content.linkPreviews!.length).toBe(1);

      expect(textMessage.content.linkPreviews![0]).toEqual(
        jasmine.objectContaining({
          url,
          urlOffset,
        }),
      );
    });

    it('adds mentions correctly', () => {
      const text = 'Hello @user!';

      const mention: MentionContent = {
        length: 5,
        start: 6,
        userId: PayloadHelper.getUUID(),
      };

      const textMessage = MessageBuilder.createText({conversationId: '', from: '', text})
        .withMentions([mention])
        .build();

      expect(textMessage.content.text).toEqual(text);
      expect(textMessage.content.mentions).toEqual(jasmine.any(Array));
      expect(textMessage.content.mentions!.length).toBe(1);

      expect(textMessage.content.mentions![0]).toEqual(jasmine.objectContaining(mention));
    });

    it('does not add mentions', () => {
      const text = 'Hello, world!';
      const textMessage = MessageBuilder.createText({conversationId: '', from: '', text}).build();

      expect(textMessage.content.mentions).toBeUndefined();
    });

    it('adds a quote correctly', () => {
      const quoteId = PayloadHelper.getUUID();
      const text = 'I totally agree.';

      const quote: QuoteContent = {
        quotedMessageId: quoteId,
      };

      const replyMessage = MessageBuilder.createText({conversationId: '', from: '', text}).withQuote(quote).build();

      expect(replyMessage.content.text).toEqual(text);
      expect(replyMessage.content.quote).toEqual(jasmine.objectContaining({quotedMessageId: quoteId}));
      expect(replyMessage.content.quote).toEqual(jasmine.objectContaining(quote));
    });

    it('does not add a quote', () => {
      const text = 'Hello, world!';
      const textMessage = MessageBuilder.createText({conversationId: '', from: '', text}).build();

      expect(textMessage.content.quote).toBeUndefined();
    });

    it('adds a read confirmation request correctly', () => {
      const text = 'Please read me';

      const replyMessage = MessageBuilder.createText({conversationId: '', from: '', text})
        .withReadConfirmation(true)
        .build();

      expect(replyMessage.content.text).toEqual(text);
      expect(replyMessage.content.expectsReadConfirmation).toEqual(true);
    });

    it('adds a legal hold status', () => {
      const text = 'Please read me';

      const firstMessage = MessageBuilder.createText({conversationId: '', from: '', text})
        .withLegalHoldStatus()
        .build();

      expect(firstMessage.content.legalHoldStatus).toEqual(LegalHoldStatus.UNKNOWN);

      const replyMessage = MessageBuilder.createText({conversationId: '', from: '', text})
        .withLegalHoldStatus(LegalHoldStatus.ENABLED)
        .build();

      expect(replyMessage.content.text).toEqual(text);
      expect(replyMessage.content.legalHoldStatus).toEqual(LegalHoldStatus.ENABLED);
    });
  });
});

function generateImage() {
  const image = {
    data: Buffer.from([]),
    height: 123,
    type: 'image/jpeg',
    width: 456,
  };
  return {
    image,
    asset: {
      cipherText: Buffer.from([]),
      key: '',
      keyBytes: Buffer.from([]),
      sha256: Buffer.from([]),
      token: '',
    },
  };
}
