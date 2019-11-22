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

import {APIClient} from '@wireapp/api-client';
import {ClientType} from '@wireapp/api-client/dist/client/';
import {Account} from '@wireapp/core';
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/dist/conversation/';
import {CRUDEngine} from '@wireapp/store-engine';
import logdown from 'logdown';
import UUID from 'pure-uuid';

import {ConversationEvent, TeamEvent, UserEvent} from '@wireapp/api-client/dist/event';
import {BotConfig, BotCredentials} from './Interfaces';
import {MessageHandler} from './MessageHandler';

const defaultConfig: Required<BotConfig> = {
  backend: 'production',
  clientType: ClientType.TEMPORARY,
  conversations: [],
  owners: [],
};

export class Bot {
  public account?: Account;

  private readonly config: Required<BotConfig>;
  private readonly handlers: Map<string, MessageHandler>;
  private readonly logger: logdown.Logger;

  constructor(private readonly credentials: BotCredentials, config?: BotConfig) {
    this.config = {...defaultConfig, ...config};
    this.credentials = credentials;
    this.handlers = new Map();
    this.logger = logdown('@wireapp/bot-api/Bot', {
      logger: console,
      markdown: false,
    });
  }

  public addHandler(handler: MessageHandler): void {
    this.handlers.set(new UUID(4).format(), handler);
  }

  public removeHandler(key: string): void {
    this.handlers.delete(key);
  }

  private isAllowedConversation(conversationId: string): boolean {
    return this.config.conversations.length === 0 ? true : this.config.conversations.includes(conversationId);
  }

  private isOwner(userId: string): boolean {
    return this.config.owners.length === 0 ? true : this.config.owners.includes(userId);
  }

  public async sendText(conversationId: string, message: string): Promise<void> {
    if (this.account && this.account.service) {
      const textPayload = await this.account.service.conversation.messageBuilder
        .createText(conversationId, message)
        .build();
      await this.account.service.conversation.send(textPayload);
    }
  }

  public async start(storeEngine?: CRUDEngine): Promise<void> {
    const login = {
      clientType: this.config.clientType,
      email: this.credentials.email,
      password: this.credentials.password,
    };

    const apiClient = new APIClient({
      urls: this.config.backend === 'staging' ? APIClient.BACKEND.STAGING : APIClient.BACKEND.PRODUCTION,
    });

    this.account = storeEngine ? new Account(apiClient, () => Promise.resolve(storeEngine)) : new Account(apiClient);

    for (const payloadType of Object.values(PayloadBundleType)) {
      this.account.removeAllListeners(payloadType);
      this.account.on(payloadType as any, this.handlePayload.bind(this));
    }

    await this.account.login(login);
    await this.account.listen();

    this.handlers.forEach(handler => (handler.account = this.account));
  }

  private handlePayload(payload: PayloadBundle | ConversationEvent | UserEvent | TeamEvent): void {
    if ('conversation' in payload && this.validateMessage(payload.conversation, payload.from)) {
      this.handlers.forEach(handler => handler.handleEvent(payload));
    }
  }

  private validateMessage(conversationID: string, userID: string): boolean {
    if (!this.isAllowedConversation(conversationID)) {
      this.logger.info(
        `Skipping message because conversation "${conversationID}" is not in the list of allowed conversations.`,
      );
    }

    if (!this.isOwner(userID)) {
      this.logger.info(`Skipping message because sender "${userID}" is not in the list of owners.`);
    }

    return this.isAllowedConversation(conversationID) && this.isOwner(userID);
  }
}
