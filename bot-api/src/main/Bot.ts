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
import {ClientType} from '@wireapp/api-client/dist/commonjs/client/';
import {Account} from '@wireapp/core';
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/dist/conversation/';
import {MemoryEngine} from '@wireapp/store-engine';
import logdown from 'logdown';
import UUID from 'pure-uuid';

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

  public async start(): Promise<void> {
    const login = {
      clientType: this.config.clientType,
      email: this.credentials.email,
      password: this.credentials.password,
    };
    const engine = new MemoryEngine();
    await engine.init(this.credentials.email);
    const apiClient = new APIClient({
      store: engine,
      urls: this.config.backend === 'staging' ? APIClient.BACKEND.STAGING : APIClient.BACKEND.PRODUCTION,
    });
    this.account = new Account(apiClient);

    this.account.on(PayloadBundleType.ASSET, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.ASSET_ABORT, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.ASSET_IMAGE, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.ASSET_META, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.AVAILABILITY, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.CALL, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.CLEARED, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.CLIENT_ACTION, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.CONFIRMATION, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.CONNECTION_REQUEST, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.CONVERSATION_CLEAR, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.CONVERSATION_RENAME, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.LAST_READ_UPDATE, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.LOCATION, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.MEMBER_JOIN, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.MESSAGE_DELETE, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.MESSAGE_EDIT, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.MESSAGE_HIDE, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.PING, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.REACTION, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.TEXT, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.TIMER_UPDATE, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.TYPING, this.handlePayload.bind(this));
    this.account.on(PayloadBundleType.UNKNOWN, this.handlePayload.bind(this));

    await this.account.login(login);
    await this.account.listen();
    this.account.on('error', error => this.logger.error(error));

    this.handlers.forEach(handler => (handler.account = this.account));
  }

  private handlePayload(payload: PayloadBundle): void {
    if (this.validateMessage(payload.conversation, payload.from)) {
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
