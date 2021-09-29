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

import {CONVERSATION_EVENT} from '@wireapp/api-client/src/event/';
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
  ImageAsset,
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
} from '@wireapp/protocol-messaging';

import {getLogger, Logger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {base64ToArray, arrayToBase64, createRandomUuid} from 'Util/util';

import {decryptAesAsset} from '../assets/AssetCrypto';
import {AssetTransferState} from '../assets/AssetTransferState';

import {ClientEvent, CONVERSATION} from '../event/Client';
import {StatusType} from '../message/StatusType';
import {PROTO_MESSAGE_TYPE} from '../cryptography/ProtoMessageType';
import {GENERIC_MESSAGE_TYPE} from '../cryptography/GenericMessageType';
import {ConversationEphemeralHandler} from '../conversation/ConversationEphemeralHandler';
import {CryptographyError} from '../error/CryptographyError';
import {EventRecord} from '../storage';

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
  info: {
    height?: number;
    name?: string;
    tag?: string;
    width?: number;
  };
  key?: string;
  meta?: MappedAssetMetaData;
  otr_key?: Uint8Array;
  preview_key?: string;
  preview_otr_key?: Uint8Array;
  preview_sha256?: Uint8Array;
  preview_token?: string;
  reason?: Asset.NotUploaded | AssetTransferState;
  sha256?: Uint8Array;
  status?: AssetTransferState;
  token?: string;
}
type ConversationEvent = Omit<EventRecord, 'id'>;

export class CryptographyMapper {
  private readonly logger: Logger;

  static get CONFIG() {
    return {
      MAX_MENTIONS_PER_MESSAGE: 500,
    };
  }

  constructor() {
    this.logger = getLogger('CryptographyMapper');
  }

  /**
   * Maps a generic message into an event in JSON.
   *
   * @param genericMessage Received ProtoBuffer message
   * @param event Event of `CONVERSATION_EVENT.OTR-ASSET-ADD` or `CONVERSATION_EVENT.OTR-MESSAGE-ADD`
   * @returns Resolves with the mapped event
   */
  async mapGenericMessage(genericMessage: GenericMessage, event: ConversationEvent) {
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

  async _mapGenericMessage(genericMessage: GenericMessage, event: ConversationEvent) {
    let specificContent;

    switch (genericMessage.content) {
      case GENERIC_MESSAGE_TYPE.ASSET: {
        const mappedAsset = this._mapAsset(genericMessage.asset as Asset);
        specificContent = addMetadata(mappedAsset, genericMessage.asset);
        break;
      }

      case GENERIC_MESSAGE_TYPE.AVAILABILITY: {
        specificContent = this._mapAvailability(genericMessage.availability as Availability);
        break;
      }

      case GENERIC_MESSAGE_TYPE.CALLING: {
        specificContent = this._mapCalling(genericMessage.calling as Calling, event.data);
        break;
      }

      case GENERIC_MESSAGE_TYPE.CLEARED: {
        specificContent = this._mapCleared(genericMessage.cleared as Cleared);
        break;
      }

      case GENERIC_MESSAGE_TYPE.CONFIRMATION: {
        specificContent = this._mapConfirmation(genericMessage.confirmation as Confirmation);
        break;
      }

      case GENERIC_MESSAGE_TYPE.DELETED: {
        specificContent = this._mapDeleted(genericMessage.deleted as MessageDelete);
        break;
      }

      case GENERIC_MESSAGE_TYPE.EDITED: {
        specificContent = await this._mapEdited(genericMessage.edited as MessageEdit);
        break;
      }

      case GENERIC_MESSAGE_TYPE.EPHEMERAL: {
        specificContent = await this._mapEphemeral(genericMessage, event);
        break;
      }

      case GENERIC_MESSAGE_TYPE.HIDDEN: {
        specificContent = this._mapHidden(genericMessage.hidden as MessageHide);
        break;
      }

      case GENERIC_MESSAGE_TYPE.IMAGE: {
        const mappedImage = this._mapImage(genericMessage.image as ImageAsset, event.data.id);
        specificContent = addMetadata(mappedImage, genericMessage.image);
        break;
      }

      case GENERIC_MESSAGE_TYPE.KNOCK: {
        const mappedKnock = this._mapKnock();
        specificContent = addMetadata(mappedKnock, genericMessage.knock);
        break;
      }

      case GENERIC_MESSAGE_TYPE.LAST_READ: {
        specificContent = this._mapLastRead(genericMessage.lastRead as LastRead);
        break;
      }

      case GENERIC_MESSAGE_TYPE.LOCATION: {
        const mappedLocation = this._mapLocation(genericMessage.location as Location);
        specificContent = addMetadata(mappedLocation, genericMessage.location);
        break;
      }

      case GENERIC_MESSAGE_TYPE.REACTION: {
        specificContent = this._mapReaction(genericMessage.reaction as Reaction);
        break;
      }

      case GENERIC_MESSAGE_TYPE.TEXT: {
        const mappedText = this._mapText(genericMessage.text as Text);
        specificContent = addMetadata(mappedText, genericMessage.text);
        break;
      }

      case GENERIC_MESSAGE_TYPE.COMPOSITE_MESSAGE: {
        const mappedComposite = await this._mapComposite(genericMessage.composite as Composite);
        specificContent = addMetadata(mappedComposite, genericMessage.composite);
        break;
      }

      case GENERIC_MESSAGE_TYPE.BUTTON_ACTION_CONFIRMATION: {
        specificContent = this._mapButtonActionConfirmation(
          genericMessage.buttonActionConfirmation as ButtonActionConfirmation,
        );
        break;
      }

      case GENERIC_MESSAGE_TYPE.DATA_TRANSFER: {
        specificContent = this._mapDataTransfer(genericMessage.dataTransfer as DataTransfer);
        break;
      }

      default: {
        const logMessage = `Skipped event '${genericMessage.messageId}' of unhandled type '${genericMessage.content}'`;
        this.logger.debug(logMessage, {event, generic_message: genericMessage});
        throw new CryptographyError(CryptographyError.TYPE.UNHANDLED_TYPE, logMessage);
      }
    }

    const genericContent = {
      conversation: event.conversation,
      from: event.from,
      from_client_id: event.data.sender,
      id: genericMessage.messageId,
      status: event.status,
      time: event.time,
    };

    return {...genericContent, ...specificContent};
  }

  async _mapComposite(composite: Composite) {
    const items = await Promise.all(
      composite.items.map(async item => {
        if ((item as Composite.Item).content !== GENERIC_MESSAGE_TYPE.TEXT) {
          return item;
        }

        const {mentions: protoMentions, content} = item.text;

        if (protoMentions && protoMentions.length > CryptographyMapper.CONFIG.MAX_MENTIONS_PER_MESSAGE) {
          this.logger.warn(`Message contains '${protoMentions.length}' mentions exceeding limit`, item.text);
          protoMentions.length = CryptographyMapper.CONFIG.MAX_MENTIONS_PER_MESSAGE;
        }

        const mentions = protoMentions.map(protoMention => arrayToBase64(Mention.encode(protoMention).finish()));

        return {
          text: {
            content,
            mentions,
          },
        };
      }),
    );
    return {
      data: {items},
      type: ClientEvent.CONVERSATION.COMPOSITE_MESSAGE_ADD,
    };
  }

  _mapButtonActionConfirmation(buttonActionConfirmation: ButtonActionConfirmation) {
    return {
      data: {
        buttonId: buttonActionConfirmation.buttonId,
        messageId: buttonActionConfirmation.referenceMessageId,
      },
      type: ClientEvent.CONVERSATION.BUTTON_ACTION_CONFIRMATION,
    };
  }

  _mapAsset(asset: Asset) {
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

  _mapAssetMetaData(original: Asset.IOriginal): MappedAssetMetaData | undefined {
    const audioData = original.audio;
    if (audioData) {
      const loudnessArray = audioData.normalizedLoudness ? audioData.normalizedLoudness.buffer : new ArrayBuffer(0);
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

  _mapAvailability(availability: Availability) {
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

  _mapCalling(calling: Calling, eventData: ConversationEvent & {sender: string}) {
    return {
      content: JSON.parse(calling.content),
      sender: eventData.sender,
      type: ClientEvent.CALL.E_CALL,
    };
  }

  _mapCleared(cleared: Cleared) {
    return {
      data: {
        cleared_timestamp: cleared.clearedTimestamp.toString(),
        conversationId: cleared.conversationId,
      },
      type: CONVERSATION_EVENT.MEMBER_UPDATE,
    };
  }

  _mapConfirmation(confirmation: Confirmation) {
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

  _mapDeleted(deleted: MessageDelete) {
    return {
      data: {
        message_id: deleted.messageId,
      },
      type: ClientEvent.CONVERSATION.MESSAGE_DELETE,
    };
  }

  async _mapEdited(edited: MessageEdit) {
    const mappedMessage = this._mapText(edited.text as Text);
    mappedMessage.data.replacing_message_id = edited.replacingMessageId;
    return mappedMessage;
  }

  async _mapEphemeral(genericMessage: GenericMessage, event: ConversationEvent) {
    const messageTimer = genericMessage.ephemeral[PROTO_MESSAGE_TYPE.EPHEMERAL_EXPIRATION];
    (genericMessage.ephemeral as unknown as GenericMessage).messageId = genericMessage.messageId;

    const embeddedMessage: any = await this._mapGenericMessage(
      genericMessage.ephemeral as unknown as GenericMessage,
      event,
    );
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
  async _unwrapExternal(external: External, event: ConversationEvent) {
    const {otrKey, sha256} = external;
    try {
      const eventData = event.data;
      if (!eventData.data || !otrKey || !sha256) {
        throw new Error('Not all expected properties defined');
      }
      const cipherTextArray = base64ToArray(eventData.data);
      const cipherText = cipherTextArray.buffer;
      const keyBytes = new Uint8Array(otrKey).buffer;
      const referenceSha256 = new Uint8Array(sha256).buffer;
      const externalMessageBuffer = await decryptAesAsset(cipherText, keyBytes, referenceSha256);
      return GenericMessage.decode(new Uint8Array(externalMessageBuffer));
    } catch (error) {
      this.logger.error(`Failed to unwrap external message: ${error.message}`, error);
      throw new CryptographyError(CryptographyError.TYPE.BROKEN_EXTERNAL, CryptographyError.MESSAGE.BROKEN_EXTERNAL);
    }
  }

  _mapHidden(hidden: MessageHide) {
    return {
      data: {
        conversation_id: hidden.conversationId,
        message_id: hidden.messageId,
      },
      type: ClientEvent.CONVERSATION.MESSAGE_HIDDEN,
    };
  }

  _mapImage(image: ImageAsset, eventId: string) {
    const isMediumImage = image.tag === 'medium';
    if (isMediumImage) {
      return this._mapImageMedium(image, eventId);
    }

    this.logger.info(`Skipped event '${eventId}': ${CryptographyError.MESSAGE.IGNORED_PREVIEW}`);
    throw new CryptographyError(CryptographyError.TYPE.IGNORED_PREVIEW, CryptographyError.MESSAGE.IGNORED_PREVIEW);
  }

  _mapImageMedium(image: ImageAsset, eventId: string) {
    // set ID even if asset id is missing
    eventId = eventId || createRandomUuid();

    return {
      data: {
        content_length: image.size,
        content_type: image.mimeType,
        id: eventId,
        info: {
          height: image.height,
          tag: image.tag,
          width: image.width,
        },
        otr_key: new Uint8Array(image.otrKey ? image.otrKey : []),
        sha256: new Uint8Array(image.sha256 ? image.sha256 : []),
      },
      type: ClientEvent.CONVERSATION.ASSET_ADD,
    };
  }

  _mapKnock() {
    return {
      data: {},
      type: ClientEvent.CONVERSATION.KNOCK,
    };
  }

  _mapLastRead(lastRead: LastRead) {
    return {
      data: {
        conversationId: lastRead.conversationId,
        last_read_timestamp: lastRead.lastReadTimestamp.toString(),
      },
      type: CONVERSATION_EVENT.MEMBER_UPDATE,
    };
  }

  _mapDataTransfer(dataTransfer: DataTransfer) {
    return {
      data: {
        trackingIdentifier: dataTransfer.trackingIdentifier.identifier,
      },
      type: ClientEvent.USER.DATA_TRANSFER,
    };
  }

  _mapLocation(location: Location) {
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

  _mapReaction(reaction: Reaction) {
    return {
      data: {
        message_id: reaction.messageId,
        reaction: reaction.emoji,
      },
      type: ClientEvent.CONVERSATION.REACTION,
    };
  }

  _mapText(text: Text): MappedText {
    const {mentions: protoMentions, quote: protoQuote} = text;

    const protoLinkPreviews = text[PROTO_MESSAGE_TYPE.LINK_PREVIEWS];

    if (protoMentions && protoMentions.length > CryptographyMapper.CONFIG.MAX_MENTIONS_PER_MESSAGE) {
      this.logger.warn(`Message contains '${protoMentions.length}' mentions exceeding limit`, text);
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
