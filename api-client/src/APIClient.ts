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
import {BackendError, HttpClient} from './http/';
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
  BillingAPI,
  ServiceAPI,
  TeamAPI,
  TeamConversationAPI,
  TeamInvitationAPI,
} from './team/';
import {UserAPI} from './user/';
import {Config} from './Config';
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
};

export interface APIClient {
  on(event: TOPIC.ON_LOGOUT, listener: (error: InvalidTokenError) => void): this;

  on(event: TOPIC.COOKIE_REFRESH, listener: (cookie?: Cookie) => void): this;

  on(event: TOPIC.ACCESS_TOKEN_REFRESH, listener: (accessToken: AccessTokenData) => void): this;
}

type Apis = {
  account: AccountAPI;
  asset: AssetAPI;
  auth: AuthAPI;
  broadcast: BroadcastAPI;
  client: ClientAPI;
  connection: ConnectionAPI;
  conversation: ConversationAPI;
  giphy: GiphyAPI;
  notification: NotificationAPI;
  self: SelfAPI;
  services: ServicesAPI;
  serviceProvider: ServiceProviderAPI;
  teams: {
    conversation: TeamConversationAPI;
    feature: FeatureAPI;
    identityProvider: IdentityProviderAPI;
    invitation: TeamInvitationAPI;
    legalhold: LegalHoldAPI;
    member: MemberAPI;
    payment: PaymentAPI;
    billing: BillingAPI;
    scim: ScimAPI;
    search: TeamSearchAPI;
    service: ServiceAPI;
    team: TeamAPI;
  };
  user: UserAPI;
};

/** map of all the features that the backend supports (depending on the backend api version number) */
export type BackendFeatures = {
  /** The actual version used to communicate with backend */
  version: number;
  /** Does the backend API support federated endpoints */
  federationEndpoints: boolean;
  /** Is the backend actually talking to other federated domains */
  isFederated: boolean;
};

export type BackendVersionResponse = {supported: number[]; federation?: boolean; development?: number[]};
export class APIClient extends EventEmitter {
  private readonly logger: logdown.Logger;

  // APIs
  public api: Apis;

  // Configuration
  private readonly accessTokenStore: AccessTokenStore;
  public context?: Context;
  public transport: {http: HttpClient; ws: WebSocketClient};
  public config: Config;
  public backendFeatures: BackendFeatures;

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
    this.backendFeatures = this.computeBackendFeatures(0);
    this.api = this.configureApis(this.backendFeatures);
  }

  private configureApis(backendFeatures: BackendFeatures): Apis {
    this.logger.info('configuring APIs with config', backendFeatures);
    const assetAPI = new AssetAPI(this.transport.http, backendFeatures);
    return {
      account: new AccountAPI(this.transport.http),
      asset: assetAPI,
      auth: new AuthAPI(this.transport.http),
      services: new ServicesAPI(this.transport.http, assetAPI),
      broadcast: new BroadcastAPI(this.transport.http),
      client: new ClientAPI(this.transport.http),
      connection: new ConnectionAPI(this.transport.http, backendFeatures),
      conversation: new ConversationAPI(this.transport.http, backendFeatures),
      giphy: new GiphyAPI(this.transport.http),
      notification: new NotificationAPI(this.transport.http),
      self: new SelfAPI(this.transport.http),
      serviceProvider: new ServiceProviderAPI(this.transport.http),
      teams: {
        conversation: new TeamConversationAPI(this.transport.http),
        feature: new FeatureAPI(this.transport.http),
        identityProvider: new IdentityProviderAPI(this.transport.http),
        invitation: new TeamInvitationAPI(this.transport.http),
        legalhold: new LegalHoldAPI(this.transport.http),
        member: new MemberAPI(this.transport.http),
        payment: new PaymentAPI(this.transport.http),
        billing: new BillingAPI(this.transport.http),
        scim: new ScimAPI(this.transport.http),
        search: new TeamSearchAPI(this.transport.http),
        service: new ServiceAPI(this.transport.http),
        team: new TeamAPI(this.transport.http),
      },
      user: new UserAPI(this.transport.http, backendFeatures),
    };
  }

  /**
   * Will compute all the capabilities of the backend API according to the selected version and the version response payload
   * @param backendVersion The agreed used version between the client and the backend
   * @param responsePayload? The response from the server
   */
  private computeBackendFeatures(backendVersion: number, responsePayload?: BackendVersionResponse): BackendFeatures {
    return {
      version: backendVersion,
      federationEndpoints: backendVersion > 0,
      isFederated: responsePayload?.federation || false,
    };
  }

  /**
   * Will set the APIClient to use a specific version of the API (by default uses version 0)
   * It will fetch the API Config and use the highest possible version
   * @param acceptedVersions Which version the consumer supports
   * @param useDevVersion allow the api-client to use development version of the api (if present). The dev version also need to be listed on the supportedVersions given as parameters
   *   If we have version 2 that is a dev version, this is going to be the output of those calls
   *   - useVersion([0, 1, 2], true) > version 2 is used
   *   - useVersion([0, 1, 2], false) > version 1 is used
   *   - useVersion([0, 1], true) > version 1 is used
   * @return The highest version that is both supported by client and backend
   */
  async useVersion(acceptedVersions: number[], useDevVersion = false): Promise<BackendFeatures> {
    if (acceptedVersions.length === 1 && acceptedVersions[0] === 0) {
      // Nothing to do since version 0 is the default one
      return this.computeBackendFeatures(0);
    }
    let backendVersions: BackendVersionResponse = {supported: [0]};
    try {
      backendVersions = (await this.transport.http.sendRequest<BackendVersionResponse>({url: '/api-version'})).data;
    } catch (error) {}
    const devVersions = useDevVersion ? backendVersions.development ?? [] : [];
    const highestCommonVersion = backendVersions.supported
      .concat(devVersions)
      .sort()
      .reverse()
      .find(version => acceptedVersions.includes(version));

    if (highestCommonVersion === undefined) {
      throw new Error(
        `Backend does not support requested versions [${acceptedVersions.join(
          ', ',
        )}] (supported versions ${backendVersions.supported.join(', ')})`,
      );
    }
    this.backendFeatures = this.computeBackendFeatures(highestCommonVersion, backendVersions);
    this.transport.http.useVersion(this.backendFeatures.version);
    this.api = this.configureApis(this.backendFeatures);
    return this.backendFeatures;
  }

  public async init(clientType: ClientType = ClientType.NONE, cookie?: Cookie): Promise<Context> {
    CookieStore.setCookie(cookie);

    const initialAccessToken = await this.transport.http.refreshAccessToken();
    const context = await this.createContext(initialAccessToken.user, clientType);

    await this.accessTokenStore.updateToken(initialAccessToken);

    return context;
  }

  public async login(loginData: LoginData): Promise<Context> {
    if (this.context) {
      await this.logout();
    }

    const accessToken = await this.api.auth.postLogin(loginData);

    this.logger.info(
      `Saved initial access token. It will expire in "${accessToken.expires_in}" seconds.`,
      ObfuscationUtil.obfuscateAccessToken(accessToken),
    );

    await this.accessTokenStore.updateToken(accessToken);

    return this.createContext(accessToken.user, loginData.clientType);
  }

  public async loginWithToken(accessTokenString: string, clientType: ClientType = ClientType.NONE): Promise<Context> {
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

    const user = await this.api.auth.postRegister(userAccount);

    await this.createContext(user.id, clientType);

    return this.init(clientType, CookieStore.getCookie());
  }

  public async logout(options: {skipLogoutRequest: boolean} = {skipLogoutRequest: false}): Promise<void> {
    try {
      this.disconnect('Closed by client logout');
      if (!options.skipLogoutRequest) {
        await this.api.auth.postLogout();
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

  private async createContext(userId: string, clientType: ClientType): Promise<Context> {
    let selfDomain = undefined;
    try {
      const self = await this.api.self.getSelf();
      selfDomain = self.qualified_id?.domain;
      this.logger.info(`Got self domain "${selfDomain}"`);
    } catch (error) {
      this.logger.warn('Could not get self user:', (error as BackendError).message);
    }

    this.context = this.context
      ? {...this.context, clientType, domain: selfDomain}
      : {clientType, userId, domain: selfDomain};
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

  public get domain(): string | undefined {
    return this.context?.domain || undefined;
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
