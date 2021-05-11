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

import {EventEmitter} from 'events';
import logdown from 'logdown';

import {
  AccessTokenData,
  AccessTokenStore,
  AuthAPI,
  Context,
  Cookie,
  InvalidTokenError,
  LoginData,
  MissingCookieError,
  RegisterData,
} from './auth/';
import {AccountAPI} from './account/AccountAPI';
import {AssetAPI} from './asset/';
import {Backend} from './env/';
import {BroadcastAPI} from './broadcast/';
import {ClientAPI, ClientType} from './client/';
import {ConnectionAPI} from './connection/';
import {ConversationAPI} from './conversation/';
import {CookieStore} from './auth/CookieStore';
import {GiphyAPI} from './giphy/';
import {HttpClient} from './http/';
import {NotificationAPI} from './notification/';
import {ObfuscationUtil} from './obfuscation/';
import {OnConnect, WebSocketClient} from './tcp/';
import {SelfAPI} from './self/';
import {ServiceProviderAPI} from './serviceProvider';
import {ServicesAPI} from './services';
import {
  FeatureAPI,
  IdentityProviderAPI,
  LegalHoldAPI,
  MemberAPI,
  PaymentAPI,
  ServiceAPI,
  TeamAPI,
  TeamConversationAPI,
  TeamInvitationAPI,
} from './team/';
import {UserAPI} from './user/';
import type {Config} from './Config';
import {TeamSearchAPI} from './team/search';
import {parseAccessToken} from './auth/parseAccessToken';
import {ScimAPI} from './team/scim/ScimAPI';

const {version}: {version: string} = require('../package.json');

enum TOPIC {
  ACCESS_TOKEN_REFRESH = 'APIClient.TOPIC.ACCESS_TOKEN_REFRESH',
  COOKIE_REFRESH = 'APIClient.TOPIC.COOKIE_REFRESH',
  /** Event being sent when logout is done. */
  ON_LOGOUT = 'APIClient.TOPIC.ON_LOGOUT',
}

const defaultConfig: Config = {
  urls: Backend.PRODUCTION,
  platform: 'web-api-client',
  version: version,
};

export interface APIClient {
  on(event: TOPIC.ON_LOGOUT, listener: (error: InvalidTokenError) => void): this;

  on(event: TOPIC.COOKIE_REFRESH, listener: (cookie?: Cookie) => void): this;

  on(event: TOPIC.ACCESS_TOKEN_REFRESH, listener: (accessToken: AccessTokenData) => void): this;
}

export class APIClient extends EventEmitter {
  private readonly logger: logdown.Logger;

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
  public services: {api: ServicesAPI};
  public serviceProvider: {api: ServiceProviderAPI};
  public teams: {
    conversation: {api: TeamConversationAPI};
    feature: {api: FeatureAPI};
    identityProvider: {api: IdentityProviderAPI};
    invitation: {api: TeamInvitationAPI};
    legalhold: {api: LegalHoldAPI};
    member: {api: MemberAPI};
    payment: {api: PaymentAPI};
    scim: {api: ScimAPI};
    search: {api: TeamSearchAPI};
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

  public static readonly TOPIC = TOPIC;

  public static VERSION = version;

  constructor(config?: Config) {
    super();
    this.config = {...defaultConfig, ...config};
    this.accessTokenStore = new AccessTokenStore();
    this.accessTokenStore.on(AccessTokenStore.TOPIC.ACCESS_TOKEN_REFRESH, (accessToken: AccessTokenData) =>
      this.emit(APIClient.TOPIC.ACCESS_TOKEN_REFRESH, accessToken),
    );
    CookieStore.emitter.on(CookieStore.TOPIC.COOKIE_REFRESH, (cookie?: Cookie) =>
      this.emit(APIClient.TOPIC.COOKIE_REFRESH, cookie),
    );

    this.logger = logdown('@wireapp/api-client/Client', {
      logger: console,
      markdown: false,
    });

    const httpClient = new HttpClient(this.config, this.accessTokenStore);
    const webSocket = new WebSocketClient(this.config.urls.ws, httpClient);

    const onInvalidCredentials = async (error: InvalidTokenError | MissingCookieError) => {
      try {
        await this.logout({skipLogoutRequest: true});
      } finally {
        // Send a guaranteed logout event to the application so that the UI can respond
        this.emit(APIClient.TOPIC.ON_LOGOUT, error);
      }
    };
    webSocket.on(WebSocketClient.TOPIC.ON_INVALID_TOKEN, onInvalidCredentials);
    httpClient.on(HttpClient.TOPIC.ON_INVALID_TOKEN, onInvalidCredentials);

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
      api: new AuthAPI(this.transport.http),
    };
    this.services = {
      api: new ServicesAPI(this.transport.http),
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
    this.serviceProvider = {
      api: new ServiceProviderAPI(this.transport.http),
    };
    this.teams = {
      conversation: {
        api: new TeamConversationAPI(this.transport.http),
      },
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
      scim: {
        api: new ScimAPI(this.transport.http),
      },
      search: {
        api: new TeamSearchAPI(this.transport.http),
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

  public async init(clientType: ClientType = ClientType.NONE, cookie?: Cookie): Promise<Context> {
    CookieStore.setCookie(cookie);

    const initialAccessToken = await this.transport.http.refreshAccessToken();
    const context = this.createContext(initialAccessToken.user, clientType);

    await this.accessTokenStore.updateToken(initialAccessToken);

    return context;
  }

  public async login(loginData: LoginData): Promise<Context> {
    if (this.context) {
      await this.logout();
    }

    const accessToken = await this.auth.api.postLogin(loginData);

    this.logger.info(
      `Saved initial access token. It will expire in "${accessToken.expires_in}" seconds.`,
      ObfuscationUtil.obfuscateAccessToken(accessToken),
    );

    await this.accessTokenStore.updateToken(accessToken);

    return this.createContext(accessToken.user, loginData.clientType);
  }

  public async loginWithToken(accessTokenString: string, clientType: ClientType = ClientType.NONE) {
    const {userId} = parseAccessToken(accessTokenString);

    const accessTokenData: AccessTokenData = {
      access_token: accessTokenString,
      expires_in: 1,
      token_type: 'Bearer',
      user: userId,
    };

    await this.accessTokenStore.updateToken(accessTokenData);

    return this.createContext(userId, clientType);
  }

  public async register(userAccount: RegisterData, clientType: ClientType = ClientType.PERMANENT): Promise<Context> {
    if (this.context) {
      await this.logout();
    }

    const user = await this.auth.api.postRegister(userAccount);

    this.createContext(user.id, clientType);

    return this.init(clientType, CookieStore.getCookie());
  }

  public async logout(options: {skipLogoutRequest: boolean} = {skipLogoutRequest: false}): Promise<void> {
    try {
      this.disconnect('Closed by client logout');
      if (!options.skipLogoutRequest) {
        await this.auth.api.postLogout();
      }
    } catch (error) {
      this.logger.warn(error);
    }

    CookieStore.deleteCookie();
    await this.accessTokenStore.delete();
    delete this.context;
  }

  public connect(onConnect?: OnConnect): Promise<WebSocketClient> {
    return this.transport.ws.connect(this.context?.clientId, onConnect);
  }

  private createContext(userId: string, clientType: ClientType, clientId?: string): Context {
    this.context = this.context ? {...this.context, clientId, clientType} : {clientId, clientType, userId};
    return this.context;
  }

  public disconnect(reason?: string): void {
    this.transport.ws.disconnect(reason);
  }

  public get clientId(): string | undefined {
    return this.context?.clientId || undefined;
  }

  public get userId(): string | undefined {
    return this.context?.userId || undefined;
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
