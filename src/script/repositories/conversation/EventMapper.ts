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

import {CONVERSATION_EVENT, ConversationEvent, ConversationProtocolUpdateEvent} from '@wireapp/api-client/lib/event/';
import {container} from 'tsyringe';

import {LinkPreview, Mention} from '@wireapp/protocol-messaging';

import {AssetRemoteData} from 'Repositories/assets/AssetRemoteData';
import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import {TERMINATION_REASON} from 'Repositories/calling/enum/TerminationReason';
import {AssetData} from 'Repositories/cryptography/CryptographyMapper';
import type {Conversation} from 'Repositories/entity/Conversation';
import {Button} from 'Repositories/entity/message/Button';
import {CallingTimeoutMessage} from 'Repositories/entity/message/CallingTimeoutMessage';
import {CallMessage} from 'Repositories/entity/message/CallMessage';
import {CompositeMessage} from 'Repositories/entity/message/CompositeMessage';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {DecryptErrorMessage} from 'Repositories/entity/message/DecryptErrorMessage';
import {DeleteMessage} from 'Repositories/entity/message/DeleteMessage';
import {E2EIVerificationMessage} from 'Repositories/entity/message/E2EIVerificationMessage';
import {FailedToAddUsersMessage} from 'Repositories/entity/message/FailedToAddUsersMessage';
import {FederationStopMessage} from 'Repositories/entity/message/FederationStopMessage';
import {FileAsset} from 'Repositories/entity/message/FileAsset';
import {FileTypeRestrictedMessage} from 'Repositories/entity/message/FileTypeRestrictedMessage';
import {JoinedAfterMLSMigrationFinalisationMessage} from 'Repositories/entity/message/JoinedAfterMLSMigrationFinalisationMessage';
import {LegalHoldMessage} from 'Repositories/entity/message/LegalHoldMessage';
import {LinkPreview as LinkPreviewEntity, LinkPreviewData} from 'Repositories/entity/message/LinkPreview';
import {Location} from 'Repositories/entity/message/Location';
import {MediumImage} from 'Repositories/entity/message/MediumImage';
import {MemberMessage} from 'Repositories/entity/message/MemberMessage';
import type {Message} from 'Repositories/entity/message/Message';
import {MessageTimerUpdateMessage} from 'Repositories/entity/message/MessageTimerUpdateMessage';
import {MissedMessage} from 'Repositories/entity/message/MissedMessage';
import {MLSConversationRecoveredMessage} from 'Repositories/entity/message/MLSConversationRecoveredMessage';
import {MLSMigrationFinalisationOngoingCallMessage} from 'Repositories/entity/message/MLSMigrationFinalisationOngoingCallMessage';
import {Multipart} from 'Repositories/entity/message/Multipart';
import {OneToOneMigratedToMlsMessage} from 'Repositories/entity/message/OneToOneMigratedToMlsMessage';
import {PingMessage} from 'Repositories/entity/message/PingMessage';
import {ProtocolUpdateMessage} from 'Repositories/entity/message/ProtocolUpdateMessage';
import {ReceiptModeUpdateMessage} from 'Repositories/entity/message/ReceiptModeUpdateMessage';
import {RenameMessage} from 'Repositories/entity/message/RenameMessage';
import {Text} from 'Repositories/entity/message/Text';
import type {Text as TextAsset} from 'Repositories/entity/message/Text';
import {VerificationMessage} from 'Repositories/entity/message/VerificationMessage';
import {ClientEvent} from 'Repositories/event/Client';
import type {EventRecord, LegacyEventRecord} from 'Repositories/storage';
import {t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {userReactionMapToReactionMap} from 'Util/ReactionUtil';
import {base64ToArray} from 'Util/util';

import {
  MemberJoinEvent,
  MemberLeaveEvent,
  TeamMemberLeaveEvent,
  ErrorEvent,
  ClientConversationEvent,
  FederationStopEvent,
  FailedToAddUsersMessageEvent,
  E2EIVerificationEvent,
  MessageAddEvent,
  CompositeMessageAddEvent,
  MultipartMessageAddEvent,
} from './EventBuilder';

import {ConversationError} from '../../error/ConversationError';
import {isContentMessage} from '../../guards/Message';
import {CALL_MESSAGE_TYPE} from '../../message/CallMessageType';
import {MentionEntity} from '../../message/MentionEntity';
import {MessageCategory} from '../../message/MessageCategory';
import {QuoteEntity} from '../../message/QuoteEntity';
import {StatusType} from '../../message/StatusType';
import {SystemMessageType} from '../../message/SystemMessageType';
import {APIClient} from '../../service/APIClientSingleton';

// Event Mapper to convert all server side JSON events into core entities.
export class EventMapper {
  logger: Logger;
  /**
   * Construct a new Event Mapper.
   */
  constructor(private readonly apiClient = container.resolve(APIClient)) {
    this.logger = getLogger('EventMapper');
  }

  private get fallbackDomain() {
    return this.apiClient.context?.domain;
  }

  /**
   * Convert multiple JSON events into message entities.
   *
   * @param events Event data
   * @param conversationEntity Conversation entity the events belong to
   * @returns Resolves with the mapped message entities
   */
  mapJsonEvents(events: EventRecord[], conversationEntity: Conversation): Message[] {
    const reversedEvents = events.filter(event => !!event).reverse();
    const mappedEvents = reversedEvents.map((event): Message | void => {
      try {
        return this._mapJsonEvent(event, conversationEntity);
      } catch (error) {
        const errorMessage = `Failure while mapping events. Affected '${event.type}' event: ${error.message}`;
        this.logger.error(errorMessage, error);
      }
    });
    return mappedEvents.filter(messageEntity => !!messageEntity) as Message[];
  }

  /**
   * Convert JSON event into a message entity.
   *
   * @param event Event data
   * @param conversationEntity Conversation entity the event belong to
   * @returns Resolves with the mapped message entity
   */
  mapJsonEvent(event: ConversationEvent | ClientConversationEvent, conversationEntity: Conversation) {
    try {
      return this._mapJsonEvent(event, conversationEntity);
    } catch (error) {
      const isMessageNotFound = error.type === ConversationError.TYPE.MESSAGE_NOT_FOUND;
      if (isMessageNotFound) {
        throw error;
      }
      const errorMessage = `Failure while mapping events. Affected '${event.type}' event: ${error.message}`;
      this.logger.error(errorMessage, error);

      throw new ConversationError(
        ConversationError.TYPE.MESSAGE_NOT_FOUND,
        ConversationError.MESSAGE.MESSAGE_NOT_FOUND,
      );
    }
  }

  /**
   * Will update the content of the originalEntity with the new data given.
   * Will try to do as little updates as possible to avoid to many observable emission.
   *
   * @param originalEntity the original message to update
   * @param event new json data to feed into the entity
   * @returns the updated message entity
   */
  updateMessageEvent(originalEntity: ContentMessage, event: LegacyEventRecord): ContentMessage {
    const {id, data: eventData, edited_time: editedTime, conversation, qualified_conversation} = event;

    if (eventData.quote) {
      const {hash, message_id: messageId, user_id: userId, error} = eventData.quote;
      originalEntity.quote(new QuoteEntity({error, hash, messageId, userId}));
    }

    if (id !== originalEntity.id && originalEntity.hasAssetText()) {
      originalEntity.assets.removeAll();
      const textAsset = this._mapAssetText(eventData);
      originalEntity.assets.push(textAsset);
    } else if (originalEntity.getFirstAsset) {
      const asset = originalEntity.getFirstAsset();
      if (eventData.status && (asset as FileAsset).status) {
        const assetEntity = this._mapAsset(event);
        originalEntity.assets([assetEntity]);
      }
      if (eventData.previews) {
        if ((asset as TextAsset).previews().length !== eventData.previews.length) {
          const previews = this._mapAssetLinkPreviews(eventData.previews);
          (asset as TextAsset).previews(previews as LinkPreviewEntity[]);
        }
      }

      const {
        preview_id,
        preview_key,
        preview_domain = qualified_conversation?.domain || this.fallbackDomain,
        preview_otr_key,
        preview_sha256,
        preview_token,
      } = eventData as AssetData;
      if (preview_otr_key) {
        const remoteDataPreview = preview_key
          ? AssetRemoteData.v3(preview_key, preview_domain, preview_otr_key, preview_sha256, preview_token, true)
          : AssetRemoteData.v2(conversation, preview_id, preview_otr_key, preview_sha256, true);
        (asset as FileAsset).preview_resource(remoteDataPreview);
      }
    }

    if (event.reactions) {
      originalEntity.reactions(userReactionMapToReactionMap(event.reactions));
      originalEntity.version = event.version;
    }

    if (event.failedToSend) {
      originalEntity.failedToSend(event.failedToSend);
    }

    if (event.fileData) {
      originalEntity.fileData(event.fileData);
    }

    if (event.selected_button_id) {
      originalEntity.version = event.version;
    }

    originalEntity.id = id;

    if (originalEntity.isContent() || (originalEntity as Message).isPing()) {
      originalEntity.status(event.status ?? StatusType.SENT);
    }

    originalEntity.replacing_message_id = eventData.replacing_message_id;
    if (editedTime || eventData.edited_time) {
      originalEntity.edited_timestamp(new Date(editedTime || eventData.edited_time).getTime());
    }

    return addMetadata(originalEntity, event);
  }

  /**
   * Convert JSON event into a message entity.
   *
   * @param event Event data
   * @param conversationEntity Conversation entity the event belong to
   * @returns Mapped message entity
   */
  _mapJsonEvent(event: ConversationEvent | ClientConversationEvent, conversationEntity: Conversation) {
    let messageEntity;

    switch (event.type) {
      case CONVERSATION_EVENT.MEMBER_JOIN: {
        /* FIXME: the 'as any' is needed here because we need data that comes from the ServiceMiddleware.
         * We would need to create a super type that represents an event that has been decorated by middlewares...
         */
        messageEntity = this._mapEventMemberJoin(event as any, conversationEntity);
        break;
      }

      case CONVERSATION_EVENT.MEMBER_LEAVE: {
        messageEntity = this._mapEventMemberLeave(event);
        break;
      }

      case CONVERSATION_EVENT.RECEIPT_MODE_UPDATE: {
        messageEntity = this._mapEventReceiptModeUpdate(event);
        break;
      }

      case CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE: {
        messageEntity = this._mapEventMessageTimerUpdate(event);
        break;
      }

      case CONVERSATION_EVENT.RENAME: {
        messageEntity = this._mapEventRename(event);
        break;
      }

      case CONVERSATION_EVENT.PROTOCOL_UPDATE: {
        messageEntity = this._mapEventProtocolUpdate(event);
        break;
      }

      case ClientEvent.CONVERSATION.ASSET_ADD: {
        messageEntity = addMetadata(this._mapEventAssetAdd(event), event);
        break;
      }

      case ClientEvent.CONVERSATION.COMPOSITE_MESSAGE_ADD: {
        const addMessage = this._mapEventCompositeMessageAdd(event);
        messageEntity = addMetadata(addMessage, event);
        break;
      }

      case ClientEvent.CONVERSATION.DELETE_EVERYWHERE: {
        messageEntity = this._mapEventDeleteEverywhere(event);
        break;
      }

      case ClientEvent.CONVERSATION.GROUP_CREATION: {
        messageEntity = this._mapEventGroupCreation(event);
        break;
      }

      case ClientEvent.CONVERSATION.INCOMING_MESSAGE_TOO_BIG:
      case ClientEvent.CONVERSATION.UNABLE_TO_DECRYPT: {
        messageEntity = this._mapEventUnableToDecrypt(event as ErrorEvent);
        break;
      }

      case ClientEvent.CONVERSATION.KNOCK: {
        messageEntity = addMetadata(this._mapEventPing(), event);
        break;
      }

      case ClientEvent.CONVERSATION.CALL_TIME_OUT: {
        messageEntity = this._mapEventCallingTimeout(event);
        break;
      }

      case ClientEvent.CONVERSATION.FAILED_TO_ADD_USERS: {
        messageEntity = this._mapEventFailedToAddUsers(event);
        break;
      }

      case ClientEvent.CONVERSATION.FEDERATION_STOP: {
        messageEntity = this._mapEventFederationStop(event);
        break;
      }

      case ClientEvent.CONVERSATION.LEGAL_HOLD_UPDATE: {
        messageEntity = this._mapEventLegalHoldUpdate(event);
        break;
      }

      case ClientEvent.CONVERSATION.LOCATION: {
        messageEntity = addMetadata(this._mapEventLocation(event), event);
        break;
      }

      case ClientEvent.CONVERSATION.MESSAGE_ADD: {
        const addMessage = this._mapEventMessageAdd(event);
        messageEntity = addMetadata(addMessage, event);
        break;
      }

      case ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD: {
        const addMessage = this._mapEventMultipartAdd(event);
        messageEntity = addMetadata(addMessage, event);
        break;
      }

      case ClientEvent.CONVERSATION.MISSED_MESSAGES: {
        messageEntity = this._mapEventMissedMessages();
        break;
      }

      case ClientEvent.CONVERSATION.JOINED_AFTER_MLS_MIGRATION: {
        messageEntity = this._mapEventJoinedAfterMLSMigrationFinalisation();
        break;
      }

      case ClientEvent.CONVERSATION.MLS_MIGRATION_ONGOING_CALL: {
        messageEntity = this._mapEventMLSMigrationFinalisationOngoingCall();
        break;
      }

      case ClientEvent.CONVERSATION.MLS_CONVERSATION_RECOVERED: {
        messageEntity = this._mapEventMLSConversationRecovered();
        break;
      }

      case ClientEvent.CONVERSATION.ONE2ONE_CREATION: {
        messageEntity = this._mapEvent1to1Creation(event);
        break;
      }

      case ClientEvent.CONVERSATION.ONE2ONE_MIGRATED_TO_MLS: {
        messageEntity = this._mapEventOneToOneMigratedToMls();
        break;
      }

      case ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE: {
        messageEntity = this._mapEventTeamMemberLeave(event);
        break;
      }

      case ClientEvent.CONVERSATION.VERIFICATION: {
        messageEntity = this._mapEventVerification(event);
        break;
      }

      case ClientEvent.CONVERSATION.E2EI_VERIFICATION: {
        messageEntity = this._mapEventE2EIVerificationMessage(event);
        break;
      }

      case ClientEvent.CONVERSATION.VOICE_CHANNEL_ACTIVATE: {
        messageEntity = this._mapEventVoiceChannelActivate();
        break;
      }

      case ClientEvent.CONVERSATION.VOICE_CHANNEL_DEACTIVATE: {
        messageEntity = this._mapEventVoiceChannelDeactivate(event);
        break;
      }

      case ClientEvent.CONVERSATION.FILE_TYPE_RESTRICTED: {
        messageEntity = this._mapFileTypeRestricted(event);
        break;
      }

      default: {
        const {type, id} = event as LegacyEventRecord;
        this.logger.warn(`Ignored unhandled '${type}' event ${id ? `'${id}' ` : ''}`);
        throw new ConversationError(
          ConversationError.TYPE.MESSAGE_NOT_FOUND,
          ConversationError.MESSAGE.MESSAGE_NOT_FOUND,
        );
      }
    }

    const {
      category,
      data,
      from,
      qualified_from,
      id,
      primary_key,
      time,
      type,
      version,
      from_client_id,
      ephemeral_expires,
      ephemeral_started,
    } = event as LegacyEventRecord;

    messageEntity.category = category;
    messageEntity.conversation_id = conversationEntity.id;
    messageEntity.from = from;
    messageEntity.fromDomain = qualified_from?.domain;
    messageEntity.fromClientId = from_client_id;
    messageEntity.id = id;
    messageEntity.primary_key = primary_key;
    messageEntity.timestamp(new Date(time).getTime());
    messageEntity.type = type;
    messageEntity.version = version || 1;

    if (data) {
      messageEntity.legalHoldStatus = data.legal_hold_status;
    }

    if (messageEntity.isContent() || messageEntity.isPing()) {
      messageEntity.status((event as EventRecord).status ?? StatusType.SENT);
    }

    if (messageEntity.isComposite()) {
      const {selected_button_id, waiting_button_id} = event as LegacyEventRecord;
      messageEntity.selectedButtonId(selected_button_id);
      messageEntity.waitingButtonId(waiting_button_id);
    }
    if (messageEntity.isReactable()) {
      (messageEntity as ContentMessage).reactions(
        userReactionMapToReactionMap((event as LegacyEventRecord).reactions ?? {}),
      );
    }

    if (ephemeral_expires) {
      messageEntity.ephemeral_expires(ephemeral_expires);
      messageEntity.ephemeral_started(Number(ephemeral_started) || 0);
    }

    if (isNaN(messageEntity.timestamp())) {
      this.logger.warn(`Could not get timestamp for message '${messageEntity.id}'. Skipping it.`);
      messageEntity = undefined;
    }

    return isContentMessage(messageEntity)
      ? this.updateMessageEvent(messageEntity, event as EventRecord)
      : messageEntity;
  }

  //##############################################################################
  // Event mappers
  //##############################################################################

  /**
   * Maps JSON data of conversation.one2one-creation message into message entity.
   *
   * @param eventData Message data
   * @returns Member message entity
   */
  private _mapEvent1to1Creation({data: eventData}: LegacyEventRecord) {
    const {has_service: hasService, userIds} = eventData;
    const messageEntity = new MemberMessage();
    messageEntity.memberMessageType = SystemMessageType.CONNECTION_ACCEPTED;
    messageEntity.userIds(userIds);

    if (hasService) {
      messageEntity.showServicesWarning = true;
    }

    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.asset_add message into message entity.
   *
   * @param event Message data
   * @returns Content message entity
   */
  private _mapEventAssetAdd(event: LegacyEventRecord) {
    const messageEntity = new ContentMessage();

    const assetEntity = this._mapAsset(event);
    messageEntity.assets.push(assetEntity);

    return messageEntity;
  }

  /**
   * Maps JSON data of delete everywhere event to message entity.
   *
   * @param eventData Message data
   * @returns Delete message entity
   */
  private _mapEventDeleteEverywhere({data: eventData}: LegacyEventRecord) {
    const messageEntity = new DeleteMessage();
    messageEntity.deleted_timestamp = new Date(eventData.deleted_time).getTime();
    return messageEntity;
  }

  /**
   * Map JSON ata of group creation event to message entity.
   *
   * @param eventData Message data
   * @returns Member message entity
   */
  private _mapEventGroupCreation({data: eventData}: LegacyEventRecord) {
    const messageEntity = new MemberMessage();
    messageEntity.memberMessageType = SystemMessageType.CONVERSATION_CREATE;
    messageEntity.name(eventData.name || '');
    messageEntity.userIds(eventData.userIds);
    messageEntity.allTeamMembers = eventData.allTeamMembers;
    return messageEntity;
  }

  _mapEventCallingTimeout({data, time}: LegacyEventRecord) {
    return new CallingTimeoutMessage(data.reason, parseInt(time, 10));
  }

  _mapEventFailedToAddUsers({data, time}: FailedToAddUsersMessageEvent) {
    return new FailedToAddUsersMessage(data, parseInt(time, 10));
  }

  _mapEventFederationStop({data, time}: FederationStopEvent) {
    return new FederationStopMessage(data.domains, parseInt(time, 10));
  }

  _mapEventLegalHoldUpdate({data, timestamp}: LegacyEventRecord) {
    return new LegalHoldMessage(data.legal_hold_status, timestamp);
  }

  /**
   * Maps JSON data of conversation.location message into message entity.
   *
   * @param eventData Message data
   * @returns Location message entity
   */
  private _mapEventLocation({data: eventData}: LegacyEventRecord) {
    const location = eventData.location;
    const messageEntity = new ContentMessage();
    const assetEntity = new Location();

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
   * @param event Message data
   * @param conversationEntity Conversation entity the event belong to
   * @returns Member message entity
   */
  private _mapEventMemberJoin(
    event: MemberJoinEvent & {data?: {has_service?: boolean}},
    conversationEntity: Conversation,
  ) {
    const {data: eventData, from: sender} = event;
    const {has_service: hasService} = eventData;
    const userIds = eventData.qualified_user_ids || eventData.user_ids.map(id => ({domain: '', id}));

    const messageEntity = new MemberMessage();

    const isSingleModeConversation = conversationEntity.is1to1() || conversationEntity.isRequest();
    messageEntity.visible(!isSingleModeConversation);

    if (conversationEntity.isGroupOrChannel()) {
      const messageFromCreator = sender === conversationEntity.creator;
      const creatorIndex = userIds.findIndex(user => user.id === sender);
      const creatorIsJoiningMember = messageFromCreator && creatorIndex !== -1;

      if (creatorIsJoiningMember) {
        userIds.splice(creatorIndex, 1);
        messageEntity.memberMessageType = SystemMessageType.CONVERSATION_CREATE;
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
   * @param eventData Message data
   * @returns Member message entity
   */
  private _mapEventMemberLeave({data: eventData}: MemberLeaveEvent | TeamMemberLeaveEvent) {
    const messageEntity = new MemberMessage();
    const userIds = eventData.qualified_user_ids || eventData.user_ids.map(id => ({domain: '', id}));
    messageEntity.userIds(userIds);
    messageEntity.reason = eventData.reason;
    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.message_add message into message entity.
   *
   * @param event Message data
   * @returns Content message entity
   */
  private _mapEventMessageAdd(event: MessageAddEvent) {
    const {data: eventData, edited_time: editedTime} = event;
    const messageEntity = new ContentMessage();

    const assets = this._mapAssetText(eventData);
    messageEntity.assets.push(assets);
    messageEntity.replacing_message_id = eventData.replacing_message_id;
    if (editedTime) {
      messageEntity.edited_timestamp(new Date(editedTime).getTime());
    }

    if (eventData.quote) {
      const {message_id: messageId, user_id: userId, error} = eventData.quote as any;
      messageEntity.quote(new QuoteEntity({error, messageId, userId}));
    }

    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.message_add message into message entity.
   *
   * @param event Message data
   * @returns Content message entity
   */
  private _mapEventMultipartAdd(event: MultipartMessageAddEvent) {
    const {data: eventData} = event;
    const messageEntity = new ContentMessage();

    const assets = this._mapAssetMultipart(eventData);
    messageEntity.assets.push(assets);

    if (eventData.text?.quote) {
      const {message_id: messageId, user_id: userId, error} = eventData.text.quote as any;
      messageEntity.quote(new QuoteEntity({error, messageId, userId}));
    }

    return messageEntity;
  }

  private _mapAssetMultipart(eventData: MultipartMessageAddEvent['data']) {
    const {text, attachments} = eventData;

    const assetEntity = new Multipart({id: '', text: text?.content || '', attachments});

    const mentions = text?.mentions;

    if (mentions && mentions.length) {
      const mappedMentions = this._mapAssetMentions(mentions, text?.content || '');
      assetEntity.mentions(mappedMentions);
    }

    return assetEntity;
  }

  private _mapEventCompositeMessageAdd(event: CompositeMessageAddEvent) {
    const {data: eventData} = event;
    const messageEntity = new CompositeMessage();
    const assets = eventData.items.flatMap(item => {
      if (item.button) {
        return [new Button(item.button.id, item.button.text)];
      }
      if (item.text) {
        return [this._mapAssetText(item.text)];
      }
      return [];
    });
    messageEntity.assets.push(...assets);
    return messageEntity;
  }

  /**
   * Maps JSON data of local missed message event to message entity.
   */
  private _mapEventMissedMessages(): MissedMessage {
    return new MissedMessage();
  }

  /**
   * Maps JSON data of local missed message event to message entity.
   */
  private _mapEventJoinedAfterMLSMigrationFinalisation(): JoinedAfterMLSMigrationFinalisationMessage {
    return new JoinedAfterMLSMigrationFinalisationMessage();
  }

  /**
   * Maps JSON data of local missed message event to message entity.
   */
  private _mapEventMLSMigrationFinalisationOngoingCall(): MLSMigrationFinalisationOngoingCallMessage {
    return new MLSMigrationFinalisationOngoingCallMessage();
  }

  /**
   * Maps JSON data of local MLS conversation recovered event to message entity.
   */
  private _mapEventMLSConversationRecovered(): MLSConversationRecoveredMessage {
    return new MLSConversationRecoveredMessage();
  }

  /**
   * Maps 1:1 conversation migrated to mls event to message entity.
   */
  private _mapEventOneToOneMigratedToMls(): OneToOneMigratedToMlsMessage {
    return new OneToOneMigratedToMlsMessage();
  }

  /**
   * Maps JSON data of `conversation.knock` message into message entity.
   */
  private _mapEventPing(): PingMessage {
    return new PingMessage();
  }

  /**
   * Maps JSON data of `conversation.protocol-update` message into message entity.
   */
  private _mapEventProtocolUpdate(event: ConversationProtocolUpdateEvent): ProtocolUpdateMessage {
    return new ProtocolUpdateMessage(event.data.protocol);
  }

  /**
   * Maps JSON data of conversation.rename message into message entity.
   *
   * @param eventData Message data
   * @returns Rename message entity
   */
  private _mapEventRename({data: eventData, from, qualified_from}: LegacyEventRecord) {
    return new RenameMessage(eventData.name, from, qualified_from?.domain);
  }

  /**
   * Maps JSON data of conversation.receipt-mode-update message into message entity.
   *
   * @param eventData Message data
   * @returns receipt mode update message entity
   */
  private _mapEventReceiptModeUpdate({data: eventData}: LegacyEventRecord) {
    return new ReceiptModeUpdateMessage(!!eventData.receipt_mode);
  }

  /**
   * Maps JSON data of conversation.message-timer-update message into message entity.
   *
   * @param eventData Message data
   * @returns message timer update message entity
   */
  private _mapEventMessageTimerUpdate({data: eventData}: LegacyEventRecord) {
    return new MessageTimerUpdateMessage(eventData.message_timer);
  }

  /**
   * Maps JSON data of conversation.team_leave message into message entity.
   *
   * @param event Message data
   * @returns Member message entity
   */
  private _mapEventTeamMemberLeave(event: TeamMemberLeaveEvent) {
    const messageEntity = this._mapEventMemberLeave(event);
    const eventData = event.data;
    messageEntity.name(eventData.name || t('conversationSomeone'));
    return messageEntity;
  }

  /**
   * Maps JSON data of local decrypt errors to message entity.
   *
   * @param error_code Error data received as JSON
   * @returns Decrypt error message entity
   */
  private _mapEventUnableToDecrypt({error_code: errorCode, error}: ErrorEvent) {
    const code = typeof errorCode === 'string' ? parseInt(errorCode.split(' ')[0], 10) : errorCode;
    const clientId = error.replace(/\n/g, '').replace(/^.*\(([\w\d]+)\)$/g, '$1');
    return new DecryptErrorMessage(clientId, code);
  }

  /**
   * Maps JSON data of conversation.verification message into message entity.
   *
   * @param eventData Message data
   * @returns Verification message entity
   */
  private _mapEventVerification({data: eventData}: LegacyEventRecord) {
    const messageEntity = new VerificationMessage();
    // Database can contain non-camelCased naming. For backwards compatibility reasons we handle both.
    messageEntity.userIds(eventData.userIds || eventData.user_ids);
    messageEntity.verificationMessageType(eventData.type);

    return messageEntity;
  }

  /**
   * Maps JSON data of E2E Identity verification message event to message entity.
   */
  private _mapEventE2EIVerificationMessage({data: eventData}: E2EIVerificationEvent): MissedMessage {
    return new E2EIVerificationMessage(eventData.type, eventData.userIds);
  }

  /**
   * Maps JSON data of conversation.voice-channel-activate message into message entity.
   * @returns Call message entity
   */
  private _mapEventVoiceChannelActivate() {
    const messageEntity = new CallMessage(CALL_MESSAGE_TYPE.ACTIVATED);
    messageEntity.visible(false);
    return messageEntity;
  }

  /**
   * Maps JSON data of conversation.voice-channel-deactivate message into message entity.
   *
   * @param eventData Message data
   * @returns Call message entity
   */
  private _mapEventVoiceChannelDeactivate({data: eventData}: LegacyEventRecord) {
    const messageEntity = new CallMessage(CALL_MESSAGE_TYPE.DEACTIVATED, eventData.reason, eventData.duration);

    if (typeof eventData.duration !== 'undefined') {
      // new message format, including duration
      messageEntity.visible(!messageEntity.wasCompleted());
    } else {
      // legacy format that we still need to map (no migration)
      messageEntity.visible(messageEntity.finished_reason === TERMINATION_REASON.MISSED);
    }

    return messageEntity;
  }

  //##############################################################################
  // Asset mappers
  //##############################################################################

  _mapAsset(event: LegacyEventRecord) {
    const eventData = event.data;
    const category = event.category;
    const isFile = category === MessageCategory.FILE;
    const mimeType = eventData.content_type;
    const isImage = mimeType && mimeType.startsWith('image/');
    return isImage && !isFile ? this._mapAssetImage(event) : this._mapAssetFile(event);
  }

  /**
   * Maps JSON data of file asset into asset entity.
   *
   * @param event Asset data received as JSON
   * @returns FileAsset entity
   */
  private _mapAssetFile(event: LegacyEventRecord) {
    const {conversation: conversationId, qualified_conversation, data: eventData} = event;
    const {content_length, content_type, id, info, meta, status} = eventData;

    const assetEntity = new FileAsset(id);

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
    const {key, otr_key, sha256, token, domain = qualified_conversation?.domain} = eventData as AssetData;
    const remoteData = key
      ? AssetRemoteData.v3(key, domain, otr_key, sha256, token)
      : AssetRemoteData.v2(conversationId, id, otr_key, sha256);
    assetEntity.original_resource(remoteData);

    // Remote data - preview
    const {
      preview_id,
      preview_key,
      preview_domain = qualified_conversation?.domain || this.fallbackDomain,
      preview_otr_key,
      preview_sha256,
      preview_token,
    } = eventData as AssetData;
    if (preview_otr_key) {
      const remoteDataPreview =
        key && preview_key
          ? AssetRemoteData.v3(preview_key, preview_domain, preview_otr_key, preview_sha256, preview_token, true)
          : AssetRemoteData.v2(conversationId, preview_id, preview_otr_key, preview_sha256, true);
      assetEntity.preview_resource(remoteDataPreview);
    }

    assetEntity.status(status || AssetTransferState.UPLOAD_PENDING);

    return assetEntity;
  }

  /**
   * Maps JSON data of medium image asset into asset entity.
   *
   * @param event Asset data received as JSON
   * @returns Medium image asset entity
   */
  private _mapAssetImage(event: LegacyEventRecord<AssetData>) {
    const {data: eventData, conversation: conversationId, qualified_conversation} = event;
    const {content_length, content_type, id: assetId, info} = eventData;
    const assetEntity = new MediumImage(assetId);
    assetEntity.file_size = content_length;
    assetEntity.file_type = content_type;

    if (info) {
      assetEntity.width = `${info.width}px`;
      assetEntity.height = `${info.height}px`;
    }

    const {key, otr_key, sha256, token, domain = qualified_conversation?.domain || this.fallbackDomain} = eventData;

    if (!otr_key || !sha256) {
      return assetEntity;
    }
    const remoteData = key
      ? AssetRemoteData.v3(key, domain, otr_key, sha256, token, true)
      : AssetRemoteData.v2(conversationId, assetId, otr_key, sha256, true);

    assetEntity.resource(remoteData);
    return assetEntity;
  }

  /**
   * Map link preview from proto message.
   *
   * @param linkPreview Link preview proto message
   * @returns Mapped link preview
   */
  private _mapAssetLinkPreview(linkPreview: LinkPreview): LinkPreviewEntity | void {
    if (linkPreview) {
      const {image, title, url, tweet} = linkPreview;
      const {image: article_image, title: article_title} = linkPreview.article || {};

      const linkPreviewData: LinkPreviewData = {
        title: title || article_title || '',
        tweet: tweet ?? undefined,
        url: url,
      };
      const previewImage = image || article_image;
      if (previewImage && previewImage.uploaded) {
        const {assetId: assetKey, assetToken, assetDomain} = previewImage.uploaded;

        if (assetKey) {
          let {otrKey, sha256} = previewImage.uploaded;

          otrKey = new Uint8Array(otrKey);
          sha256 = new Uint8Array(sha256);

          const remoteData = AssetRemoteData.v3(
            assetKey,
            assetDomain || this.fallbackDomain,
            otrKey,
            sha256,
            assetToken,
            true,
          );
          linkPreviewData.image = remoteData;
        }
      }

      return new LinkPreviewEntity(linkPreviewData);
    }
  }

  /**
   * Map link previews from proto messages.
   *
   * @param linkPreviews Link previews as base64 encoded proto messages
   * @returns Array of mapped link previews
   */
  private _mapAssetLinkPreviews(linkPreviews: string[]) {
    const encodedLinkPreviews = linkPreviews.map(base64 => base64ToArray(base64));
    return encodedLinkPreviews
      .map(encodedLinkPreview => LinkPreview.decode(encodedLinkPreview))
      .map(linkPreview => this._mapAssetLinkPreview(linkPreview))
      .filter(linkPreviewEntity => linkPreviewEntity);
  }

  /**
   * Map mentions from proto messages.
   *
   * @param mentions Mentions as base64 encoded proto messages
   * @param messageText Text of message
   * @returns Array of mapped mentions
   */
  private _mapAssetMentions(mentions: string[], messageText: string) {
    const encodedMentions = mentions.map(base64 => base64ToArray(base64));
    return encodedMentions
      .map(encodedMention => {
        const protoMention = Mention.decode(encodedMention);
        return new MentionEntity(
          protoMention.start,
          protoMention.length,
          protoMention.qualifiedUserId?.id || protoMention.userId,
          protoMention.qualifiedUserId?.domain,
        );
      })
      .filter((mentionEntity, _, allMentions): boolean | void => {
        if (mentionEntity) {
          try {
            return mentionEntity.validate(messageText, allMentions);
          } catch (error) {
            this.logger.warn(`Removed invalid mention when mapping message: ${error.message}`);
            return false;
          }
        }
      });
  }

  /**
   * Maps JSON data of text asset into asset entity.
   *
   * @param eventData Asset data received as JSON
   * @returns Text asset entity
   */
  private _mapAssetText(eventData: MessageAddEvent['data']) {
    const {id, content, mentions, message, previews} = eventData;
    const messageText = content || message;
    const assetEntity = new Text(id, messageText);

    if (mentions && mentions.length) {
      const mappedMentions = this._mapAssetMentions(mentions, messageText);
      assetEntity.mentions(mappedMentions);
    }
    if (previews && previews.length) {
      const mappedLinkPreviews = this._mapAssetLinkPreviews(previews) as unknown as LinkPreviewEntity[];
      assetEntity.previews(mappedLinkPreviews);
    }

    return assetEntity;
  }

  _mapFileTypeRestricted(event: LegacyEventRecord) {
    const {
      data: {isIncoming, name, fileExt},
      time,
    } = event;
    return new FileTypeRestrictedMessage(isIncoming, name, fileExt, +time);
  }
}

// TODO: Method is probably being used for data from backend & database. If yes, it should be split up (Single-responsibility principle).
function addMetadata<T extends Message>(entity: T, event: LegacyEventRecord): T {
  const {data: eventData, read_receipts} = event;
  if (eventData) {
    entity.expectsReadConfirmation = eventData.expects_read_confirmation;
    entity.legalHoldStatus = eventData.legal_hold_status;
  }
  entity.readReceipts(read_receipts || []);
  return entity;
}
