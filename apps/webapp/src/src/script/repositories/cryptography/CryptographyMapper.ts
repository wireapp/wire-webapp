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

import {
  ConversationOtrMessageAddEvent,
  ConversationMLSMessageAddEvent,
  CONVERSATION_EVENT,
} from '@wireapp/api-client/lib/event';
import {GenericMessageType} from '@wireapp/core/lib/conversation';
import {MultiPartContent} from '@wireapp/core/lib/conversation/content';
import {container} from 'tsyringe';

import {
  Asset,
  Availability,
  ButtonActionConfirmation,
  Calling,
  Cleared,
  Composite,
  Confirmation,
  DataTransfer,
  External,
  GenericMessage,
  IAsset,
  IImageAsset,
  LastRead,
  LegalHoldStatus,
  LinkPreview,
  Location,
  Mention,
  MessageDelete,
  MessageEdit,
  MessageHide,
  Quote,
  Reaction,
  Text,
  InCallEmoji,
  InCallHandRaise,
  ButtonAction,
} from '@wireapp/protocol-messaging';

import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import {CALL_MESSAGE_TYPE} from 'Repositories/calling/enum/CallMessageType';
import {ConversationEphemeralHandler} from 'Repositories/conversation/ConversationEphemeralHandler';
import {MessageAddEvent} from 'Repositories/conversation/EventBuilder';
import {ClientEvent, CONVERSATION} from 'Repositories/event/Client';
import {getLogger, Logger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {base64ToArray, arrayToBase64} from 'Util/util';

import {PROTO_MESSAGE_TYPE} from './ProtoMessageType';

import {CryptographyError} from '../../error/CryptographyError';
import {StatusType} from '../../message/StatusType';
import {Core} from '../../service/CoreSingleton';

export interface MappedText {
  data: {content: string; mentions: string[]; previews: string[]; quote?: string; replacing_message_id?: string};
  type: CONVERSATION;
}

export interface MappedAssetMetaData {
  duration: number;
  loudness: Uint8Array;
}

export interface MappedAsset {
  data: any;
  type: CONVERSATION;
}

export interface AssetData {
  content_length: number;
  content_type: string;
  domain?: string;
  id?: string;
  info: {
    height?: number;
    name?: string;
    tag?: string;
    width?: number;
  };
  key?: string;
  meta?: MappedAssetMetaData;
  otr_key?: Uint8Array;
  preview_domain?: string;
  preview_id?: string;
  preview_key?: string;
  preview_otr_key?: Uint8Array;
  preview_sha256?: Uint8Array;
  preview_token?: string;
  reason?: Asset.NotUploaded | AssetTransferState;
  sha256?: Uint8Array;
  status?: AssetTransferState;
  token?: string;
}

type EncryptedEvent = ConversationOtrMessageAddEvent | ConversationMLSMessageAddEvent | MessageAddEvent;

export class CryptographyMapper {
  private readonly logger: Logger;

  static get CONFIG() {
    return {
      MAX_MENTIONS_PER_MESSAGE: 500,
    };
  }

  constructor(private readonly core = container.resolve(Core)) {
    this.logger = getLogger('CryptographyMapper');
  }

  /**
   * Maps a generic message into an event in JSON.
   *
   * @param genericMessage Received ProtoBuffer message
   * @param event Event of `CONVERSATION_EVENT.OTR-ASSET-ADD` or `CONVERSATION_EVENT.OTR-MESSAGE-ADD`
   * @returns Resolves with the mapped event
   */
  async mapGenericMessage(genericMessage: GenericMessage, event: EncryptedEvent) {
    if (!genericMessage) {
      throw new CryptographyError(
        CryptographyError.TYPE.NO_GENERIC_MESSAGE,
        CryptographyError.MESSAGE.NO_GENERIC_MESSAGE,
      );
    }

    if (genericMessage.external) {
      genericMessage = await this._unwrapExternal(genericMessage.external as External, event);
    }

    return this._mapGenericMessage(genericMessage, event);
  }

  private _mapGenericMessage(genericMessage: GenericMessage, event: EncryptedEvent) {
    let specificContent;

    switch (genericMessage.content) {
      case GenericMessageType.ASSET: {
        const mappedAsset = this._mapAsset(genericMessage.asset as Asset);
        specificContent = addMetadata(mappedAsset, genericMessage.asset);
        break;
      }

      case GenericMessageType.AVAILABILITY: {
        specificContent = this._mapAvailability(genericMessage.availability as Availability);
        break;
      }

      case GenericMessageType.CALLING: {
        specificContent = this._mapCalling(genericMessage.calling as Calling, event);
        break;
      }

      case GenericMessageType.CLEARED: {
        specificContent = this._mapCleared(genericMessage.cleared as Cleared);
        break;
      }

      case GenericMessageType.CONFIRMATION: {
        specificContent = this._mapConfirmation(genericMessage.confirmation as Confirmation);
        break;
      }

      case GenericMessageType.DELETED: {
        specificContent = this._mapDeleted(genericMessage.deleted as MessageDelete);
        break;
      }

      case GenericMessageType.EDITED: {
        specificContent = this._mapEdited(genericMessage.edited as MessageEdit);
        break;
      }

      case GenericMessageType.EPHEMERAL: {
        specificContent = this._mapEphemeral(genericMessage, event);
        break;
      }

      case GenericMessageType.HIDDEN: {
        specificContent = this._mapHidden(genericMessage.hidden as MessageHide);
        break;
      }

      case GenericMessageType.KNOCK: {
        const mappedKnock = this._mapKnock();
        specificContent = addMetadata(mappedKnock, genericMessage.knock);
        break;
      }

      case GenericMessageType.LAST_READ: {
        specificContent = this._mapLastRead(genericMessage.lastRead as LastRead);
        break;
      }

      case GenericMessageType.LOCATION: {
        const mappedLocation = this._mapLocation(genericMessage.location as Location);
        specificContent = addMetadata(mappedLocation, genericMessage.location);
        break;
      }

      case GenericMessageType.REACTION: {
        specificContent = this._mapReaction(genericMessage.reaction as Reaction);
        break;
      }

      case GenericMessageType.IN_CALL_EMOJI: {
        specificContent = this._mapInCallEmoji(genericMessage.inCallEmoji as InCallEmoji);
        break;
      }

      case GenericMessageType.IN_CALL_HAND_RAISE: {
        specificContent = this._mapInCallHandRaise(genericMessage.inCallHandRaise as InCallHandRaise);
        break;
      }

      case GenericMessageType.TEXT: {
        const mappedText = this._mapText(genericMessage.text as Text);
        specificContent = addMetadata(mappedText, genericMessage.text);
        break;
      }

      case GenericMessageType.COMPOSITE: {
        const mappedComposite = this._mapComposite(genericMessage.composite as Composite);
        specificContent = addMetadata(mappedComposite, genericMessage.composite);
        break;
      }

      case GenericMessageType.BUTTON_ACTION_CONFIRMATION: {
        specificContent = this._mapButtonActionConfirmation(
          genericMessage.buttonActionConfirmation as ButtonActionConfirmation,
        );
        break;
      }

      case GenericMessageType.DATA_TRANSFER: {
        specificContent = this._mapDataTransfer(genericMessage.dataTransfer as DataTransfer);
        break;
      }

      case GenericMessageType.MULTIPART: {
        if (!genericMessage.multipart) {
          const logMessage = `Skipped event '${genericMessage.messageId}' of type '${genericMessage.content}', no data found`;
          this.logger.debug(logMessage, {event, generic_message: genericMessage});
          return undefined;
        }
        specificContent = this._mapMultipart(
          genericMessage.multipart?.text as Text,
          genericMessage.multipart?.attachments,
        );

        break;
      }

      case GenericMessageType.BUTTON_ACTION: {
        specificContent = this._mapButtonAction(genericMessage.buttonAction as ButtonAction);
        break;
      }

      default: {
        const logMessage = `Skipped event '${genericMessage.messageId}' of unhandled type '${genericMessage.content}'`;
        this.logger.debug(logMessage, {event, generic_message: genericMessage});
        return undefined;
      }
    }

    const {conversation, qualified_conversation, from, qualified_from} = event;
    const genericContent = {
      conversation,
      from,
      from_client_id: event.type === CONVERSATION_EVENT.OTR_MESSAGE_ADD ? event.data.sender : undefined,
      id: genericMessage.messageId,
      qualified_conversation,
      qualified_from,
      status: 'status' in event ? event.status : undefined,
      time: event.time,
    };

    return {...genericContent, ...specificContent};
  }

  private _mapComposite(composite: Composite) {
    const items = composite.items.map(item => {
      if ((item as Composite.Item).content !== GenericMessageType.TEXT) {
        return item;
      }

      const {mentions: protoMentions, content} = item.text;

      if (protoMentions && protoMentions.length > CryptographyMapper.CONFIG.MAX_MENTIONS_PER_MESSAGE) {
        this.logger.warn(`Message contains '${protoMentions.length}' mentions exceeding limit`);
        protoMentions.length = CryptographyMapper.CONFIG.MAX_MENTIONS_PER_MESSAGE;
      }

      const mentions = protoMentions.map(protoMention => arrayToBase64(Mention.encode(protoMention).finish()));

      return {
        text: {
          content,
          mentions,
        },
      };
    });

    return {
      data: {items},
      type: ClientEvent.CONVERSATION.COMPOSITE_MESSAGE_ADD,
    };
  }

  private _mapButtonAction(buttonAction: ButtonAction) {
    return {
      type: ClientEvent.CONVERSATION.BUTTON_ACTION,
      data: {
        buttonId: buttonAction.buttonId,
        messageId: buttonAction.referenceMessageId,
      },
    };
  }

  private _mapButtonActionConfirmation(buttonActionConfirmation: ButtonActionConfirmation) {
    return {
      data: {
        buttonId: buttonActionConfirmation.buttonId,
        messageId: buttonActionConfirmation.referenceMessageId,
      },
      type: ClientEvent.CONVERSATION.BUTTON_ACTION_CONFIRMATION,
    };
  }

  private _mapAsset(asset: Asset) {
    const {original, preview, uploaded, notUploaded} = asset;
    let data: AssetData;

    if (original) {
      data = {
        content_length: original.size as number,
        content_type: original.mimeType,
        info: {
          name: original.name || null,
        },
      };

      if (original.image) {
        data.info.height = original.image.height;
        data.info.width = original.image.width;
      } else {
        data.meta = this._mapAssetMetaData(original);
      }
    }

    if (preview) {
      const remote = preview.remote;

      data = {
        ...data,
        preview_domain: remote.assetDomain,
        preview_key: remote.assetId,
        preview_otr_key: new Uint8Array(remote.otrKey),
        preview_sha256: new Uint8Array(remote.sha256),
        preview_token: remote.assetToken,
      };
    }

    const isImage = original && original.image;
    if (isImage) {
      data.info.tag = 'medium';
    }

    if (asset.hasOwnProperty('uploaded') && uploaded !== null) {
      data = {
        ...data,
        domain: uploaded.assetDomain,
        key: uploaded.assetId,
        otr_key: new Uint8Array(uploaded.otrKey),
        sha256: new Uint8Array(uploaded.sha256),
        status: AssetTransferState.UPLOADED,
        token: uploaded.assetToken,
      };
    } else if (asset.hasOwnProperty('notUploaded') && notUploaded !== null) {
      data = {...data, reason: notUploaded, status: AssetTransferState.UPLOAD_FAILED};
    }

    return {data, type: ClientEvent.CONVERSATION.ASSET_ADD};
  }

  private _mapAssetMetaData(original: Asset.IOriginal): MappedAssetMetaData | undefined {
    const audioData = original.audio;
    if (audioData) {
      const loudnessArray = audioData.normalizedLoudness || new ArrayBuffer(0);
      const durationInSeconds = audioData.durationInMillis
        ? Number(audioData.durationInMillis) / TIME_IN_MILLIS.SECOND
        : 0;

      return {
        duration: durationInSeconds,
        loudness: new Uint8Array(loudnessArray),
      };
    }
    return undefined;
  }

  private _mapAvailability(availability: Availability) {
    const knownAvailabilityTypes = [
      Availability.Type.NONE,
      Availability.Type.AVAILABLE,
      Availability.Type.AWAY,
      Availability.Type.BUSY,
    ];

    if (!knownAvailabilityTypes.includes(availability.type)) {
      const message = `Availability type "${availability.type}" is unknown.`;
      throw new CryptographyError(CryptographyError.TYPE.UNHANDLED_TYPE, message);
    }

    return {
      data: {
        availability: availability.type,
      },
      type: ClientEvent.USER.AVAILABILITY,
    };
  }

  private _mapCalling(calling: Calling, event: EncryptedEvent) {
    return {
      content: JSON.parse(calling.content),
      targetConversation: calling.qualifiedConversationId,
      sender: event.type === CONVERSATION_EVENT.OTR_MESSAGE_ADD ? event.data.sender : undefined,
      senderClientId: event.type === CONVERSATION_EVENT.MLS_MESSAGE_ADD ? event.senderClientId : undefined,
      type: ClientEvent.CALL.E_CALL,
    };
  }

  private _mapCleared(cleared: Cleared) {
    return {
      data: {
        cleared_timestamp: cleared.clearedTimestamp.toString(),
        conversationId: cleared.conversationId,
      },
      type: CONVERSATION_EVENT.MEMBER_UPDATE,
    };
  }

  private _mapConfirmation(confirmation: Confirmation) {
    return {
      data: {
        message_id: confirmation.firstMessageId,
        more_message_ids: confirmation.moreMessageIds || [],
        status: (() => {
          switch (confirmation.type) {
            case Confirmation.Type.DELIVERED:
              return StatusType.DELIVERED;
            case Confirmation.Type.READ:
              return StatusType.SEEN;
            default:
              const message = `Confirmation type "${confirmation.type}" is unknown.`;
              throw new CryptographyError(CryptographyError.TYPE.UNHANDLED_TYPE, message);
          }
        })(),
      },
      type: ClientEvent.CONVERSATION.CONFIRMATION,
    };
  }

  private _mapDeleted(deleted: MessageDelete) {
    return {
      data: {
        message_id: deleted.messageId,
      },
      type: ClientEvent.CONVERSATION.MESSAGE_DELETE,
    };
  }

  private _mapEdited(edited: MessageEdit) {
    const mappedMessage = this._mapText(edited.text as Text);
    mappedMessage.data.replacing_message_id = edited.replacingMessageId;
    return mappedMessage;
  }

  private _mapEphemeral(genericMessage: GenericMessage, event: EncryptedEvent) {
    const messageTimer = genericMessage.ephemeral[PROTO_MESSAGE_TYPE.EPHEMERAL_EXPIRATION];
    (genericMessage.ephemeral as unknown as GenericMessage).messageId = genericMessage.messageId;

    const embeddedMessage: any = this._mapGenericMessage(genericMessage.ephemeral as unknown as GenericMessage, event);
    embeddedMessage.ephemeral_expires = ConversationEphemeralHandler.validateTimer(messageTimer as number);

    return embeddedMessage;
  }

  /**
   * Unpacks a specific generic message which is wrapped inside an external generic message.
   *
   * @note Wrapped messages get the 'message_id' of their wrappers (external message)
   * @param external Generic message of type 'external'
   * @param event Backend event of type 'conversation.otr-message-add'
   * @returns Resolves with generic message
   */
  async _unwrapExternal(external: External, event: EncryptedEvent) {
    const {otrKey, sha256} = external;
    try {
      // Only OTR proteus messages can be sent as external, MLS message should throw an error at this point
      const eventData = event.type === CONVERSATION_EVENT.OTR_MESSAGE_ADD ? event.data : undefined;
      if (!eventData?.data || !otrKey || !sha256) {
        throw new Error('Not all expected properties defined');
      }
      const cipherTextArray = base64ToArray(eventData.data);
      const cipherText = cipherTextArray;
      const externalMessageBuffer = await this.core.service!.asset.decryptAsset({
        cipherText,
        keyBytes: otrKey,
        sha256,
      });
      return GenericMessage.decode(new Uint8Array(externalMessageBuffer));
    } catch (error) {
      this.logger.error(`Failed to unwrap external message: ${error.message}`, error);
      throw new CryptographyError(CryptographyError.TYPE.BROKEN_EXTERNAL, CryptographyError.MESSAGE.BROKEN_EXTERNAL);
    }
  }

  private _mapHidden(hidden: MessageHide) {
    return {
      data: {
        conversation_id: hidden.conversationId,
        message_id: hidden.messageId,
      },
      type: ClientEvent.CONVERSATION.MESSAGE_HIDDEN,
    };
  }

  private _mapKnock() {
    return {
      data: {},
      type: ClientEvent.CONVERSATION.KNOCK,
    };
  }

  private _mapLastRead(lastRead: LastRead) {
    return {
      data: {
        conversationId: lastRead.conversationId,
        last_read_timestamp: lastRead.lastReadTimestamp.toString(),
      },
      type: CONVERSATION_EVENT.MEMBER_UPDATE,
    };
  }

  private _mapDataTransfer(dataTransfer: DataTransfer) {
    return {
      data: {
        trackingIdentifier: dataTransfer.trackingIdentifier.identifier,
      },
      type: ClientEvent.USER.DATA_TRANSFER,
    };
  }

  private _mapLocation(location: Location) {
    return {
      data: {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          zoom: location.zoom,
        },
      },
      type: ClientEvent.CONVERSATION.LOCATION,
    };
  }

  private _mapReaction(reaction: Reaction) {
    return {
      data: {
        message_id: reaction.messageId,
        reaction: reaction.emoji,
      },
      type: ClientEvent.CONVERSATION.REACTION,
    };
  }

  private _mapInCallEmoji(emojis: InCallEmoji) {
    return {
      content: {
        emojis: emojis.emojis,
        type: CALL_MESSAGE_TYPE.EMOJIS,
      },
      type: ClientEvent.CALL.IN_CALL_EMOJI,
    };
  }

  private _mapInCallHandRaise(handRaise: InCallHandRaise) {
    return {
      content: {
        isHandUp: handRaise.isHandUp,
        type: CALL_MESSAGE_TYPE.HAND_RAISED,
      },
      type: ClientEvent.CALL.IN_CALL_HAND_RAISE,
    };
  }

  private _mapMultipart(text: Text, attachments: MultiPartContent['attachments']) {
    const mappedText = this._mapText(text);
    return {
      data: {
        text: mappedText.data,
        attachments,
      },
      type: ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD,
    };
  }

  private _mapText(text: Text): MappedText {
    const {mentions: protoMentions, quote: protoQuote} = text;

    const protoLinkPreviews = text[PROTO_MESSAGE_TYPE.LINK_PREVIEWS];

    if (protoMentions && protoMentions.length > CryptographyMapper.CONFIG.MAX_MENTIONS_PER_MESSAGE) {
      this.logger.warn(`Message contains '${protoMentions.length}' mentions exceeding limit`);
      protoMentions.length = CryptographyMapper.CONFIG.MAX_MENTIONS_PER_MESSAGE;
    }

    const mentions = protoMentions.map(protoMention => arrayToBase64(Mention.encode(protoMention).finish()));
    const previews = protoLinkPreviews.map(protoLinkPreview =>
      arrayToBase64(LinkPreview.encode(protoLinkPreview).finish()),
    );

    const mappedText: MappedText = {
      data: {
        content: `${text.content}`,
        mentions,
        previews,
      },
      type: ClientEvent.CONVERSATION.MESSAGE_ADD,
    };

    if (protoQuote) {
      const quote = arrayToBase64(Quote.encode(protoQuote).finish());
      mappedText.data.quote = quote;
    }

    return mappedText;
  }
}

function addMetadata(
  mappedEvent: MappedAsset,
  asset: (IAsset | IImageAsset) & Partial<{expectsReadConfirmation: boolean; legalHoldStatus: LegalHoldStatus}>,
) {
  mappedEvent.data = {
    ...mappedEvent.data,
    expects_read_confirmation: asset.expectsReadConfirmation,
    legal_hold_status: asset.legalHoldStatus,
  };

  return mappedEvent;
}
