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

// grunt test_init && grunt test_run:cryptography/CryptographyMapper

'use strict';

describe('z.cryptography.CryptographyMapper', function() {
  const mapper = new z.cryptography.CryptographyMapper();
  mapper.logger.level = mapper.logger.levels.ERROR;

  let event = undefined;

  beforeEach(function() {
    event = {
      conversation: z.util.create_random_uuid(),
      data: {
        id: z.util.create_random_uuid(),
      },
      from: z.util.create_random_uuid(),
      time: new Date().toISOString(),
    };
  });

  describe('"map_generic_message"', function() {
    beforeAll(function(done) {
      z.util.protobuf.load_protos('ext/proto/generic-message-proto/messages.proto')
        .then(done)
        .catch(done.fail);
    });

    it('resolves with a mapped original asset message', function(done) {
      const original = {
        mime_type: 'jpg',
        name: 'foo.jpg',
        size: 1024,
      };

      const original_asset = new z.proto.Asset.Original(original.mime_type, original.size, original.name);
      const asset = new z.proto.Asset(original_asset);

      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.ASSET_ADD);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.content_length).toBe(original.size);
          expect(event_json.data.content_type).toBe(original.mime_type);
          expect(event_json.data.info.name).toBe(original.name);
          expect(event_json.data.info.nonce).toBe(generic_message.message_id);
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped original asset message with audio meta data', function(done) {
      const audio_meta_data = new z.proto.Asset.AudioMetaData(3 * 1000, new Uint8Array([1, 2, 3]));
      const original_asset = new z.proto.Asset.Original('audio/mp3', 1024, 'foo.mp3', null, null, audio_meta_data);
      const asset = new z.proto.Asset(original_asset);

      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.ASSET_ADD);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.content_length).toEqual(original_asset.size.toNumber());
          expect(event_json.data.content_type).toEqual(original_asset.mime_type);
          expect(event_json.data.info.name).toEqual(original_asset.name);
          expect(event_json.data.info.nonce).toBe(generic_message.message_id);
          expect(event_json.data.meta.duration).toEqual(original_asset.audio.duration_in_millis / 1000);
          expect(event_json.data.meta.loudness).toEqual(new Uint8Array(original_asset.audio.normalized_loudness.toArrayBuffer()));
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped uploaded asset message', function(done) {
      const uploaded = {
        key: z.util.create_random_uuid(),
        otr_key: new Uint8Array([1, 2]),
        sha256: new Uint8Array([3, 4]),
        token: z.util.create_random_uuid(),
      };

      const uploaded_asset = new z.proto.Asset.RemoteData(uploaded.otr_key, uploaded.sha256, uploaded.key, uploaded.token);
      const asset = new z.proto.Asset();
      asset.set('uploaded', uploaded_asset);

      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.ASSET_ADD);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.key).toBe(uploaded.key);
          expect(event_json.data.token).toBe(uploaded.token);
          expect(event_json.data.otr_key.length).toBe(2);
          expect(event_json.data.sha256.length).toBe(2);
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped cancelled upload asset message', function(done) {
      const asset = new z.proto.Asset();
      asset.set('not_uploaded', z.proto.Asset.NotUploaded.CANCELLED);

      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.ASSET_ADD);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.reason).toBe(z.proto.Asset.NotUploaded.CANCELLED);
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped failed upload asset message', function(done) {
      const asset = new z.proto.Asset();
      asset.set('not_uploaded', z.proto.Asset.NotUploaded.FAILED);

      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.ASSET_ADD);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.reason).toBe(z.proto.Asset.NotUploaded.FAILED);
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped uploaded preview asset message', function(done) {
      const data = {
        otr_key: new Uint8Array([1, 2]),
        sha256: new Uint8Array([3, 4]),
      };

      const remote_data = new z.proto.Asset.RemoteData();
      remote_data.set('otr_key', data.otr_key);
      remote_data.set('sha256', data.sha256);

      const preview_asset = new z.proto.Asset.Preview();
      preview_asset.set('remote', remote_data);

      const asset = new z.proto.Asset();
      asset.set('preview', preview_asset);

      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.ASSET_ADD);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.preview_otr_key.length).toBe(2);
          expect(event_json.data.preview_sha256.length).toBe(2);
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped cleared message', function(done) {
      const date = Date.now().toString();
      const conversation_id = z.util.create_random_uuid();
      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.CLEARED, new z.proto.Cleared(conversation_id, date));

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Backend.CONVERSATION.MEMBER_UPDATE);
          expect(event_json.conversation).toBe(conversation_id);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.cleared_timestamp).toBe(date);
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped hidden message', function(done) {
      const conversation_id = z.util.create_random_uuid();
      const message_id = z.util.create_random_uuid();
      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.HIDDEN, new z.proto.MessageHide(conversation_id, message_id));

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.MESSAGE_HIDDEN);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.conversation_id).toBe(conversation_id);
          expect(event_json.data.message_id).toBe(message_id);
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped deleted message', function(done) {
      const message_id = z.util.create_random_uuid();
      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.DELETED, new z.proto.MessageDelete(message_id));

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.MESSAGE_DELETE);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.message_id).toBe(message_id);
          done();
        })
        .catch(done.fail);
    });

    // @todo Add expects for otr_key and sha256
    it('resolves with a mapped medium image message', function(done) {
      const image = {
        height: 480,
        mime_type: 'jpg',
        original_height: 960,
        original_width: 1280,
        size: 1024,
        tag: 'medium',
        width: 640,
      };

      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      const image_asset = new z.proto.ImageAsset(image.tag, image.width, image.height, image.original_width, image.original_height, image.mime_type, image.size);
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.IMAGE, image_asset);

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.ASSET_ADD);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.content_length).toBe(image.size);
          expect(event_json.data.content_type).toBe(image.mime_type);
          expect(event_json.data.id).toBe(event.data.id);
          expect(event_json.data.info.tag).toBe(image.tag);
          expect(event_json.data.info.width).toBe(image.width);
          expect(event_json.data.info.height).toBe(image.height);
          expect(event_json.data.info.nonce).toBe(event.data.id);
          expect(event_json.data.info.public).toBeFalsy();
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped medium image message when receiving v3', function(done) {
      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());

      const image_meta_data = new z.proto.Asset.ImageMetaData(1280, 640);
      const original = new z.proto.Asset.Original('image/jpg', 1024, null, image_meta_data);

      const remote_data = new z.proto.Asset.RemoteData();
      remote_data.set('otr_key', new Uint8Array([1, 2]));
      remote_data.set('sha256', new Uint8Array([3, 4]));
      remote_data.set('asset_id', z.util.create_random_uuid());
      remote_data.set('asset_token', z.util.create_random_uuid());

      const asset = new z.proto.Asset();
      asset.set('original', original);
      asset.set('uploaded', remote_data);
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.ASSET_ADD);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.content_length).toBe(original.size.toNumber());
          expect(event_json.data.content_type).toBe(original.mime_type);
          expect(event_json.data.key).toBe(remote_data.asset_id);
          expect(event_json.data.token).toBe(remote_data.asset_token);
          expect(event_json.data.info.tag).toBe('medium');
          expect(event_json.data.info.width).toBe(image_meta_data.width);
          expect(event_json.data.info.height).toBe(image_meta_data.height);
          expect(event_json.data.info.nonce).toBe(generic_message.message_id);
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped medium image message when event id is not set', function(done) {
      const image = {
        height: 480,
        mime_type: 'jpg',
        original_height: 960,
        original_width: 1280,
        size: 1024,
        tag: 'medium',
        width: 640,
      };

      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      const image_asset = new z.proto.ImageAsset(image.tag, image.width, image.height, image.original_width, image.original_height, image.mime_type, image.size);
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.IMAGE, image_asset);

      delete event.data.id;

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.ASSET_ADD);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.content_length).toBe(image.size);
          expect(event_json.data.content_type).toBe(image.mime_type);
          expect(event_json.data.id).toBeDefined();
          expect(event_json.data.info.tag).toBe(image.tag);
          expect(event_json.data.info.width).toBe(image.width);
          expect(event_json.data.info.height).toBe(image.height);
          expect(event_json.data.info.nonce).toBeDefined();
          expect(event_json.data.info.public).toBeFalsy();
          done();
        })
        .catch(done.fail);
    });

    it('rejects with an error for a preview image message', function(done) {
      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.IMAGE, new z.proto.ImageAsset('preview'));

      mapper.map_generic_message(generic_message, event)
        .then(done.fail)
        .catch(function(error) {
          expect(error instanceof z.cryptography.CryptographyError).toBeTruthy();
          expect(error.type).toBe(z.cryptography.CryptographyError.TYPE.IGNORED_PREVIEW);
          done();
        });
    });

    it('resolves with a mapped knock message', function(done) {
      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.KNOCK, new z.proto.Knock(false));

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.KNOCK);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.nonce).toBe(generic_message.message_id);
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped last read message', function(done) {
      const date = Date.now().toString();
      const conversation_id = z.util.create_random_uuid();
      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.LAST_READ, new z.proto.LastRead(conversation_id, date));

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Backend.CONVERSATION.MEMBER_UPDATE);
          expect(event_json.conversation).toBe(conversation_id);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.last_read_timestamp).toBe(date);
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped reaction message', function(done) {
      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.REACTION, new z.proto.Reaction(z.message.ReactionType.LIKE, generic_message.message_id));

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.REACTION);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.message_id).toBe(generic_message.message_id);
          expect(event_json.data.reaction).toBe(z.message.ReactionType.LIKE);
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped text message', function(done) {
      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.TEXT, new z.proto.Text('Unit test'));

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.MESSAGE_ADD);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.content).toBe('Unit test');
          expect(event_json.data.nonce).toBe(generic_message.message_id);
          done();
        })
        .catch(done.fail);
    });

    it('rejects with an error if no generic message is provided', function(done) {
      mapper.map_generic_message(undefined, {id: 'ABC'})
        .then(done.fail)
        .catch(function(error) {
          expect(error instanceof z.cryptography.CryptographyError).toBeTruthy();
          expect(error.type).toBe(z.cryptography.CryptographyError.TYPE.NO_GENERIC_MESSAGE);
          done();
        });
    });

    it('can map a text wrapped inside an external message', function(done) {
      const plaintext = 'Test';
      const generic_message_id = z.util.create_random_uuid();
      const generic_message = new z.proto.GenericMessage(generic_message_id);
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.TEXT, new z.proto.Text(plaintext));

      z.assets.AssetCrypto.encrypt_aes_asset(generic_message.toArrayBuffer())
        .then(function({cipher_text, key_bytes, sha256}) {
          key_bytes = new Uint8Array(key_bytes);
          sha256 = new Uint8Array(sha256);
          event.data.data = z.util.array_to_base64(cipher_text);

          const external_message = new z.proto.GenericMessage(z.util.create_random_uuid());
          external_message.set('external', new z.proto.External(key_bytes, sha256));

          return mapper.map_generic_message(external_message, event);
        })
        .then(function(event_json) {
          expect(event_json.data.content).toBe(plaintext);
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.MESSAGE_ADD);
          expect(event_json.id).toBe(generic_message_id);
          done();
        })
        .catch(done.fail);
    });

    it('can map a ping wrapped inside an external message', function(done) {
      let external_message = undefined;
      const generic_message_id = z.util.create_random_uuid();
      const ping = new z.proto.GenericMessage(generic_message_id);
      ping.set('knock', new z.proto.Knock(false));

      z.assets.AssetCrypto.encrypt_aes_asset(ping.toArrayBuffer())
        .then(function({cipher_text, key_bytes, sha256}) {
          key_bytes = new Uint8Array(key_bytes);
          sha256 = new Uint8Array(sha256);
          event.data.data = z.util.array_to_base64(cipher_text);

          external_message = new z.proto.GenericMessage(z.util.create_random_uuid());
          external_message.set('external', new z.proto.External(key_bytes, sha256));
          return mapper.map_generic_message(external_message, event);
        })
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.KNOCK);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message_id);
          expect(event_json.data.nonce).toBe(ping.message_id);
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped location message', function(done) {
      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.LOCATION, new z.proto.Location(52.520645, 13.409779, 'Berlin', 1));

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.LOCATION);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.location.longitude).toBe(generic_message.location.longitude);
          expect(event_json.data.location.latitude).toBe(generic_message.location.latitude);
          expect(event_json.data.location.name).toBe(generic_message.location.name);
          expect(event_json.data.location.zoom).toBe(generic_message.location.zoom);
          expect(event_json.data.nonce).toBe(generic_message.message_id);
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped reaction message', function(done) {
      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set('reaction', new z.proto.Reaction(z.message.ReactionType.LIKE, generic_message.message_id));

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.REACTION);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.data.message_id).toBe(generic_message.message_id);
          expect(event_json.data.reaction).toBe(z.message.ReactionType.LIKE);
          done();
        })
        .catch(done.fail);
    });

    it('resolves with a mapped calling message', function(done) {
      const content_message = {
        resp: false,
        sessid: 'asd2',
        type: 'CANCEL',
        version: '3.0',
      };

      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.CALLING, new z.proto.Calling(JSON.stringify(content_message)));

      mapper.map_generic_message(generic_message, event)
        .then(function(event_json) {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CALL.E_CALL);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message.message_id);
          expect(event_json.content).toEqual(content_message);
          done();
        })
        .catch(done.fail);
    });
  });
});
