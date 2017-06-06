/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

// grunt test_init && grunt test_run:conversation/EventMapper

'use strict';

describe('Event Mapper', function() {
  let conversation_et = null;
  let event_mapper = null;

  beforeAll(function(done) {
    z.util.protobuf
      .load_protos('ext/proto/generic-message-proto/messages.proto')
      .then(done)
      .catch(done.fail);
  });

  beforeEach(function() {
    conversation_et = new z.entity.Conversation(z.util.create_random_uuid());
    event_mapper = new z.conversation.EventMapper();
  });

  describe('map_json_event', function() {
    it('maps text messages without link previews', function() {
      const event_id = z.util.create_random_uuid;

      const event = {
        conversation: conversation_et.id,
        data: {
          content: 'foo',
          nonce: event_id,
        },
        from: z.util.create_random_uuid,
        id: event_id,
        time: new Date().toISOString(),
        type: z.event.Backend.CONVERSATION.MESSAGE_ADD,
      };

      const message_et = event_mapper.map_json_event(event, conversation_et);
      expect(message_et.get_first_asset().text).toBe(event.data.content);
      expect(message_et.get_first_asset().nonce).toBe(event.data.nonce);
      expect(message_et).toBeDefined();
    });

    it('maps text messages with deprecated link preview format', function() {
      const event_id = z.util.create_random_uuid;

      const article = new z.proto.Article(
        'test.com',
        'Test title',
        'Test description'
      );
      const link_preview = new z.proto.LinkPreview('test.com', 0, article);

      const event = {
        conversation: conversation_et.id,
        data: {
          content: 'test.com',
          nonce: event_id,
          previews: [link_preview.encode64()],
        },
        from: z.util.create_random_uuid,
        id: event_id,
        time: new Date().toISOString(),
        type: z.event.Backend.CONVERSATION.MESSAGE_ADD,
      };

      const message_et = event_mapper.map_json_event(event, conversation_et);
      expect(message_et.get_first_asset().text).toBe(event.data.content);
      expect(message_et.get_first_asset().nonce).toBe(event.data.nonce);
      expect(message_et.get_first_asset().previews().length).toBe(1);
      expect(message_et.get_first_asset().previews()[0].original_url).toBe(
        'test.com'
      );
      expect(message_et).toBeDefined();
    });

    it('maps text messages with link preview', function() {
      const event_id = z.util.create_random_uuid;

      const link_preview = new z.proto.LinkPreview(
        'test.com',
        0,
        null,
        'test.com/perm',
        'Test title',
        'Test description'
      );

      const event = {
        conversation: conversation_et.id,
        data: {
          content: 'test.com',
          nonce: event_id,
          previews: [link_preview.encode64()],
        },
        from: z.util.create_random_uuid,
        id: event_id,
        time: new Date().toISOString(),
        type: z.event.Backend.CONVERSATION.MESSAGE_ADD,
      };

      const message_et = event_mapper.map_json_event(event, conversation_et);
      expect(message_et.get_first_asset().text).toBe(event.data.content);
      expect(message_et.get_first_asset().nonce).toBe(event.data.nonce);
      expect(message_et.get_first_asset().previews().length).toBe(1);
      expect(message_et.get_first_asset().previews()[0].original_url).toBe(
        link_preview.url
      );
      expect(message_et.get_first_asset().previews()[0].permanent_url).toBe(
        link_preview.permanent_url
      );
      expect(message_et).toBeDefined();
    });

    it('maps v3 image asset', function() {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {
        conversation: '6db80f23-fbdf-416f-a123-d279aebff011',
        from: '9b47476f-974d-481c-af64-13f82ed98a5f',
        id: '72554b6b-edc3-4dde-a177-5552df09df43',
        status: 1,
        time: '2017-05-18T10:32:22.639Z',
        data: {
          content_length: 47527,
          content_type: 'image/jpeg',
          info: {
            height: 905,
            nonce: '72554b6b-edc3-4dde-a177-5552df09df43',
            tag: 'medium',
            width: 1448,
          },
          key: '3-2-dc080e34-72d8-478e-a1bf-fdda44b47872',
          otr_key: {
            '0': 172,
            '1': 208,
            '2': 234,
            '3': 12,
            '4': 213,
            '5': 105,
            '6': 120,
            '7': 152,
            '8': 41,
            '9': 86,
            '10': 136,
            '11': 107,
            '12': 217,
            '13': 221,
            '14': 198,
            '15': 195,
            '16': 216,
            '17': 152,
            '18': 19,
            '19': 101,
            '20': 192,
            '21': 57,
            '22': 94,
            '23': 22,
            '24': 206,
            '25': 120,
            '26': 95,
            '27': 216,
            '28': 132,
            '29': 190,
            '30': 94,
            '31': 213,
          },
          sha256: {
            '0': 24,
            '1': 71,
            '2': 123,
            '3': 151,
            '4': 230,
            '5': 255,
            '6': 224,
            '7': 109,
            '8': 58,
            '9': 157,
            '10': 152,
            '11': 216,
            '12': 196,
            '13': 127,
            '14': 101,
            '15': 137,
            '16': 68,
            '17': 10,
            '18': 56,
            '19': 35,
            '20': 77,
            '21': 223,
            '22': 124,
            '23': 26,
            '24': 96,
            '25': 142,
            '26': 171,
            '27': 208,
            '28': 4,
            '29': 12,
            '30': 118,
            '31': 26,
          },
          token: 'aV0TGxF3ugpawm3wAYPmew==',
        },
        type: 'conversation.asset-add',
        category: 128,
        primary_key: 94,
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      const message_et = event_mapper.map_json_event(event, conversation_et);
      expect(message_et.get_first_asset().width).toBe(event.data.info.width);
      expect(message_et.get_first_asset().height).toBe(event.data.info.height);
      expect(message_et.get_first_asset().file_size).toBe(
        event.data.content_length
      );
      expect(message_et.get_first_asset().file_type).toBe(
        event.data.content_type
      );
      expect(message_et.get_first_asset().type).toBe(z.assets.AssetType.IMAGE);
      expect(message_et.get_first_asset().resource().otr_key).toBe(
        event.data.otr_key
      );
      expect(message_et.get_first_asset().resource().sha256).toBe(
        event.data.sha256
      );
      expect(message_et).toBeDefined();
    });

    it('skips messages which cannot be mapped', function() {
      // @formatter:off
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const good_message = {
        conversation: conversation_et.id,
        id: '4cec0f75-d963-486d-9401-415240ac2ad8',
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        time: '2016-08-04T15:12:12.453Z',
        data: {
          content: 'Message with timestamp',
          nonce: '4cec0f75-d963-486d-9401-415240ac2ad8',
          previews: [],
        },
        type: 'conversation.message-add',
      };
      const bad_message = {
        conversation: conversation_et.id,
        id: 'aeac8355-739b-4dfc-a119-891a52c6a8dc',
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        data: {
          content: 'Knock, are you there? :)',
          nonce: 'aeac8355-739b-4dfc-a119-891a52c6a8dc',
        },
        type: 'conversation.message-add',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */
      // @formatter:on

      const message_ets = event_mapper.map_json_events(
        [good_message, bad_message],
        conversation_et
      );
      expect(message_ets.length).toBe(1);
    });
  });

  describe('_map_event_unable_to_decrypt', () => {
    it('maps a message from a decrypt error event', function() {
      // @formatter:off
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
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
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */
      // @formatter:on

      const message_et = event_mapper._map_event_unable_to_decrypt(event);
      expect(message_et.error_code).toBe('205');
      expect(message_et.client_id).toBe('c0a70d96aaeb87b6');
    });
  });
});
