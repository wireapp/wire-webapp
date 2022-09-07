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

import {CoreCrypto} from '@otak/core-crypto/platforms/web/corecrypto';
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

describe('ConversationService', () => {
  beforeAll(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(0));
  });
  afterAll(() => {
    jasmine.clock().uninstall();
  });

  function buildConversationService(federated?: boolean) {
    const client = new APIClient({urls: APIClient.BACKEND.STAGING});
    spyOn(client.api.conversation, 'postMlsMessage').and.returnValue(
      Promise.resolve({
        events: [],
        time: new Date().toISOString(),
      }),
    );
    spyOn(client.api.user, 'postListClients').and.returnValue(
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
      () =>
        ({
          encryptMessage: async () => Uint8Array.from([1, 2, 3]),
        } as unknown as CoreCrypto),
      {
        commitPendingProposals: () => Promise.resolve(),
      } as unknown as NotificationService,
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
        const onStart = jasmine.createSpy().and.returnValue(Promise.resolve(true));
        const onSuccess = jasmine.createSpy();

        spyOn<any>(conversationService, 'sendGenericMessage').and.returnValue(Promise.resolve({time: sentTime}));
        // const onReconnect = jasmine.createSpy().and.returnValue(getServerAddress());

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
          spyOn<any>(conversationService, 'getRecipientsForConversation').and.returnValue(Promise.resolve({} as any));
          spyOn(conversationService['messageService'], 'sendMessage').and.returnValue(Promise.resolve({} as any));
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
          spyOn<any>(conversationService, 'getQualifiedRecipientsForConversation').and.returnValue(
            Promise.resolve({} as any),
          );
          spyOn(conversationService['messageService'], 'sendFederatedMessage').and.returnValue(
            Promise.resolve({} as any),
          );
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
          spyOn<any>(conversationService, 'getRecipientsForConversation').and.returnValue(Promise.resolve({} as any));
          spyOn(conversationService['messageService'], 'sendMessage').and.returnValue(Promise.resolve({} as any));
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
          spyOn<any>(conversationService, 'getQualifiedRecipientsForConversation').and.returnValue(
            Promise.resolve({} as any),
          );
          spyOn(conversationService['messageService'], 'sendFederatedMessage').and.returnValue(
            Promise.resolve({} as any),
          );
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
      spyOn<any>(conversationService, 'sendGenericMessage');
      const message: OtrMessage = {...baseMessage, type: PayloadBundleType.TEXT, content: {text: 'test'}};
      const onStart = jasmine.createSpy().and.returnValue(Promise.resolve(false));
      const onSuccess = jasmine.createSpy();
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
      spyOn<any>(conversationService, 'sendGenericMessage').and.returnValue(Promise.resolve({time: '', errored: true}));
      const message: OtrMessage = {...baseMessage, type: PayloadBundleType.TEXT, content: {text: 'test'}};
      const onSuccess = jasmine.createSpy();
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
        const onStart = jasmine.createSpy().and.returnValue(Promise.resolve(true));
        const onSuccess = jasmine.createSpy();
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

  describe('getAllParticipantsClients', () => {
    it('gives the members and clients of a federated conversation', async () => {
      const members = {
        'test-domain': {
          ['test-id-1']: ['test-client-id-1-user-1'],
          ['test-id-2']: ['test-client-id-1-user-2', 'test-client-id-2-user-2'],
        },
      };
      const conversationService = buildConversationService(true);
      spyOn<any>(conversationService, 'getConversationQualifiedMembers').and.returnValue([
        {domain: 'test-domain', id: 'test-id-1'},
        {domain: 'test-domain', id: 'test-id-2'},
      ]);

      const fetchedMembers = await conversationService.getAllParticipantsClients('convid');
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
