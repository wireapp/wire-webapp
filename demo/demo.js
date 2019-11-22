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
import {WebSocketClient} from '@wireapp/api-client/dist/tcp/';
import {Button, Form, Input} from '@wireapp/react-ui-kit/Form';
import {COLOR, Logo} from '@wireapp/react-ui-kit/Identity';
import {ContainerXS, Content, Header, StyledApp} from '@wireapp/react-ui-kit/Layout';
import {H1, Link, Text} from '@wireapp/react-ui-kit/Text';
import logdown from 'logdown';
import React, {Component} from 'react';
import ReactDOM from 'react-dom';

const logger = logdown('Demo');
logger.state.isEnabled = true;

const BACKEND_ENV = APIClient.BACKEND.STAGING;

class Auth extends Component {
  constructor(props) {
    super(props);
    this.state = {
      authenticated: false,
      authenticationError: undefined,
      login: {
        email: '',
        password: '',
        persist: false,
      },
    };
    this.doAuth = this.doAuth.bind(this);
    this.onEmailChange = this.onEmailChange.bind(this);
    this.onPasswordChange = this.onPasswordChange.bind(this);
  }

  componentDidMount() {
    window.wire.client
      .init()
      .then(() => this.setState({authenticated: true}))
      .catch(error => {
        logger.error('Could not recover from cookie', error);
      });
  }

  doAuth(event) {
    event.preventDefault();
    this.setState({authenticated: false, authenticationError: undefined});
    return window.wire.client
      .init()
      .catch(() => window.wire.client.login(this.state.login))
      .then(context => {
        logger.log('Login successful', context);
        this.setState({authenticated: true, authenticationError: undefined});
        return window.wire.client.connect();
      })
      .catch(error => {
        this.setState({authenticated: false, authenticationError: error});
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
      <StyledApp>
        <Header>
          <Link href="https://wire.com">
            <Logo />
          </Link>
          <div>&nbsp;</div>
        </Header>
        <Content>
          <ContainerXS verticalCenter>
            <H1 center>API-Client</H1>
            <Form
              onSubmit={this.doAuth}
              style={{
                alignItems: 'center',
                display: 'flex',
              }}
            >
              <Input onChange={this.onEmailChange} placeholder="Email" name="username" />
              <Input onChange={this.onPasswordChange} type="password" placeholder="Password" name="password" />
              <Button type="submit" backgroundColor={this.state.authenticationError ? COLOR.RED : COLOR.GREEN} block>
                {this.state.authenticated ? '😊' : 'Login'}
              </Button>
              <Text center>
                Backend: <Link href={BACKEND_ENV.rest}>{BACKEND_ENV.rest}</Link>
              </Text>
            </Form>
          </ContainerXS>
        </Content>
      </StyledApp>
    );
  }
}

window.onload = function() {
  const config = {
    urls: BACKEND_ENV,
  };
  const client = new APIClient(config);
  client.transport.ws.on(WebSocketClient.TOPIC.ON_MESSAGE, notification => {
    logger.log('Received notification via WebSocket', notification);
  });
  client.on(APIClient.TOPIC.ACCESS_TOKEN_REFRESH, accessToken => {
    logger.log('Acquired AccessToken', accessToken);
  });
  window.wire = Object.assign({}, {client});

  ReactDOM.render(<Auth />, document.getElementById('app'));
};
