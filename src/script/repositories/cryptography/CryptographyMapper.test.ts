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

import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event/';
import {GenericMessageType} from '@wireapp/core/lib/conversation';
import {isObject} from 'underscore';

import {
  Asset,
  Availability,
  ButtonAction,
  Calling,
  Cleared,
  External,
  GenericMessage,
  Knock,
  LastRead,
  LegalHoldStatus,
  Location,
  MessageDelete,
  MessageHide,
  Reaction,
  Text,
} from '@wireapp/protocol-messaging';

import {ClientEvent} from 'Repositories/event/Client';
import {CryptographyError} from 'src/script/error/CryptographyError';
import {arrayToBase64} from 'Util/util';
import {createUuid} from 'Util/uuid';

import {CryptographyMapper} from './CryptographyMapper';
import {PROTO_MESSAGE_TYPE} from './ProtoMessageType';

describe('CryptographyMapper', () => {
  const coreMock = {
    service: {
      asset: {
        decryptAsset: jest.fn(payload => Promise.resolve(payload.cipherText)),
      },
    },
  };
  const mapper = new CryptographyMapper(coreMock as any);

  let event: any = undefined;
  const emojiReaction = '😇';

  beforeEach(() => {
    event = {
      conversation: createUuid(),
      data: {
        id: createUuid(),
      },
      from: createUuid(),
      time: new Date().toISOString(),
      type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
    };
  });

  describe('"mapGenericMessage"', () => {
    it('resolves with a mapped original asset message', () => {
      const original = {
        mime_type: 'jpg',
        name: 'foo.jpg',
        size: 1024,
      };

      const original_asset = new Asset.Original({
        mimeType: original.mime_type,
        name: original.name,
        size: original.size,
      });
      const asset = new Asset({original: original_asset});

      const generic_message = new GenericMessage({
        [GenericMessageType.ASSET]: asset,
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.content_length).toBe(original.size);
        expect(event_json.data.content_type).toBe(original.mime_type);
        expect(event_json.data.info.name).toBe(original.name);
      });
    });

    it('resolves with a mapped original asset message with audio meta data', () => {
      const duration = 3;
      const audio_meta_data = new Asset.AudioMetaData({
        durationInMillis: duration * 1000,
        normalizedLoudness: new Uint8Array([1, 2, 3]),
      });
      const original_asset = new Asset.Original({
        audio: audio_meta_data,
        mimeType: 'audio/mp3',
        name: 'foo.mp3',
        size: 1024,
      });
      const asset = new Asset({original: original_asset});

      const generic_message = new GenericMessage({
        [GenericMessageType.ASSET]: asset,
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.content_length).toEqual(original_asset.size);

        expect(event_json.data.content_type).toEqual(original_asset.mimeType);
        expect(event_json.data.info.name).toEqual(original_asset.name);
        expect(event_json.data.meta.duration).toEqual(duration);
        expect(event_json.data.meta.loudness).toEqual(new Uint8Array(original_asset.audio?.normalizedLoudness.buffer));
      });
    });

    it('resolves with a mapped uploaded asset message', () => {
      const uploaded = {
        key: createUuid(),
        otr_key: new Uint8Array([1, 2]),
        sha256: new Uint8Array([3, 4]),
        token: createUuid(),
      };

      const uploaded_asset = new Asset.RemoteData({
        assetId: uploaded.key,
        assetToken: uploaded.token,
        otrKey: uploaded.otr_key,
        sha256: uploaded.sha256,
      });
      const asset = new Asset({uploaded: uploaded_asset});

      const generic_message = new GenericMessage({
        [GenericMessageType.ASSET]: asset,
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.key).toBe(uploaded.key);
        expect(event_json.data.token).toBe(uploaded.token);
        expect(event_json.data.otr_key.length).toBe(2);
        expect(event_json.data.sha256.length).toBe(2);
      });
    });

    it('resolves with a mapped cancelled upload asset message', () => {
      const asset = new Asset({notUploaded: Asset.NotUploaded.CANCELLED});

      const generic_message = new GenericMessage({
        [GenericMessageType.ASSET]: asset,
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.reason).toBe(Asset.NotUploaded.CANCELLED);
      });
    });

    it('resolves with a mapped failed upload asset message', () => {
      const asset = new Asset({
        notUploaded: Asset.NotUploaded.FAILED,
      });

      const generic_message = new GenericMessage({
        [GenericMessageType.ASSET]: asset,
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.reason).toBe(Asset.NotUploaded.FAILED);
      });
    });

    it('resolves with a mapped uploaded preview asset message', () => {
      const data = {
        otr_key: new Uint8Array([1, 2]),
        sha256: new Uint8Array([3, 4]),
      };

      const remote_data = new Asset.RemoteData({
        otrKey: data.otr_key,
        sha256: data.sha256,
      });

      const preview_asset = new Asset.Preview({remote: remote_data, mimeType: '', size: 10});

      const asset = new Asset({
        preview: preview_asset,
      });

      const generic_message = new GenericMessage({
        [GenericMessageType.ASSET]: asset,
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.preview_otr_key.length).toBe(2);
        expect(event_json.data.preview_sha256.length).toBe(2);
      });
    });

    it('resolves with a mapped availability message', () => {
      const availability = new Availability({type: Availability.Type.AVAILABLE});

      const generic_message = new GenericMessage({
        [GenericMessageType.AVAILABILITY]: availability,
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.USER.AVAILABILITY);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.availability).toBe(Availability.Type.AVAILABLE);
      });
    });

    it('resolves with a mapped cleared message', () => {
      const date = Date.now();
      const conversation_id = createUuid();

      const cleared = new Cleared({
        clearedTimestamp: date,
        conversationId: conversation_id,
      });
      const generic_message = new GenericMessage({
        [GenericMessageType.CLEARED]: cleared,
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(CONVERSATION_EVENT.MEMBER_UPDATE);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.cleared_timestamp).toBe(date.toString());
        expect(event_json.data.conversationId).toBe(conversation_id);
      });
    });

    it('resolves with a mapped hidden message', () => {
      const conversation_id = createUuid();
      const message_id = createUuid();
      const message_hide = new MessageHide({
        conversationId: conversation_id,
        messageId: message_id,
      });
      const generic_message = new GenericMessage({
        [GenericMessageType.HIDDEN]: message_hide,
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CONVERSATION.MESSAGE_HIDDEN);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.conversation_id).toBe(conversation_id);
        expect(event_json.data.message_id).toBe(message_id);
      });
    });

    it('resolves with a mapped deleted message', () => {
      const message_id = createUuid();
      const generic_message = new GenericMessage({
        [GenericMessageType.DELETED]: new MessageDelete({messageId: message_id}),
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CONVERSATION.MESSAGE_DELETE);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.message_id).toBe(message_id);
      });
    });

    it('resolves with a mapped medium image message when receiving v3', () => {
      const image_meta_data = new Asset.ImageMetaData({
        height: 640,
        width: 1280,
      });
      const original = new Asset.Original({
        image: image_meta_data,
        mimeType: 'image/jpg',
        size: 1024,
      });

      const remote_data = new Asset.RemoteData({
        assetId: createUuid(),
        assetToken: createUuid(),
        otrKey: new Uint8Array([1, 2]),
        sha256: new Uint8Array([3, 4]),
      });

      const asset = new Asset({
        original: original,
        uploaded: remote_data,
      });

      const generic_message = new GenericMessage({
        [GenericMessageType.ASSET]: asset,
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.content_length).toBe(original.size);
        expect(event_json.data.content_type).toBe(original.mimeType);
        expect(event_json.data.key).toBe(remote_data.assetId);
        expect(event_json.data.token).toBe(remote_data.assetToken);
        expect(event_json.data.info.tag).toBe('medium');
        expect(event_json.data.info.width).toBe(image_meta_data.width);
        expect(event_json.data.info.height).toBe(image_meta_data.height);
      });
    });

    it('resolves with a mapped knock message', () => {
      const generic_message = new GenericMessage({
        [GenericMessageType.KNOCK]: new Knock({hotKnock: false}),
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CONVERSATION.KNOCK);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
      });
    });

    it('maps legal hold states for ping messages', async () => {
      const expectedLegalHoldStatus = LegalHoldStatus.DISABLED;

      const optimisticEvent: any = {
        conversation: 'ecf815e4-ef9d-494c-827b-85214b9d694e',
        data: {},
        from: '90f56eae-ef65-4b49-9efb-2d6502721965',
        status: 1,
        time: '2019-07-10T15:08:24.751Z',
        type: 'conversation.message-add',
      };

      const protoKnock = new Knock({
        [PROTO_MESSAGE_TYPE.EXPECTS_READ_CONFIRMATION]: false,
        [PROTO_MESSAGE_TYPE.LEGAL_HOLD_STATUS]: expectedLegalHoldStatus,
        hotKnock: false,
      });

      const genericMessage = new GenericMessage({
        [GenericMessageType.KNOCK]: protoKnock,
        messageId: createUuid(),
      });

      const mappedEvent = await mapper.mapGenericMessage(genericMessage, optimisticEvent);

      expect(mappedEvent.data.legal_hold_status).toBe(expectedLegalHoldStatus);
    });

    it('resolves with a mapped last read message', () => {
      const date = Date.now();
      const conversation_id = createUuid();

      const last_read = new LastRead({conversationId: conversation_id, lastReadTimestamp: date});
      const generic_message = new GenericMessage({
        [GenericMessageType.LAST_READ]: last_read,
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(CONVERSATION_EVENT.MEMBER_UPDATE);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.conversationId).toBe(conversation_id);
        expect(event_json.data.last_read_timestamp).toBe(date.toString());
      });
    });

    it('resolves with a mapped reaction message', () => {
      const messageId = createUuid();

      const reaction = new Reaction({
        emoji: emojiReaction,
        messageId,
      });
      const generic_message = new GenericMessage({
        [GenericMessageType.REACTION]: reaction,
        messageId,
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CONVERSATION.REACTION);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.message_id).toBe(generic_message.messageId);
        expect(event_json.data.reaction).toBe(emojiReaction);
      });
    });

    it('resolves with a mapped text message', () => {
      const generic_message = new GenericMessage({
        [GenericMessageType.TEXT]: new Text({content: 'Unit test'}),
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CONVERSATION.MESSAGE_ADD);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.content).toBe('Unit test');
      });
    });

    it('rejects with an error if no generic message is provided', done => {
      mapper
        .mapGenericMessage(undefined as any, {id: 'ABC'} as any)
        .then(done.fail)
        .catch(error => {
          expect(error instanceof CryptographyError).toBeTruthy();
          expect(error.type).toBe(CryptographyError.TYPE.NO_GENERIC_MESSAGE);
          done();
        });
    });

    it('can map a text wrapped inside an external message', async () => {
      const plaintext = 'Test';
      const text = new Text({content: plaintext});
      const generic_message = new GenericMessage({
        [GenericMessageType.TEXT]: text,
        messageId: createUuid(),
      });

      const encryptedAsset = GenericMessage.encode(generic_message).finish();
      const keyBytes = new Uint8Array([]);
      const sha256 = new Uint8Array([]);
      event.data.data = arrayToBase64(encryptedAsset);

      const external_message = new GenericMessage({
        external: new External({otrKey: keyBytes, sha256}),
        messageId: createUuid(),
      });
      const event_json = await mapper.mapGenericMessage(external_message, event);

      expect(event_json.data.content).toBe(plaintext);
      expect(event_json.type).toBe(ClientEvent.CONVERSATION.MESSAGE_ADD);
      expect(event_json.id).toBe(generic_message.messageId);
    });

    it('resolves with a mapped button action message', async () => {
      const generic_message = new GenericMessage({
        buttonAction: new ButtonAction({
          referenceMessageId: createUuid(),
          buttonId: createUuid(),
        }),
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CONVERSATION.BUTTON_ACTION);
        expect(event_json.conversation).toBe(event.conversation);

        expect(event_json.data.messageId).toBe(generic_message.buttonAction?.referenceMessageId);
        expect(event_json.data.buttonId).toBe(generic_message.buttonAction?.buttonId);
        expect(event_json.qualified_from).toBe(event.qualified_from);
      });
    });

    it('can map a ping wrapped inside an external message', async () => {
      let external_message = undefined;

      const genericMessage = new GenericMessage({
        knock: new Knock({hotKnock: false}),
        messageId: createUuid(),
      });

      const encryptedAsset = GenericMessage.encode(genericMessage).finish();
      const keyBytes = new Uint8Array([]);
      const sha256 = new Uint8Array([]);
      event.data.data = arrayToBase64(encryptedAsset);

      external_message = new GenericMessage({
        external: new External({otrKey: keyBytes, sha256}),
        messageId: createUuid(),
      });
      const event_json = await mapper.mapGenericMessage(external_message, event);

      expect(isObject(event_json)).toBeTruthy();
      expect(event_json.type).toBe(ClientEvent.CONVERSATION.KNOCK);
      expect(event_json.conversation).toBe(event.conversation);
      expect(event_json.from).toBe(event.from);
      expect(event_json.time).toBe(event.time);
      expect(event_json.id).toBe(genericMessage.messageId);
    });

    it('resolves with a mapped location message', () => {
      const location = new Location({
        latitude: 13.409779,
        longitude: 52.520645,
        name: 'Berlin',
        zoom: 1,
      });
      const generic_message = new GenericMessage({
        [GenericMessageType.LOCATION]: location,
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CONVERSATION.LOCATION);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.location.longitude).toBe(generic_message.location.longitude);
        expect(event_json.data.location.latitude).toBe(generic_message.location.latitude);
        expect(event_json.data.location.name).toBe(generic_message.location.name);
        expect(event_json.data.location.zoom).toBe(generic_message.location.zoom);
      });
    });

    it('resolves with a mapped reaction message', () => {
      const messageId = createUuid();

      const reaction = new Reaction({
        emoji: emojiReaction,
        messageId,
      });
      const generic_message = new GenericMessage({
        messageId,
        reaction,
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CONVERSATION.REACTION);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.data.message_id).toBe(generic_message.messageId);
        expect(event_json.data.reaction).toBe(emojiReaction);
      });
    });

    it('resolves with a mapped calling message', () => {
      const content_message = {
        resp: false,
        sessid: 'asd2',
        type: 'CANCEL',
        version: '3.0',
      };

      const calling = new Calling({content: JSON.stringify(content_message)});
      const generic_message = new GenericMessage({
        [GenericMessageType.CALLING]: calling,
        messageId: createUuid(),
      });

      return mapper.mapGenericMessage(generic_message, event).then(event_json => {
        expect(isObject(event_json)).toBeTruthy();
        expect(event_json.type).toBe(ClientEvent.CALL.E_CALL);
        expect(event_json.conversation).toBe(event.conversation);
        expect(event_json.from).toBe(event.from);
        expect(event_json.time).toBe(event.time);
        expect(event_json.id).toBe(generic_message.messageId);
        expect(event_json.content).toEqual(content_message);
      });
    });
  });
});
