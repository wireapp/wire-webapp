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

import {Availability, Confirmation, GenericMessage, LinkPreview, Mention, Quote} from '@wireapp/protocol-messaging';

import Logger from 'utils/Logger';
import TimeUtil from 'utils/TimeUtil';

export default class CryptographyMapper {
  static get CONFIG() {
    return {
      MAX_MENTIONS_PER_MESSAGE: 500,
    };
  }

  // Construct a new CryptographyMapper.
  constructor() {
    this.logger = new Logger('z.cryptography.CryptographyMapper', z.config.LOGGER.OPTIONS);
  }

  /**
   * Maps a generic message into an event in JSON.
   *
   * @param {GenericMessage} genericMessage - Received ProtoBuffer message
   * @param {JSON} event - Event of z.event.Backend.CONVERSATION.OTR-ASSET-ADD or z.event.Backend.CONVERSATION.OTR-MESSAGE-ADD
   * @returns {Promise} Resolves with the mapped event
   */
  mapGenericMessage(genericMessage, event) {
    if (!genericMessage) {
      return Promise.reject(new z.error.CryptographyError(z.error.CryptographyError.TYPE.NO_GENERIC_MESSAGE));
    }

    return Promise.resolve()
      .then(() => (genericMessage.external ? this._unwrapExternal(genericMessage.external, event) : genericMessage))
      .then(unwrappedGenericMessage => this._mapGenericMessage(unwrappedGenericMessage, event));
  }

  _mapGenericMessage(genericMessage, event) {
    let specificContent;

    switch (genericMessage.content) {
      case z.cryptography.GENERIC_MESSAGE_TYPE.ASSET: {
        specificContent = addExpectReadReceiptData(this._mapAsset(genericMessage.asset), genericMessage.asset);
        break;
      }

      case z.cryptography.GENERIC_MESSAGE_TYPE.AVAILABILITY: {
        specificContent = this._mapAvailability(genericMessage.availability);
        break;
      }

      case z.cryptography.GENERIC_MESSAGE_TYPE.CALLING: {
        specificContent = this._mapCalling(genericMessage.calling, event.data);
        break;
      }

      case z.cryptography.GENERIC_MESSAGE_TYPE.CLEARED: {
        specificContent = this._mapCleared(genericMessage.cleared);
        break;
      }

      case z.cryptography.GENERIC_MESSAGE_TYPE.CONFIRMATION: {
        specificContent = this._mapConfirmation(genericMessage.confirmation);
        break;
      }

      case z.cryptography.GENERIC_MESSAGE_TYPE.DELETED: {
        specificContent = this._mapDeleted(genericMessage.deleted);
        break;
      }

      case z.cryptography.GENERIC_MESSAGE_TYPE.EDITED: {
        specificContent = this._mapEdited(genericMessage.edited, genericMessage.messageId);
        break;
      }

      case z.cryptography.GENERIC_MESSAGE_TYPE.EPHEMERAL: {
        specificContent = this._mapEphemeral(genericMessage, event);
        break;
      }

      case z.cryptography.GENERIC_MESSAGE_TYPE.HIDDEN: {
        specificContent = this._mapHidden(genericMessage.hidden);
        break;
      }

      case z.cryptography.GENERIC_MESSAGE_TYPE.IMAGE: {
        specificContent = addExpectReadReceiptData(
          this._mapImage(genericMessage.image, event.data.id),
          genericMessage.image
        );
        break;
      }

      case z.cryptography.GENERIC_MESSAGE_TYPE.KNOCK: {
        specificContent = addExpectReadReceiptData(this._mapKnock(genericMessage.knock), genericMessage.knock);
        break;
      }

      case z.cryptography.GENERIC_MESSAGE_TYPE.LAST_READ: {
        specificContent = this._mapLastRead(genericMessage.lastRead);
        break;
      }

      case z.cryptography.GENERIC_MESSAGE_TYPE.LOCATION: {
        specificContent = addExpectReadReceiptData(this._mapLocation(genericMessage.location), genericMessage.location);
        break;
      }

      case z.cryptography.GENERIC_MESSAGE_TYPE.REACTION: {
        specificContent = this._mapReaction(genericMessage.reaction);
        break;
      }

      case z.cryptography.GENERIC_MESSAGE_TYPE.TEXT: {
        specificContent = addExpectReadReceiptData(this._mapText(genericMessage.text), genericMessage.text);
        break;
      }

      default: {
        const logMessage = `Skipped event '${genericMessage.messageId}' of unhandled type '${genericMessage.content}'`;
        this.logger.debug(logMessage, {event, generic_message: genericMessage});
        throw new z.error.CryptographyError(z.error.CryptographyError.TYPE.UNHANDLED_TYPE);
      }
    }

    const genericContent = {
      conversation: event.conversation,
      from: event.from,
      id: genericMessage.messageId,
      status: event.status,
      time: event.time,
    };

    return Object.assign(genericContent, specificContent);
  }

  _mapAsset(asset) {
    const {original, preview, uploaded, notUploaded} = asset;
    let data = {};

    if (original) {
      data = {
        content_length: original.size,
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

      data = Object.assign(data, {
        preview_key: remote.assetId,
        preview_otr_key: new Uint8Array(remote.otrKey),
        preview_sha256: new Uint8Array(remote.sha256),
        preview_token: remote.assetToken,
      });
    }

    const isImage = original && original.image;
    if (isImage) {
      data.info.tag = 'medium';
    }

    if (asset.hasOwnProperty('uploaded') && uploaded !== null) {
      data = Object.assign(data, {
        key: uploaded.assetId,
        otr_key: new Uint8Array(uploaded.otrKey),
        sha256: new Uint8Array(uploaded.sha256),
        status: z.assets.AssetTransferState.UPLOADED,
        token: uploaded.assetToken,
      });
    } else if (asset.hasOwnProperty('notUploaded') && notUploaded !== null) {
      data = Object.assign(data, {
        reason: notUploaded,
        status: z.assets.AssetTransferState.UPLOAD_FAILED,
      });
    }

    return {data, type: z.event.Client.CONVERSATION.ASSET_ADD};
  }

  _mapAssetMetaData(original) {
    const audioData = original.audio;
    if (audioData) {
      const loudnessArray = audioData.normalizedLoudness ? audioData.normalizedLoudness.buffer : [];
      const durationInSeconds = audioData.durationInMillis
        ? audioData.durationInMillis / TimeUtil.UNITS_IN_MILLIS.SECOND
        : 0;

      return {
        duration: durationInSeconds,
        loudness: new Uint8Array(loudnessArray),
      };
    }
  }

  _mapAvailability(availability) {
    return {
      data: {
        availability: (() => {
          switch (availability.type) {
            case Availability.Type.NONE:
              return z.user.AvailabilityType.NONE;
            case Availability.Type.AVAILABLE:
              return z.user.AvailabilityType.AVAILABLE;
            case Availability.Type.AWAY:
              return z.user.AvailabilityType.AWAY;
            case Availability.Type.BUSY:
              return z.user.AvailabilityType.BUSY;
            default:
              const message = 'Unhandled availability type';
              throw new z.error.CryptographyError(z.error.CryptographyError.TYPE.UNHANDLED_TYPE, message);
          }
        })(),
      },
      type: z.event.Client.USER.AVAILABILITY,
    };
  }

  _mapCalling(calling, eventData) {
    return {
      content: JSON.parse(calling.content),
      sender: eventData.sender,
      type: z.event.Client.CALL.E_CALL,
    };
  }

  _mapCleared(cleared) {
    return {
      data: {
        cleared_timestamp: cleared.clearedTimestamp.toString(),
        conversationId: cleared.conversationId,
      },
      type: z.event.Backend.CONVERSATION.MEMBER_UPDATE,
    };
  }

  _mapConfirmation(confirmation) {
    return {
      data: {
        message_id: confirmation.firstMessageId,
        more_message_ids: confirmation.moreMessageIds || [],
        status: (() => {
          switch (confirmation.type) {
            case Confirmation.Type.DELIVERED:
              return z.message.StatusType.DELIVERED;
            case Confirmation.Type.READ:
              return z.message.StatusType.SEEN;
            default:
              const message = 'Unhandled confirmation type';
              throw new z.error.CryptographyError(z.error.CryptographyError.TYPE.UNHANDLED_TYPE, message);
          }
        })(),
      },
      type: z.event.Client.CONVERSATION.CONFIRMATION,
    };
  }

  _mapDeleted(deleted) {
    return {
      data: {
        message_id: deleted.messageId,
      },
      type: z.event.Client.CONVERSATION.MESSAGE_DELETE,
    };
  }

  _mapEdited(edited, eventId) {
    const mappedMessage = this._mapText(edited.text, eventId);
    mappedMessage.data.replacing_message_id = edited.replacingMessageId;
    return mappedMessage;
  }

  _mapEphemeral(genericMessage, event) {
    const messageTimer = genericMessage.ephemeral[z.cryptography.PROTO_MESSAGE_TYPE.EPHEMERAL_EXPIRATION];
    genericMessage.ephemeral.messageId = genericMessage.messageId;

    const embeddedMessage = this._mapGenericMessage(genericMessage.ephemeral, event);
    embeddedMessage.ephemeral_expires = z.conversation.ConversationEphemeralHandler.validateTimer(messageTimer);

    return embeddedMessage;
  }

  /**
   * Unpacks a specific generic message which is wrapped inside an external generic message.
   *
   * @note Wrapped messages get the 'message_id' of their wrappers (external message)
   * @param {External} external - Generic message of type 'external'
   * @param {JSON} event - Backend event of type 'conversation.otr-message-add'
   * @returns {Promise} Resolves with generic message
   */
  _unwrapExternal(external, event) {
    return Promise.resolve(external)
      .then(({otrKey, sha256}) => {
        const eventData = event.data;

        if (!eventData.data || !otrKey || !sha256) {
          throw new Error('Not all expected properties defined');
        }

        const cipherText = z.util.base64ToArray(eventData.data).buffer;
        const keyBytes = new Uint8Array(otrKey).buffer;
        const referenceSha256 = new Uint8Array(sha256).buffer;

        return z.assets.AssetCrypto.decryptAesAsset(cipherText, keyBytes, referenceSha256);
      })
      .then(externalMessageBuffer => GenericMessage.decode(new Uint8Array(externalMessageBuffer)))
      .catch(error => {
        this.logger.error(`Failed to unwrap external message: ${error.message}`, error);
        throw new z.error.CryptographyError(z.error.CryptographyError.TYPE.BROKEN_EXTERNAL);
      });
  }

  _mapHidden(hidden) {
    return {
      data: {
        conversation_id: hidden.conversationId,
        message_id: hidden.messageId,
      },
      type: z.event.Client.CONVERSATION.MESSAGE_HIDDEN,
    };
  }

  _mapImage(image, eventId) {
    const isMediumImage = image.tag === 'medium';
    if (isMediumImage) {
      return this._mapImageMedium(image, eventId);
    }

    this.logger.info(`Skipped event '${eventId}': ${z.error.CryptographyError.MESSAGE.IGNORED_PREVIEW}`);
    throw new z.error.CryptographyError(z.error.CryptographyError.TYPE.IGNORED_PREVIEW);
  }

  _mapImageMedium(image, eventId) {
    // set ID even if asset id is missing
    eventId = eventId || z.util.createRandomUuid();

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
      type: z.event.Client.CONVERSATION.ASSET_ADD,
    };
  }

  _mapKnock() {
    return {
      data: {},
      type: z.event.Client.CONVERSATION.KNOCK,
    };
  }

  _mapLastRead(lastRead) {
    return {
      data: {
        conversationId: lastRead.conversationId,
        last_read_timestamp: lastRead.lastReadTimestamp.toString(),
      },
      type: z.event.Backend.CONVERSATION.MEMBER_UPDATE,
    };
  }

  _mapLocation(location) {
    return {
      data: {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          zoom: location.zoom,
        },
      },
      type: z.event.Client.CONVERSATION.LOCATION,
    };
  }

  _mapReaction(reaction) {
    return {
      data: {
        message_id: reaction.messageId,
        reaction: reaction.emoji,
      },
      type: z.event.Client.CONVERSATION.REACTION,
    };
  }

  _mapText(text) {
    const {mentions: protoMentions, quote: protoQuote} = text;

    const protoLinkPreviews = text[z.cryptography.PROTO_MESSAGE_TYPE.LINK_PREVIEWS];

    if (protoMentions && protoMentions.length > CryptographyMapper.CONFIG.MAX_MENTIONS_PER_MESSAGE) {
      this.logger.warn(`Message contains '${protoMentions.length}' mentions exceeding limit`, text);
      protoMentions.length = CryptographyMapper.CONFIG.MAX_MENTIONS_PER_MESSAGE;
    }

    return {
      data: {
        content: `${text.content}`,
        mentions: protoMentions.map(protoMention => z.util.arrayToBase64(Mention.encode(protoMention).finish())),
        previews: protoLinkPreviews.map(protoLinkPreview =>
          z.util.arrayToBase64(LinkPreview.encode(protoLinkPreview).finish())
        ),
        quote: protoQuote && z.util.arrayToBase64(Quote.encode(protoQuote).finish()),
      },
      type: z.event.Client.CONVERSATION.MESSAGE_ADD,
    };
  }
}

function addExpectReadReceiptData(mappedEvent, rawEvent) {
  mappedEvent.data = Object.assign({}, mappedEvent.data, {
    expects_read_confirmation: rawEvent.expectsReadConfirmation,
  });
  return mappedEvent;
}
