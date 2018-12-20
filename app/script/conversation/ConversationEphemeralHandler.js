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

window.z = window.z || {};
window.z.conversation = z.conversation || {};

z.conversation.ConversationEphemeralHandler = class ConversationEphemeralHandler extends z.conversation
  .AbstractConversationEventHandler {
  static get CONFIG() {
    return {
      INTERVAL_TIME: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND * 0.25,
      TIMER_RANGE: {
        MAX: z.util.TimeUtil.UNITS_IN_MILLIS.YEAR,
        MIN: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND,
      },
    };
  }

  static validateTimer(messageTimer) {
    const TIMER_RANGE = ConversationEphemeralHandler.CONFIG.TIMER_RANGE;
    const isTimerReset = messageTimer === null;

    return isTimerReset ? messageTimer : z.util.NumberUtil.clamp(messageTimer, TIMER_RANGE.MIN, TIMER_RANGE.MAX);
  }

  constructor(conversationMapper, eventService, eventListeners) {
    super();

    const defaultEventListeners = {onMessageTimeout: z.util.noop};
    this.eventListeners = Object.assign({}, defaultEventListeners, eventListeners);
    this.eventService = eventService;

    this.setEventHandlingConfig({
      [z.event.Backend.CONVERSATION.MESSAGE_TIMER_UPDATE]: this._updateEphemeralTimer.bind(this),
    });

    this.checkMessageTimer = this.checkMessageTimer.bind(this);

    this.conversationMapper = conversationMapper;
    this.logger = new z.util.Logger('z.conversation.ConversationEphemeralHandler', z.config.LOGGER.OPTIONS);

    this.timedMessages = ko.observableArray([]);

    let updateIntervalId = null;
    this.timedMessages.subscribe(messageEntities => {
      const shouldClearInterval = !messageEntities.length && updateIntervalId;
      if (shouldClearInterval) {
        window.clearInterval(updateIntervalId);
        updateIntervalId = null;
        return this.logger.info('Cleared ephemeral message check interval');
      }

      const shouldSetInterval = messageEntities.length && !updateIntervalId;
      if (shouldSetInterval) {
        const INTERVAL_TIME = ConversationEphemeralHandler.CONFIG.INTERVAL_TIME;
        updateIntervalId = window.setInterval(() => this._updateTimedMessages(), INTERVAL_TIME);
        this.logger.info('Started ephemeral message check interval');
      }
    });
  }

  /**
   * Check the remaining lifetime for a given ephemeral message.
   *
   * @param {Message} messageEntity - Message to check
   * @param {number} timeOffset - Approximate time different to backend in milliseconds
   * @returns {undefined} No return value
   */
  checkMessageTimer(messageEntity, timeOffset) {
    const hasHitBackend = messageEntity.status() > z.message.StatusType.SENDING;
    if (!hasHitBackend) {
      return;
    }

    switch (messageEntity.ephemeral_status()) {
      case z.message.EphemeralStatusType.TIMED_OUT: {
        this._timeoutEphemeralMessage(messageEntity);
        break;
      }

      case z.message.EphemeralStatusType.ACTIVE: {
        messageEntity.startMessageTimer(timeOffset);
        break;
      }

      case z.message.EphemeralStatusType.INACTIVE: {
        messageEntity.startMessageTimer(timeOffset);

        const changes = {
          ephemeral_expires: messageEntity.ephemeral_expires(),
          ephemeral_started: messageEntity.ephemeral_started(),
        };

        this.eventService.updateEvent(messageEntity.primary_key, changes);
        break;
      }

      default:
        this.logger.info(this.logger.levels.OFF, `Non-ephemeral message of type: ${messageEntity.type}`);
    }
  }

  validateMessage(messageEntity) {
    const isEphemeralMessage = messageEntity.ephemeral_status() !== z.message.EphemeralStatusType.NONE;
    if (!isEphemeralMessage) {
      return messageEntity;
    }

    const isExpired = !!this._updateTimedMessage(messageEntity);
    if (!isExpired) {
      const {id, conversation_id: conversationId} = messageEntity;
      const matchingMessageEntity = this.timedMessages().find(timedMessageEntity => {
        const {conversation_id: timedConversationId, id: timedMessageId} = timedMessageEntity;
        return timedMessageId === id && timedConversationId === conversationId;
      });

      if (matchingMessageEntity) {
        this.timedMessages.replace(matchingMessageEntity, messageEntity);
      } else {
        this.timedMessages.push(messageEntity);
      }

      return messageEntity;
    }
  }

  validateMessages(messageEntities) {
    return messageEntities
      .map(messageEntity => this.validateMessage(messageEntity))
      .filter(messageEntity => messageEntity);
  }

  _obfuscateAssetMessage(messageEntity) {
    messageEntity.ephemeral_expires(true);

    const assetEntity = messageEntity.get_first_asset();
    const changes = {
      data: {
        content_type: assetEntity.file_type,
        meta: {},
      },
      ephemeral_expires: true,
    };

    this.eventService.updateEvent(messageEntity.primary_key, changes);
    this.logger.info(`Obfuscated asset message '${messageEntity.id}'`);
  }

  _obfuscateImageMessage(messageEntity) {
    messageEntity.ephemeral_expires(true);

    const assetEntity = messageEntity.get_first_asset();
    const changes = {
      data: {
        info: {
          height: assetEntity.height,
          tag: 'medium',
          width: assetEntity.width,
        },
      },
      ephemeral_expires: true,
    };

    this.eventService.updateEvent(messageEntity.primary_key, changes);
    this.logger.info(`Obfuscated image message '${messageEntity.id}'`);
  }

  _obfuscateMessage(messageEntity) {
    if (messageEntity.has_asset_text()) {
      this._obfuscateTextMessage(messageEntity);
    } else if (messageEntity.has_asset()) {
      this._obfuscateAssetMessage(messageEntity);
    } else if (messageEntity.has_asset_image()) {
      this._obfuscateImageMessage(messageEntity);
    } else {
      this.logger.warn(`Ephemeral message of unsupported type: ${messageEntity.type}`, messageEntity);
    }
  }

  _obfuscateTextMessage(messageEntity) {
    messageEntity.ephemeral_expires(true);

    const assetEntity = messageEntity.get_first_asset();
    const obfuscatedAsset = new z.entity.Text(messageEntity.id);
    const obfuscatedPreviews = assetEntity.previews().map(linkPreview => {
      linkPreview.obfuscate();
      const protoArticle = new z.proto.Article(linkPreview.url, linkPreview.title); // deprecated format
      return new z.proto.LinkPreview(linkPreview.url, 0, protoArticle, linkPreview.url, linkPreview.title).encode64();
    });

    obfuscatedAsset.text = z.util.StringUtil.obfuscate(assetEntity.text);
    obfuscatedAsset.previews(assetEntity.previews());

    messageEntity.assets([obfuscatedAsset]);
    const changes = {
      data: {
        content: obfuscatedAsset.text,
        previews: obfuscatedPreviews,
      },
      ephemeral_expires: true,
    };

    this.eventService.updateEvent(messageEntity.primary_key, changes);
    this.logger.info(`Obfuscated text message '${messageEntity.id}'`);
  }

  _timeoutEphemeralMessage(messageEntity) {
    if (!messageEntity.is_expired()) {
      if (messageEntity.user().is_me) {
        this._obfuscateMessage(messageEntity);
      }

      this.eventListeners.onMessageTimeout(messageEntity);
    }
  }

  /**
   * Updates the ephemeral timer of a conversation when an timer-update message is received.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation entity which message timer was changed
   * @param {Object} eventJson - JSON data of 'conversation.message-timer-update' event
   * @returns {Promise} Resolves when the event was handled
   */
  _updateEphemeralTimer(conversationEntity, eventJson) {
    const updates = {globalMessageTimer: ConversationEphemeralHandler.validateTimer(eventJson.data.message_timer)};
    this.conversationMapper.updateProperties(conversationEntity, updates);
    return Promise.resolve(conversationEntity);
  }

  _updateTimedMessage(messageEntity) {
    if (_.isString(messageEntity.ephemeral_expires())) {
      const remainingTime = Math.max(0, messageEntity.ephemeral_expires() - Date.now());
      messageEntity.ephemeral_remaining(remainingTime);

      const isExpired = remainingTime === 0;
      if (isExpired) {
        this._timeoutEphemeralMessage(messageEntity);
        return messageEntity;
      }
    }
  }

  _updateTimedMessages() {
    const expiredMessages = this.timedMessages()
      .map(messageEntity => this._updateTimedMessage(messageEntity))
      .filter(messageEntity => messageEntity);

    if (expiredMessages.length) {
      this.timedMessages.remove(messageEntity => {
        for (const expiredMessage of expiredMessages) {
          const {conversation_id: conversationId, id: messageId} = expiredMessage;
          const isExpiredMessage = messageEntity.id === messageId && messageEntity.conversation_id === conversationId;
          if (isExpiredMessage) {
            return true;
          }
        }

        return false;
      });
    }
  }
};
