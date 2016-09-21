#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

# grunt test_init && grunt test_run:cryptography/CryptographyMapper

describe 'z.cryptography.CryptographyMapper', ->
  mapper = new z.cryptography.CryptographyMapper()
  mapper.logger.level = mapper.logger.levels.ERROR

  event = undefined

  beforeEach ->
    event =
      conversation: z.util.create_random_uuid()
      data:
        id: z.util.create_random_uuid()
      from: z.util.create_random_uuid()
      time: new Date().toISOString()

  describe 'map_generic_message', ->
    beforeAll (done) ->
      z.util.protobuf.load_protos 'ext/proto/generic-message-proto/messages.proto'
      .then(done).catch done.fail

    it 'resolves with a mapped original asset message', (done) ->
      original =
        mime_type: 'jpg'
        size: 1024
        name: 'foo.jpg'
      original_asset = new z.proto.Asset.Original original.mime_type, original.size, original.name
      asset = new z.proto.Asset original_asset

      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'asset', asset

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Client.CONVERSATION.ASSET_META
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.content_length).toBe original.size
        expect(event_json.data.content_type).toBe original.mime_type
        expect(event_json.data.info.name).toBe original.name
        expect(event_json.data.info.nonce).toBe generic_message.message_id
        done()
      .catch done.fail

    it 'resolves with a mapped original asset message with audio meta data', (done) ->
      audio_meta_data = new z.proto.Asset.AudioMetaData 3 * 1000, new Uint8Array([1, 2, 3])
      original_asset = new z.proto.Asset.Original 'audio/mp3', 1024, 'foo.mp3', null, null, audio_meta_data
      asset = new z.proto.Asset original_asset

      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'asset', asset

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Client.CONVERSATION.ASSET_META
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.content_length).toEqual original_asset.size.toNumber()
        expect(event_json.data.content_type).toEqual original_asset.mime_type
        expect(event_json.data.info.name).toEqual original_asset.name
        expect(event_json.data.info.nonce).toBe generic_message.message_id
        expect(event_json.data.meta.duration).toEqual original_asset.audio.duration_in_millis / 1000
        expect(event_json.data.meta.loudness).toEqual new Uint8Array(original_asset.audio.normalized_loudness.toArrayBuffer())
        done()
      .catch done.fail

    it 'resolves with a mapped uploaded asset message', (done) ->
      uploaded =
        otr_key: new Uint8Array [1, 2]
        sha256: new Uint8Array [3, 4]
      uploaded_asset = new z.proto.Asset.RemoteData uploaded.otr_key, uploaded.sha256
      asset = new z.proto.Asset()
      asset.set 'uploaded', uploaded_asset

      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'asset', asset

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Client.CONVERSATION.ASSET_UPLOAD_COMPLETE
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.id).toBe event.data.id
        done()
      .catch done.fail

    it 'resolves with a mapped cancelled upload asset message', (done) ->
      asset = new z.proto.Asset()
      asset.set 'not_uploaded', z.proto.Asset.NotUploaded.CANCELLED

      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'asset', asset

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Client.CONVERSATION.ASSET_UPLOAD_FAILED
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.reason).toBe z.proto.Asset.NotUploaded.CANCELLED
        done()
      .catch done.fail

    it 'resolves with a mapped failed upload asset message', (done) ->
      asset = new z.proto.Asset()
      asset.set 'not_uploaded', z.proto.Asset.NotUploaded.FAILED

      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'asset', asset

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Client.CONVERSATION.ASSET_UPLOAD_FAILED
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.reason).toBe z.proto.Asset.NotUploaded.FAILED
        done()
      .catch done.fail

    it 'resolves with a mapped uploaded asset message', (done) ->
      data =
        otr_key: new Uint8Array [1, 2]
        sha256: new Uint8Array [3, 4]

      remote_data = new z.proto.Asset.RemoteData()
      remote_data.set 'otr_key', data.otr_key
      remote_data.set 'sha256', data.sha256

      preview_asset = new z.proto.Asset.Preview()
      preview_asset.set 'remote', remote_data

      asset = new z.proto.Asset()
      asset.set 'preview', preview_asset

      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'asset', asset

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Client.CONVERSATION.ASSET_PREVIEW
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.id).toBe event.data.id
        expect(event_json.data.otr_key.length).toBe 2
        expect(event_json.data.sha256.length).toBe 2
        done()
      .catch done.fail

    it 'resolves with a mapped cleared message', (done) ->
      date = Date.now().toString()
      conversation_id = z.util.create_random_uuid()
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'cleared', new z.proto.Cleared conversation_id, date

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Backend.CONVERSATION.MEMBER_UPDATE
        expect(event_json.conversation).toBe conversation_id
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.cleared_timestamp).toBe date
        done()
      .catch done.fail

    it 'resolves with a mapped hidden message', (done) ->
      conversation_id = z.util.create_random_uuid()
      message_id = z.util.create_random_uuid()
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'hidden', new z.proto.MessageHide conversation_id, message_id

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Client.CONVERSATION.MESSAGE_HIDDEN
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.conversation_id).toBe conversation_id
        expect(event_json.data.message_id).toBe message_id
        done()
      .catch done.fail

    it 'resolves with a mapped deleted message', (done) ->
      message_id = z.util.create_random_uuid()
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'deleted', new z.proto.MessageDelete message_id

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Client.CONVERSATION.MESSAGE_DELETE
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.message_id).toBe message_id
        done()
      .catch done.fail

    # @todo Add expects for otr_key and sha256
    it 'resolves with a mapped medium image message', (done) ->
      image =
        tag: 'medium'
        width: 640
        height: 480
        original_width: 1280
        original_height: 960
        mime_type: 'jpg'
        size: 1024
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      image_asset = new z.proto.ImageAsset image.tag, image.width, image.height, image.original_width,
        image.original_height, image.mime_type, image.size
      generic_message.set 'image', image_asset

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Backend.CONVERSATION.ASSET_ADD
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.content_length).toBe image.size
        expect(event_json.data.content_type).toBe image.mime_type
        expect(event_json.data.id).toBe event.data.id
        expect(event_json.data.info.tag).toBe image.tag
        expect(event_json.data.info.width).toBe image.width
        expect(event_json.data.info.height).toBe image.height
        expect(event_json.data.info.nonce).toBe event.data.id
        expect(event_json.data.info.original_width).toBe image.original_width
        expect(event_json.data.info.original_height).toBe image.original_height
        expect(event_json.data.info.public).toBeFalsy()
        done()
      .catch done.fail

    it 'resolves with a mapped medium image message when event id is not set', (done) ->
      image =
        tag: 'medium'
        width: 640
        height: 480
        original_width: 1280
        original_height: 960
        mime_type: 'jpg'
        size: 1024
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      image_asset = new z.proto.ImageAsset image.tag, image.width, image.height, image.original_width,
        image.original_height, image.mime_type, image.size
      generic_message.set 'image', image_asset

      delete event.data.id

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Backend.CONVERSATION.ASSET_ADD
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.content_length).toBe image.size
        expect(event_json.data.content_type).toBe image.mime_type
        expect(event_json.data.id).toBeDefined()
        expect(event_json.data.info.tag).toBe image.tag
        expect(event_json.data.info.width).toBe image.width
        expect(event_json.data.info.height).toBe image.height
        expect(event_json.data.info.nonce).toBeDefined()
        expect(event_json.data.info.original_width).toBe image.original_width
        expect(event_json.data.info.original_height).toBe image.original_height
        expect(event_json.data.info.public).toBeFalsy()
        done()
      .catch done.fail

    it 'rejects with an error for a preview image message', (done) ->
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'image', new z.proto.ImageAsset 'preview'

      mapper.map_generic_message generic_message, event
      .then done.fail
      .catch (error) ->
        expect(error instanceof z.cryptography.CryptographyError).toBeTruthy()
        expect(error.type).toBe z.cryptography.CryptographyError::TYPE.IGNORED_PREVIEW
        done()

    it 'resolves with a mapped knock message', (done) ->
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'knock', new z.proto.Knock false

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Backend.CONVERSATION.KNOCK
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.nonce).toBe generic_message.message_id
        done()
      .catch done.fail

    it 'rejects with an error for a hot knock message', (done) ->
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'knock', new z.proto.Knock true

      mapper.map_generic_message generic_message, event
      .then done.fail
      .catch (error) ->
        expect(error instanceof z.cryptography.CryptographyError).toBeTruthy()
        expect(error.type).toBe z.cryptography.CryptographyError::TYPE.IGNORED_HOT_KNOCK
        done()

    it 'resolves with a mapped last read message', (done) ->
      date = Date.now().toString()
      conversation_id = z.util.create_random_uuid()
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'lastRead', new z.proto.LastRead conversation_id, date

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Backend.CONVERSATION.MEMBER_UPDATE
        expect(event_json.conversation).toBe conversation_id
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.last_read_timestamp).toBe date
        done()
      .catch done.fail

    it 'resolves with a mapped reaction message', (done) ->
      message_id = z.util.create_random_uuid()
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'reaction', new z.proto.Reaction '💖', message_id

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Client.CONVERSATION.REACTION
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.message_id).toBe message_id
        expect(event_json.data.reaction).toBe '💖'
        done()
      .catch done.fail

    it 'resolves with a mapped text message', (done) ->
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'text', new z.proto.Text 'Unit test'

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Backend.CONVERSATION.MESSAGE_ADD
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.content).toBe 'Unit test'
        expect(event_json.data.nonce).toBe generic_message.message_id
        done()
      .catch done.fail

    it 'rejects with an error if no generic message is provided', (done) ->
      mapper.map_generic_message undefined, {id: 'ABC'}
      .then done.fail
      .catch (error) ->
        expect(error instanceof z.cryptography.CryptographyError).toBeTruthy()
        expect(error.type).toBe z.cryptography.CryptographyError::TYPE.NO_GENERIC_MESSAGE
        done()

    it 'rejects with an error for an unhandled generic message type', (done) ->
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'calling', new z.proto.Calling 'Test'

      mapper.map_generic_message generic_message, {id: 'ABC'}
      .then done.fail
      .catch (error) ->
        expect(error instanceof z.cryptography.CryptographyError).toBeTruthy()
        expect(error.type).toBe z.cryptography.CryptographyError::TYPE.UNHANDLED_TYPE
        done()

    it 'can map a text wrapped inside an external message', (done) ->
      plaintext = 'Test'
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'text', new z.proto.Text plaintext

      z.assets.AssetCrypto.encrypt_aes_asset generic_message.toArrayBuffer()
      .then (data) ->
        [key_bytes, sha256, ciphertext] = data
        key_bytes = new Uint8Array key_bytes
        sha256 = new Uint8Array sha256
        event.data.data = z.util.array_to_base64 ciphertext

        external_message = new z.proto.GenericMessage z.util.create_random_uuid()
        external_message.set 'external', new z.proto.External key_bytes, sha256
        return external_message
      .then (external_message) ->
        return mapper.map_generic_message external_message, event
      .then (event_json) ->
        expect(event_json.data.content).toBe plaintext
        expect(event_json.type).toBe z.event.Backend.CONVERSATION.MESSAGE_ADD
        done()
      .catch done.fail

    it 'can map a ping wrapped inside an external message', (done) ->
      external_message = undefined
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'knock', new z.proto.Knock false

      z.assets.AssetCrypto.encrypt_aes_asset generic_message.toArrayBuffer()
      .then (data) ->
        [key_bytes, sha256, ciphertext] = data
        key_bytes = new Uint8Array key_bytes
        sha256 = new Uint8Array sha256
        event.data.data = z.util.array_to_base64 ciphertext

        external_message = new z.proto.GenericMessage z.util.create_random_uuid()
        external_message.set 'external', new z.proto.External key_bytes, sha256
        return external_message
      .then (external_message) ->
        return mapper.map_generic_message external_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Backend.CONVERSATION.KNOCK
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe external_message.message_id
        expect(event_json.data.nonce).toBe generic_message.message_id
        done()
      .catch done.fail

    it 'resolves with a mapped location message', (done) ->
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'location', new z.proto.Location 52.520645, 13.409779, 'Berlin', 1

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Client.CONVERSATION.LOCATION
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.location.longitude).toBe generic_message.location.longitude
        expect(event_json.data.location.latitude).toBe generic_message.location.latitude
        expect(event_json.data.location.name).toBe generic_message.location.name
        expect(event_json.data.location.zoom).toBe generic_message.location.zoom
        expect(event_json.data.nonce).toBe generic_message.message_id
        done()
      .catch done.fail

    it 'resolves with a mapped reaction message', (done) ->
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'reaction', new z.proto.Reaction z.message.ReactionType.LIKE, generic_message.message_id

      mapper.map_generic_message generic_message, event
      .then (event_json) ->
        expect(_.isObject event_json).toBeTruthy()
        expect(event_json.type).toBe z.event.Client.CONVERSATION.REACTION
        expect(event_json.conversation).toBe event.conversation
        expect(event_json.from).toBe event.from
        expect(event_json.time).toBe event.time
        expect(event_json.id).toBe generic_message.message_id
        expect(event_json.data.message_id).toBe generic_message.message_id
        expect(event_json.data.reaction).toBe z.message.ReactionType.LIKE
        done()
      .catch done.fail
