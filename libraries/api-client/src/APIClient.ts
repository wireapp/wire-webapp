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

import logdown from 'logdown';

import {EventEmitter} from 'events';

import {LogFactory} from '@wireapp/commons';

import {AccountAPI} from './account/AccountAPI';
import {AssetAPI} from './asset/';
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
import {CookieStore} from './auth/CookieStore';
import {parseAccessToken} from './auth/parseAccessToken';
import {BroadcastAPI} from './broadcast/';
import {CellsAPI} from './cells/CellsAPI';
import {ClientAPI, ClientType} from './client/';
import {Config, MINIMUM_API_VERSION} from './Config';
import {ConnectionAPI} from './connection/';
import {ConversationAPI} from './conversation/';
import {Backend} from './env/';
import {GenericAPI} from './generic';
import {GiphyAPI} from './giphy/';
import {BackendError, HttpClient} from './http/';
import {NotificationAPI} from './notification/';
import {OAuthAPI} from './oauth/OAuthAPI';
import {ObfuscationUtil} from './obfuscation/';
import {SelfAPI} from './self/';
import {ServiceProviderAPI} from './serviceProvider';
import {ServicesAPI} from './services';
import {OnConnect, WebSocketClient} from './tcp/';
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
import {ScimAPI} from './team/scim/ScimAPI';
import {TeamSearchAPI} from './team/search';
import {SSOAPI} from './team/sso';
import {UserAPI} from './user/';
import {UserGroupAPI} from './userGroups/';

const {version}: {version: string} = require('../package.json');

enum TOPIC {
  ACCESS_TOKEN_REFRESH = 'APIClient.TOPIC.ACCESS_TOKEN_REFRESH',
  COOKIE_REFRESH = 'APIClient.TOPIC.COOKIE_REFRESH',
  /** Event being sent when logout is done. */
  ON_LOGOUT = 'APIClient.TOPIC.ON_LOGOUT',
}

const defaultConfig = {
  urls: Backend.PRODUCTION,
} as Config;

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
  cells: CellsAPI;
  client: ClientAPI;
  connection: ConnectionAPI;
  conversation: ConversationAPI;
  giphy: GiphyAPI;
  notification: NotificationAPI;
  oauth: OAuthAPI;
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
    sso: SSOAPI;
    team: TeamAPI;
  };
  userGroup: UserGroupAPI;
  user: UserAPI;
  generic: GenericAPI;
};

/** map of all the features that the backend supports (depending on the backend api version number) */
export type BackendFeatures = {
  /** The actual version used to communicate with backend */
  version: number;
  /** Does the backend API support federated endpoints */
  federationEndpoints: boolean;
  /** Is the backend actually talking to other federated domains */
  isFederated: boolean;
  /** Does the backend API support MLS features */
  supportsMLS: boolean;
  /** Does the backend API support creating guest links with password */
  supportsGuestLinksWithPassword: boolean;
  domain: string;
};

export type BackendVersionResponse = {
  supported: number[];
  federation?: boolean;
  development?: number[];
  /**
   * The domain of the backend server
   */
  domain: string;
};

export class APIClient extends EventEmitter {
  private readonly logger: logdown.Logger;

  // APIs
  public api: Apis;
  private cellsApi: CellsAPI | null = null;

  // Configuration
  private readonly accessTokenStore: AccessTokenStore;
  public context?: Context;
  public transport: {http: HttpClient; ws: WebSocketClient};
  public config: Config;
  public backendFeatures: BackendFeatures;

  // Store reference to cookie listener for cleanup
  private cookieRefreshListener?: (cookie?: Cookie) => void;

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
    // Store the listener reference so we can remove it on disconnect
    this.cookieRefreshListener = (cookie?: Cookie) => this.emit(APIClient.TOPIC.COOKIE_REFRESH, cookie);
    CookieStore.emitter.on(CookieStore.TOPIC.COOKIE_REFRESH, this.cookieRefreshListener);

    this.logger = LogFactory.getLogger('@wireapp/api-client/Client');

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
    this.backendFeatures = this.computeBackendFeatures(MINIMUM_API_VERSION);
    this.api = this.configureApis(this.backendFeatures);
  }

  private configureApis(backendFeatures: BackendFeatures): Apis {
    this.logger.info('configuring APIs with config:', backendFeatures);

    const assetAPI = new AssetAPI(this.transport.http);

    // Prevents the CellsAPI from being initialized multiple times
    if (!this.cellsApi) {
      this.cellsApi = new CellsAPI({
        httpClientConfig: this.config,
        accessTokenStore: this.accessTokenStore,
      });
    }

    return {
      account: new AccountAPI(this.transport.http),
      asset: assetAPI,
      auth: new AuthAPI(this.transport.http),
      services: new ServicesAPI(this.transport.http, assetAPI),
      broadcast: new BroadcastAPI(this.transport.http),
      cells: this.cellsApi,
      client: new ClientAPI(this.transport.http),
      connection: new ConnectionAPI(this.transport.http),
      conversation: new ConversationAPI(this.transport.http, backendFeatures),
      giphy: new GiphyAPI(this.transport.http),
      notification: new NotificationAPI(this.transport.http),
      oauth: new OAuthAPI(this.transport.http),
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
        sso: new SSOAPI(this.transport.http),
        team: new TeamAPI(this.transport.http),
      },
      userGroup: new UserGroupAPI(this.transport.http),
      user: new UserAPI(this.transport.http, backendFeatures),
      generic: new GenericAPI(this.transport.http),
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
      domain: responsePayload?.domain ?? '',
      federationEndpoints: backendVersion > 0,
      isFederated: responsePayload?.federation || false,
      supportsMLS: backendVersion >= 5,
      supportsGuestLinksWithPassword: backendVersion >= 4,
    };
  }

  /**
   * Sets the API client to use the highest supported version within a given range,
   * with a hard minimum of version 8 enforced.
   *
   * @param min - Minimum acceptable version (must be ≥ 8)
   * @param max - Maximum acceptable version
   * @param allowDev - If true, allows using development versions from the backend
   * @returns Backend feature configuration for the selected version
   * @throws Error if no compatible version is found
   */
  async useVersion(min: number, max: number, allowDev: boolean = false): Promise<BackendFeatures> {
    if (min < MINIMUM_API_VERSION) {
      throw new Error(`Minimum supported API version is ${MINIMUM_API_VERSION}. Received: ${min}`);
    }

    const response = await this.transport.http.sendRequest<BackendVersionResponse>({
      url: '/api-version',
    });

    const {supported, development = [], domain, federation} = response.data;
    const availableVersions = allowDev ? [...supported, ...development] : supported;
    const compatibleVersion = this.findHighestCompatibleVersion(availableVersions, min, max);

    if (compatibleVersion === undefined) {
      throw new Error(
        `No compatible API version in range [${min}-${max}]. ` + `Backend supports: [${supported.join(', ')}]`,
      );
    }

    this.backendFeatures = this.computeBackendFeatures(compatibleVersion, {federation, supported, development, domain});
    this.transport.http.useVersion(compatibleVersion);
    this.transport.ws.useVersion(compatibleVersion);
    this.api = this.configureApis(this.backendFeatures);

    return this.backendFeatures;
  }

  /**
   * Returns the highest version from the list that falls within the specified range.
   *
   * @param versions - List of available versions
   * @param min - Minimum required version
   * @param max - Maximum allowed version
   * @returns The highest version in the allowed range, or undefined if none are compatible
   */
  private findHighestCompatibleVersion(versions: number[], min: number, max: number): number | undefined {
    const inRangeVersions = versions.filter(version => version >= min && version <= max);
    const [highestVersion] = inRangeVersions.sort((a, b) => b - a);
    return highestVersion;
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

  public connect(onConnect?: OnConnect): WebSocketClient {
    return this.transport.ws.connect(this.context?.clientId, onConnect);
  }

  private async createContext(userId: string, clientType: ClientType): Promise<Context> {
    let selfDomain = undefined;
    try {
      const self = await this.api.self.getSelf();
      selfDomain = self.qualified_id?.domain;
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
    // Remove the cookie refresh listener to prevent memory leaks
    if (this.cookieRefreshListener) {
      CookieStore.emitter.off(CookieStore.TOPIC.COOKIE_REFRESH, this.cookieRefreshListener);
    }
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

  /**
   * Will check if MLS is supported by backend (whether the api version used supports MLS, and whether a backend removal key is present).
   */
  public async supportsMLS(): Promise<boolean> {
    const {supportsMLS} = this.backendFeatures;

    if (!supportsMLS) {
      return false;
    }

    try {
      const backendRemovalKey = (await this.api.client.getPublicKeys()).removal;
      return !!backendRemovalKey;
    } catch {
      // Ignore errors, backend might not support removal keys
    }

    return false;
  }
}
