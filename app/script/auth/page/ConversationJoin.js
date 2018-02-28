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

import {Container, Header, Footer, Content} from '@wireapp/react-ui-kit/Layout';
import {Form, Button, InputSubmitCombo, Input, RoundIconButton, ErrorMessage} from '@wireapp/react-ui-kit/Form';
import {Logo} from '@wireapp/react-ui-kit/Identity';
import {H1, H2, Text, Link, Small} from '@wireapp/react-ui-kit/Text';
import {conversationJoinStrings} from '../../strings';
import {connect} from 'react-redux';
import {COLOR} from '@wireapp/react-ui-kit/Identity';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import * as ConversationAction from '../module/action/ConversationAction';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as AuthAction from '../module/action/AuthAction';
import {injectIntl} from 'react-intl';
import ROUTE from '../route';
import {withRouter} from 'react-router';
import React, {Component} from 'react';
import {pathWithParams} from '../util/urlUtil';

const CONVERSATION_CODE = 'code';
const CONVERSATION_KEY = 'key';

class ConversationJoin extends Component {
  state = {
    conversationCode: null,
    conversationKey: null,
    enteredName: '',
    validLink: true,
  };

  componentDidMount() {
    const params = new URLSearchParams(this.props.location.search);
    const conversationCode = params.get(CONVERSATION_CODE);
    const conversationKey = params.get(CONVERSATION_KEY);

    this.props
      .doInit()
      .then(() => this.props.doCheckConversationCode(conversationKey, conversationCode))
      .then(() =>
        this.setState({
          ...this.state,
          conversationCode: conversationCode,
          conversationKey: conversationKey,
        })
      )
      .catch(error => {
        this.setState({
          ...this.state,
          validLink: false,
        });
      });
  }

  onOpenWireClick = () => {
    this.props
      .doJoinConversationByCode(this.state.conversationKey, this.state.conversationCode)
      .then(() => {
        const link = document.createElement('a');
        link.href = pathWithParams(ROUTE.LOGIN, 'mode=login');
        document.body.appendChild(link); // workaround for Firefox
        link.click();
      })
      .catch(error => console.error('Failed to create wireless account', error));
  };

  handleSubmit = event => {
    event.preventDefault();
    this.props
      .doRegisterWireless({name: this.state.enteredName})
      .then(() => this.props.doJoinConversationByCode(this.state.conversationKey, this.state.conversationCode))
      .then(() => {
        const link = document.createElement('a');
        link.href = pathWithParams(ROUTE.LOGIN, 'reason=registration');
        document.body.appendChild(link); // workaround for Firefox
        link.click();
      })
      .catch(error => console.error('Failed to create wireless account', error));
  };

  renderExistentAccount = () => {
    const {intl: {formatMessage: _}} = this.props;
    return (
      <div>
        <Content style={{flex: '1', marginTop: '20px', width: '520px'}}>
          <Container verticalCenter>
            <H1 style={{fontWeight: 500}} color={COLOR.GRAY}>
              {_(conversationJoinStrings.headline)}
            </H1>
            <H2>{_(conversationJoinStrings.existentAccountSubhead)}</H2>
            <Button onClick={this.onOpenWireClick}>{_(conversationJoinStrings.existentAccountOpenButton)}</Button>
          </Container>
        </Content>
        <Footer style={{justifyContent: 'flex-end', marginBottom: '30px'}}>
          <Small block>
            <Link href={'/register'} textTransform={'none'} data-uie-name="go-join">
              {_(conversationJoinStrings.existentAccountJoinWithoutLink)}
            </Link>
            {` ${_(conversationJoinStrings.existentAccountJoinWithoutText)}`}
          </Small>
          <Small block>
            {`${_(conversationJoinStrings.acceptTou)} `}
            <Link href={'/terms'} textTransform={'none'} data-uie-name="go-tou">
              {_(conversationJoinStrings.touLink)}
            </Link>
          </Small>
        </Footer>
      </div>
    );
  };

  renderValidLink = () => {
    const {intl: {formatMessage: _}} = this.props;
    const {enteredName, error} = this.state;
    return (
      <div>
        <Content style={{flex: '1', marginTop: '20px', width: '520px'}}>
          <Container verticalCenter>
            <H1 style={{fontWeight: 500}} color={COLOR.GRAY}>
              {_(conversationJoinStrings.headline)}
            </H1>
            <H2>{_(conversationJoinStrings.subhead)}</H2>
            <Form style={{marginTop: 30}}>
              <InputSubmitCombo>
                <Input
                  value={enteredName}
                  innerRef={node => (this.teamNameInput = node)}
                  onChange={event => {
                    this.setState({enteredName: event.target.value});
                  }}
                  placeholder={_(conversationJoinStrings.namePlaceholder)}
                  pattern=".{2,256}"
                  maxLength="256"
                  minLength="2"
                  required
                  autoFocus
                  data-uie-name="enter-name"
                />
                <RoundIconButton
                  disabled={!enteredName}
                  type="submit"
                  formNoValidate
                  onClick={this.handleSubmit}
                  data-uie-name="do-next"
                />
              </InputSubmitCombo>
              <ErrorMessage data-uie-name="error-message">
                {error ? parseValidationErrors(error) : parseError(this.props.error)}
              </ErrorMessage>
            </Form>
          </Container>
        </Content>
        <Footer style={{justifyContent: 'flex-end', marginBottom: '30px'}}>
          <Small block>
            {`${_(conversationJoinStrings.hasAccount)} `}
            <Link href={'/login'} textTransform={'none'} data-uie-name="go-login">
              {_(conversationJoinStrings.loginLink)}
            </Link>
          </Small>
          <Small block>
            {`${_(conversationJoinStrings.acceptTou)} `}
            <Link href={'/terms'} textTransform={'none'} data-uie-name="go-tou">
              {_(conversationJoinStrings.touLink)}
            </Link>
          </Small>
        </Footer>
      </div>
    );
  };

  renderInvalidLink = () => {
    const {intl: {formatMessage: _}} = this.props;
    return (
      <div>
        <Content style={{flex: '1', marginTop: '20px', width: '520px'}}>
          <Container verticalCenter>
            <H1 style={{fontWeight: 500}} color={COLOR.GRAY}>
              {_(conversationJoinStrings.invalidHeadline)}
            </H1>
            <H2>{_(conversationJoinStrings.invalidSubhead)}</H2>
          </Container>
        </Content>
        <Footer style={{justifyContent: 'flex-end', marginBottom: '30px'}}>
          <Small block>
            <Link href={'/register'} textTransform={'none'} data-uie-name="go-register">
              {_(conversationJoinStrings.invalidCreateAccountLink)}
            </Link>
            {` ${_(conversationJoinStrings.invalidCreateAccountText)}`}
          </Small>
        </Footer>
      </div>
    );
  };

  render() {
    const {isAuthenticated, intl: {formatMessage: _}} = this.props;
    const {validLink} = this.state;
    return (
      <Container
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        <Header>
          <Logo width={72} />
          <Text bold>{_(conversationJoinStrings.headerText)}</Text>
        </Header>
        {validLink
          ? isAuthenticated ? this.renderExistentAccount() : this.renderValidLink()
          : this.renderInvalidLink()}
      </Container>
    );
  }
}

export default withRouter(
  injectIntl(
    connect(
      state => ({
        isAuthenticated: AuthSelector.isAuthenticated(state),
      }),
      {...ConversationAction, ...AuthAction}
    )(ConversationJoin)
  )
);
