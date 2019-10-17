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
import {Context, LoginData} from '@wireapp/api-client/dist/commonjs/auth/';
import {ClientType, RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/';

import {StatusCode} from '@wireapp/api-client/dist/commonjs/http/';
import {WebSocketTopic} from '@wireapp/api-client/dist/commonjs/tcp/';
import * as cryptobox from '@wireapp/cryptobox';
import {error as StoreEngineError} from '@wireapp/store-engine';
import EventEmitter from 'events';
import logdown from 'logdown';

import {ConversationMessageTimerUpdateEvent} from '@wireapp/api-client/dist/commonjs/event';
import {LoginSanitizer} from './auth/';
import {BroadcastService} from './broadcast/';
import {ClientInfo, ClientService} from './client/';
import {ConnectionService} from './connection/';
import {AssetService, ConversationService, PayloadBundle, PayloadBundleType} from './conversation/';
import {CoreError} from './CoreError';
import {CryptographyService} from './cryptography/';
import {GiphyService} from './giphy/';
import {NotificationHandler, NotificationService} from './notification/';
import {SelfService} from './self/';
import {TeamService} from './team/';
import {UserService} from './user/';

export class Account extends EventEmitter {
  private readonly logger: logdown.Logger;

  private readonly apiClient: APIClient;
  public service?: {
    asset: AssetService;
    broadcast: BroadcastService;
    client: ClientService;
    connection: ConnectionService;
    conversation: ConversationService;
    cryptography: CryptographyService;
    giphy: GiphyService;
    notification: NotificationService;
    self: SelfService;
    team: TeamService;
    user: UserService;
  };

  public static TOPIC = {
    ERROR: 'Account.TOPIC.ERROR',
  };

  constructor(apiClient: APIClient = new APIClient()) {
    super();
    this.apiClient = apiClient;
    this.logger = logdown('@wireapp/core/Account', {
      logger: console,
      markdown: false,
    });
  }

  get clientId(): string {
    return this.apiClient.validatedClientId;
  }

  get userId(): string {
    return this.apiClient.validatedUserId;
  }

  public async init(): Promise<void> {
    const assetService = new AssetService(this.apiClient);
    const cryptographyService = new CryptographyService(this.apiClient, this.apiClient.config.store);

    const clientService = new ClientService(this.apiClient, this.apiClient.config.store, cryptographyService);
    const connectionService = new ConnectionService(this.apiClient);
    const giphyService = new GiphyService(this.apiClient);
    const conversationService = new ConversationService(this.apiClient, cryptographyService, assetService);
    const notificationService = new NotificationService(this.apiClient, cryptographyService);
    const selfService = new SelfService(this.apiClient);
    const teamService = new TeamService(this.apiClient);

    const broadcastService = new BroadcastService(this.apiClient, conversationService, cryptographyService);
    const userService = new UserService(this.apiClient, broadcastService);

    this.service = {
      asset: assetService,
      broadcast: broadcastService,
      client: clientService,
      connection: connectionService,
      conversation: conversationService,
      cryptography: cryptographyService,
      giphy: giphyService,
      notification: notificationService,
      self: selfService,
      team: teamService,
      user: userService,
    };
  }

  public async login(loginData: LoginData, initClient: boolean = true, clientInfo?: ClientInfo): Promise<Context> {
    this.resetContext();
    await this.init();

    LoginSanitizer.removeNonPrintableCharacters(loginData);

    await this.apiClient.login(loginData);

    if (initClient) {
      await this.initClient(loginData, clientInfo);
    }

    if (this.apiClient.context) {
      return this.apiClient.context;
    }

    throw Error('Login failed.');
  }

  public async initClient(
    loginData: LoginData,
    clientInfo?: ClientInfo,
  ): Promise<{isNewClient: boolean; localClient: RegisteredClient}> {
    if (!this.service) {
      throw new Error('Services are not set.');
    }

    try {
      const localClient = await this.loadAndValidateLocalClient();
      return {isNewClient: false, localClient};
    } catch (error) {
      // There was no client so we need to "create" and "register" a client
      const notFoundInDatabase =
        error instanceof cryptobox.error.CryptoboxError ||
        error.constructor.name === 'CryptoboxError' ||
        error instanceof StoreEngineError.RecordNotFoundError ||
        error.constructor.name === StoreEngineError.RecordNotFoundError.constructor.name;
      const notFoundOnBackend = error.response && error.response.status === StatusCode.NOT_FOUND;

      if (notFoundInDatabase) {
        this.logger.log('Could not find valid client in database');
        return this.registerClient(loginData, clientInfo);
      }

      if (notFoundOnBackend) {
        this.logger.log('Could not find valid client on backend');
        const client = await this.service!.client.getLocalClient();
        const shouldDeleteWholeDatabase = client.type === ClientType.TEMPORARY;
        if (shouldDeleteWholeDatabase) {
          this.logger.log('Last client was temporary - Deleting database');

          await this.apiClient.config.store.purge();
          await this.apiClient.init(loginData.clientType);

          return this.registerClient(loginData, clientInfo);
        }

        this.logger.log('Last client was permanent - Deleting cryptography stores');
        await this.service!.cryptography.deleteCryptographyStores();
        return this.registerClient(loginData, clientInfo);
      }

      throw error;
    }
  }

  public async loadAndValidateLocalClient(): Promise<RegisteredClient> {
    await this.service!.cryptography.initCryptobox();

    const loadedClient = await this.service!.client.getLocalClient();
    await this.apiClient.client.api.getClient(loadedClient.id);
    this.apiClient.context!.clientId = loadedClient.id;

    return loadedClient;
  }

  private async registerClient(
    loginData: LoginData,
    clientInfo?: ClientInfo,
  ): Promise<{isNewClient: boolean; localClient: RegisteredClient}> {
    if (!this.service) {
      throw new Error('Services are not set.');
    }
    const registeredClient = await this.service.client.register(loginData, clientInfo);
    this.apiClient.context!.clientId = registeredClient.id;
    this.logger.log('Client is created');

    await this.service!.notification.initializeNotificationStream();
    await this.service!.client.synchronizeClients();

    return {isNewClient: true, localClient: registeredClient};
  }

  private resetContext(): void {
    delete this.apiClient.context;
    delete this.service;
  }

  public async logout(): Promise<void> {
    await this.apiClient.logout();
    this.resetContext();
  }

  public async listen(
    notificationHandler: NotificationHandler = this.service!.notification.handleNotification,
  ): Promise<Account> {
    if (!this.apiClient.context) {
      throw new Error('Context is not set - please login first');
    }

    this.apiClient.transport.ws.removeAllListeners(WebSocketTopic.ON_MESSAGE);
    this.apiClient.transport.ws.on(WebSocketTopic.ON_MESSAGE, notificationHandler);

    this.service!.notification.removeAllListeners(NotificationService.TOPIC.NOTIFICATION_ERROR);
    this.service!.notification.on(NotificationService.TOPIC.NOTIFICATION_ERROR, this.handleError);

    for (const payloadType of Object.values(PayloadBundleType)) {
      this.service!.notification.removeAllListeners(payloadType);
      this.service!.notification.on(payloadType, this.handlePayload);
    }

    const onBeforeConnect = async () => this.service!.notification.handleNotificationStream(notificationHandler);
    await this.apiClient.connect(onBeforeConnect);
    return this;
  }

  private readonly handlePayload = async (payload: PayloadBundle): Promise<void> => {
    switch (payload.type) {
      case PayloadBundleType.TIMER_UPDATE: {
        const {
          data: {message_timer},
          conversation,
        } = (payload as unknown) as ConversationMessageTimerUpdateEvent;
        const expireAfterMillis = Number(message_timer);
        this.service!.conversation.messageTimer.setConversationLevelTimer(conversation, expireAfterMillis);
        break;
      }
    }
    this.emit(payload.type, payload);
  };

  private readonly handleError = (accountError: CoreError): void => {
    this.emit(Account.TOPIC.ERROR, accountError);
  };
}
