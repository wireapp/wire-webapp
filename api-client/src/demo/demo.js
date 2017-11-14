/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import Client from '../../dist/commonjs/Client';
import {AccessTokenStore} from '../../dist/commonjs/auth/';
import {WebSocketClient} from '../../dist/commonjs/tcp/';
import {MemoryEngine} from '@wireapp/store-engine/dist/commonjs/engine';
import {
  Button,
  COLOR,
  ContainerMD,
  ContainerXS,
  Form,
  H1,
  Input,
  Link,
  Logo,
  Text,
} from '@wireapp/react-ui-kit';
import React, {Component} from 'react';
import ReactDOM from 'react-dom';

const BACKEND_ENV = Client.BACKEND.STAGING;

class Auth extends Component {
  constructor(props) {
    super(props);
    this.state = {
      login: {
        email: window.wire.email,
        password: window.wire.password,
        persist: false,
      },
      authenticated: false,
    };
    this.doAuth = this.doAuth.bind(this);
    this.onEmailChange = this.onEmailChange.bind(this);
    this.onPasswordChange = this.onPasswordChange.bind(this);
  }

  doAuth(event) {
    event.preventDefault();
    this.setState({authenticated: false});
    return Promise.resolve()
      .then(() => window.wire.client.init())
      .catch(error => window.wire.client.login(this.state.login))
      .then(context => {
        console.log('Login successful', context);
        this.setState({authenticated: true});
        return window.wire.client.connect();
      });
  }

  onEmailChange(event) {
    this.setState({login: Object.assign(this.state.login, {email: event.target.value})});
  }

  onPasswordChange(event) {
    this.setState({login: Object.assign(this.state.login, {password: event.target.value})});
  }

  render() {
    return (
      <ContainerMD>
        <Link href="https://wire.com">
          <Logo />
        </Link>
        <ContainerXS>
          <H1 center>API-Client</H1>
          <Form
            onSubmit={this.doAuth}
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Input onChange={this.onEmailChange} placeholder="Email" />
            <Input onChange={this.onPasswordChange} type="password" placeholder="Password" />
            <Button type="submit" backgroundColor={COLOR.GREEN} block>
              {this.state.authenticated ? '😊' : 'Login'}
            </Button>
            <Text center>
              Backend: <Link href={BACKEND_ENV.rest}>{BACKEND_ENV.rest}</Link>
            </Text>
            <Text center>Version: {window.wire.client.VERSION}</Text>
          </Form>
        </ContainerXS>
      </ContainerMD>
    );
  }
}

window.onload = function() {
  const config = {store: new MemoryEngine('wire-demo'), urls: BACKEND_ENV};
  const client = new Client(config);
  client.transport.ws.on(WebSocketClient.TOPIC.ON_MESSAGE, notification => {
    console.log('Received notification via WebSocket', notification);
  });
  client.accessTokenStore.on(AccessTokenStore.TOPIC.ACCESS_TOKEN_REFRESH, accessToken => {
    console.log('Acquired AccessToken', accessToken);
  });
  window.wire = Object.assign({}, {client});

  ReactDOM.render(<Auth />, document.getElementById('app'));
};
