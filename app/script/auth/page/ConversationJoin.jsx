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

import {
  H2,
  H3,
  Link,
  Small,
  Form,
  Button,
  InputSubmitCombo,
  Input,
  RoundIconButton,
  ErrorMessage,
  Container,
  COLOR,
} from '@wireapp/react-ui-kit';
import {conversationJoinStrings} from '../../strings';
import {connect} from 'react-redux';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import * as ConversationAction from '../module/action/ConversationAction';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as ConversationSelector from '../module/selector/ConversationSelector';
import ValidationError from '../module/action/ValidationError';
import * as AuthAction from '../module/action/AuthAction';
import {injectIntl, FormattedHTMLMessage} from 'react-intl';
import ROUTE from '../route';
import {withRouter} from 'react-router';
import React, {Component} from 'react';
import {pathWithParams} from '../util/urlUtil';
import {Link as RRLink} from 'react-router-dom';
import BackendError from '../module/action/BackendError';
import AppAlreadyOpen from '../component/AppAlreadyOpen';
import WirelessUnsupportedBrowser from '../component/WirelessUnsupportedBrowser';
import WirelessContainer from '../component/WirelessContainer';

const CONVERSATION_CODE = 'code';
const CONVERSATION_KEY = 'key';

class ConversationJoin extends Component {
  state = {
    conversationCode: null,
    conversationKey: null,
    enteredName: '',
    error: null,
    forceNewAccount: false,
    isValidLink: true,
    isValidName: true,
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
          isValidLink: false,
        });
      });
  }

  openWebapp = params => {
    const link = document.createElement('a');
    link.href = pathWithParams(ROUTE.LOGIN, params);
    document.body.appendChild(link); // workaround for Firefox
    link.click();
  };

  onLoginClick = () => this.openWebapp('mode=login');

  onOpenWireClick = () => {
    this.props.doJoinConversationByCode(this.state.conversationKey, this.state.conversationCode).then(() => {
      const link = document.createElement('a');
      link.href = pathWithParams('/');
      document.body.appendChild(link); // workaround for Firefox
      link.click();
    });
  };

  handleSubmit = event => {
    event.preventDefault();
    this.nameInput.value = this.nameInput.value.trim();
    if (!this.nameInput.checkValidity()) {
      this.setState({
        error: ValidationError.handleValidationState('name', this.nameInput.validity),
        isValidName: false,
      });
    } else {
      Promise.resolve(this.nameInput.value)
        .then(name => name.trim())
        .then(name => this.props.doRegisterWireless({name}))
        .then(() => this.props.doJoinConversationByCode(this.state.conversationKey, this.state.conversationCode))
        .then(() => this.openWebapp('reason=registration'));
    }
    this.nameInput.focus();
  };

  isConversationFullErrorPresent = error =>
    error && error.label && error.is(BackendError.CONVERSATION_ERRORS.CONVERSATION_TOO_MANY_MEMBERS);

  resetErrors = () => this.setState({error: null, isValidName: true});

  renderExistentAccount = () => {
    const {intl: {formatMessage: _}} = this.props;
    return (
      <Container verticalCenter>
        <AppAlreadyOpen />
        <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} color={COLOR.GRAY}>
          <FormattedHTMLMessage {...conversationJoinStrings.headline} />
        </H2>
        <H3 style={{marginTop: '10px'}}>{_(conversationJoinStrings.existentAccountSubhead)}</H3>
        <Button onClick={this.onOpenWireClick}>{_(conversationJoinStrings.existentAccountOpenButton)}</Button>
        <Small block>
          {`${_(conversationJoinStrings.acceptTou)} `}
          <Link href={`${ROUTE.WIRE_ROOT}/legal/terms/personal`} textTransform={'none'} data-uie-name="go-tou">
            {_(conversationJoinStrings.touLink)}
          </Link>
        </Small>
        <Small block>
          <Link
            onClick={() => this.setState({...this.state, forceNewAccount: true})}
            textTransform={'none'}
            data-uie-name="go-join"
          >
            {_(conversationJoinStrings.existentAccountJoinWithoutLink)}
          </Link>
          {` ${_(conversationJoinStrings.existentAccountJoinWithoutText)}`}
        </Small>
      </Container>
    );
  };

  renderNewAnonAccount = () => {
    const {intl: {formatMessage: _}} = this.props;
    const {enteredName, isValidName, error} = this.state;
    return (
      <Container verticalCenter>
        <AppAlreadyOpen />
        <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} color={COLOR.GRAY}>
          <FormattedHTMLMessage {...conversationJoinStrings.headline} />
        </H2>
        <H3 style={{marginTop: '10px'}}>
          <FormattedHTMLMessage {...conversationJoinStrings.subhead} />
        </H3>
        <Form style={{marginTop: 30}}>
          <InputSubmitCombo>
            <Input
              name="name"
              autoComplete="username"
              value={enteredName}
              innerRef={node => (this.nameInput = node)}
              onChange={event => {
                this.resetErrors();
                this.setState({enteredName: event.target.value});
              }}
              placeholder={_(conversationJoinStrings.namePlaceholder)}
              autoFocus
              maxLength="64"
              minLength="2"
              pattern=".{2,64}"
              required
              data-uie-name="enter-name"
            />
            <RoundIconButton
              disabled={!enteredName || !isValidName}
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
        <Small block>
          {`${_(conversationJoinStrings.acceptTou)} `}
          <Link href={`${ROUTE.WIRE_ROOT}/legal/terms/personal`} textTransform={'none'} data-uie-name="go-tou">
            {_(conversationJoinStrings.touLink)}
          </Link>
        </Small>
        <Small block>
          {`${_(conversationJoinStrings.hasAccount)} `}
          <Link onClick={this.onLoginClick} textTransform={'none'} data-uie-name="go-login">
            {_(conversationJoinStrings.loginLink)}
          </Link>
        </Small>
      </Container>
    );
  };

  renderInvalidLink = () => {
    const {intl: {formatMessage: _}} = this.props;
    return (
      <Container verticalCenter>
        <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} color={COLOR.GRAY}>
          <FormattedHTMLMessage {...conversationJoinStrings.invalidHeadline} />
        </H2>
        <H3 style={{marginTop: '10px'}}>{_(conversationJoinStrings.invalidSubhead)}</H3>
        <Small block>
          <Link to={ROUTE.INDEX} component={RRLink} textTransform={'none'} data-uie-name="go-register">
            {_(conversationJoinStrings.invalidCreateAccountLink)}
          </Link>
          {` ${_(conversationJoinStrings.invalidCreateAccountText)}`}
        </Small>
      </Container>
    );
  };

  renderFullConversation = () => {
    const {intl: {formatMessage: _}} = this.props;
    return (
      <Container verticalCenter>
        <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} color={COLOR.GRAY}>
          <FormattedHTMLMessage {...conversationJoinStrings.fullConversationHeadline} />
        </H2>
        <H3 style={{marginTop: '10px'}}>{_(conversationJoinStrings.fullConversationSubhead)}</H3>
      </Container>
    );
  };

  render() {
    const {error, isAuthenticated} = this.props;
    const {isValidLink, forceNewAccount} = this.state;
    return (
      <WirelessUnsupportedBrowser>
        <WirelessContainer>
          {isValidLink
            ? this.isConversationFullErrorPresent(error)
              ? this.renderFullConversation()
              : !isAuthenticated || forceNewAccount ? this.renderNewAnonAccount() : this.renderExistentAccount()
            : this.renderInvalidLink()}
        </WirelessContainer>
      </WirelessUnsupportedBrowser>
    );
  }
}

export default withRouter(
  injectIntl(
    connect(
      state => ({
        error: ConversationSelector.getError(state),
        isAuthenticated: AuthSelector.isAuthenticated(state),
        isFetching: ConversationSelector.isFetching(state),
      }),
      {...ConversationAction, ...AuthAction}
    )(ConversationJoin)
  )
);
