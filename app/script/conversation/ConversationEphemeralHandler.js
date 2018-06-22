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

z.conversation.ConversationEphemeralHandler = class ConversationEphemeralHandler {
  static get CONFIG() {
    return {
      INTERVAL_TIME: 250,
    };
  }

  constructor(conversationService, onMessageTimeout) {
    this.conversationService = conversationService;
    this.onMessageTimeout = onMessageTimeout;
    this.logger = new z.util.Logger('z.conversation.ConversationEphemeralHandler', z.config.LOGGER.OPTIONS);

    this.timedMessages = [];
    window.setInterval(this._updateTimedMessages.bind(this), ConversationEphemeralHandler.CONFIG.INTERVAL_TIME);
  }

  _updateTimedMessages() {
    const now = Date.now();
    for (let index = this.timedMessages.length - 1; index >= 0; index--) {
      const messageEntity = this.timedMessages[index];
      if (_.isString(messageEntity.ephemeral_expires())) {
        const remainingTime = messageEntity.ephemeral_expires() - now;
        if (remainingTime > 0) {
          messageEntity.ephemeral_remaining(remainingTime);
        } else {
          this._removeTimedMessage(messageEntity);
        }
      }
    }
  }

  addTimedMessage(messageEntity) {
    if (messageEntity.ephemeral_status === z.message.EphemeralStatusType.NONE) {
      return;
    }
    const isAlreadyAdded = this.timedMessages.some(timedMessage => {
      return timedMessage.id === messageEntity.id && timedMessage.conversation_id === messageEntity.conversation_id;
    });
    if (!isAlreadyAdded) {
      this.timedMessages.push(messageEntity);
      this._updateTimedMessages();
    }
  }

  _removeTimedMessage(messageEntity) {
    const messageIndex = this.timedMessages.indexOf(messageEntity);
    if (messageIndex > -1) {
      amplify.publish(z.event.WebApp.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, messageEntity);
      this._timeoutEphemeralMessage(messageEntity);
      this.timedMessages.splice(messageIndex, 1);
    }
  }

  /**
   * Check the remaining lifetime for a given ephemeral message.
   * @param {Message} messageEntity - Message to check
   * @returns {undefined} No return value
   */
  checkMessageTimer(messageEntity) {
    switch (messageEntity.ephemeral_status()) {
      case z.message.EphemeralStatusType.TIMED_OUT:
        this._timeoutEphemeralMessage(messageEntity);
        break;
      case z.message.EphemeralStatusType.ACTIVE:
        messageEntity.startMessageTimer();
        break;
      case z.message.EphemeralStatusType.INACTIVE:
        messageEntity.startMessageTimer();
        this.conversationService.update_message_in_db(messageEntity, {
          ephemeral_expires: messageEntity.ephemeral_expires(),
          ephemeral_started: messageEntity.ephemeral_started(),
        });
        break;
      default:
        this.logger.warn(`Ephemeral message of unsupported type: ${messageEntity.type}`);
    }
  }

  _timeoutEphemeralMessage(messageEntity) {
    if (!messageEntity.is_expired()) {
      this.onMessageTimeout(messageEntity);
    }
  }

  obfuscateMessage(messageEntity) {
    if (messageEntity.has_asset_text()) {
      this._obfuscateTextMessage(messageEntity);
    } else if (messageEntity.is_ping()) {
      this._obfuscatePingMessage(messageEntity);
    } else if (messageEntity.has_asset()) {
      this._obfuscateAssetMessage(messageEntity);
    } else if (messageEntity.has_asset_image()) {
      this._obfuscateImageMessage(messageEntity);
    } else {
      this.logger.warn(`Ephemeral message of unsupported type: ${messageEntity.type}`);
    }
  }

  _obfuscateAssetMessage(assetEntity) {
    const asset = assetEntity.get_first_asset();
    assetEntity.ephemeral_expires(true);

    this.conversationService.update_message_in_db(assetEntity, {
      data: {
        content_type: asset.file_type,
        meta: {},
      },
      ephemeral_expires: true,
    });
    this.logger.info(`Obfuscated asset message '${assetEntity.id}'`);
  }

  _obfuscateImageMessage(assetEntity) {
    const asset = assetEntity.get_first_asset();
    assetEntity.ephemeral_expires(true);

    this.conversationService.update_message_in_db(assetEntity, {
      data: {
        info: {
          height: asset.height,
          tag: 'medium',
          width: asset.width,
        },
      },
      ephemeral_expires: true,
    });
    this.logger.info(`Obfuscated image message '${assetEntity.id}'`);
  }

  _obfuscateTextMessage(messageEntity) {
    const asset = messageEntity.get_first_asset();
    const obfuscatedAsset = new z.entity.Text(messageEntity.id);
    const obfuscatedPreviews = asset.previews().map(linkPreview => {
      linkPreview.obfuscate();
      const article = new z.proto.Article(linkPreview.url, linkPreview.title); // deprecated format
      return new z.proto.LinkPreview(linkPreview.url, 0, article, linkPreview.url, linkPreview.title).encode64();
    });

    obfuscatedAsset.text = z.util.StringUtil.obfuscate(asset.text);
    obfuscatedAsset.previews(asset.previews());

    messageEntity.assets([obfuscatedAsset]);
    messageEntity.ephemeral_expires(true);

    this.conversationService.update_message_in_db(messageEntity, {
      data: {
        content: obfuscatedAsset.text,
        previews: obfuscatedPreviews,
      },
      ephemeral_expires: true,
    });
    this.logger.info(`Obfuscated text message '${messageEntity.id}'`);
  }

  _obfuscatePingMessage(messageEntity) {
    messageEntity.ephemeral_expires(true);
    this.conversationService.update_message_in_db(messageEntity, {ephemeral_expires: true});
    this.logger.info(`Obfuscated ping message '${messageEntity.id}'`);
  }
};
