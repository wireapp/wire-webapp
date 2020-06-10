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

import {Article, LinkPreview, Mention} from '@wireapp/protocol-messaging';
import {createRandomUuid, arrayToBase64} from 'Util/util';
import {Conversation} from 'src/script/entity/Conversation';
import {EventMapper} from 'src/script/conversation/EventMapper';
import {AssetType} from 'src/script/assets/AssetType';
import {ClientEvent} from 'src/script/event/Client';
import {MentionEntity} from 'src/script/message/MentionEntity';
import {TestFactory} from '../../helper/TestFactory';

describe('Event Mapper', () => {
  const testFactory = new TestFactory();
  let conversation_et = null;
  let event_mapper = null;

  beforeAll(() => {
    return testFactory.exposeUserActors().then(() => {
      wire.app = {
        service: {
          asset: testFactory.asset_service,
        },
      };
    });
  });

  beforeEach(() => {
    conversation_et = new Conversation(createRandomUuid());
    event_mapper = new EventMapper();
  });

  describe('mapJsonEvent', () => {
    it('maps text messages without link previews', () => {
      const event_id = createRandomUuid();

      const event = {
        conversation: conversation_et.id,
        data: {
          content: 'foo',
          nonce: event_id,
        },
        from: createRandomUuid,
        id: event_id,
        time: new Date().toISOString(),
        type: ClientEvent.CONVERSATION.MESSAGE_ADD,
      };

      return event_mapper.mapJsonEvent(event, conversation_et).then(messageEntity => {
        expect(messageEntity.get_first_asset().text).toBe(event.data.content);
        expect(messageEntity).toBeDefined();
      });
    });

    it('maps text messages with deprecated link preview format', async () => {
      const event_id = createRandomUuid();

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

      const base64LinkPreview = await arrayToBase64(LinkPreview.encode(link_preview).finish());

      const event = {
        conversation: conversation_et.id,
        data: {
          content: 'test.com',
          nonce: event_id,
          previews: [base64LinkPreview],
        },
        from: createRandomUuid,
        id: event_id,
        time: new Date().toISOString(),
        type: ClientEvent.CONVERSATION.MESSAGE_ADD,
      };

      const messageEntity = await event_mapper.mapJsonEvent(event, conversation_et);

      expect(messageEntity.get_first_asset().text).toBe(event.data.content);
      expect(messageEntity.get_first_asset().previews().length).toBe(1);
      expect(messageEntity.get_first_asset().previews()[0].url).toBe('test.com');
      expect(messageEntity).toBeDefined();
    });

    it('maps text messages with link preview', async () => {
      const event_id = createRandomUuid();

      const link_preview = new LinkPreview({
        article: null,
        permanentUrl: 'test.com/perm',
        summary: 'Test description',
        title: 'Test title',
        url: 'test.com',
        urlOffset: 0,
      });

      const base64Preview = await arrayToBase64(LinkPreview.encode(link_preview).finish());

      const event = {
        conversation: conversation_et.id,
        data: {
          content: 'test.com',
          nonce: event_id,
          previews: [base64Preview],
        },
        from: createRandomUuid,
        id: event_id,
        time: new Date().toISOString(),
        type: ClientEvent.CONVERSATION.MESSAGE_ADD,
      };

      const messageEntity = await event_mapper.mapJsonEvent(event, conversation_et);

      expect(messageEntity.get_first_asset().text).toBe(event.data.content);
      expect(messageEntity.get_first_asset().previews().length).toBe(1);
      expect(messageEntity.get_first_asset().previews()[0].url).toBe(link_preview.url);
      expect(messageEntity).toBeDefined();
    });

    it('maps v3 image asset', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const event = {"conversation":"6db80f23-fbdf-416f-a123-d279aebff011","from":"9b47476f-974d-481c-af64-13f82ed98a5f","id":"72554b6b-edc3-4dde-a177-5552df09df43","status":1,"time":"2017-05-18T10:32:22.639Z","data":{"content_length":47527,"content_type":"image/jpeg","info":{"height":905,"nonce":"72554b6b-edc3-4dde-a177-5552df09df43","tag":"medium","width":1448},"key":"3-2-dc080e34-72d8-478e-a1bf-fdda44b47872","otr_key":{"0":172,"1":208,"2":234,"3":12,"4":213,"5":105,"6":120,"7":152,"8":41,"9":86,"10":136,"11":107,"12":217,"13":221,"14":198,"15":195,"16":216,"17":152,"18":19,"19":101,"20":192,"21":57,"22":94,"23":22,"24":206,"25":120,"26":95,"27":216,"28":132,"29":190,"30":94,"31":213},"sha256":{"0":24,"1":71,"2":123,"3":151,"4":230,"5":255,"6":224,"7":109,"8":58,"9":157,"10":152,"11":216,"12":196,"13":127,"14":101,"15":137,"16":68,"17":10,"18":56,"19":35,"20":77,"21":223,"22":124,"23":26,"24":96,"25":142,"26":171,"27":208,"28":4,"29":12,"30":118,"31":26},"token":"aV0TGxF3ugpawm3wAYPmew=="},"type":"conversation.asset-add","category":128,"primary_key":94};
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      return event_mapper.mapJsonEvent(event, conversation_et).then(messageEntity => {
        expect(messageEntity.get_first_asset().width).toBe(event.data.info.width);
        expect(messageEntity.get_first_asset().height).toBe(event.data.info.height);
        expect(messageEntity.get_first_asset().file_size).toBe(event.data.content_length);
        expect(messageEntity.get_first_asset().file_type).toBe(event.data.content_type);
        expect(messageEntity.get_first_asset().type).toBe(AssetType.IMAGE);
        expect(messageEntity.get_first_asset().resource().otrKey).toBe(event.data.otr_key);
        expect(messageEntity.get_first_asset().resource().sha256).toBe(event.data.sha256);
        expect(messageEntity).toBeDefined();
      });
    });

    it('skips messages which cannot be mapped', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const good_message = {"conversation":conversation_et.id,"id":"4cec0f75-d963-486d-9401-415240ac2ad8","from":"532af01e-1e24-4366-aacf-33b67d4ee376","time":"2016-08-04T15:12:12.453Z","data":{"content":"Message with timestamp","nonce":"4cec0f75-d963-486d-9401-415240ac2ad8","previews":[]},"type":"conversation.message-add"};
      // prettier-ignore
      const bad_message = {"conversation":conversation_et.id,"id":"aeac8355-739b-4dfc-a119-891a52c6a8dc","from":"532af01e-1e24-4366-aacf-33b67d4ee376","data":{"content":"Knock, are you there? :)","nonce":"aeac8355-739b-4dfc-a119-891a52c6a8dc"},"type":"conversation.message-add"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      return event_mapper.mapJsonEvents([good_message, bad_message], conversation_et).then(messageEntities => {
        expect(messageEntities.length).toBe(1);
      });
    });

    it('filters mentions that are out of range', async () => {
      const mandy = '@Mandy';
      const randy = '@Randy';
      const text = `Hi ${mandy} and ${randy}.`;

      const validMention = new MentionEntity(text.indexOf('@'), mandy.length, createRandomUuid());
      const outOfRangeMention = new MentionEntity(text.length, randy.length, createRandomUuid());

      const conversationEntity = new Conversation(createRandomUuid());

      const mentionArrays = await Promise.all([
        arrayToBase64(Mention.encode(validMention.toProto()).finish()),
        arrayToBase64(Mention.encode(outOfRangeMention.toProto()).finish()),
      ]);

      const event = {
        category: 16,
        conversation: conversationEntity.id,
        data: {
          content: text,
          mentions: mentionArrays,
          previews: [],
        },
        from: createRandomUuid(),
        id: createRandomUuid(),
        primary_key: 5,
        time: '2018-09-27T15:23:14.177Z',
        type: 'conversation.message-add',
      };

      const messageEntity = await event_mapper.mapJsonEvent(event, conversationEntity);
      const mentions = messageEntity.get_first_asset().mentions();

      expect(mentions.length).toBe(1);
    });

    it('filters mentions that are overlapping', async () => {
      const mandy = '@Mandy';
      const randy = '@Randy';
      const sandy = '@Sandy';
      const text = `Hi ${mandy}, ${randy} and ${sandy}.`;

      const mandyStart = text.indexOf(mandy);
      const sandyStart = text.indexOf(sandy);
      const validMention1 = new MentionEntity(mandyStart, mandy.length, createRandomUuid());
      const validMention2 = new MentionEntity(sandyStart, sandy.length, createRandomUuid());

      const overlappingStart = mandyStart + mandy.length - 1;
      const overlappingMention = new MentionEntity(overlappingStart, randy.length, createRandomUuid());

      const conversationEntity = new Conversation(createRandomUuid());

      const mentionArrays = await Promise.all([
        arrayToBase64(Mention.encode(validMention1.toProto()).finish()),
        arrayToBase64(Mention.encode(overlappingMention.toProto()).finish()),
        arrayToBase64(Mention.encode(validMention2.toProto()).finish()),
      ]);

      const event = {
        category: 16,
        conversation: conversationEntity.id,
        data: {
          content: text,
          mentions: mentionArrays,
          previews: [],
        },
        from: createRandomUuid(),
        id: createRandomUuid(),
        primary_key: 5,
        time: '2018-09-27T15:23:14.177Z',
        type: 'conversation.message-add',
      };

      const messageEntity = await event_mapper.mapJsonEvent(event, conversationEntity);
      const mentions = messageEntity.get_first_asset().mentions();

      expect(mentions.length).toBe(2);
    });
  });

  describe('_mapEventUnableToDecrypt', () => {
    it('maps a message from a decrypt error event', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const event = {"category": 0, "conversation": "fb1c051a-3ce3-46c5-bbc2-0153b6076af0", "error": "We received a message with session tag 'a8859a310a0c374a3da67e3a0f871145', but we don't have a session for this tag. (c0a70d96aaeb87b6)", "error_code": "205 (c0a70d96aaeb87b6)", "from": "2bde49aa-bdb5-458f-98cf-7d3552b10916", "id": "cb4972e0-9586-42a2-90cc-1798ec0cb648", "primary_key": 9, "time": "2017-04-03T12:58:04.301Z", "type": "conversation.unable-to-decrypt"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      const message_et = event_mapper._mapEventUnableToDecrypt(event);

      expect(message_et.error_code).toBe('205');
      expect(message_et.client_id).toBe('c0a70d96aaeb87b6');
    });
  });
});
