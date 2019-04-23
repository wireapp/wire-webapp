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

import {LinkPreview, Mention} from '@wireapp/protocol-messaging';

import {MediumImage} from '../entity/message/MediumImage';
import {getLogger} from 'utils/Logger';
import {t} from 'utils/LocalizerUtil';

import {ReceiptModeUpdateMessage} from '../entity/message/ReceiptModeUpdateMessage';
import {TERMINATION_REASON} from '../calling/enum/TerminationReason';
import {base64ToArray} from 'utils/util';

// Event Mapper to convert all server side JSON events into core entities.
export class EventMapper {
  /**
   * Construct a new Event Mapper.
   */
  constructor() {
    this.logger = getLogger('EventMapper');
  }

  /**
   * Convert multiple JSON events into message entities.
   *
   * @param {Array} events - Event data
   * @param {Conversation} conversationEntity - Conversation entity the events belong to
   * @returns {Promise<Array<Message>>} Resolves with the mapped message entities
   */
  mapJsonEvents(events, conversationEntity) {
    return Promise.resolve().then(() => {
      return events
        .filter(event => event)
        .reverse()
        .map(event => {
          try {
            return this._mapJsonEvent(event, conversationEntity);
          } catch (error) {
            const errorMessage = `Failure while mapping events. Affected '${event.type}' event: ${error.message}`;
            this.logger.error(errorMessage, {error, event});

            const customData = {eventTime: new Date(event.time).toISOString(), eventType: event.type};
            Raygun.send(new Error(errorMessage), customData);
          }
        })
        .filter(messageEntity => messageEntity);
    });
  }

  /**
   * Convert JSON event into a message entity.
   *
   * @param {Object} event - Event data
   * @param {Conversation} conversationEntity - Conversation entity the event belong to
   * @returns {Promise} Resolves with the mapped message entity
   */
  mapJsonEvent(event, conversationEntity) {
    return Promise.resolve()
      .then(() => this._mapJsonEvent(event, conversationEntity))
      .catch(error => {
        const isMessageNotFound = error.type === z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND;
        if (isMessageNotFound) {
          throw error;
        }
        const errorMessage = `Failure while mapping events. Affected '${event.type}' event: ${error.message}`;
        this.logger.error(errorMessage, {error, event});

        const customData = {eventTime: new Date(event.time).toISOString(), eventType: event.type};
        Raygun.send(new Error(errorMessage), customData);

        throw new z.error.ConversationError(z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND);
      });
  }

  /**
   * Will update the content of the originalEntity with the new data given.
   * Will try to do as little updates as possible to avoid to many observable emission.
   *
   * @param {z.entity.MessageEntity} originalEntity - the original message to update
   * @param {Object} event - new json data to feed into the entity
   * @returns {z.entity.MessageEntity} - the updated message entity
   */
  updateMessageEvent(originalEntity, event) {
    const {id, data: eventData, edited_time: editedTime} = event;

    if (id !== originalEntity.id && originalEntity.has_asset_text()) {
      originalEntity.assets.removeAll();
      originalEntity.assets.push(this._mapAssetText(eventData));

      if (eventData.quote) {
        const {message_id: messageId, user_id: userId, error} = eventData.quote;
        originalEntity.quote(new z.message.QuoteEntity({error, messageId, userId}));
      }
    } else if (originalEntity.get_first_asset) {
      const asset = originalEntity.get_first_asset();
      if (eventData.status && asset.status) {
        const assetEntity = this._mapAsset(event);
        originalEntity.assets([assetEntity]);
      }
      if (eventData.previews) {
        if (asset.previews().length !== eventData.previews.length) {
          asset.previews(this._mapAssetLinkPreviews(eventData.previews));
        }
      }

      const {preview_id, preview_key, preview_otr_key, preview_sha256, preview_token} = eventData;
      if (preview_otr_key) {
        const remoteDataPreview = preview_key
          ? z.assets.AssetRemoteData.v3(preview_key, preview_otr_key, preview_sha256, preview_token, true)
          : z.assets.AssetRemoteData.v2(event.conversation, preview_id, preview_otr_key, preview_sha256, true);
        asset.preview_resource(remoteDataPreview);
      }
    }

    if (event.reactions !== undefined) {
      originalEntity.reactions(event.reactions);
      originalEntity.version = event.version;
    }

    originalEntity.id = id;

    if (originalEntity.is_content() || originalEntity.is_ping()) {
      originalEntity.status(event.status || z.message.StatusType.SENT);
    }

    originalEntity.replacing_message_id = eventData.replacing_message_id;
    if (editedTime || eventData.edited_time) {
      originalEntity.edited_timestamp(new Date(editedTime || eventData.edited_time).getTime());
    }

    return addReadReceiptData(originalEntity, event);
  }

  /**
   * Convert JSON event into a message entity.
   *
   * @param {Object} event - Event data
   * @param {Conversation} conversationEntity - Conversation entity the event belong to
   * @returns {Message} Mapped message entity
   */
  _mapJsonEvent(event, conversationEntity) {
    let messageEntity;

    switch (event.type) {
      case z.event.Backend.CONVERSATION.MEMBER_JOIN: {
        messageEntity = this._mapEventMemberJoin(event, conversationEntity);
        break;
      }

      case z.event.Backend.CONVERSATION.MEMBER_LEAVE: {
        messageEntity = this._mapEventMemberLeave(event);
        break;
      }

      case z.event.Backend.CONVERSATION.RECEIPT_MODE_UPDATE: {
        messageEntity = this._mapEventReceiptModeUpdate(event);
        break;
      }

      case z.event.Backend.CONVERSATION.MESSAGE_TIMER_UPDATE: {
        messageEntity = this._mapEventMessageTimerUpdate(event);
        break;
      }

      case z.event.Backend.CONVERSATION.RENAME: {
        messageEntity = this._mapEventRename(event);
        break;
      }

      case z.event.Client.CONVERSATION.ASSET_ADD: {
        messageEntity = addReadReceiptData(this._mapEventAssetAdd(event), event);
        break;
      }

      case z.event.Client.CONVERSATION.DELETE_EVERYWHERE: {
        messageEntity = this._mapEventDeleteEverywhere(event);
        break;
      }

      case z.event.Client.CONVERSATION.GROUP_CREATION: {
        messageEntity = this._mapEventGroupCreation(event);
        break;
      }

      case z.event.Client.CONVERSATION.INCOMING_MESSAGE_TOO_BIG:
      case z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT: {
        messageEntity = this._mapEventUnableToDecrypt(event);
        break;
      }

      case z.event.Client.CONVERSATION.KNOCK: {
        messageEntity = addReadReceiptData(this._mapEventPing(), event);
        break;
      }

      case z.event.Client.CONVERSATION.LOCATION: {
        messageEntity = addReadReceiptData(this._mapEventLocation(event), event);
        break;
      }

      case z.event.Client.CONVERSATION.MESSAGE_ADD: {
        messageEntity = addReadReceiptData(this._mapEventMessageAdd(event), event);
        break;
      }

      case z.event.Client.CONVERSATION.MISSED_MESSAGES: {
        messageEntity = this._mapEventMissedMessages();
        break;
      }

      case z.event.Client.CONVERSATION.ONE2ONE_CREATION: {
        messageEntity = this._mapEvent1to1Creation(event);
        break;
      }

      case z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE: {
        messageEntity = this._mapEventTeamMemberLeave(event);
        break;
      }

      case z.event.Client.CONVERSATION.VERIFICATION: {
        messageEntity = this._mapEventVerification(event);
        break;
      }

      case z.event.Client.CONVERSATION.VOICE_CHANNEL_ACTIVATE: {
        messageEntity = this._mapEventVoiceChannelActivate();
        break;
      }

      case z.event.Client.CONVERSATION.VOICE_CHANNEL_DEACTIVATE: {
        messageEntity = this._mapEventVoiceChannelDeactivate(event);
        break;
      }

      default: {
        this.logger.warn(`Ignored unhandled '${event.type}' event ${event.id ? `'${event.id}' ` : ''}`, event);
        throw new z.error.ConversationError(z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND);
      }
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

    if (messageEntity.is_content() || messageEntity.is_ping()) {
      messageEntity.status(event.status || z.message.StatusType.SENT);
    }

    if (messageEntity.isReactable()) {
      messageEntity.reactions(event.reactions || {});
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
   * Maps JSON data of conversation.one2one-creation message into message entity.
   *
   * @private
   * @param {Object} eventData - Message data
   * @returns {ContentMessage} Member message entity
   */
  _mapEvent1to1Creation({data: eventData}) {
    const {has_service: hasService, userIds} = eventData;

    const messageEntity = new z.entity.MemberMessage();
    messageEntity.memberMessageType = z.message.SystemMessageType.CONNECTION_ACCEPTED;
    messageEntity.userIds(userIds);

    if (hasService) {
      messageEntity.showServicesWarning = true;
    }

    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.asset_add message into message entity.
   *
   * @private
   * @param {Object} event - Message data
   * @returns {ContentMessage} Content message entity
   */
  _mapEventAssetAdd(event) {
    const messageEntity = new z.entity.ContentMessage();

    const assetEntity = this._mapAsset(event);
    messageEntity.assets.push(assetEntity);

    return messageEntity;
  }

  /**
   * Maps JSON data of delete everywhere event to message entity.
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
   * Map JSON ata of group creation event to message entity.
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
    messageEntity.allTeamMembers = eventData.allTeamMembers;
    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.location message into message entity.
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
   * Maps JSON data of conversation.member_join message into message entity.
   *
   * @private
   * @param {Object} event - Message data
   * @param {Conversation} conversationEntity - Conversation entity the event belong to
   * @returns {MemberMessage} Member message entity
   */
  _mapEventMemberJoin(event, conversationEntity) {
    const {data: eventData, from: sender} = event;
    const {has_service: hasService, user_ids: userIds} = eventData;

    const messageEntity = new z.entity.MemberMessage();

    const isSingleModeConversation = conversationEntity.is1to1() || conversationEntity.isRequest();
    messageEntity.visible(!isSingleModeConversation);

    if (conversationEntity.isGroup()) {
      const messageFromCreator = sender === conversationEntity.creator;
      const creatorIndex = userIds.indexOf(sender);
      const creatorIsJoiningMember = messageFromCreator && creatorIndex !== -1;

      if (creatorIsJoiningMember) {
        userIds.splice(creatorIndex, 1);
        messageEntity.memberMessageType = z.message.SystemMessageType.CONVERSATION_CREATE;
      }

      if (hasService) {
        messageEntity.showServicesWarning = true;
      }

      messageEntity.userIds(userIds);
    }

    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.member_leave message into message entity.
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
   * Maps JSON data of conversation.message_add message into message entity.
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
    messageEntity.edited_timestamp(new Date(editedTime || eventData.edited_time).getTime());

    if (eventData.quote) {
      const {message_id: messageId, user_id: userId, error} = eventData.quote;
      messageEntity.quote(new z.message.QuoteEntity({error, messageId, userId}));
    }

    return messageEntity;
  }

  /**
   * Maps JSON data of local missed message event to message entity.
   * @private
   * @returns {MissedMessage} Missed message entity
   */
  _mapEventMissedMessages() {
    return new z.entity.MissedMessage();
  }

  /**
   * Maps JSON data of conversation.knock message into message entity.
   * @private
   * @returns {PingMessage} Ping message entity
   */
  _mapEventPing() {
    return new z.entity.PingMessage();
  }

  /**
   * Maps JSON data of conversation.rename message into message entity.
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
   * Maps JSON data of conversation.receipt-mode-update message into message entity.
   *
   * @private
   * @param {Object} eventData - Message data
   * @returns {ReceiptModeUpdateMessage} receipt mode update message entity
   */
  _mapEventReceiptModeUpdate({data: eventData}) {
    return new ReceiptModeUpdateMessage(!!eventData.receipt_mode);
  }

  /**
   * Maps JSON data of conversation.message-timer-update message into message entity.
   *
   * @private
   * @param {Object} eventData - Message data
   * @returns {MessageTimerUpdateMessage} message timer update message entity
   */
  _mapEventMessageTimerUpdate({data: eventData}) {
    return new z.entity.MessageTimerUpdateMessage(eventData.message_timer);
  }

  /**
   * Maps JSON data of conversation.team_leave message into message entity.
   *
   * @private
   * @param {Object} event - Message data
   * @returns {MemberMessage} Member message entity
   */
  _mapEventTeamMemberLeave(event) {
    const messageEntity = this._mapEventMemberLeave(event);
    const eventData = event.data;
    messageEntity.name(eventData.name || t('conversationSomeone'));
    return messageEntity;
  }

  /**
   * Maps JSON data of local decrypt errors to message entity.
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
   * Maps JSON data of conversation.verification message into message entity.
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
   * Maps JSON data of conversation.voice-channel-activate message into message entity.
   * @private
   * @returns {CallMessageEntity} Call message entity
   */
  _mapEventVoiceChannelActivate() {
    const messageEntity = new z.entity.CallMessage();

    messageEntity.call_message_type = z.message.CALL_MESSAGE_TYPE.ACTIVATED;
    messageEntity.visible(false);

    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.voice-channel-deactivate message into message entity.
   *
   * @private
   * @param {Object} eventData - Message data
   * @returns {CallMessageEntity} Call message entity
   */
  _mapEventVoiceChannelDeactivate({data: eventData}) {
    const messageEntity = new z.entity.CallMessage();

    messageEntity.call_message_type = z.message.CALL_MESSAGE_TYPE.DEACTIVATED;
    messageEntity.finished_reason = eventData.reason;
    messageEntity.visible(messageEntity.finished_reason === TERMINATION_REASON.MISSED);

    return messageEntity;
  }

  //##############################################################################
  // Asset mappers
  //##############################################################################

  _mapAsset(event) {
    const eventData = event.data;
    const assetInfo = eventData.info;
    const isMediumImage = assetInfo && assetInfo.tag === 'medium';
    return isMediumImage ? this._mapAssetImage(event) : this._mapAssetFile(event);
  }

  /**
   * Maps JSON data of file asset into asset entity.
   *
   * @private
   * @param {Object} event - Asset data received as JSON
   * @returns {File} File asset entity
   */
  _mapAssetFile(event) {
    const {conversation: conversationId, data: eventData} = event;
    const {content_length, content_type, id, info, meta, status} = eventData;

    const assetEntity = new z.entity.File(id);

    assetEntity.conversationId = conversationId;

    // Original
    assetEntity.file_size = content_length;
    assetEntity.file_type = content_type;
    assetEntity.meta = meta;

    // info
    if (info) {
      const {correlation_id, name} = info;
      assetEntity.correlation_id = correlation_id;
      assetEntity.file_name = name;
    }

    // Remote data - full
    const {key, otr_key, sha256, token} = eventData;
    const remoteData = key
      ? z.assets.AssetRemoteData.v3(key, otr_key, sha256, token)
      : z.assets.AssetRemoteData.v2(conversationId, id, otr_key, sha256);
    assetEntity.original_resource(remoteData);

    // Remote data - preview
    const {preview_id, preview_key, preview_otr_key, preview_sha256, preview_token} = eventData;
    if (preview_otr_key) {
      const remoteDataPreview = preview_key
        ? z.assets.AssetRemoteData.v3(preview_key, preview_otr_key, preview_sha256, preview_token, true)
        : z.assets.AssetRemoteData.v2(conversationId, preview_id, preview_otr_key, preview_sha256, true);
      assetEntity.preview_resource(remoteDataPreview);
    }

    assetEntity.status(status || z.assets.AssetTransferState.UPLOAD_PENDING);

    return assetEntity;
  }

  /**
   * Maps JSON data of medium image asset into asset entity.
   *
   * @private
   * @param {Object} event - Asset data received as JSON
   * @returns {MediumImage} Medium image asset entity
   */
  _mapAssetImage(event) {
    const {data: eventData, conversation: conversationId} = event;
    const {content_length, content_type, id: assetId, info} = eventData;
    const assetEntity = new MediumImage(assetId);

    assetEntity.file_size = content_length;
    assetEntity.file_type = content_type;
    assetEntity.ratio = assetEntity.height / assetEntity.width;

    if (info) {
      assetEntity.width = info.width;
      assetEntity.height = info.height;
    }

    const {key, otr_key, sha256, token} = eventData;

    if (!otr_key || !sha256) {
      return assetEntity;
    }

    const remoteData = key
      ? z.assets.AssetRemoteData.v3(key, otr_key, sha256, token, true)
      : z.assets.AssetRemoteData.v2(conversationId, assetId, otr_key, sha256, true);

    assetEntity.resource(remoteData);
    return assetEntity;
  }

  /**
   * Map link preview from proto message.
   *
   * @private
   * @param {LinkPreview} linkPreview - Link preview proto message
   * @returns {LinkPreview} Mapped link preview
   */
  _mapAssetLinkPreview(linkPreview) {
    if (linkPreview) {
      const {image, title, url} = linkPreview;
      const {image: article_image, title: article_title} = linkPreview.article || {};

      const meta_data = linkPreview.metaData || linkPreview.meta_data;

      const linkPreviewEntity = new z.entity.LinkPreview(title || article_title, url);
      linkPreviewEntity.meta_data_type = meta_data;
      linkPreviewEntity.meta_data = linkPreview[meta_data];

      const previewImage = image || article_image;
      if (previewImage && previewImage.uploaded) {
        const {assetId: assetKey, assetToken} = previewImage.uploaded;

        if (assetKey) {
          let {otrKey, sha256} = previewImage.uploaded;

          otrKey = new Uint8Array(otrKey);
          sha256 = new Uint8Array(sha256);

          linkPreviewEntity.image_resource(z.assets.AssetRemoteData.v3(assetKey, otrKey, sha256, assetToken, true));
        }
      }

      return linkPreviewEntity;
    }
  }

  /**
   * Map link previews from proto messages.
   *
   * @private
   * @param {Array} linkPreviews - Link previews as base64 encoded proto messages
   * @returns {Array<LinkPreview>} Array of mapped link previews
   */
  _mapAssetLinkPreviews(linkPreviews) {
    return linkPreviews
      .map(encodedLinkPreview => LinkPreview.decode(base64ToArray(encodedLinkPreview)))
      .map(linkPreview => this._mapAssetLinkPreview(linkPreview))
      .filter(linkPreviewEntity => linkPreviewEntity);
  }

  /**
   * Map mentions from proto messages.
   *
   * @private
   * @param {Array} mentions - Mentions as base64 encoded proto messages
   * @param {string} messageText - Text of message
   * @returns {Array<z.message.MentionEntity>} Array of mapped mentions
   */
  _mapAssetMentions(mentions, messageText) {
    return mentions
      .map(encodedMention => {
        const protoMention = Mention.decode(base64ToArray(encodedMention));
        return new z.message.MentionEntity(protoMention.start, protoMention.length, protoMention.userId);
      })
      .filter((mentionEntity, _, allMentions) => {
        if (mentionEntity) {
          try {
            return mentionEntity.validate(messageText, allMentions);
          } catch (error) {
            this.logger.warn(`Removed invalid mention when mapping message: ${error.message}`, mentionEntity);
            return false;
          }
        }
      });
  }

  /**
   * Maps JSON data of text asset into asset entity.
   *
   * @private
   * @param {Object} eventData - Asset data received as JSON
   * @returns {Text} Text asset entity
   */
  _mapAssetText(eventData) {
    const {id, content, mentions, message, previews} = eventData;
    const messageText = content || message;
    const assetEntity = new z.entity.Text(id, messageText);

    if (mentions && mentions.length) {
      assetEntity.mentions(this._mapAssetMentions(mentions, messageText));
    }
    if (previews && previews.length) {
      assetEntity.previews(this._mapAssetLinkPreviews(previews));
    }

    return assetEntity;
  }
}

function addReadReceiptData(entity, event) {
  const {data: eventData, read_receipts} = event;
  if (eventData) {
    entity.expectsReadConfirmation = eventData.expects_read_confirmation;
  }
  entity.readReceipts(read_receipts || []);
  return entity;
}
