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
window.z.cryptography = z.cryptography || {};

z.cryptography.CryptographyMapper = class CryptographyMapper {
  /**
   * Construct a new CryptographyMapper.
   */
  constructor() {
    this.logger = new z.util.Logger('z.cryptography.CryptographyMapper', z.config.LOGGER.OPTIONS);
  }

  /**
   * Maps a generic message into an event in JSON.
   *
   * @param {z.proto.GenericMessage} generic_message - Received ProtoBuffer message
   * @param {JSON} event - Event of z.event.Backend.CONVERSATION.OTR-ASSET-ADD or z.event.Backend.CONVERSATION.OTR-MESSAGE-ADD
   * @returns {Promise} Resolves with the mapped event
   */
  map_generic_message(generic_message, event) {
    if (generic_message === undefined) {
      return Promise.reject(new z.cryptography.CryptographyError(z.cryptography.CryptographyError.TYPE.NO_GENERIC_MESSAGE));
    }
    return Promise.resolve()
      .then(() => generic_message.external ? this._unwrap_external(generic_message.external, event) : generic_message)
      .then((unwrapped_generic_message) => {
        return Promise.all([
          this._map_generic_message(unwrapped_generic_message, event),
          unwrapped_generic_message,
        ]);
      })
      .then(([specific_content, unwrapped_generic_message]) => {
        return Object.assign({
          conversation: event.conversation,
          from: event.from,
          id: unwrapped_generic_message.message_id,
          status: event.status,
          time: event.time,
        }, specific_content);
      });
  }

  _map_generic_message(generic_message, event) {
    switch (generic_message.content) {
      case z.cryptography.GENERIC_MESSAGE_TYPE.ASSET:
        return this._map_asset(generic_message.asset, generic_message.message_id);
      case z.cryptography.GENERIC_MESSAGE_TYPE.CALLING:
        return this._map_calling(generic_message.calling, event.data);
      case z.cryptography.GENERIC_MESSAGE_TYPE.CLEARED:
        return this._map_cleared(generic_message.cleared);
      case z.cryptography.GENERIC_MESSAGE_TYPE.CONFIRMATION:
        return this._map_confirmation(generic_message.confirmation);
      case z.cryptography.GENERIC_MESSAGE_TYPE.DELETED:
        return this._map_deleted(generic_message.deleted);
      case z.cryptography.GENERIC_MESSAGE_TYPE.EDITED:
        return this._map_edited(generic_message.edited, generic_message.message_id);
      case z.cryptography.GENERIC_MESSAGE_TYPE.EPHEMERAL:
        return this._map_ephemeral(generic_message, event);
      case z.cryptography.GENERIC_MESSAGE_TYPE.HIDDEN:
        return this._map_hidden(generic_message.hidden);
      case z.cryptography.GENERIC_MESSAGE_TYPE.IMAGE:
        return this._map_image(generic_message.image, event.data.id);
      case z.cryptography.GENERIC_MESSAGE_TYPE.KNOCK:
        return this._map_knock(generic_message.knock, generic_message.message_id);
      case z.cryptography.GENERIC_MESSAGE_TYPE.LAST_READ:
        return this._map_last_read(generic_message.lastRead);
      case z.cryptography.GENERIC_MESSAGE_TYPE.LOCATION:
        return this._map_location(generic_message.location, generic_message.message_id);
      case z.cryptography.GENERIC_MESSAGE_TYPE.REACTION:
        return this._map_reaction(generic_message.reaction);
      case z.cryptography.GENERIC_MESSAGE_TYPE.TEXT:
        return this._map_text(generic_message.text, generic_message.message_id);
      default:
        this.logger.debug(`Skipped event '${generic_message.message_id}' of unhandled type '${generic_message.content}'`, {event, generic_message});
        throw new z.cryptography.CryptographyError(z.cryptography.CryptographyError.TYPE.UNHANDLED_TYPE);
    }
  }

  _map_calling(calling, event_data) {
    return {
      content: JSON.parse(calling.content),
      sender: event_data.sender,
      type: z.event.Client.CALL.E_CALL,
    };
  }

  _map_asset(asset, event_nonce) {
    const {original, preview, uploaded, not_uploaded} = asset;
    let data = {};

    if (original != null) {
      data = {
        content_length: original.size.toNumber(),
        content_type: original.mime_type,
        info: {
          name: original.name,
          nonce: event_nonce,
        },
      };

      if (original.image) {
        data.info.height = original.image.height;
        data.info.width = original.image.width;
      } else {
        data.meta = this._map_asset_meta_data(original);
      }
    }

    if (preview != null) {
      const {remote} = preview;
      data = Object.assign(data, {
        preview_key: remote.asset_id,
        preview_otr_key: new Uint8Array(remote.otr_key.toArrayBuffer()),
        preview_sha256: new Uint8Array(remote.sha256.toArrayBuffer()),
        preview_token: remote.asset_token,
      });
    }

    const is_image = uploaded && uploaded.asset_id && original && original.image;
    if (is_image) {
      data.info.tag = 'medium';
    }

    if (uploaded != null) {
      data = Object.assign(data, {
        key: uploaded.asset_id,
        otr_key: new Uint8Array(uploaded.otr_key.toArrayBuffer()),
        sha256: new Uint8Array(uploaded.sha256.toArrayBuffer()),
        status: z.assets.AssetTransferState.UPLOADED,
        token: uploaded.asset_token,
      });
    }

    if (not_uploaded != null) {
      data = Object.assign(data, {
        reason: not_uploaded,
        status: z.assets.AssetTransferState.UPLOAD_FAILED,
      });
    }

    return {
      data,
      type: z.event.Client.CONVERSATION.ASSET_ADD,
    };
  }

  _map_asset_meta_data(original) {
    if (original.audio) {
      return {
        duration: original.audio.duration_in_millis.toNumber() / 1000,
        loudness: new Uint8Array(original.audio.normalized_loudness !== null ? original.audio.normalized_loudness.toArrayBuffer() : []),
      };
    }
  }

  _map_cleared(cleared) {
    return {
      conversation: cleared.conversation_id,
      data: {
        cleared_timestamp: cleared.cleared_timestamp.toString(),
      },
      type: z.event.Backend.CONVERSATION.MEMBER_UPDATE,
    };
  }

  _map_confirmation(confirmation) {
    return {
      data: {
        message_id: confirmation.message_id,
        status: (() => {
          switch (confirmation.type) {
            case z.proto.Confirmation.Type.DELIVERED:
              return z.message.StatusType.DELIVERED;
            case z.proto.Confirmation.Type.READ:
              return z.message.StatusType.SEEN;
            default:
              throw new z.cryptography.CryptographyError(z.cryptography.CryptographyError.TYPE.UNHANDLED_TYPE, 'Unhandled confirmation type');
          }
        })(),
      },
      type: z.event.Client.CONVERSATION.CONFIRMATION,
    };
  }

  _map_deleted(deleted) {
    return {
      data: {
        message_id: deleted.message_id,
      },
      type: z.event.Client.CONVERSATION.MESSAGE_DELETE,
    };
  }

  _map_edited(edited, event_id) {
    const mapped = this._map_text(edited.text, event_id);
    mapped.data.replacing_message_id = edited.replacing_message_id;
    return mapped;
  }

  _map_ephemeral(generic_message, event) {
    const millis_as_number = generic_message.ephemeral.expire_after_millis.toNumber();
    generic_message.ephemeral.message_id = generic_message.message_id;
    const embedded_message = this._map_generic_message(generic_message.ephemeral, event);
    embedded_message.ephemeral_expires = z.ephemeral.timings.map_to_closest_timing(millis_as_number);
    return embedded_message;
  }

  /**
   * Unpacks a specific generic message which is wrapped inside an external generic message.
   *
   * @note Wrapped messages get the 'message_id' of their wrappers (external message)
   * @param {z.proto.GenericMessage} external - Generic message of type 'external'
   * @param {JSON} event - Backend event of type 'conversation.otr-message-add'
   * @returns {Promise} Resolves with generic message
   */
  _unwrap_external(external, event) {
    const data = {
      otr_key: new Uint8Array(external.otr_key.toArrayBuffer()),
      sha256: new Uint8Array(external.sha256.toArrayBuffer()),
      text: z.util.base64_to_array(event.data.data),
    };

    return z.assets.AssetCrypto.decrypt_aes_asset(data.text.buffer, data.otr_key.buffer, data.sha256.buffer)
      .then((external_message_buffer) => z.proto.GenericMessage.decode(external_message_buffer))
      .catch((error) => {
        this.logger.error(`Failed to map external message: ${error.message}`, error);
        throw new z.cryptography.CryptographyError(z.cryptography.CryptographyError.TYPE.BROKEN_EXTERNAL);
      });
  }

  _map_hidden(hidden) {
    return {
      data: {
        conversation_id: hidden.conversation_id,
        message_id: hidden.message_id,
      },
      type: z.event.Client.CONVERSATION.MESSAGE_HIDDEN,
    };
  }

  _map_image(image, event_id) {
    if (image.tag === 'medium') {
      return this._map_image_medium(image, event_id);
    }
    const error = new z.cryptography.CryptographyError(z.cryptography.CryptographyError.TYPE.IGNORED_PREVIEW);
    this.logger.info(`Skipped event '${event_id}': ${error.message}`);
    throw error;
  }

  _map_image_medium(image, event_id) {
    event_id = event_id || z.util.create_random_uuid();
    return {
      data: {
        content_length: image.size,
        content_type: image.mime_type,
        id: event_id,
        info: {
          height: image.height,
          nonce: event_id || z.util.create_random_uuid(), // set nonce even if asset id is missing
          tag: image.tag,
          width: image.width,
        },
        otr_key: new Uint8Array(image.otr_key !== null ? image.otr_key.toArrayBuffer() : []),
        sha256: new Uint8Array(image.sha256 !== null ? image.sha256.toArrayBuffer() : []),
      },
      type: z.event.Client.CONVERSATION.ASSET_ADD,
    };
  }

  _map_knock(knock, event_id) {
    return {
      data: {
        nonce: event_id,
      },
      type: z.event.Client.CONVERSATION.KNOCK,
    };
  }

  _map_last_read(last_read) {
    return {
      conversation: last_read.conversation_id,
      data: {
        last_read_timestamp: last_read.last_read_timestamp.toString(),
      },
      type: z.event.Backend.CONVERSATION.MEMBER_UPDATE,
    };
  }

  _map_location(location, event_id) {
    return {
      data: {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          zoom: location.zoom,
        },
        nonce: event_id,
      },
      type: z.event.Client.CONVERSATION.LOCATION,
    };
  }

  _map_reaction(reaction) {
    return {
      data: {
        message_id: reaction.message_id,
        reaction: reaction.emoji,
      },
      type: z.event.Client.CONVERSATION.REACTION,
    };
  }

  _map_text(text, event_id) {
    return {
      data: {
        content: `${text.content}`,
        nonce: event_id,
        previews: text.link_preview.map((preview) => preview.encode64()),
      },
      type: z.event.Client.CONVERSATION.MESSAGE_ADD,
    };
  }
};
