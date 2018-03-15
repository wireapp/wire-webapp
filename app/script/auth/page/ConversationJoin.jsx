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
  ContainerXS,
  COLOR,
} from '@wireapp/react-ui-kit';
import {conversationJoinStrings} from '../../strings';
import {connect} from 'react-redux';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import * as ConversationAction from '../module/action/ConversationAction';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import * as ConversationSelector from '../module/selector/ConversationSelector';
import ValidationError from '../module/action/ValidationError';
import * as AuthAction from '../module/action/AuthAction';
import * as StringUtil from '../util/stringUtil';
import {Redirect} from 'react-router';
import {Link as RRLink} from 'react-router-dom';
import ROUTE from '../route';
import {injectIntl, FormattedHTMLMessage} from 'react-intl';
import EXTERNAL_ROUTE from '../externalRoute';
import {withRouter} from 'react-router';
import React, {Component} from 'react';
import {pathWithParams} from '../util/urlUtil';
import BackendError from '../module/action/BackendError';
import AppAlreadyOpen from '../component/AppAlreadyOpen';
import WirelessUnsupportedBrowser from '../component/WirelessUnsupportedBrowser';
import WirelessContainer from '../component/WirelessContainer';

class ConversationJoin extends Component {
  state = {
    conversationCode: null,
    conversationKey: null,
    enteredName: '',
    error: null,
    forceNewTemporaryGuestAccount: false,
    isValidLink: true,
    isValidName: true,
    showCookiePolicyBanner: true,
  };

  readAndUpdateParamsFromUrl = (nextProps = this.props) => {
    const conversationCode = nextProps.match.params.conversationCode;
    const conversationKey = nextProps.match.params.conversationKey;
    const keyOrCodeChanged =
      conversationCode !== this.state.conversationCode || conversationKey !== this.state.conversationKey;
    if (keyOrCodeChanged) {
      this.props
        .doInit()
        .then(() => {
          this.setState((state, props) => ({
            ...state,
            conversationCode,
            conversationKey,
            isValidLink: true,
          }));
        })
        .then(() => this.props.doCheckConversationCode(conversationKey, conversationCode))
        .catch(error => {
          this.setState((state, props) => ({
            ...state,
            isValidLink: false,
          }));
        });
    }
  };

  componentDidMount = () => this.readAndUpdateParamsFromUrl();

  componentWillReceiveProps = nextProps => this.readAndUpdateParamsFromUrl(nextProps);

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
        .then(() => window.location.replace(pathWithParams(EXTERNAL_ROUTE.WEBAPP)));
    }
    this.nameInput.focus();
  };

  isConversationFullError = error =>
    error && error.label && error.is(BackendError.CONVERSATION_ERRORS.CONVERSATION_TOO_MANY_MEMBERS);

  resetErrors = () => this.setState({error: null, isValidName: true});

  renderActivatedAccount = () => {
    const {selfName, intl: {formatMessage: _}} = this.props;
    return (
      <ContainerXS style={{margin: 'auto 0'}}>
        <AppAlreadyOpen />
        <H2
          style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}}
          color={COLOR.GRAY}
          data-uie-name="status-join-headline"
        >
          {selfName ? (
            <FormattedHTMLMessage
              {...conversationJoinStrings.existentAccountHeadline}
              values={{name: StringUtil.capitalize(selfName)}}
            />
          ) : (
            <FormattedHTMLMessage {...conversationJoinStrings.headline} />
          )}
        </H2>
        <H3 style={{marginTop: '10px'}}>{_(conversationJoinStrings.existentAccountSubhead)}</H3>
        <Button onClick={this.onOpenWireClick} data-uie-name="do-open">
          {_(conversationJoinStrings.existentAccountOpenButton)}
        </Button>
        <Small block>
          {`${_(conversationJoinStrings.acceptTou)} `}
          <Link href={EXTERNAL_ROUTE.WIRE_TERMS_PERSONAL} textTransform={'none'} data-uie-name="go-tou">
            {_(conversationJoinStrings.touLink)}
          </Link>
        </Small>
        <Small block>
          <Link
            onClick={() => this.setState({...this.state, forceNewTemporaryGuestAccount: true})}
            textTransform={'none'}
            data-uie-name="go-join"
          >
            {_(conversationJoinStrings.existentAccountJoinWithoutLink)}
          </Link>
          {` ${_(conversationJoinStrings.existentAccountJoinWithoutText)}`}
        </Small>
      </ContainerXS>
    );
  };

  renderTemporaryGuestAccount = () => {
    const {intl: {formatMessage: _}} = this.props;
    const {enteredName, isValidName, error} = this.state;
    return (
      <ContainerXS style={{margin: 'auto 0'}}>
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
          <Link href={EXTERNAL_ROUTE.WIRE_TERMS_PERSONAL} textTransform={'none'} data-uie-name="go-tou">
            {_(conversationJoinStrings.touLink)}
          </Link>
        </Small>
        <Small block>
          {`${_(conversationJoinStrings.hasAccount)} `}
          <Link
            component={RRLink}
            to={`${ROUTE.LOGIN}/${this.state.conversationKey}/${this.state.conversationCode}`}
            textTransform={'none'}
            data-uie-name="go-login"
          >
            {_(conversationJoinStrings.loginLink)}
          </Link>
        </Small>
      </ContainerXS>
    );
  };

  renderFullConversation = () => {
    const {intl: {formatMessage: _}} = this.props;
    return (
      <ContainerXS style={{margin: 'auto 0'}}>
        <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} color={COLOR.GRAY}>
          <FormattedHTMLMessage {...conversationJoinStrings.fullConversationHeadline} />
        </H2>
        <H3 style={{marginTop: '10px'}}>{_(conversationJoinStrings.fullConversationSubhead)}</H3>
      </ContainerXS>
    );
  };

  renderJoin = () => {
    const {error, isAuthenticated} = this.props;
    const {isValidLink, forceNewTemporaryGuestAccount} = this.state;

    if (!isValidLink) {
      return <Redirect to={ROUTE.CONVERSATION_JOIN_INVALID} />;
    }
    if (this.isConversationFullError(error)) {
      return this.renderFullConversation();
    }
    const renderTemporaryGuestAccountCreation = !isAuthenticated || forceNewTemporaryGuestAccount;
    return renderTemporaryGuestAccountCreation ? this.renderTemporaryGuestAccount() : this.renderActivatedAccount();
  };

  render() {
    return (
      <WirelessUnsupportedBrowser>
        <WirelessContainer
          showCookiePolicyBanner={this.state.showCookiePolicyBanner}
          onCookiePolicyBannerClose={() => this.setState({...this.state, showCookiePolicyBanner: false})}
        >
          {this.renderJoin()}
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
        selfName: SelfSelector.getSelfName(state),
      }),
      {...ConversationAction, ...AuthAction}
    )(ConversationJoin)
  )
);
