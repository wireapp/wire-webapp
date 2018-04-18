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

'use strict';

window.z = window.z || {};
window.z.conversation = z.conversation || {};

// Event Mapper to convert all server side JSON events into core entities.
z.conversation.EventMapper = class EventMapper {
  /**
   * Construct a new Event Mapper.
   */
  constructor() {
    this.logger = new z.util.Logger('z.conversation.EventMapper', z.config.LOGGER.OPTIONS);
  }

  /**
   * Convert multiple JSON events into message entities.
   *
   * @param {Object} events - Event data
   * @param {Conversation} conversationEntity - Conversation entity the events belong to
   * @param {boolean} [createDummyImage] - Create a dummy image
   * @returns {Array<Message>} Mapped message entities
   */
  mapJsonEvents(events, conversationEntity, createDummyImage) {
    return events
      .reverse()
      .filter(event => event)
      .map(event => {
        try {
          return this._mapJsonEvent(event, conversationEntity, createDummyImage);
        } catch (error) {
          const errorMessage = `Failed to map event of type '${event.type}': ${error.message}`;
          this.logger.error(errorMessage, {error, event});
          Raygun.send(new Error(errorMessage), {eventType: event.type});
        }
      })
      .filter(messageEntity => messageEntity);
  }

  /**
   * Convert JSON event into a message entity.
   *
   * @param {Object} event - Event data
   * @param {Conversation} conversationEntity - Conversation entity the event belong to
   * @param {boolean} [createDummyImage] - Create a dummy image
   * @returns {Message} Mapped message entity
   */
  mapJsonEvent(event, conversationEntity, createDummyImage) {
    return this._mapJsonEvent(event, conversationEntity, createDummyImage);
  }

  /**
   * Convert JSON event into a message entity.
   *
   * @param {Object} event - Event data
   * @param {Conversation} conversationEntity - Conversation entity the event belong to
   * @param {boolean} createDummyImage - Create a dummy image
   * @returns {Message} Mapped message entity
   */
  _mapJsonEvent(event, conversationEntity, createDummyImage) {
    let messageEntity;

    switch (event.type) {
      case z.event.Backend.CONVERSATION.MEMBER_JOIN:
        messageEntity = this._mapEventMemberJoin(event, conversationEntity);
        break;
      case z.event.Backend.CONVERSATION.MEMBER_LEAVE:
        messageEntity = this._mapEventMemberLeave(event);
        break;
      case z.event.Backend.CONVERSATION.RENAME:
        messageEntity = this._mapEventRename(event);
        break;
      case z.event.Client.CONVERSATION.ASSET_ADD:
        messageEntity = this._mapEventAssetAdd(event, createDummyImage);
        break;
      case z.event.Client.CONVERSATION.DELETE_EVERYWHERE:
        messageEntity = this._mapEventDeleteEverywhere(event);
        break;
      case z.event.Client.CONVERSATION.GROUP_CREATION:
        messageEntity = this._mapEventGroupCreation(event);
        break;
      case z.event.Client.CONVERSATION.KNOCK:
        messageEntity = this._mapEventPing();
        break;
      case z.event.Client.CONVERSATION.LOCATION:
        messageEntity = this._mapEventLocation(event);
        break;
      case z.event.Client.CONVERSATION.MESSAGE_ADD:
        messageEntity = this._mapEventMessageAdd(event);
        break;
      case z.event.Client.CONVERSATION.MISSED_MESSAGES:
        messageEntity = this._mapEventMissedMessages();
        break;
      case z.event.Client.CONVERSATION.ONE2ONE_CREATION:
        messageEntity = this._mapEvent1to1Creation(event);
        break;
      case z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE:
        messageEntity = this._mapEventTeamMemberLeave(event);
        break;
      case z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT:
      case z.event.Client.CONVERSATION.INCOMING_MESSAGE_TOO_BIG:
        messageEntity = this._mapEventUnableToDecrypt(event);
        break;
      case z.event.Client.CONVERSATION.VERIFICATION:
        messageEntity = this._mapEventVerification(event);
        break;
      case z.event.Client.CONVERSATION.VOICE_CHANNEL_ACTIVATE:
        messageEntity = this._mapEventVoiceChannelActivate();
        break;
      case z.event.Client.CONVERSATION.VOICE_CHANNEL_DEACTIVATE:
        messageEntity = this._mapEventVoiceChannelDeactivate(event);
        break;
      default:
        this.logger.warn(`Ignored unhandled event ${event.id ? `'${event.id}' ` : ''}of type '${event.type}'`, event);
        return messageEntity;
    }

    const {category, from, id, primary_key, time, type, version} = event;

    messageEntity.category = category;
    messageEntity.conversation_id = conversationEntity.id;
    messageEntity.from = from;
    messageEntity.id = id;
    messageEntity.primary_key = primary_key;
    messageEntity.timestamp(new Date(time).getTime());
    messageEntity.type = type;
    messageEntity.version = version || 1;

    if (messageEntity.is_reactable()) {
      const {reactions, status} = event;
      messageEntity.reactions(reactions || {});
      if (status) {
        messageEntity.status(status);
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
   * Maps JSON data of conversation.one2one-creation message into message entity
   *
   * @private
   * @param {Object} eventData - Message data
   * @returns {ContentMessage} Member message entity
   */
  _mapEvent1to1Creation({data: eventData}) {
    const messageEntity = new z.entity.MemberMessage();
    messageEntity.memberMessageType = z.message.SystemMessageType.CONNECTION_ACCEPTED;
    messageEntity.userIds(eventData.userIds);
    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.asset_add message into message entity
   *
   * @private
   * @param {Object} event - Message data
   * @param {boolean} createDummyImage - Create a dummy image
   * @returns {ContentMessage} Content message entity
   */
  _mapEventAssetAdd(event, createDummyImage) {
    const eventData = event.data;
    const messageEntity = new z.entity.ContentMessage();

    const isMediumImage = eventData.info.tag === 'medium';
    const assetEntity = isMediumImage ? this._mapAssetImage(event, createDummyImage) : this._mapAssetFile(event);
    messageEntity.assets.push(assetEntity);

    return messageEntity;
  }

  /**
   * Maps JSON data of delete everywhere event to message entity
   *
   * @private
   * @param {Object} eventData - Message data
   * @returns {DeleteMessage} Delete message entity
   */
  _mapEventDeleteEverywhere({data: eventData}) {
    const messageEntity = new z.entity.DeleteMessage();
    messageEntity.deleted_timestamp = new Date(eventData.deleted_time).getTime();
    return messageEntity;
  }

  /**
   *Map JSON ata of group creation event to message entity
   *
   * @private
   * @param {Object} eventData - Message data
   * @returns {MemberMessage} Member message entity
   */
  _mapEventGroupCreation({data: eventData}) {
    const messageEntity = new z.entity.MemberMessage();
    messageEntity.memberMessageType = z.message.SystemMessageType.CONVERSATION_CREATE;
    messageEntity.name(eventData.name || '');
    messageEntity.userIds(eventData.userIds);
    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.location message into message entity
   *
   * @private
   * @param {Object} eventData - Message data
   * @returns {ContentMessage} Location message entity
   */
  _mapEventLocation({data: eventData}) {
    const location = eventData.location;
    const messageEntity = new z.entity.ContentMessage();
    const assetEntity = new z.entity.Location();

    assetEntity.longitude = location.longitude;
    assetEntity.latitude = location.latitude;
    assetEntity.name = location.name;
    assetEntity.zoom = location.zoom;

    messageEntity.assets.push(assetEntity);

    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.member_join message into message entity
   *
   * @private
   * @param {Object} event - Message data
   * @param {z.entity.Conversation} conversationEntity - Conversation entity the event belong to
   * @returns {MemberMessage} Member message entity
   */
  _mapEventMemberJoin(event, conversationEntity) {
    const {data: eventData, from} = event;
    const messageEntity = new z.entity.MemberMessage();

    const one2oneConversationTypes = [z.conversation.ConversationType.CONNECT, z.conversation.ConversationType.ONE2ONE];
    const messageFromCreator = from === conversationEntity.creator;

    if (one2oneConversationTypes.includes(conversationEntity.type())) {
      const singleUserAdded = eventData.user_ids.length === 1;
      if (messageFromCreator && singleUserAdded) {
        messageEntity.memberMessageType = z.message.SystemMessageType.CONNECTION_ACCEPTED;
        eventData.user_ids = conversationEntity.participating_user_ids();
      } else {
        messageEntity.visible(false);
      }
    } else {
      const creatorIndex = eventData.user_ids.indexOf(event.from);
      const creatorIsJoiningMember = messageFromCreator && creatorIndex !== -1;

      if (creatorIsJoiningMember) {
        eventData.user_ids.splice(creatorIndex, 1);
        messageEntity.memberMessageType = z.message.SystemMessageType.CONVERSATION_CREATE;
      }
    }

    messageEntity.userIds(eventData.user_ids);

    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.member_leave message into message entity
   *
   * @private
   * @param {Object} eventData - Message data
   * @returns {MemberMessage} Member message entity
   */
  _mapEventMemberLeave({data: eventData}) {
    const messageEntity = new z.entity.MemberMessage();
    messageEntity.userIds(eventData.user_ids);
    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.message_add message into message entity
   *
   * @private
   * @param {Object} event - Message data
   * @returns {ContentMessage} Content message entity
   */
  _mapEventMessageAdd(event) {
    const {data: eventData, edited_time: editedTime} = event;
    const messageEntity = new z.entity.ContentMessage();

    messageEntity.assets.push(this._mapAssetText(eventData));
    messageEntity.replacing_message_id = eventData.replacing_message_id;
    messageEntity.edited_timestamp = new Date(editedTime || eventData.edited_time).getTime();

    return messageEntity;
  }

  /**
   * Maps JSON data of local missed message event to message entity
   * @private
   * @returns {MissedMessage} Missed message entity
   */
  _mapEventMissedMessages() {
    return new z.entity.MissedMessage();
  }

  /**
   * Maps JSON data of conversation.knock message into message entity
   * @private
   * @returns {PingMessage} Ping message entity
   */
  _mapEventPing() {
    return new z.entity.PingMessage();
  }

  /**
   * Maps JSON data of conversation.rename message into message entity
   *
   * @private
   * @param {Object} eventData - Message data
   * @returns {RenameMessage} Rename message entity
   */
  _mapEventRename({data: eventData}) {
    const messageEntity = new z.entity.RenameMessage();
    messageEntity.name = eventData.name;
    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.team_leave message into message entity
   *
   * @private
   * @param {Object} event - Message data
   * @returns {MemberMessage} Member message entity
   */
  _mapEventTeamMemberLeave(event) {
    const messageEntity = this._mapEventMemberLeave(event);
    const eventData = event.data;
    messageEntity.name(eventData.name || z.l10n.text(z.string.conversationSomeone));
    return messageEntity;
  }

  /**
   * Maps JSON data of local decrypt errors to message entity
   *
   * @private
   * @param {Object} error_code - Error data received as JSON
   * @returns {DecryptErrorMessage} Decrypt error message entity
   */
  _mapEventUnableToDecrypt({error_code: errorCode}) {
    const messageEntity = new z.entity.DecryptErrorMessage();

    if (errorCode) {
      const [code] = errorCode.split(' ');
      messageEntity.error_code = code;
      messageEntity.client_id = errorCode.substring(code.length + 1).replace(/[()]/g, '');
    }

    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.verification message into message entity
   *
   * @private
   * @param {Object} eventData - Message data
   * @returns {VerificationMessage} Verification message entity
   */
  _mapEventVerification({data: eventData}) {
    const messageEntity = new z.entity.VerificationMessage();

    // Database can contain non-camelCased naming. For backwards compatibility reasons we handle both.
    messageEntity.userIds(eventData.userIds || eventData.user_ids);
    messageEntity.verificationMessageType(eventData.type);

    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.voice-channel-activate message into message entity
   * @private
   * @returns {z.calling.entities.CallMessageEntity} Call message entity
   */
  _mapEventVoiceChannelActivate() {
    const messageEntity = new z.entity.CallMessage();

    messageEntity.call_message_type = z.message.CALL_MESSAGE_TYPE.ACTIVATED;
    messageEntity.visible(false);

    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.voice-channel-deactivate message into message entity
   *
   * @private
   * @param {Object} eventData - Message data
   * @returns {z.calling.entities.CallMessageEntity} Call message entity
   */
  _mapEventVoiceChannelDeactivate({data: eventData}) {
    const messageEntity = new z.entity.CallMessage();

    messageEntity.call_message_type = z.message.CALL_MESSAGE_TYPE.DEACTIVATED;
    messageEntity.finished_reason = eventData.reason;
    messageEntity.visible(messageEntity.finished_reason === z.calling.enum.TERMINATION_REASON.MISSED);

    return messageEntity;
  }

  //##############################################################################
  // Asset mappers
  //##############################################################################

  _createDummyImage(width, height) {
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' width='${width}' height='${height}'></svg>`;
  }

  /**
   * Maps JSON data of file asset into asset entity
   *
   * @private
   * @param {Object} event - Asset data received as JSON
   * @returns {File} File asset entity
   */
  _mapAssetFile(event) {
    const {conversation: conversationId, data: eventData} = event;
    const {content_length, content_type, id, info, meta, status} = eventData;

    const assetEntity = new z.entity.File(id);

    assetEntity.correlation_id = info.correlation_id;
    assetEntity.conversationId = conversationId;

    // original
    assetEntity.file_size = content_length;
    assetEntity.file_type = content_type;
    assetEntity.file_name = info.name;
    assetEntity.meta = meta;

    // remote data - full
    const {key, otr_key, sha256, token} = eventData;
    const remoteData = key
      ? z.assets.AssetRemoteData.v3(key, otr_key, sha256, token)
      : z.assets.AssetRemoteData.v2(conversationId, id, otr_key, sha256);
    assetEntity.original_resource(remoteData);

    // remote data - preview
    const {preview_id, preview_key, preview_otr_key, preview_sha256, preview_token} = eventData;
    if (preview_otr_key) {
      const remoteDataPreview = preview_key
        ? z.assets.AssetRemoteData.v3(preview_key, preview_otr_key, preview_sha256, preview_token, true)
        : z.assets.AssetRemoteData.v2(conversationId, preview_id, preview_otr_key, preview_sha256, true);
      assetEntity.preview_resource(remoteDataPreview);
    }

    assetEntity.status(status || z.assets.AssetTransferState.UPLOADING);

    return assetEntity;
  }

  /**
   * Maps JSON data of medium image asset into asset entity
   *
   * @private
   * @param {Object} event - Asset data received as JSON
   * @param {boolean} createDummyImage - Create a dummy image
   * @returns {z.entity.MediumImage} Medium image asset entity
   */
  _mapAssetImage(event, createDummyImage) {
    const {data: eventData, conversation: conversationId} = event;
    const {content_length, content_type, id: assetId, info} = eventData;
    const assetEntity = new z.entity.MediumImage(assetId);

    assetEntity.file_size = content_length;
    assetEntity.file_type = content_type;
    assetEntity.width = info.width;
    assetEntity.height = info.height;
    assetEntity.ratio = assetEntity.height / assetEntity.width;

    const {key, otr_key, sha256, token} = eventData;

    const remoteData = key
      ? z.assets.AssetRemoteData.v3(key, otr_key, sha256, token, true)
      : z.assets.AssetRemoteData.v2(conversationId, assetId, otr_key, sha256, true);
    assetEntity.resource(remoteData);

    if (createDummyImage) {
      assetEntity.dummy_url = this._createDummyImage(assetEntity.width, assetEntity.height);
    }

    return assetEntity;
  }

  /**
   * Map link preview
   *
   * @private
   * @param {z.proto.LinkPreview} linkPreview - Link preview proto message
   * @returns {LinkPreview} Mapped link preview
   */
  _mapAssetLinkPreview(linkPreview) {
    if (linkPreview) {
      const {image, title, url, meta_data} = linkPreview;
      const {image: article_image, title: article_title} = linkPreview.article || {};

      const linkPreviewEntity = new z.entity.LinkPreview(title || article_title, url);
      linkPreviewEntity.meta_data_type = meta_data;
      linkPreviewEntity.meta_data = linkPreview[meta_data];

      const previewImage = image || article_image;
      if (previewImage) {
        const {asset_token, asset_id: asset_key} = previewImage.uploaded;

        if (asset_key) {
          let {otr_key, sha256} = previewImage.uploaded;

          otr_key = new Uint8Array(otr_key.toArrayBuffer());
          sha256 = new Uint8Array(sha256.toArrayBuffer());

          linkPreviewEntity.image_resource(z.assets.AssetRemoteData.v3(asset_key, otr_key, sha256, asset_token, true));
        }
      }

      return linkPreviewEntity;
    }
  }

  /**
   * Map link previews
   *
   * @private
   * @param {Array} [linkPreviews=[]] - base64 encoded proto previews
   * @returns {Array<LinkPreview>} Array of mapped link previews
   */
  _mapAssetLinkPreviews(linkPreviews = []) {
    return linkPreviews
      .map(encodedLinkPreview => z.proto.LinkPreview.decode64(encodedLinkPreview))
      .map(linkPreview => this._mapAssetLinkPreview(linkPreview))
      .filter(linkPreviewEntity => linkPreviewEntity);
  }

  /**
   * Maps JSON data of text asset into asset entity
   *
   * @private
   * @param {Object} eventData - Asset data received as JSON
   * @returns {Text} Text asset entity
   */
  _mapAssetText(eventData) {
    const {id, content, message, previews} = eventData;
    const assetEntity = new z.entity.Text(id, content || message);

    assetEntity.previews(this._mapAssetLinkPreviews(previews));

    return assetEntity;
  }
};
