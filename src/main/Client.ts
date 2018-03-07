//
// Wire
// Copyright (C) 2018 Wire Swiss GmbH
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see http://www.gnu.org/licenses/.
//

import {Config} from './Config';
import {AccessTokenData, AuthAPI, Context, LoginData, RegisterData, AUTH_TABLE_NAME} from './auth';
import {AccessTokenStore} from './auth/';
import {AssetAPI} from './asset/';
import {AxiosResponse} from 'axios';
import {Backend} from './env';
import {ClientAPI, ClientType} from './client/';
import {ConnectionAPI} from './connection/';
import {ConversationAPI} from './conversation/';
import {GiphyAPI} from './giphy/';
import {HttpClient} from './http/';
import {InvitationAPI} from './invitation/';
import {MemberAPI, PaymentAPI, TeamAPI, TeamInvitationAPI} from './team/';
import {SelfAPI} from './self/';
import {UserAPI} from './user/';
import {WebSocketClient} from './tcp/';
import {User} from './user';
import {retrieveCookie} from './shims/node/cookie';

const VERSION = require('../../package.json').version;

class Client {
  private STORE_NAME_PREFIX: string = 'wire';
  // APIs
  public asset: {api: AssetAPI};
  public auth: {api: AuthAPI};
  public client: {api: ClientAPI};
  public connection: {api: ConnectionAPI};
  public conversation: {api: ConversationAPI};
  public giphy: {api: GiphyAPI};
  public invitation: {api: InvitationAPI};
  public self: {api: SelfAPI};
  public teams: {
    team: {api?: TeamAPI};
    member: {api?: MemberAPI};
    invitation: {api?: TeamInvitationAPI};
    payment: {api?: PaymentAPI};
  } = {
    team: {api: undefined},
    member: {api: undefined},
    invitation: {api: undefined},
    payment: {api: undefined},
  };
  public user: {api: UserAPI};

  // Configuration
  private accessTokenStore: AccessTokenStore;
  public context?: Context;
  public transport: {http: HttpClient; ws: WebSocketClient};

  public static BACKEND = Backend;
  public static VERSION: string = VERSION;

  constructor(public config: Config = new Config()) {
    this.config = new Config(config.store, config.urls, config.schemaCallback);
    this.accessTokenStore = new AccessTokenStore(this.config.store);

    const httpClient = new HttpClient(this.config.urls.rest, this.accessTokenStore, this.config.store);

    this.transport = {
      http: httpClient,
      ws: new WebSocketClient(this.config.urls.ws, httpClient),
    };

    this.asset = {
      api: new AssetAPI(this.transport.http),
    };
    this.auth = {
      api: new AuthAPI(this.transport.http, this.config.store),
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
    this.invitation = {
      api: new InvitationAPI(this.transport.http),
    };
    this.self = {
      api: new SelfAPI(this.transport.http),
    };

    this.teams = {
      invitation: {
        api: new TeamInvitationAPI(this.transport.http),
      },
      member: {
        api: new MemberAPI(this.transport.http),
      },
      payment: {
        api: new PaymentAPI(this.transport.http),
      },
      team: {
        api: new TeamAPI(this.transport.http),
      },
    };

    this.user = {
      api: new UserAPI(this.transport.http),
    };
  }

  public init(): Promise<Context> {
    let context: Context;
    let accessToken: AccessTokenData;
    return this.accessTokenStore
      .init()
      .then(
        (accessToken: AccessTokenData | undefined) => (accessToken ? accessToken : this.transport.http.postAccess())
      )
      .then((createdAccessToken: AccessTokenData) => {
        context = this.createContext(createdAccessToken.user);
        accessToken = createdAccessToken;
      })
      .then(() => this.initEngine(context))
      .then(() => this.accessTokenStore.updateToken(accessToken))
      .then(() => context);
  }

  public login(loginData: LoginData): Promise<Context> {
    let context: Context;
    let accessToken: AccessTokenData;
    let cookieResponse: AxiosResponse;

    return Promise.resolve()
      .then(() => this.context && this.logout())
      .then(() => this.auth.api.postLogin(loginData))
      .then((response: AxiosResponse<any>) => {
        cookieResponse = response;
        accessToken = response.data;
        context = this.createContext(
          accessToken.user,
          undefined,
          loginData.persist ? ClientType.PERMANENT : ClientType.TEMPORARY
        );
      })
      .then(() => this.initEngine(context))
      .then(() => retrieveCookie(cookieResponse, this.config.store))
      .then(() => this.accessTokenStore.updateToken(accessToken))
      .then(() => context);
  }

  public register(userAccount: RegisterData): Promise<Context> {
    return Promise.resolve()
      .then(() => this.context && this.logout())
      .then(() => this.auth.api.postRegister(userAccount))
      .then((user: User) => this.createContext(user.id))
      .then((context: Context) => this.initEngine(context))
      .then(() => this.init());
  }

  public logout(): Promise<void> {
    return this.auth.api
      .postLogout()
      .then(() => this.disconnect('Closed by client logout'))
      .then(() => this.accessTokenStore.delete())
      .then(() => {
        delete this.context;
      });
  }

  public connect(): Promise<WebSocketClient> {
    if (this.context && this.context.clientId) {
      return this.transport.ws.connect(this.context.clientId);
    } else {
      return this.transport.ws.connect();
    }
  }

  private createContext(userId: string, clientId?: string, clientType?: ClientType): Context {
    if (this.context) {
      this.context = {...this.context, clientId, clientType};
    } else {
      this.context = new Context(userId, clientId, clientType);
    }

    return this.context;
  }

  public disconnect(reason?: string): void {
    this.transport.ws.disconnect(reason);
  }

  private async initEngine(context: Context) {
    const db = await this.config.store.init(
      `${this.STORE_NAME_PREFIX}@${this.config.urls.name}@${context.userId}${
        context.clientType ? `@${context.clientType}` : ''
      }`
    );
    const isDexieStore = db && db.constructor.name === 'Dexie';
    const isSchemalessStore = isDexieStore && Object.keys(db._dbSchema).length === 0;
    if (isSchemalessStore) {
      if (this.config.schemaCallback) {
        this.config.schemaCallback(db);
      } else {
        db.version(1).stores({
          [AUTH_TABLE_NAME]: '',
        });
      }
    }
    return this.config.store;
  }
}

export = Client;
