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
   * @param {AssetService} asset_service - Asset handling service
   */
  constructor(asset_service) {
    this.map_json_event = this.map_json_event.bind(this);
    this.asset_service = asset_service;
    this.logger = new z.util.Logger('z.conversation.EventMapper', z.config.LOGGER.OPTIONS);
  }

  /**
   * Convert multiple JSON events into message entities.
   *
   * @param {Object} events - Event data
   * @param {Conversation} conversation_et - Conversation entity the events belong to
   * @param {boolean} should_create_dummy_image - Create a dummy image
   * @returns {Array<Message>} Mapped message entities
   */
  map_json_events(events, conversation_et, should_create_dummy_image) {
    return events
      .reverse()
      .filter((event) => event)
      .map((event) => this.map_json_event(event, conversation_et, should_create_dummy_image))
      .filter((message_et) => message_et);
  }

  /**
   * Convert JSON event into a message entity.
   *
   * @param {Object} event - Event data
   * @param {Conversation} conversation_et - Conversation entity the event belong to
   * @param {boolean} should_create_dummy_image - Create a dummy image
   * @returns {Message} Mapped message entity
   */
  map_json_event(event, conversation_et, should_create_dummy_image) {
    try {
      return this._map_json_event(event, conversation_et, should_create_dummy_image);
    } catch (error) {
      this.logger.error(`Failed to map event: ${error.message}`, {error, event});
      return undefined;
    }
  }

  /**
   * Convert JSON event into a message entity.
   *
   * @param {Object} event - Event data
   * @param {Conversation} conversation_et - Conversation entity the event belong to
   * @param {boolean} should_create_dummy_image - Create a dummy image
   * @returns {Message} Mapped message entity
   */
  _map_json_event(event, conversation_et, should_create_dummy_image) {
    let message_et;

    switch (event.type) {
      case z.event.Backend.CONVERSATION.ASSET_ADD:
        message_et = this._map_event_asset_add(event, should_create_dummy_image);
        break;
      case z.event.Backend.CONVERSATION.KNOCK:
        message_et = this._map_event_ping(event);
        break;
      case z.event.Backend.CONVERSATION.MESSAGE_ADD:
        message_et = this._map_event_message_add(event);
        break;
      case z.event.Backend.CONVERSATION.MEMBER_JOIN:
        message_et = this._map_event_member_join(event, conversation_et);
        break;
      case z.event.Backend.CONVERSATION.MEMBER_LEAVE:
      case z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE:
        message_et = this._map_event_member_leave(event);
        break;
      case z.event.Backend.CONVERSATION.MEMBER_UPDATE:
        message_et = this._map_event_member_update(event);
        break;
      case z.event.Client.CONVERSATION.MISSED_MESSAGES:
        message_et = this._map_event_missed_messages();
        break;
      case z.event.Backend.CONVERSATION.RENAME:
        message_et = this._map_event_rename(event);
        break;
      case z.event.Backend.CONVERSATION.VOICE_CHANNEL_ACTIVATE:
        message_et = this._map_event_voice_channel_activate();
        break;
      case z.event.Backend.CONVERSATION.VOICE_CHANNEL_DEACTIVATE:
        message_et = this._map_event_voice_channel_deactivate(event);
        break;
      case z.event.Client.CONVERSATION.ASSET_META:
        message_et = this._map_event_asset_meta(event);
        break;
      case z.event.Client.CONVERSATION.DELETE_EVERYWHERE:
        message_et = this._map_event_delete_everywhere(event);
        break;
      case z.event.Client.CONVERSATION.LOCATION:
        message_et = this._map_event_location(event);
        break;
      case z.event.Client.CONVERSATION.VERIFICATION:
        message_et = this._map_event_verification(event);
        break;
      case z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT:
      case z.event.Client.CONVERSATION.INCOMING_MESSAGE_TOO_BIG:
        message_et = this._map_event_unable_to_decrypt(event);
        break;
      default:
        message_et = this._map_event_ignored();
    }

    message_et.category = event.category;
    message_et.conversation_id = conversation_et.id;
    message_et.from = event.from;
    message_et.id = event.id;
    message_et.primary_key = event.primary_key;
    message_et.timestamp(new Date(event.time).getTime());
    message_et.type = event.type;
    message_et.version = event.version || 1;

    if (message_et.is_reactable()) {
      message_et.reactions(event.reactions || {});
      if (event.status) {
        message_et.status(event.status);
      }
    }

    if (event.ephemeral_expires) {
      message_et.ephemeral_expires(event.ephemeral_expires);
      message_et.ephemeral_started(event.ephemeral_started || '0');
    }

    if (window.isNaN(message_et.timestamp())) {
      this.logger.warn(`Could not get timestamp for message '${message_et.id}'. Skipping it.`, event);
      message_et = undefined;
    }

    return message_et;
  }


  //##############################################################################
  // Event mappers
  //##############################################################################


  /**
   * Maps JSON data of conversation.asset_add message into message entity
   *
   * @private
   * @param {Object} event - Message data
   * @param {boolean} should_create_dummy_image - Create a dummy image
   * @returns {ContentMessage} Content message entity
   */
  _map_event_asset_add(event, should_create_dummy_image) {
    const event_data = event.data;
    const message_et = new z.entity.ContentMessage();

    if (event_data.info.tag === 'medium') {
      message_et.assets.push(this._map_asset_image(event, should_create_dummy_image));
    } else {
      message_et.assets.push(this._map_asset_file(event));
    }

    message_et.nonce = event_data.info.nonce;
    return message_et;
  }

  /**
   * Maps JSON data of delete everywhere event to message entity
   *
   * @private
   * @param {Object} event_data - Message data
   * @returns {DeleteMessage} Delete message entity
   */
  _map_event_delete_everywhere({data: event_data}) {
    const message_et = new z.entity.DeleteMessage();
    message_et.deleted_timestamp = new Date(event_data.deleted_time).getTime();
    return message_et;
  }

  /**
   * Maps JSON data of other message types currently ignored into message entity
   * @private
   * @returns {SystemMessage} System message entity
   */
  _map_event_ignored() {
    const message_et = new z.entity.SystemMessage();
    message_et.visible(false);
    return message_et;
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
    const message_et = new z.entity.ContentMessage();
    const asset_et = new z.entity.Location();


    asset_et.longitude = location.longitude;
    asset_et.latitude = location.latitude;
    asset_et.name = location.name;
    asset_et.zoom = location.zoom;

    message_et.assets.push(asset_et);
    message_et.nonce = nonce;

    return message_et;
  }

  /**
   * Maps JSON data of conversation.member_join message into message entity
   *
   * @private
   * @param {Object} event - Message data
   * @param {z.entity.Conversation} conversation_et - Conversation entity the event belong to
   * @returns {MemberMessage} Member message entity
   */
  _map_event_member_join(event, conversation_et) {
    const {data: event_data, from} = event;
    const message_et = new z.entity.MemberMessage();

    if ([z.conversation.ConversationType.CONNECT, z.conversation.ConversationType.ONE2ONE].includes(conversation_et.type())) {
      if ((from === conversation_et.creator) && (event_data.user_ids.length === 1)) {
        message_et.member_message_type = z.message.SystemMessageType.CONNECTION_ACCEPTED;
        event_data.user_ids = conversation_et.participating_user_ids();
      } else {
        message_et.visible(false);
      }
    } else {
      const creator_index = event_data.user_ids.indexOf(event.from);

      if ((from === conversation_et.creator) && (creator_index !== -1)) {
        event_data.user_ids.splice(creator_index, 1);
        message_et.member_message_type = z.message.SystemMessageType.CONVERSATION_CREATE;
      }
    }

    message_et.user_ids(event_data.user_ids);

    return message_et;
  }

  /**
   * Maps JSON data of conversation.member_leave or conversation.team_leave message into message entity
   *
   * @private
   * @param {Object} event_data - Message data
   * @returns {MemberMessage} Member message entity
   */
  _map_event_member_leave({data: event_data}) {
    const message_et = new z.entity.MemberMessage();
    message_et.user_ids(event_data.user_ids);
    return message_et;
  }

  /**
   * Maps JSON data of conversation.member_update message into message entity
   *
   * @private
   * @param {Object} event_data - Message data
   * @returns {MemberMessage} Member message entity
   */
  _map_event_member_update({data: event_data}) {
    const message_et = new z.entity.MemberMessage();
    // Don't render last read
    message_et.visible(!event_data.last_read_timestamp);
    return message_et;
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
    const message_et = new z.entity.ContentMessage();

    message_et.assets.push(this._map_asset_text(event_data));
    message_et.nonce = event_data.nonce;
    message_et.replacing_message_id = event_data.replacing_message_id;
    message_et.edited_timestamp = new Date(edited_time || event_data.edited_time).getTime();

    return message_et;
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
    const message_et = new z.entity.PingMessage();
    message_et.nonce = event_data.nonce;
    return message_et;
  }


  /**
   * Maps JSON data of conversation.rename message into message entity
   *
   * @private
   * @param {Object} event_data - Message data
   * @returns {RenameMessage} Rename message entity
   */
  _map_event_rename({data: event_data}) {
    const message_et = new z.entity.RenameMessage();
    message_et.name = event_data.name;
    return message_et;
  }

  /**
   * Maps JSON data of local decrypt errors to message entity
   *
   * @private
   * @param {Object} error_code - Error data received as JSON
   * @returns {DecryptErrorMessage} Decrypt error message entity
   */
  _map_event_unable_to_decrypt({error_code}) {
    const message_et = new z.entity.DecryptErrorMessage();

    if (error_code) {
      message_et.error_code = error_code.split(' ')[0];
      message_et.client_id = error_code.substring(message_et.error_code.length + 1).replace(/[()]/g, '');
    }

    return message_et;
  }

  /**
   * Maps JSON data of conversation.verification message into message entity
   *
   * @private
   * @param {Object} event_data - Message data
   * @returns {VerificationMessage} Verification message entity
   */
  _map_event_verification({data: event_data}) {
    const message_et = new z.entity.VerificationMessage();

    message_et.user_ids(event_data.user_ids);
    message_et.verification_message_type = event_data.type;

    return message_et;
  }
  /**
   * Maps JSON data of conversation.voice-channel-activate message into message entity
   * @private
   * @returns {CallMessage} Call message entity
   */
  _map_event_voice_channel_activate() {
    const message_et = new z.entity.CallMessage();

    message_et.call_message_type = z.message.CALL_MESSAGE_TYPE.ACTIVATED;
    message_et.visible(false);

    return message_et;
  }

  /**
   * Maps JSON data of conversation.voice-channel-deactivate message into message entity
   *
   * @private
   * @param {Object} event_data - Message data
   * @returns {CallMessage} Call message entity
   */
  _map_event_voice_channel_deactivate({data: event_data}) {
    const message_et = new z.entity.CallMessage();

    message_et.call_message_type = z.message.CALL_MESSAGE_TYPE.DEACTIVATED;
    message_et.finished_reason = event_data.reason;
    message_et.visible(message_et.finished_reason === z.calling.enum.TERMINATION_REASON.MISSED);

    return message_et;
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

    const asset_et = new z.entity.File(id);

    asset_et.correlation_id = info.correlation_id;
    asset_et.conversation_id = conversation_id;

    // original
    asset_et.file_size = content_length;
    asset_et.file_type = content_type;
    asset_et.file_name = info.name;
    asset_et.meta = meta;

    try {
      // remote data - full
      const {key, otr_key, sha256, token} = event_data;
      if (key) {
        asset_et.original_resource(z.assets.AssetRemoteData.v3(key, otr_key, sha256, token));
      } else {
        asset_et.original_resource(z.assets.AssetRemoteData.v2(conversation_id, id, otr_key, sha256));
      }

      // remote data - preview
      const {preview_id, preview_key, preview_otr_key, preview_sha256, preview_token} = event_data;
      if (preview_otr_key) {
        if (preview_key) {
          asset_et.preview_resource(z.assets.AssetRemoteData.v3(preview_key, preview_otr_key, preview_sha256, preview_token, true));
        } else {
          asset_et.preview_resource(z.assets.AssetRemoteData.v2(conversation_id, preview_id, preview_otr_key, preview_sha256, true));
        }
      }
    } catch (error) {
      if (error.name === 'ValidationUtilError') {
        this.logger.error(`Failed to validate an asset. Error: ${error.message}`);
        return asset_et;
      }
      throw error;
    }

    asset_et.status(status || z.assets.AssetTransferState.UPLOADING);

    return asset_et;
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
      const link_preview_et = new z.entity.LinkPreview();
      const {image, permanent_url, summary, title, url, url_offset, meta_data} = link_preview;
      const {image: article_image, title: article_title, summary: article_summary, permanent_url: article_permanent_url} = link_preview.article || {};

      link_preview_et.title = title || article_title;
      link_preview_et.summary = summary || article_summary;
      link_preview_et.permanent_url = permanent_url || article_permanent_url;
      link_preview_et.original_url = url;
      link_preview_et.url_offset = url_offset;
      link_preview_et.meta_data_type = meta_data;
      link_preview_et.meta_data = link_preview[meta_data];

      const preview_image = image || article_image;

      if (preview_image) {
        const {asset_token, asset_id} = preview_image.uploaded;
        let {otr_key, sha256} = preview_image.uploaded;

        otr_key = new Uint8Array(otr_key.toArrayBuffer());
        sha256 = new Uint8Array(sha256.toArrayBuffer());

        try {
          link_preview_et.image_resource(z.assets.AssetRemoteData.v3(asset_id, otr_key, sha256, asset_token, true));
        } catch (error) {
          if (error.name === 'ValidationUtilError') {
            this.logger.error(`Failed to validate an asset. Error: ${error.message}`);
          } else {
            throw error;
          }
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
      .map((encoded_link_preview) => z.proto.LinkPreview.decode64(encoded_link_preview))
      .map((link_preview) => this._map_asset_link_preview(link_preview))
      .filter((link_preview_et) => link_preview_et);
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
    const asset_et = new z.entity.Text(id, (content || message));

    asset_et.nonce = nonce;
    asset_et.previews(this._map_asset_link_previews(previews));

    return asset_et;
  }

  /**
   * Maps JSON data of medium image asset into asset entity
   *
   * @private
   * @param {Object} event - Asset data received as JSON
   * @param {boolean} should_create_dummy_image - Create a dummy image
   * @returns {z.entity.MediumImage} Medium image asset entity
   */
  _map_asset_image(event, should_create_dummy_image) {
    const {data: event_data, conversation: conversation_id} = event;
    const {content_length, content_type, id: asset_id, info} = event_data;
    const asset_et = new z.entity.MediumImage(asset_id);

    asset_et.file_size = content_length;
    asset_et.file_type = content_type;
    asset_et.width = info.width;
    asset_et.height = info.height;
    asset_et.ratio = asset_et.height / asset_et.width;

    const {key, otr_key, sha256, token} = event_data;

    if (should_create_dummy_image) {
      asset_et.dummy_url = z.util.dummy_image(asset_et.width, asset_et.height);
    }

    try {
      if (key) {
        asset_et.resource(z.assets.AssetRemoteData.v3(key, otr_key, sha256, token, true));
      } else {
        asset_et.resource(z.assets.AssetRemoteData.v2(conversation_id, asset_id, otr_key, sha256, true));
      }
    } catch (error) {
      if (error.name === 'ValidationUtilError') {
        this.logger.error(`Failed to validate an asset. Error: ${error.message}`);
        return asset_et;
      }
      throw error;
    }

    return asset_et;
  }
};
