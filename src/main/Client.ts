//
// Wire
// Copyright (C) 2017 Wire Swiss GmbH
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

import Config from './Config';
import {AccessTokenData, AuthAPI, Context, LoginData, RegisterData} from './auth';
import {AccessTokenStore} from './auth/';
import {AssetAPI} from './asset/';
import {Backend} from './env';
import {ClientAPI} from './client/';
import {ConnectionAPI} from './connection/';
import {ConversationAPI} from './conversation/';
import {GiphyAPI} from './giphy/';
import {HttpClient} from './http/';
import {MemberAPI, PaymentAPI, TeamAPI, TeamInvitationAPI} from './team/';
import {MemoryEngine} from '@wireapp/store-engine/dist/commonjs/engine';
import {SelfAPI} from './self/';
import {UserAPI} from './user/';
import {WebSocketClient} from './tcp/';

class Client {
  // APIs
  public asset: {api: AssetAPI} = {api: undefined};
  public auth: {api: AuthAPI} = {api: undefined};
  public client: {api: ClientAPI} = {api: undefined};
  public connection: {api: ConnectionAPI} = {api: undefined};
  public conversation: {api: ConversationAPI} = {api: undefined};
  public giphy: {api: GiphyAPI} = {api: undefined};
  public self: {api: SelfAPI} = {api: undefined};
  public teams: {
    team: {api: TeamAPI};
    member: {api: MemberAPI};
    invitation: {api: TeamInvitationAPI};
    payment: {api: PaymentAPI};
  } = {
    team: {api: undefined},
    member: {api: undefined},
    invitation: {api: undefined},
    payment: {api: undefined},
  };
  public user: {api: UserAPI} = {api: undefined};

  // Configuration
  private accessTokenStore: AccessTokenStore;
  private config: Config;
  public context: Context = undefined;
  public transport: {http: HttpClient; ws: WebSocketClient} = {
    http: undefined,
    ws: undefined,
  };

  public static BACKEND = Backend;
  public VERSION: string;

  constructor(config: Config) {
    this.config = {
      store: new MemoryEngine('wire'),
      urls: Client.BACKEND.PRODUCTION,
      ...config,
    };

    this.accessTokenStore = new AccessTokenStore(this.config.store);

    this.transport.http = new HttpClient(this.config.urls.rest, this.accessTokenStore);
    this.transport.ws = new WebSocketClient(this.config.urls.ws, this.transport.http);

    this.asset.api = new AssetAPI(this.transport.http);
    this.auth.api = new AuthAPI(this.transport.http, this.config.store);
    this.client.api = new ClientAPI(this.transport.http);
    this.connection.api = new ConnectionAPI(this.transport.http);
    this.conversation.api = new ConversationAPI(this.transport.http);
    this.giphy.api = new GiphyAPI(this.transport.http);
    this.self.api = new SelfAPI(this.transport.http);
    this.teams.invitation.api = new TeamInvitationAPI(this.transport.http);
    this.teams.member.api = new MemberAPI(this.transport.http);
    this.teams.payment.api = new PaymentAPI(this.transport.http);
    this.teams.team.api = new TeamAPI(this.transport.http);
    this.user.api = new UserAPI(this.transport.http);

    this.transport.http.authAPI = this.auth.api;
  }

  public init(): Promise<Context> {
    return this.accessTokenStore
      .init()
      .then((accessToken: AccessTokenData) => (accessToken ? accessToken : this.auth.api.postAccess()))
      .then((accessToken: AccessTokenData) => this.accessTokenStore.updateToken(accessToken))
      .then((accessToken: AccessTokenData) => this.createContext(accessToken.user));
  }

  public login(loginData: LoginData): Promise<Context> {
    return Promise.resolve()
      .then(() => this.context && this.logout())
      .then(() => this.auth.api.postLogin(loginData))
      .then((accessToken: AccessTokenData) => this.accessTokenStore.updateToken(accessToken))
      .then((accessToken: AccessTokenData) => this.createContext(accessToken.user));
  }

  public register(registerData: RegisterData): Promise<Context> {
    return Promise.resolve()
      .then(() => this.context && this.logout())
      .then(() => this.auth.api.postRegister(registerData))
      .then(() => this.init());
  }

  public logout(): Promise<void> {
    return this.auth.api
      .postLogout()
      .then(() => this.disconnect())
      .then(() => this.accessTokenStore.delete())
      .then(() => (this.context = undefined));
  }

  public connect(): Promise<WebSocketClient> {
    return this.transport.ws.connect(this.context.clientID);
  }

  private createContext(userID: string): Context {
    if (this.context) {
      throw new Error(`There is already a context with user ID '${userID}'.`);
    }

    this.context = new Context(userID);
    return this.context;
  }

  public disconnect(): void {
    this.transport.ws.disconnect();
  }
}

Client.prototype.VERSION = require('../../package.json').version;

export = Client;
