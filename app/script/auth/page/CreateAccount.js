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

import {connect} from 'react-redux';
import {ArrowIcon} from '@wireapp/react-ui-kit/Icon';
import {Container, ContainerXS, Columns, Column} from '@wireapp/react-ui-kit/Layout';
import {Form, Input, InputBlock, Button, Checkbox} from '@wireapp/react-ui-kit/Form';
import {H1, Link, Small} from '@wireapp/react-ui-kit/Text';
import {injectIntl} from 'react-intl';
import ROUTE from '../route';
import {Link as RRLink} from 'react-router-dom';
import {withRouter} from 'react-router';
import * as AuthAction from '../module/action/AuthAction';
import * as UserAction from '../module/action/UserAction';
import * as AuthSelector from '../module/selector/AuthSelector';
import React, {Component} from 'react';

class CreateAccount extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: this.props.account.email,
      name: this.props.account.name,
      password: this.props.account.password,
    };
  }

  handleSubmit = event => {
    event.preventDefault();
    return Promise.resolve()
      .then(() => this.props.pushAccountRegistrationData({...this.state}))
      .then(() => this.props.doSendActivationCode(this.state.email))
      .then(() => this.props.history.push(ROUTE.VERIFY));
  };

  render() {
    return (
      <Container centerText verticalCenter>
        <Columns>
          <Column style={{display: 'flex'}}>
            <div style={{margin: 'auto'}}>
              <Link to={ROUTE.NEW_TEAM} data-uie-name="go-register-team" component={RRLink}>
                <ArrowIcon direction="left" />
              </Link>
            </div>
          </Column>
          <Column style={{flexGrow: 2}}>
            <ContainerXS
              centerText
              style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
            >
              <div>
                <H1 center>{'Set up your account'}</H1>
                <Form onSubmit={this.handleSubmit}>
                  <InputBlock>
                    <Input
                      name="name"
                      onChange={event => this.setState({name: event.target.value})}
                      defaultValue={this.state.name}
                      autoComplete="section-create-team username"
                      placeholder={'Name'}
                      autoFocus
                      maxLength="64"
                      minLength="2"
                      pattern=".{2,64}"
                      required
                      data-uie-name="enter-name"
                    />
                    <Input
                      name="email"
                      onChange={event => this.setState({email: event.target.value})}
                      defaultValue={this.state.email}
                      autoComplete="section-create-team email"
                      placeholder={'you@yourcompany.com'}
                      placeholderTextTransform="unset"
                      maxLength="128"
                      type="email"
                      required
                      data-uie-name="enter-email"
                    />
                    <Input
                      name="password"
                      onChange={event => this.setState({password: event.target.value})}
                      defaultValue={this.state.password}
                      autoComplete="section-create-team new-password"
                      type="password"
                      placeholder={'Password (min. 8 characters)'}
                      maxLength="1024"
                      minLength="8"
                      pattern=".{8,1024}"
                      required
                      data-uie-name="enter-password"
                    />
                  </InputBlock>
                  <Checkbox name="accept" required data-uie-name="do-terms">
                    <Small textTransform="uppercase">
                      {'I accept the '}
                      <Link data-uie-name="go-terms" href="#" bold fontSize="12px">
                        {'terms and conditions'}
                      </Link>
                    </Small>
                  </Checkbox>
                  <Button data-uie-name="do-next" type="submit">
                    {'Next'}
                  </Button>
                </Form>
              </div>
            </ContainerXS>
          </Column>
          <Column />
        </Columns>
      </Container>
    );
  }
}

export default withRouter(
  injectIntl(
    connect(
      state => ({
        account: AuthSelector.getAccount(state),
      }),
      {...AuthAction, ...UserAction}
    )(CreateAccount)
  )
);
