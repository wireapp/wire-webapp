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

'use strict';

window.z = window.z || {};
window.z.conversation = z.conversation || {};

// Event Mapper to convert all server side JSON events into core entities.
z.conversation.EventMapper = class EventMapper {
  /**
   * Construct a new Event Mapper.
   */
  constructor() {
    this.map_json_event = this.map_json_event.bind(this);
    this.logger = new z.util.Logger('z.conversation.EventMapper', z.config.LOGGER.OPTIONS);
  }

  /**
   * Convert multiple JSON events into message entities.
   *
   * @param {Object} events - Event data
   * @param {Conversation} conversationEt - Conversation entity the events belong to
   * @param {boolean} shouldCreateDummyImage - Create a dummy image
   * @returns {Array<Message>} Mapped message entities
   */
  map_json_events(events, conversationEt, shouldCreateDummyImage) {
    return events
      .reverse()
      .filter(event => event)
      .map(event => this.map_json_event(event, conversationEt, shouldCreateDummyImage))
      .filter(message_et => message_et);
  }

  /**
   * Convert JSON event into a message entity.
   *
   * @param {Object} event - Event data
   * @param {Conversation} conversationEt - Conversation entity the event belong to
   * @param {boolean} shouldCreateDummyImage - Create a dummy image
   * @returns {Message} Mapped message entity
   */
  map_json_event(event, conversationEt, shouldCreateDummyImage) {
    try {
      return this._map_json_event(event, conversationEt, shouldCreateDummyImage);
    } catch (error) {
      this.logger.error(`Failed to map event of type '${event.type}': ${error.message}`, {error, event});
      return undefined;
    }
  }

  /**
   * Convert JSON event into a message entity.
   *
   * @param {Object} event - Event data
   * @param {Conversation} conversationEt - Conversation entity the event belong to
   * @param {boolean} shouldCreateDummyImage - Create a dummy image
   * @returns {Message} Mapped message entity
   */
  _map_json_event(event, conversationEt, shouldCreateDummyImage) {
    let messageEntity;

    switch (event.type) {
      case z.event.Backend.CONVERSATION.MEMBER_JOIN:
        messageEntity = this._map_event_member_join(event, conversationEt);
        break;
      case z.event.Backend.CONVERSATION.MEMBER_LEAVE:
        messageEntity = this._map_event_member_leave(event);
        break;
      case z.event.Backend.CONVERSATION.RENAME:
        messageEntity = this._map_event_rename(event);
        break;
      case z.event.Client.CONVERSATION.ASSET_ADD:
        messageEntity = this._map_event_asset_add(event, shouldCreateDummyImage);
        break;
      case z.event.Client.CONVERSATION.DELETE_EVERYWHERE:
        messageEntity = this._map_event_delete_everywhere(event);
        break;
      case z.event.Client.CONVERSATION.KNOCK:
        messageEntity = this._map_event_ping(event);
        break;
      case z.event.Client.CONVERSATION.LOCATION:
        messageEntity = this._map_event_location(event);
        break;
      case z.event.Client.CONVERSATION.MESSAGE_ADD:
        messageEntity = this._map_event_message_add(event);
        break;
      case z.event.Client.CONVERSATION.MISSED_MESSAGES:
        messageEntity = this._map_event_missed_messages();
        break;
      case z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE:
        messageEntity = this._map_event_team_member_leave(event);
        break;
      case z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT:
      case z.event.Client.CONVERSATION.INCOMING_MESSAGE_TOO_BIG:
        messageEntity = this._map_event_unable_to_decrypt(event);
        break;
      case z.event.Client.CONVERSATION.VERIFICATION:
        messageEntity = this._map_event_verification(event);
        break;
      case z.event.Client.CONVERSATION.VOICE_CHANNEL_ACTIVATE:
        messageEntity = this._map_event_voice_channel_activate();
        break;
      case z.event.Client.CONVERSATION.VOICE_CHANNEL_DEACTIVATE:
        messageEntity = this._map_event_voice_channel_deactivate(event);
        break;
      default:
        this.logger.warn(`Ignored unhandled event '${event.id}' of type '${event.type}'`);
        return messageEntity;
    }

    messageEntity.category = event.category;
    messageEntity.conversation_id = conversationEt.id;
    messageEntity.from = event.from;
    messageEntity.id = event.id;
    messageEntity.primary_key = event.primary_key;
    messageEntity.timestamp(new Date(event.time).getTime());
    messageEntity.type = event.type;
    messageEntity.version = event.version || 1;

    if (messageEntity.is_reactable()) {
      messageEntity.reactions(event.reactions || {});
      if (event.status) {
        messageEntity.status(event.status);
      }
    }

    if (event.ephemeral_expires) {
      messageEntity.ephemeral_expires(event.ephemeral_expires);
      messageEntity.ephemeral_started(event.ephemeral_started || '0');
    }

    if (window.isNaN(messageEntity.timestamp())) {
      this.logger.warn(`Could not get timestamp for message '${messageEntity.id}'. Skipping it.`, event);
      messageEntity = undefined;
    }

    return messageEntity;
  }

  //##############################################################################
  // Event mappers
  //##############################################################################

  /**
   * Maps JSON data of conversation.asset_add message into message entity
   *
   * @private
   * @param {Object} event - Message data
   * @param {boolean} shouldCreateDummyImage - Create a dummy image
   * @returns {ContentMessage} Content message entity
   */
  _map_event_asset_add(event, shouldCreateDummyImage) {
    const event_data = event.data;
    const messageEntity = new z.entity.ContentMessage();

    if (event_data.info.tag === 'medium') {
      messageEntity.assets.push(this._map_asset_image(event, shouldCreateDummyImage));
    } else {
      messageEntity.assets.push(this._map_asset_file(event));
    }

    messageEntity.nonce = event_data.info.nonce;
    return messageEntity;
  }

  /**
   * Maps JSON data of delete everywhere event to message entity
   *
   * @private
   * @param {Object} event_data - Message data
   * @returns {DeleteMessage} Delete message entity
   */
  _map_event_delete_everywhere({data: event_data}) {
    const messageEntity = new z.entity.DeleteMessage();
    messageEntity.deleted_timestamp = new Date(event_data.deleted_time).getTime();
    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.location message into message entity
   *
   * @private
   * @param {Object} event_data - Message data
   * @returns {LocationMessage} Location message entity
   */
  _map_event_location({data: event_data}) {
    const {location, nonce} = event_data;
    const messageEntity = new z.entity.ContentMessage();
    const assetEntity = new z.entity.Location();

    assetEntity.longitude = location.longitude;
    assetEntity.latitude = location.latitude;
    assetEntity.name = location.name;
    assetEntity.zoom = location.zoom;

    messageEntity.assets.push(assetEntity);
    messageEntity.nonce = nonce;

    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.member_join message into message entity
   *
   * @private
   * @param {Object} event - Message data
   * @param {z.entity.Conversation} conversationEt - Conversation entity the event belong to
   * @returns {MemberMessage} Member message entity
   */
  _map_event_member_join(event, conversationEt) {
    const {data: event_data, from} = event;
    const messageEntity = new z.entity.MemberMessage();

    if (
      [z.conversation.ConversationType.CONNECT, z.conversation.ConversationType.ONE2ONE].includes(conversationEt.type())
    ) {
      if (from === conversationEt.creator && event_data.user_ids.length === 1) {
        messageEntity.member_message_type = z.message.SystemMessageType.CONNECTION_ACCEPTED;
        event_data.user_ids = conversationEt.participating_user_ids();
      } else {
        messageEntity.visible(false);
      }
    } else {
      const creator_index = event_data.user_ids.indexOf(event.from);

      if (from === conversationEt.creator && creator_index !== -1) {
        event_data.user_ids.splice(creator_index, 1);
        messageEntity.member_message_type = z.message.SystemMessageType.CONVERSATION_CREATE;
      }
    }

    messageEntity.user_ids(event_data.user_ids);

    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.member_leave message into message entity
   *
   * @private
   * @param {Object} event_data - Message data
   * @returns {MemberMessage} Member message entity
   */
  _map_event_member_leave({data: event_data}) {
    const messageEntity = new z.entity.MemberMessage();
    messageEntity.user_ids(event_data.user_ids);
    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.member_update message into message entity
   *
   * @private
   * @param {Object} event_data - Message data
   * @returns {MemberMessage} Member message entity
   */
  _map_event_member_update({data: event_data}) {
    const messageEntity = new z.entity.MemberMessage();
    // Don't render last read
    messageEntity.visible(!event_data.last_read_timestamp);
    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.message_add message into message entity
   *
   * @private
   * @param {Object} event - Message data
   * @returns {ContentMessage} Content message entity
   */
  _map_event_message_add(event) {
    const {data: event_data, edited_time} = event;
    const messageEntity = new z.entity.ContentMessage();

    messageEntity.assets.push(this._map_asset_text(event_data));
    messageEntity.nonce = event_data.nonce;
    messageEntity.replacing_message_id = event_data.replacing_message_id;
    messageEntity.edited_timestamp = new Date(edited_time || event_data.edited_time).getTime();

    return messageEntity;
  }

  /**
   * Maps JSON data of local missed message event to message entity
   * @private
   * @returns {MissedMessage} Missed message entity
   */
  _map_event_missed_messages() {
    return new z.entity.MissedMessage();
  }

  /**
   * Maps JSON data of conversation.knock message into message entity
   *
   * @private
   * @param {Object} event_data - Message data
   * @returns {PingMessage} Ping message entity
   */
  _map_event_ping({data: event_data}) {
    const messageEntity = new z.entity.PingMessage();
    messageEntity.nonce = event_data.nonce;
    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.rename message into message entity
   *
   * @private
   * @param {Object} event_data - Message data
   * @returns {RenameMessage} Rename message entity
   */
  _map_event_rename({data: event_data}) {
    const messageEntity = new z.entity.RenameMessage();
    messageEntity.name = event_data.name;
    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.team_leave message into message entity
   *
   * @private
   * @param {Object} event - Message data
   * @returns {MemberMessage} Member message entity
   */
  _map_event_team_member_leave(event) {
    const messageEntity = this._map_event_member_leave(event);
    const event_data = event.data;
    messageEntity.name(event_data.name || z.l10n.text(z.string.conversation_someone));
    return messageEntity;
  }

  /**
   * Maps JSON data of local decrypt errors to message entity
   *
   * @private
   * @param {Object} error_code - Error data received as JSON
   * @returns {DecryptErrorMessage} Decrypt error message entity
   */
  _map_event_unable_to_decrypt({error_code}) {
    const messageEntity = new z.entity.DecryptErrorMessage();

    if (error_code) {
      messageEntity.error_code = error_code.split(' ')[0];
      messageEntity.client_id = error_code.substring(messageEntity.error_code.length + 1).replace(/[()]/g, '');
    }

    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.verification message into message entity
   *
   * @private
   * @param {Object} event_data - Message data
   * @returns {VerificationMessage} Verification message entity
   */
  _map_event_verification({data: event_data}) {
    const messageEntity = new z.entity.VerificationMessage();

    messageEntity.user_ids(event_data.user_ids);
    messageEntity.verification_message_type = event_data.type;

    return messageEntity;
  }
  /**
   * Maps JSON data of conversation.voice-channel-activate message into message entity
   * @private
   * @returns {CallMessage} Call message entity
   */
  _map_event_voice_channel_activate() {
    const messageEntity = new z.entity.CallMessage();

    messageEntity.call_message_type = z.message.CALL_MESSAGE_TYPE.ACTIVATED;
    messageEntity.visible(false);

    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.voice-channel-deactivate message into message entity
   *
   * @private
   * @param {Object} event_data - Message data
   * @returns {CallMessage} Call message entity
   */
  _map_event_voice_channel_deactivate({data: event_data}) {
    const messageEntity = new z.entity.CallMessage();

    messageEntity.call_message_type = z.message.CALL_MESSAGE_TYPE.DEACTIVATED;
    messageEntity.finished_reason = event_data.reason;
    messageEntity.visible(messageEntity.finished_reason === z.calling.enum.TERMINATION_REASON.MISSED);

    return messageEntity;
  }

  //##############################################################################
  // Asset mappers
  //##############################################################################

  /**
   * Maps JSON data of file asset into asset entity
   *
   * @private
   * @param {Object} event - Asset data received as JSON
   * @returns {File} File asset entity
   */
  _map_asset_file(event) {
    const {conversation: conversation_id, data: event_data} = event;
    const {content_length, content_type, id, info, meta, status} = event_data;

    const assetEntity = new z.entity.File(id);

    assetEntity.correlation_id = info.correlation_id;
    assetEntity.conversation_id = conversation_id;

    // original
    assetEntity.file_size = content_length;
    assetEntity.file_type = content_type;
    assetEntity.file_name = info.name;
    assetEntity.meta = meta;

    // remote data - full
    const {key, otr_key, sha256, token} = event_data;
    if (key) {
      assetEntity.original_resource(z.assets.AssetRemoteData.v3(key, otr_key, sha256, token));
    } else {
      assetEntity.original_resource(z.assets.AssetRemoteData.v2(conversation_id, id, otr_key, sha256));
    }

    // remote data - preview
    const {preview_id, preview_key, preview_otr_key, preview_sha256, preview_token} = event_data;
    if (preview_otr_key) {
      if (preview_key) {
        assetEntity.preview_resource(
          z.assets.AssetRemoteData.v3(preview_key, preview_otr_key, preview_sha256, preview_token, true)
        );
      } else {
        assetEntity.preview_resource(
          z.assets.AssetRemoteData.v2(conversation_id, preview_id, preview_otr_key, preview_sha256, true)
        );
      }
    }

    assetEntity.status(status || z.assets.AssetTransferState.UPLOADING);

    return assetEntity;
  }

  /**
   * Map link preview
   *
   * @private
   * @param {z.proto.LinkPreview} link_preview - Link preview proto message
   * @returns {LinkPreview} Mapped link preview
   */
  _map_asset_link_preview(link_preview) {
    if (link_preview) {
      const {image, title, url, meta_data} = link_preview;
      const {image: article_image, title: article_title} = link_preview.article || {};

      const link_preview_et = new z.entity.LinkPreview(title || article_title, url);
      link_preview_et.meta_data_type = meta_data;
      link_preview_et.meta_data = link_preview[meta_data];

      const preview_image = image || article_image;
      if (preview_image) {
        const {asset_token, asset_id: asset_key} = preview_image.uploaded;

        if (asset_key) {
          let {otr_key, sha256} = preview_image.uploaded;

          otr_key = new Uint8Array(otr_key.toArrayBuffer());
          sha256 = new Uint8Array(sha256.toArrayBuffer());

          link_preview_et.image_resource(z.assets.AssetRemoteData.v3(asset_key, otr_key, sha256, asset_token, true));
        }
      }

      return link_preview_et;
    }
  }

  /**
   * Map link previews
   *
   * @private
   * @param {Array} [link_previews=[]] - base64 encoded proto previews
   * @returns {Array<LinkPreview>} Array of mapped link previews
   */
  _map_asset_link_previews(link_previews = []) {
    return link_previews
      .map(encoded_link_preview => z.proto.LinkPreview.decode64(encoded_link_preview))
      .map(link_preview => this._map_asset_link_preview(link_preview))
      .filter(link_preview_et => link_preview_et);
  }

  /**
   * Maps JSON data of text asset into asset entity
   *
   * @private
   * @param {Object} event_data - Asset data received as JSON
   * @returns {Text} Text asset entity
   */
  _map_asset_text(event_data) {
    const {id, content, message, nonce, previews} = event_data;
    const assetEntity = new z.entity.Text(id, content || message);

    assetEntity.nonce = nonce;
    assetEntity.previews(this._map_asset_link_previews(previews));

    return assetEntity;
  }

  /**
   * Maps JSON data of medium image asset into asset entity
   *
   * @private
   * @param {Object} event - Asset data received as JSON
   * @param {boolean} shouldCreateDummyImage - Create a dummy image
   * @returns {z.entity.MediumImage} Medium image asset entity
   */
  _map_asset_image(event, shouldCreateDummyImage) {
    const {data: event_data, conversation: conversation_id} = event;
    const {content_length, content_type, id: asset_id, info} = event_data;
    const assetEntity = new z.entity.MediumImage(asset_id);

    assetEntity.file_size = content_length;
    assetEntity.file_type = content_type;
    assetEntity.width = info.width;
    assetEntity.height = info.height;
    assetEntity.ratio = assetEntity.height / assetEntity.width;

    const {key, otr_key, sha256, token} = event_data;

    if (key) {
      assetEntity.resource(z.assets.AssetRemoteData.v3(key, otr_key, sha256, token, true));
    } else {
      assetEntity.resource(z.assets.AssetRemoteData.v2(conversation_id, asset_id, otr_key, sha256, true));
    }

    if (shouldCreateDummyImage) {
      assetEntity.dummy_url = z.util.dummy_image(assetEntity.width, assetEntity.height);
    }

    return assetEntity;
  }
};
