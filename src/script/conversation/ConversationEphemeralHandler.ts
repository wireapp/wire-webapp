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

import ko from 'knockout';
import {Article, LinkPreview} from '@wireapp/protocol-messaging';
import type {ConversationMessageTimerUpdateEvent} from '@wireapp/api-client/src/event';
import {CONVERSATION_EVENT} from '@wireapp/api-client/src/event';

import {Logger, getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {clamp} from 'Util/NumberUtil';
import {arrayToBase64, noop} from 'Util/util';
import {obfuscate} from 'Util/StringUtil';

import {EphemeralStatusType} from '../message/EphemeralStatusType';
import {StatusType} from '../message/StatusType';
import {Text} from '../entity/message/Text';
import {AbstractConversationEventHandler} from './AbstractConversationEventHandler';
import type {EventService} from '../event/EventService';
import type {ConversationMapper} from './ConversationMapper';
import type {Message} from '../entity/message/Message';
import type {ContentMessage} from '../entity/message/ContentMessage';
import type {Conversation} from '../entity/Conversation';

export class ConversationEphemeralHandler extends AbstractConversationEventHandler {
  eventListeners: Record<string, (...args: any[]) => void>;
  eventService: EventService;
  conversationMapper: ConversationMapper;
  logger: Logger;
  timedMessages: ko.ObservableArray<ContentMessage>;
  timedMessagesSubscription: ko.Subscription;

  static get CONFIG() {
    return {
      INTERVAL_TIME: TIME_IN_MILLIS.SECOND * 0.25,
      TIMER_RANGE: {
        MAX: TIME_IN_MILLIS.YEAR,
        MIN: TIME_IN_MILLIS.SECOND,
      },
    };
  }

  static validateTimer(messageTimer: number | null): number {
    const TIMER_RANGE = ConversationEphemeralHandler.CONFIG.TIMER_RANGE;
    const isTimerReset = messageTimer === null;

    return isTimerReset ? messageTimer : clamp(messageTimer, TIMER_RANGE.MIN, TIMER_RANGE.MAX);
  }

  constructor(
    conversationMapper: ConversationMapper,
    eventService: EventService,
    eventListeners: Record<string, (...args: any[]) => void>,
  ) {
    super();

    const defaultEventListeners = {onMessageTimeout: noop};
    this.eventListeners = {...defaultEventListeners, ...eventListeners};
    this.eventService = eventService;

    this.setEventHandlingConfig({
      [CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE]: this._updateEphemeralTimer.bind(this),
    });

    this.checkMessageTimer = this.checkMessageTimer.bind(this);

    this.conversationMapper = conversationMapper;
    this.logger = getLogger('ConversationEphemeralHandler');

    this.timedMessages = ko.observableArray([]);

    let updateIntervalId: number | null = null;

    this.timedMessagesSubscription = this.timedMessages.subscribe(messageEntities => {
      const shouldClearInterval = messageEntities.length === 0 && updateIntervalId;
      if (shouldClearInterval) {
        window.clearInterval(updateIntervalId);
        updateIntervalId = null;
        return this.logger.info('Cleared ephemeral message check interval');
      }

      const shouldSetInterval = messageEntities.length !== 0 && !updateIntervalId;
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
   * @param messageEntity Message to check
   * @param timeOffset Approximate time different to backend in milliseconds
   */
  async checkMessageTimer(messageEntity: ContentMessage, timeOffset: number): Promise<void> {
    const hasHitBackend = messageEntity.status() > StatusType.SENDING;
    if (!hasHitBackend) {
      return;
    }

    switch (messageEntity.ephemeral_status()) {
      case EphemeralStatusType.TIMED_OUT: {
        await this._timeoutEphemeralMessage(messageEntity);
        break;
      }

      case EphemeralStatusType.ACTIVE: {
        messageEntity.startMessageTimer(timeOffset);
        break;
      }

      case EphemeralStatusType.INACTIVE: {
        messageEntity.startMessageTimer(timeOffset);

        const changes = {
          ephemeral_expires: messageEntity.ephemeral_expires(),
          ephemeral_started: Number(messageEntity.ephemeral_started()),
        };

        this.eventService.updateEvent(messageEntity.primary_key, changes);
        break;
      }
    }
  }

  async validateMessage(messageEntity: ContentMessage): Promise<Message | void> {
    const isEphemeralMessage = messageEntity.ephemeral_status() !== EphemeralStatusType.NONE;
    if (!isEphemeralMessage) {
      return messageEntity;
    }

    const isExpired = !!(await this._updateTimedMessage(messageEntity));
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

  async validateMessages(messageEntities: ContentMessage[]): Promise<Message[]> {
    const validatedMessages = await Promise.all(
      messageEntities.map(messageEntity => this.validateMessage(messageEntity)),
    );
    return validatedMessages.filter(messageEntity => !!messageEntity) as Message[];
  }

  private _obfuscateAssetMessage(messageEntity: ContentMessage) {
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

  private _obfuscateImageMessage(messageEntity: ContentMessage): void {
    messageEntity.ephemeral_expires(true);

    const assetEntity = messageEntity.get_first_asset();
    const changes = {
      data: {
        info: {
          height: (assetEntity as any).size,
          tag: 'medium',
          width: (assetEntity as any).width,
        },
      },
      ephemeral_expires: true,
    };

    this.eventService.updateEvent(messageEntity.primary_key, changes);
    this.logger.info(`Obfuscated image message '${messageEntity.id}'`);
  }

  async _obfuscateMessage(messageEntity: ContentMessage): Promise<void> {
    if (messageEntity.has_asset_text()) {
      await this._obfuscateTextMessage(messageEntity);
    } else if (messageEntity.has_asset()) {
      this._obfuscateAssetMessage(messageEntity);
    } else if (messageEntity.has_asset_image()) {
      this._obfuscateImageMessage(messageEntity);
    } else {
      this.logger.warn(`Ephemeral message of unsupported type: ${messageEntity.type}`, messageEntity);
    }
  }

  async _obfuscateTextMessage(messageEntity: ContentMessage): Promise<void> {
    messageEntity.ephemeral_expires(true);

    const assetEntity = messageEntity.get_first_asset() as Text;
    const obfuscatedAsset = new Text(messageEntity.id);
    const obfuscatedPreviews = await Promise.all(
      assetEntity.previews().map(linkPreview => {
        linkPreview.obfuscate();
        const protoArticle = new Article({permanentUrl: linkPreview.url, title: linkPreview.title}); // deprecated format
        const linkPreviewProto = new LinkPreview({
          article: protoArticle,
          permanentUrl: linkPreview.url,
          title: linkPreview.title,
          url: linkPreview.url,
          urlOffset: 0,
        });
        return arrayToBase64(LinkPreview.encode(linkPreviewProto).finish());
      }),
    );

    obfuscatedAsset.text = obfuscate(assetEntity.text);
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

  async _timeoutEphemeralMessage(messageEntity: ContentMessage): Promise<void> {
    if (!messageEntity.is_expired()) {
      if (messageEntity.user().isMe) {
        await this._obfuscateMessage(messageEntity);
      }

      this.eventListeners.onMessageTimeout(messageEntity);
    }
  }

  /**
   * Updates the ephemeral timer of a conversation when an timer-update message is received.
   *
   * @param conversationEntity Conversation entity which message timer was changed
   * @param eventJson JSON data of 'conversation.message-timer-update' event
   * @returns Resolves when the event was handled
   */
  private _updateEphemeralTimer(
    conversationEntity: Conversation,
    eventJson: ConversationMessageTimerUpdateEvent,
  ): Promise<Conversation> {
    const updates = {globalMessageTimer: ConversationEphemeralHandler.validateTimer(eventJson.data.message_timer)};
    this.conversationMapper.updateProperties(conversationEntity, updates as any);
    return Promise.resolve(conversationEntity);
  }

  async _updateTimedMessage(messageEntity: ContentMessage): Promise<ContentMessage | void> {
    if (typeof messageEntity.ephemeral_expires() === 'string') {
      const remainingTime = Math.max(0, (messageEntity.ephemeral_expires() as number) - Date.now());
      messageEntity.ephemeral_remaining(remainingTime);

      const isExpired = remainingTime === 0;
      if (isExpired) {
        await this._timeoutEphemeralMessage(messageEntity);
        return messageEntity;
      }
    }
  }

  async _updateTimedMessages(): Promise<void> {
    const updatedMessages = await Promise.all(
      this.timedMessages().map(messageEntity => this._updateTimedMessage(messageEntity)),
    );
    const expiredMessages = updatedMessages.filter(messageEntity => !!messageEntity) as ContentMessage[];

    if (expiredMessages.length !== 0) {
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

  dispose(): void {
    this.timedMessagesSubscription.dispose();
  }
}
