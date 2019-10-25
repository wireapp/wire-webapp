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

import {CRUDEngine, MemoryEngine} from '@wireapp/store-engine';
import EventEmitter from 'events';
import logdown from 'logdown';

import {AccountAPI} from './account/AccountAPI';
import {AssetAPI} from './asset/';
import {AccessTokenStore, AuthAPI, Context, InvalidTokenError, LoginData, RegisterData} from './auth/';
import {BroadcastAPI} from './broadcast/';
import {ClientAPI, ClientType} from './client/';
import {Config} from './Config';
import {ConnectionAPI} from './connection/';
import {ConversationAPI} from './conversation/';
import {Backend} from './env/';
import {GiphyAPI} from './giphy/';
import {HttpClient} from './http/';
import {NotificationAPI} from './notification/';
import * as ObfuscationUtil from './obfuscation/';
import {SelfAPI} from './self/';
import {retrieveCookie} from './shims/node/cookie';
import {WebSocketClient} from './tcp/';
import {
  FeatureAPI,
  IdentityProviderAPI,
  LegalHoldAPI,
  MemberAPI,
  PaymentAPI,
  ServiceAPI,
  TeamAPI,
  TeamInvitationAPI,
} from './team/';
import {UserAPI} from './user/';

const {version}: {version: string} = require('../../package.json');

enum TOPIC {
  ON_LOGOUT = 'APIClient.TOPIC.ON_LOGOUT',
}

const defaultConfig: Config = {
  store: new MemoryEngine(),
  urls: Backend.PRODUCTION,
};

export declare interface APIClient {
  on(event: TOPIC.ON_LOGOUT, listener: (error: InvalidTokenError) => void): this;
}

export class APIClient extends EventEmitter {
  private readonly logger: logdown.Logger;
  private readonly STORE_NAME_PREFIX = 'wire';

  // APIs
  public account: {api: AccountAPI};
  public asset: {api: AssetAPI};
  public auth: {api: AuthAPI};
  public broadcast: {api: BroadcastAPI};
  public client: {api: ClientAPI};
  public connection: {api: ConnectionAPI};
  public conversation: {api: ConversationAPI};
  public giphy: {api: GiphyAPI};
  public notification: {api: NotificationAPI};
  public self: {api: SelfAPI};
  public teams: {
    feature: {api: FeatureAPI};
    identityProvider: {api: IdentityProviderAPI};
    invitation: {api: TeamInvitationAPI};
    legalhold: {api: LegalHoldAPI};
    member: {api: MemberAPI};
    payment: {api: PaymentAPI};
    service: {api: ServiceAPI};
    team: {api: TeamAPI};
  };
  public user: {api: UserAPI};

  // Configuration
  private readonly accessTokenStore: AccessTokenStore;
  public context?: Context;
  public transport: {http: HttpClient; ws: WebSocketClient};
  public config: Config;

  public static BACKEND = Backend;
  public static get TOPIC(): typeof TOPIC {
    return TOPIC;
  }
  public static VERSION = version;

  constructor(config?: Config) {
    super();
    this.config = {...defaultConfig, ...config};
    this.accessTokenStore = new AccessTokenStore();
    this.logger = logdown('@wireapp/api-client/Client', {
      logger: console,
      markdown: false,
    });

    const httpClient = new HttpClient(this.config.urls.rest, this.accessTokenStore, this.config.store);
    const webSocket = new WebSocketClient(this.config.urls.ws, httpClient);

    webSocket.on(WebSocketClient.TOPIC.ON_INVALID_TOKEN, async error => {
      this.logger.warn(`Cannot renew access token because cookie is invalid: ${error.message}`, error);
      await this.logout();
      this.emit(APIClient.TOPIC.ON_LOGOUT, error);
    });

    this.transport = {
      http: httpClient,
      ws: webSocket,
    };

    this.account = {
      api: new AccountAPI(this.transport.http),
    };
    this.asset = {
      api: new AssetAPI(this.transport.http),
    };
    this.auth = {
      api: new AuthAPI(this.transport.http, this.config.store),
    };
    this.broadcast = {
      api: new BroadcastAPI(this.transport.http),
    };
    this.client = {
      api: new ClientAPI(this.transport.http),
    };
    this.connection = {
      api: new ConnectionAPI(this.transport.http),
    };
    this.conversation = {
      api: new ConversationAPI(this.transport.http),
    };
    this.giphy = {
      api: new GiphyAPI(this.transport.http),
    };
    this.notification = {
      api: new NotificationAPI(this.transport.http),
    };
    this.self = {
      api: new SelfAPI(this.transport.http),
    };

    this.teams = {
      feature: {
        api: new FeatureAPI(this.transport.http),
      },
      identityProvider: {
        api: new IdentityProviderAPI(this.transport.http),
      },
      invitation: {
        api: new TeamInvitationAPI(this.transport.http),
      },
      legalhold: {
        api: new LegalHoldAPI(this.transport.http),
      },
      member: {
        api: new MemberAPI(this.transport.http),
      },
      payment: {
        api: new PaymentAPI(this.transport.http),
      },
      service: {
        api: new ServiceAPI(this.transport.http),
      },
      team: {
        api: new TeamAPI(this.transport.http),
      },
    };

    this.user = {
      api: new UserAPI(this.transport.http),
    };
  }

  public async init(clientType: ClientType = ClientType.NONE): Promise<Context> {
    const initialAccessToken = await this.transport.http.refreshAccessToken();
    const context = this.createContext(initialAccessToken.user, clientType);

    await this.initEngine(context);
    await this.accessTokenStore.updateToken(initialAccessToken);

    return context;
  }

  public async login(loginData: LoginData): Promise<Context> {
    if (this.context) {
      await this.logout({ignoreError: true});
    }

    const cookieResponse = await this.auth.api.postLogin(loginData);
    const accessToken = cookieResponse.data;

    this.logger.info(
      `Saved initial access token. It will expire in "${accessToken.expires_in}" seconds.`,
      ObfuscationUtil.obfuscateAccessToken(accessToken),
    );

    const context = this.createContext(accessToken.user, loginData.clientType);

    await this.initEngine(context);
    await retrieveCookie(cookieResponse, this.config.store);
    await this.accessTokenStore.updateToken(accessToken);

    return context;
  }

  public async register(userAccount: RegisterData, clientType: ClientType = ClientType.PERMANENT): Promise<Context> {
    if (this.context) {
      await this.logout({ignoreError: true});
    }

    const user = await this.auth.api.postRegister(userAccount);

    /**
     * Note:
     * It's necessary to initialize the context (Client.createContext()) and the store (Client.initEngine())
     * for saving the retrieved cookie from POST /access (Client.init()) in a Node environment.
     */
    const context = await this.createContext(user.id, clientType);

    await this.initEngine(context);
    return this.init(clientType);
  }

  public async logout(options = {ignoreError: false}): Promise<void> {
    try {
      await this.auth.api.postLogout();
    } catch (error) {
      if (options.ignoreError) {
        this.logger.error(error);
      } else {
        throw error;
      }
    }

    this.disconnect('Closed by client logout');
    await this.accessTokenStore.delete();
    delete this.context;
  }

  public connect(onBeforeConnect?: () => Promise<void>): Promise<WebSocketClient> {
    return this.transport.ws.connect(this.context && this.context.clientId, onBeforeConnect);
  }

  private createContext(userId: string, clientType: ClientType, clientId?: string): Context {
    this.context = this.context ? {...this.context, clientId, clientType} : new Context(userId, clientType, clientId);
    return this.context;
  }

  public disconnect(reason?: string): void {
    this.transport.ws.disconnect(reason);
  }

  private async initEngine(context: Context): Promise<CRUDEngine> {
    const clientType = context.clientType === ClientType.NONE ? '' : `@${context.clientType}`;
    const dbName = `${this.STORE_NAME_PREFIX}@${this.config.urls.name}@${context.userId}${clientType}`;
    this.logger.log(`Initialising store with name "${dbName}"`);
    try {
      const db = await this.config.store.init(dbName);
      const isDexieStore = db && db.constructor.name === 'Dexie';
      if (isDexieStore) {
        if (this.config.schemaCallback) {
          this.config.schemaCallback(db);
        } else {
          const message = `Could not initialize store "${dbName}". Missing schema definition.`;
          throw new Error(message);
        }
        // In case the database got purged, db.close() is called automatically and we have to reopen it.
        await db.open();
      }
    } catch (error) {
      this.logger.error(`Could not initialize store "${dbName}": ${error.message}`);
      throw error;
    }
    return this.config.store;
  }

  public get clientId(): string | undefined {
    if (this.context && this.context.clientId) {
      return this.context.clientId;
    }
    return undefined;
  }

  public get userId(): string | undefined {
    if (this.context && this.context.userId) {
      return this.context.userId;
    }
    return undefined;
  }

  /** Should be used in cases where the user ID is MANDATORY. */
  public get validatedUserId(): string {
    if (this.userId) {
      return this.userId;
    }
    throw new Error('No valid user ID.');
  }

  /** Should be used in cases where the client ID is MANDATORY. */
  public get validatedClientId(): string {
    if (this.clientId) {
      return this.clientId;
    }
    throw new Error('No valid client ID.');
  }
}
