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

import {AssetType} from 'Repositories/assets/AssetType';
import {Conversation} from 'Repositories/entity/Conversation';
import {MentionEntity} from 'src/script/message/MentionEntity';
import {createMessageAddEvent} from 'test/helper/EventGenerator';
import {arrayToBase64} from 'Util/util';
import {createUuid} from 'Util/uuid';

import {Article, LinkPreview, Mention} from '@wireapp/protocol-messaging';

import {EventMapper} from './EventMapper';

describe('Event Mapper', () => {
  let conversation: Conversation;
  const eventMapper = new EventMapper();

  beforeEach(() => {
    conversation = new Conversation(createUuid());
  });

  describe('mapJsonEvent', () => {
    it('maps text messages without link previews', () => {
      const event = createMessageAddEvent();

      const message = eventMapper.mapJsonEvent(event, conversation) as any;
      expect(message.getFirstAsset().text).toBe(event.data.content);
      expect(message).toBeDefined();
    });

    it('maps text messages with deprecated link preview format', () => {
      const article = new Article({
        permanentUrl: 'test.com',
        summary: 'Test description',
        title: 'Test title',
      });
      const link_preview = new LinkPreview({
        article,
        url: 'test.com',
        urlOffset: 0,
      });

      const base64LinkPreview = arrayToBase64(LinkPreview.encode(link_preview).finish());

      const event = createMessageAddEvent({
        dataOverrides: {
          content: 'test.com',
          previews: [base64LinkPreview],
        },
      });

      const messageEntity = eventMapper.mapJsonEvent(event, conversation) as any;

      expect(messageEntity.getFirstAsset().text).toBe(event.data.content);
      expect(messageEntity.getFirstAsset().previews().length).toBe(1);
      expect(messageEntity.getFirstAsset().previews()[0].url).toBe('test.com');
      expect(messageEntity).toBeDefined();
    });

    it('maps text messages with link preview', () => {
      const link_preview = new LinkPreview({
        article: null,
        permanentUrl: 'test.com/perm',
        summary: 'Test description',
        title: 'Test title',
        url: 'test.com',
        urlOffset: 0,
      });

      const base64Preview = arrayToBase64(LinkPreview.encode(link_preview).finish());

      const event = createMessageAddEvent({
        dataOverrides: {
          content: 'test.com',
          previews: [base64Preview],
        },
      });

      const messageEntity = eventMapper.mapJsonEvent(event, conversation) as any;

      expect(messageEntity.getFirstAsset().text).toBe(event.data.content);
      expect(messageEntity.getFirstAsset().previews().length).toBe(1);
      expect(messageEntity.getFirstAsset().previews()[0].url).toBe(link_preview.url);
      expect(messageEntity).toBeDefined();
    });

    it('maps image asset', () => {
      const otrKey = new Uint8Array([1, 2, 3]);
      const sha256 = new Uint8Array([4, 5, 6]);
      const event = {
        category: 128,
        conversation: '6db80f23-fbdf-416f-a123-d279aebff011',
        data: {
          content_length: 47527,
          content_type: 'image/jpeg',
          id: '72554b6b-edc3-4dde-a177-5552df09df43',
          info: {height: 905, nonce: '72554b6b-edc3-4dde-a177-5552df09df43', tag: 'medium', width: 1448},
          key: '3-2-dc080e34-72d8-478e-a1bf-fdda44b47872',
          otr_key: otrKey,
          sha256: sha256,
          token: 'aV0TGxF3ugpawm3wAYPmew==',
          domain: 'test.domain.com',
        },
        from: '9b47476f-974d-481c-af64-13f82ed98a5f',
        id: '72554b6b-edc3-4dde-a177-5552df09df43',
        primary_key: 94,
        status: 1,
        time: '2017-05-18T10:32:22.639Z',
        type: 'conversation.asset-add',
      } as any;

      const messageEntity = eventMapper.mapJsonEvent(event, conversation) as any;
      expect(messageEntity.getFirstAsset().width).toBe(`${event.data.info.width}px`);
      expect(messageEntity.getFirstAsset().height).toBe(`${event.data.info.height}px`);
      expect(messageEntity.getFirstAsset().file_size).toBe(event.data.content_length);
      expect(messageEntity.getFirstAsset().file_type).toBe(event.data.content_type);
      expect(messageEntity.getFirstAsset().type).toBe(AssetType.IMAGE);
      expect(messageEntity.getFirstAsset().resource().otrKey).toBe(otrKey);
      expect(messageEntity.getFirstAsset().resource().sha256).toBe(sha256);
      expect(messageEntity).toBeDefined();
    });

    it('skips messages which cannot be mapped', () => {
      const good_message = createMessageAddEvent({
        dataOverrides: {
          content: 'Message with timestamp',
          previews: [],
        },
      }) as any;
      const bad_message = createMessageAddEvent({
        overrides: {
          time: undefined,
        },
      });

      const messageEntities = eventMapper.mapJsonEvents([good_message, bad_message], conversation);
      expect(messageEntities.length).toBe(1);
    }) as any;

    it('filters mentions that are out of range', () => {
      const mandy = '@Mandy';
      const randy = '@Randy';
      const text = `Hi ${mandy} and ${randy}.`;

      const validMention = new MentionEntity(text.indexOf('@'), mandy.length, createUuid());
      const outOfRangeMention = new MentionEntity(text.length, randy.length, createUuid());

      const conversationEntity = new Conversation(createUuid());

      const mentionArrays = [
        arrayToBase64(Mention.encode(validMention.toProto()).finish()),
        arrayToBase64(Mention.encode(outOfRangeMention.toProto()).finish()),
      ];

      const event = createMessageAddEvent({
        dataOverrides: {
          content: text,
          mentions: mentionArrays,
          previews: [],
        },
      });

      const messageEntity = eventMapper.mapJsonEvent(event, conversationEntity) as any;
      const mentions = messageEntity.getFirstAsset().mentions();

      expect(mentions.length).toBe(1);
    });

    it('filters mentions that are overlapping', () => {
      const mandy = '@Mandy';
      const randy = '@Randy';
      const sandy = '@Sandy';
      const text = `Hi ${mandy}, ${randy} and ${sandy}.`;

      const mandyStart = text.indexOf(mandy);
      const sandyStart = text.indexOf(sandy);
      const validMention1 = new MentionEntity(mandyStart, mandy.length, createUuid());
      const validMention2 = new MentionEntity(sandyStart, sandy.length, createUuid());

      const overlappingStart = mandyStart + mandy.length - 1;
      const overlappingMention = new MentionEntity(overlappingStart, randy.length, createUuid());

      const conversationEntity = new Conversation(createUuid());

      const mentionArrays = [
        arrayToBase64(Mention.encode(validMention1.toProto()).finish()),
        arrayToBase64(Mention.encode(overlappingMention.toProto()).finish()),
        arrayToBase64(Mention.encode(validMention2.toProto()).finish()),
      ];

      const event = createMessageAddEvent({
        dataOverrides: {
          content: text,
          mentions: mentionArrays,
          previews: [],
        },
      });

      const messageEntity = eventMapper.mapJsonEvent(event, conversationEntity) as any;
      const mentions = messageEntity.getFirstAsset().mentions();

      expect(mentions.length).toBe(2);
    });
  });

  describe('_mapEventUnableToDecrypt', () => {
    it('maps a message from a decrypt error event', () => {
      const event = {
        category: 0,
        conversation: 'fb1c051a-3ce3-46c5-bbc2-0153b6076af0',
        error:
          "We received a message with session tag 'a8859a310a0c374a3da67e3a0f871145', but we don't have a session for this tag. (c0a70d96aaeb87b6)",
        error_code: '205 (c0a70d96aaeb87b6)',
        from: '2bde49aa-bdb5-458f-98cf-7d3552b10916',
        id: 'cb4972e0-9586-42a2-90cc-1798ec0cb648',
        primary_key: 9,
        time: '2017-04-03T12:58:04.301Z',
        type: 'conversation.unable-to-decrypt',
      } as any;

      const message_et = eventMapper['_mapEventUnableToDecrypt'](event);

      expect(message_et.code).toBe(205);
      expect(message_et.clientId).toBe('c0a70d96aaeb87b6');
    });
  });
});
