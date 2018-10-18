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

// grunt test_init && grunt test_run:cryptography/CryptographyMapper

'use strict';

describe('z.cryptography.CryptographyMapper', () => {
  const mapper = new z.cryptography.CryptographyMapper();

  let event = undefined;

  beforeEach(() => {
    event = {
      conversation: z.util.createRandomUuid(),
      data: {
        id: z.util.createRandomUuid(),
      },
      from: z.util.createRandomUuid(),
      time: new Date().toISOString(),
    };
  });

  describe('"mapGenericMessage"', () => {
    beforeAll(() => z.util.protobuf.loadProtos('ext/proto/@wireapp/protocol-messaging/messages.proto'));

    it('resolves with a mapped original asset message', () => {
      const original = {
        mime_type: 'jpg',
        name: 'foo.jpg',
        size: 1024,
      };

      const original_asset = new z.proto.Asset.Original(original.mime_type, original.size, original.name);
      const asset = new z.proto.Asset(original_asset);

      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(_.isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(z.event.Client.CONVERSATION.ASSET_ADD);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.message_id);
        expect(event_json.data.content_length).toBe(original.size);
        expect(event_json.data.content_type).toBe(original.mime_type);
        expect(event_json.data.info.name).toBe(original.name);
      });
    });

    it('resolves with a mapped original asset message with audio meta data', () => {
      const audio_meta_data = new z.proto.Asset.AudioMetaData(3 * 1000, new Uint8Array([1, 2, 3]));
      const original_asset = new z.proto.Asset.Original('audio/mp3', 1024, 'foo.mp3', null, null, audio_meta_data);
      const asset = new z.proto.Asset(original_asset);

      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(_.isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(z.event.Client.CONVERSATION.ASSET_ADD);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.message_id);
        expect(event_json.data.content_length).toEqual(original_asset.size.toNumber());
        expect(event_json.data.content_type).toEqual(original_asset.mime_type);
        expect(event_json.data.info.name).toEqual(original_asset.name);
        expect(event_json.data.meta.duration).toEqual(original_asset.audio.duration_in_millis / 1000);
        expect(event_json.data.meta.loudness).toEqual(
          new Uint8Array(original_asset.audio.normalized_loudness.toArrayBuffer())
        );
      });
    });

    it('resolves with a mapped uploaded asset message', () => {
      const uploaded = {
        key: z.util.createRandomUuid(),
        otr_key: new Uint8Array([1, 2]),
        sha256: new Uint8Array([3, 4]),
        token: z.util.createRandomUuid(),
      };

      const uploaded_asset = new z.proto.Asset.RemoteData(
        uploaded.otr_key,
        uploaded.sha256,
        uploaded.key,
        uploaded.token
      );
      const asset = new z.proto.Asset();
      asset.set('uploaded', uploaded_asset);

      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
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
      });
    });

    it('resolves with a mapped cancelled upload asset message', () => {
      const asset = new z.proto.Asset();
      asset.set('not_uploaded', z.proto.Asset.NotUploaded.CANCELLED);

      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(_.isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(z.event.Client.CONVERSATION.ASSET_ADD);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.message_id);
        expect(event_json.data.reason).toBe(z.proto.Asset.NotUploaded.CANCELLED);
      });
    });

    it('resolves with a mapped failed upload asset message', () => {
      const asset = new z.proto.Asset();
      asset.set('not_uploaded', z.proto.Asset.NotUploaded.FAILED);

      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(_.isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(z.event.Client.CONVERSATION.ASSET_ADD);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.message_id);
        expect(event_json.data.reason).toBe(z.proto.Asset.NotUploaded.FAILED);
      });
    });

    it('resolves with a mapped uploaded preview asset message', () => {
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

      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(_.isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(z.event.Client.CONVERSATION.ASSET_ADD);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.message_id);
        expect(event_json.data.preview_otr_key.length).toBe(2);
        expect(event_json.data.preview_sha256.length).toBe(2);
      });
    });

    it('resolves with a mapped availability message', () => {
      const availability = new z.proto.Availability(z.proto.Availability.Type.AVAILABLE);

      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.AVAILABILITY, availability);

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(_.isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(z.event.Client.USER.AVAILABILITY);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.message_id);
        expect(event_json.data.availability).toBe(z.user.AvailabilityType.AVAILABLE);
      });
    });

    it('resolves with a mapped cleared message', () => {
      const date = Date.now().toString();
      const conversation_id = z.util.createRandomUuid();
      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.CLEARED, new z.proto.Cleared(conversation_id, date));

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(_.isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(z.event.Backend.CONVERSATION.MEMBER_UPDATE);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.message_id);
        expect(event_json.data.cleared_timestamp).toBe(date);
        expect(event_json.data.conversationId).toBe(conversation_id);
      });
    });

    it('resolves with a mapped hidden message', () => {
      const conversation_id = z.util.createRandomUuid();
      const message_id = z.util.createRandomUuid();
      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      const messageHide = new z.proto.MessageHide(conversation_id, message_id);
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.HIDDEN, messageHide);

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(_.isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(z.event.Client.CONVERSATION.MESSAGE_HIDDEN);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.message_id);
        expect(event_json.data.conversation_id).toBe(conversation_id);
        expect(event_json.data.message_id).toBe(message_id);
      });
    });

    it('resolves with a mapped deleted message', () => {
      const message_id = z.util.createRandomUuid();
      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.DELETED, new z.proto.MessageDelete(message_id));

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(_.isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(z.event.Client.CONVERSATION.MESSAGE_DELETE);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.message_id);
        expect(event_json.data.message_id).toBe(message_id);
      });
    });

    // @todo Add expects for otr_key and sha256
    it('resolves with a mapped medium image message', () => {
      const image = {
        height: 480,
        mime_type: 'jpg',
        original_height: 960,
        original_width: 1280,
        size: 1024,
        tag: 'medium',
        width: 640,
      };

      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      const image_asset = new z.proto.ImageAsset(
        image.tag,
        image.width,
        image.height,
        image.original_width,
        image.original_height,
        image.mime_type,
        image.size
      );
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.IMAGE, image_asset);

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
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
        expect(event_json.data.info.public).toBeFalsy();
      });
    });

    it('resolves with a mapped medium image message when receiving v3', () => {
      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());

      const image_meta_data = new z.proto.Asset.ImageMetaData(1280, 640);
      const original = new z.proto.Asset.Original('image/jpg', 1024, null, image_meta_data);

      const remote_data = new z.proto.Asset.RemoteData();
      remote_data.set('otr_key', new Uint8Array([1, 2]));
      remote_data.set('sha256', new Uint8Array([3, 4]));
      remote_data.set('asset_id', z.util.createRandomUuid());
      remote_data.set('asset_token', z.util.createRandomUuid());

      const asset = new z.proto.Asset();
      asset.set('original', original);
      asset.set('uploaded', remote_data);
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
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
      });
    });

    it('resolves with a mapped medium image message when event id is not set', () => {
      const image = {
        height: 480,
        mime_type: 'jpg',
        original_height: 960,
        original_width: 1280,
        size: 1024,
        tag: 'medium',
        width: 640,
      };

      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      const image_asset = new z.proto.ImageAsset(
        image.tag,
        image.width,
        image.height,
        image.original_width,
        image.original_height,
        image.mime_type,
        image.size
      );
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.IMAGE, image_asset);

      delete event.data.id;

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
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
        expect(event_json.data.info.public).toBeFalsy();
      });
    });

    it('rejects with an error for a preview image message', done => {
      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.IMAGE, new z.proto.ImageAsset('preview'));

      mapper
        .mapGenericMessage(generic_message, event)
        .then(done.fail)
        .catch(error => {
          expect(error instanceof z.error.CryptographyError).toBeTruthy();
          expect(error.type).toBe(z.error.CryptographyError.TYPE.IGNORED_PREVIEW);
          done();
        });
    });

    it('resolves with a mapped knock message', () => {
      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.KNOCK, new z.proto.Knock(false));

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(_.isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(z.event.Client.CONVERSATION.KNOCK);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.message_id);
      });
    });

    it('resolves with a mapped last read message', () => {
      const date = Date.now().toString();
      const conversation_id = z.util.createRandomUuid();
      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.LAST_READ, new z.proto.LastRead(conversation_id, date));

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(_.isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(z.event.Backend.CONVERSATION.MEMBER_UPDATE);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.message_id);
        expect(event_json.data.conversationId).toBe(conversation_id);
        expect(event_json.data.last_read_timestamp).toBe(date);
      });
    });

    it('resolves with a mapped reaction message', () => {
      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      const reaction = new z.proto.Reaction(z.message.ReactionType.LIKE, generic_message.message_id);
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.REACTION, reaction);

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(_.isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(z.event.Client.CONVERSATION.REACTION);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.message_id);
        expect(event_json.data.message_id).toBe(generic_message.message_id);
        expect(event_json.data.reaction).toBe(z.message.ReactionType.LIKE);
      });
    });

    it('resolves with a mapped text message', () => {
      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.TEXT, new z.proto.Text('Unit test'));

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(_.isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(z.event.Client.CONVERSATION.MESSAGE_ADD);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.message_id);
        expect(event_json.data.content).toBe('Unit test');
      });
    });

    it('rejects with an error if no generic message is provided', done => {
      mapper
        .mapGenericMessage(undefined, {id: 'ABC'})
        .then(done.fail)
        .catch(error => {
          expect(error instanceof z.error.CryptographyError).toBeTruthy();
          expect(error.type).toBe(z.error.CryptographyError.TYPE.NO_GENERIC_MESSAGE);
          done();
        });
    });

    it('can map a text wrapped inside an external message', () => {
      const plaintext = 'Test';
      const generic_message_id = z.util.createRandomUuid();
      const generic_message = new z.proto.GenericMessage(generic_message_id);
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.TEXT, new z.proto.Text(plaintext));

      return z.assets.AssetCrypto.encryptAesAsset(generic_message.toArrayBuffer())
        .then(({cipherText, keyBytes, sha256}) => {
          keyBytes = new Uint8Array(keyBytes);
          sha256 = new Uint8Array(sha256);
          event.data.data = z.util.arrayToBase64(cipherText);

          const external_message = new z.proto.GenericMessage(z.util.createRandomUuid());
          external_message.set('external', new z.proto.External(keyBytes, sha256));

          return mapper.mapGenericMessage(external_message, event);
        })
        .then(event_json => {
          expect(event_json.data.content).toBe(plaintext);
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.MESSAGE_ADD);
          expect(event_json.id).toBe(generic_message_id);
        });
    });

    it('can map a ping wrapped inside an external message', () => {
      let external_message = undefined;
      const generic_message_id = z.util.createRandomUuid();
      const ping = new z.proto.GenericMessage(generic_message_id);
      ping.set('knock', new z.proto.Knock(false));

      return z.assets.AssetCrypto.encryptAesAsset(ping.toArrayBuffer())
        .then(({cipherText, keyBytes, sha256}) => {
          keyBytes = new Uint8Array(keyBytes);
          sha256 = new Uint8Array(sha256);
          event.data.data = z.util.arrayToBase64(cipherText);

          external_message = new z.proto.GenericMessage(z.util.createRandomUuid());
          external_message.set('external', new z.proto.External(keyBytes, sha256));
          return mapper.mapGenericMessage(external_message, event);
        })
        .then(event_json => {
          expect(_.isObject(event_json)).toBeTruthy();
          expect(event_json.type).toBe(z.event.Client.CONVERSATION.KNOCK);
          expect(event_json.conversation).toBe(event.conversation);
          expect(event_json.from).toBe(event.from);
          expect(event_json.time).toBe(event.time);
          expect(event_json.id).toBe(generic_message_id);
        });
    });

    it('resolves with a mapped location message', () => {
      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      const location = new z.proto.Location(52.520645, 13.409779, 'Berlin', 1);
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.LOCATION, location);

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
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
      });
    });

    it('resolves with a mapped reaction message', () => {
      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      generic_message.set('reaction', new z.proto.Reaction(z.message.ReactionType.LIKE, generic_message.message_id));

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(_.isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(z.event.Client.CONVERSATION.REACTION);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.message_id);
        expect(event_json.data.message_id).toBe(generic_message.message_id);
        expect(event_json.data.reaction).toBe(z.message.ReactionType.LIKE);
      });
    });

    it('resolves with a mapped calling message', () => {
      const content_message = {
        resp: false,
        sessid: 'asd2',
        type: 'CANCEL',
        version: '3.0',
      };

      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      const calling = new z.proto.Calling(JSON.stringify(content_message));
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.CALLING, calling);

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(_.isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(z.event.Client.CALL.E_CALL);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.message_id);
        expect(event_json.content).toEqual(content_message);
      });
    });
  });
});
