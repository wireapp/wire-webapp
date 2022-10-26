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
import {ClientType} from '@wireapp/api-client/lib/client/';
import {ConversationEvent, TeamEvent, UserEvent} from '@wireapp/api-client/lib/event';
import {Account} from '@wireapp/core';
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/lib/conversation/';
import {CRUDEngine} from '@wireapp/store-engine';
import logdown from 'logdown';
import UUID from 'uuidjs';
import {BotConfig, BotCredentials} from './Interfaces';
import {MessageHandler} from './MessageHandler';
import {
  AccessTokenData,
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_COOKIE_KEY,
  AUTH_TABLE_NAME,
  Cookie,
} from '@wireapp/api-client/lib/auth';

const defaultConfig: Required<BotConfig> = {
  backend: 'production',
  clientType: ClientType.TEMPORARY,
  conversations: [],
  owners: [],
};

export class Bot extends MessageHandler {
  public account: Account | undefined = undefined;

  private readonly config: Required<BotConfig>;
  private readonly handlers: Map<string, MessageHandler>;
  private readonly logger: logdown.Logger;

  constructor(private readonly credentials: BotCredentials, config?: BotConfig) {
    super();
    this.config = {...defaultConfig, ...config};
    this.credentials = credentials;
    this.handlers = new Map();
    this.logger = logdown('@wireapp/bot-api/Bot', {
      logger: console,
      markdown: false,
    });
  }

  public addHandler(handler: MessageHandler): void {
    this.handlers.set(UUID.genV4().toString(), handler);
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

  public async start(storeEngine?: CRUDEngine): Promise<APIClient> {
    const login = {
      clientType: this.config.clientType,
      email: this.credentials.email,
      password: this.credentials.password,
    };

    const apiClient = new APIClient({
      urls: this.config.backend === 'staging' ? APIClient.BACKEND.STAGING : APIClient.BACKEND.PRODUCTION,
    });

    apiClient.on(APIClient.TOPIC.ACCESS_TOKEN_REFRESH, async (accessToken: AccessTokenData) => {
      await storeEngine?.updateOrCreate(AUTH_TABLE_NAME, AUTH_ACCESS_TOKEN_KEY, accessToken);
    });

    this.account = new Account(apiClient, {createStore: () => Promise.resolve(storeEngine)});

    for (const payloadType of Object.values(PayloadBundleType)) {
      this.account.removeAllListeners(payloadType);
      this.account.on(payloadType as any, this.handleEvent.bind(this));
    }

    try {
      if (!storeEngine) {
        throw new Error('Store engine not provided');
      }
      const cookie = await this.getCookie(storeEngine);
      await this.account.init(this.config.clientType, cookie);
    } catch (error) {
      this.logger.warn('Failed to init account from cookie', error);
      await this.account.login(login);
    }

    await this.account.listen();

    this.handlers.forEach(handler => (handler.account = this.account));

    return apiClient;
  }

  async getCookie(storeEngine: CRUDEngine): Promise<Cookie | undefined> {
    const {expiration, zuid} = await storeEngine.read<Cookie>(AUTH_TABLE_NAME, AUTH_COOKIE_KEY);
    const cookie = new Cookie(zuid, expiration);
    return cookie;
  }

  handleEvent(payload: PayloadBundle | ConversationEvent | UserEvent | TeamEvent): void {
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
