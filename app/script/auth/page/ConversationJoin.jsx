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
  Text,
  Link,
  Small,
  Form,
  Button,
  ICON_NAME,
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
import {isMobileOs, isSafari} from '../Runtime';
import * as Environment from '../Environment';
import * as ConversationAction from '../module/action/ConversationAction';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import * as ConversationSelector from '../module/selector/ConversationSelector';
import ValidationError from '../module/action/ValidationError';
import * as AuthAction from '../module/action/AuthAction';
import * as NotificationAction from '../module/action/NotificationAction';
import * as StringUtil from '../util/stringUtil';
import {Redirect} from 'react-router';
import {Link as RRLink} from 'react-router-dom';
import {ROUTE, QUERY_KEY} from '../route';
import {injectIntl, FormattedHTMLMessage} from 'react-intl';
import {withRouter} from 'react-router';
import React, {Component} from 'react';
import {getURLParameter, getAppPath, hasURLParameter, pathWithParams} from '../util/urlUtil';
import BackendError from '../module/action/BackendError';
import AppAlreadyOpen from '../component/AppAlreadyOpen';
import WirelessUnsupportedBrowser from '../component/WirelessUnsupportedBrowser';
import WirelessContainer from '../component/WirelessContainer';
import * as AccentColor from '../util/AccentColor';
import EXTERNAL_ROUTE from '../externalRoute';

class ConversationJoin extends Component {
  state = {
    accentColor: AccentColor.random(),
    conversationCode: null,
    conversationKey: null,
    enteredName: '',
    error: null,
    expiresIn: undefined,
    forceNewTemporaryGuestAccount: false,
    isValidLink: true,
    isValidName: true,
    showCookiePolicyBanner: true,
  };

  readAndUpdateParamsFromUrl = nextProps => {
    if (this.isPwaSupportedBrowser()) {
      this.setState({forceNewTemporaryGuestAccount: true});
    }
    const conversationCode = getURLParameter(QUERY_KEY.CONVERSATION_CODE);
    const conversationKey = getURLParameter(QUERY_KEY.CONVERSATION_KEY);
    const expiresIn = parseInt(getURLParameter(QUERY_KEY.JOIN_EXPIRES), 10) || undefined;

    const codeParamChanged = conversationCode !== this.state.conversationCode;
    const keyParamChanged = conversationKey !== this.state.conversationKey;
    const expiresInParamChanged = expiresIn !== this.state.expiresIn;
    const urlParamChanged = codeParamChanged || keyParamChanged || expiresInParamChanged;

    if (urlParamChanged) {
      Promise.resolve()
        .then(() => {
          this.setState((state, props) => ({
            ...state,
            conversationCode,
            conversationKey,
            expiresIn,
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

  componentDidMount = () => {
    this.props
      .doInit({shouldValidateLocalClient: true})
      .catch(() => {})
      .then(() => this.readAndUpdateParamsFromUrl(this.props));
  };

  componentWillReceiveProps = nextProps => this.readAndUpdateParamsFromUrl(nextProps);

  onOpenWireClick = () => {
    this.props
      .doJoinConversationByCode(this.state.conversationKey, this.state.conversationCode)
      .then(() => this.routeToApp());
  };

  isPwaSupportedBrowser = () => {
    const pwaAware = hasURLParameter(QUERY_KEY.PWA_AWARE);
    return Environment.onEnvironment({
      onProduction: false,
      onStaging: pwaAware && (isMobileOs() || isSafari()),
    });
  };

  routeToApp = () => {
    const redirectLocation = this.isPwaSupportedBrowser()
      ? pathWithParams(EXTERNAL_ROUTE.PWA_LOGIN, QUERY_KEY.IMMEDIATE_LOGIN)
      : getAppPath();
    window.location.replace(redirectLocation);
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
        .then(name => {
          const registrationData = {
            accent_id: this.state.accentColor.id,
            expires_in: this.state.expiresIn,
            name,
          };
          return this.props.doRegisterWireless(registrationData, {
            shouldInitializeClient: !this.isPwaSupportedBrowser(),
          });
        })
        .then(() => this.props.doJoinConversationByCode(this.state.conversationKey, this.state.conversationCode))
        .then(conversationEvent => this.props.setLastEventDate(new Date(conversationEvent.time)))
        .then(() => this.routeToApp())
        .catch(error => this.props.doLogout());
    }
    this.nameInput.focus();
  };

  isConversationFullError = error =>
    error && error.label && error.label === BackendError.CONVERSATION_ERRORS.CONVERSATION_TOO_MANY_MEMBERS;

  resetErrors = () => this.setState({error: null, isValidName: true});

  renderActivatedAccount = () => {
    const {
      selfName,
      intl: {formatMessage: _},
    } = this.props;
    const {error} = this.state;
    return (
      <ContainerXS style={{margin: 'auto 0'}}>
        <AppAlreadyOpen fullscreen={this.isPwaSupportedBrowser()} />
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
        <Text block style={{fontSize: '16px', marginTop: '10px'}}>
          {_(conversationJoinStrings.existentAccountSubhead)}
        </Text>
        <Button style={{marginTop: 16}} onClick={this.onOpenWireClick} data-uie-name="do-open">
          {_(conversationJoinStrings.existentAccountOpenButton)}
        </Button>
        <ErrorMessage data-uie-name="error-message">
          {error ? parseValidationErrors(error) : parseError(this.props.error)}
        </ErrorMessage>
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
    const {
      intl: {formatMessage: _},
    } = this.props;
    const {enteredName, isValidName, error} = this.state;
    return (
      <ContainerXS style={{margin: 'auto 0'}}>
        <AppAlreadyOpen fullscreen={this.isPwaSupportedBrowser()} />
        <H2 style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}} color={COLOR.GRAY}>
          <FormattedHTMLMessage {...conversationJoinStrings.headline} />
        </H2>
        <Text style={{fontSize: '16px', marginTop: '10px'}}>
          <FormattedHTMLMessage {...conversationJoinStrings.subhead} />
        </Text>
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
              icon={ICON_NAME.ARROW}
              onClick={this.handleSubmit}
              data-uie-name="do-next"
            />
          </InputSubmitCombo>
          <ErrorMessage data-uie-name="error-message">
            {error ? parseValidationErrors(error) : parseError(this.props.error)}
          </ErrorMessage>
        </Form>
        {!this.isPwaSupportedBrowser() && (
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
        )}
      </ContainerXS>
    );
  };

  renderFullConversation = () => {
    const {
      intl: {formatMessage: _},
    } = this.props;
    return (
      <ContainerXS style={{margin: 'auto 0'}}>
        <H2
          style={{fontWeight: 500, marginBottom: '10px', marginTop: '0'}}
          color={COLOR.GRAY}
          data-uie-name="status-full-headline"
        >
          <FormattedHTMLMessage {...conversationJoinStrings.fullConversationHeadline} />
        </H2>
        <Text style={{fontSize: '16px', marginTop: '10px'}} data-uie-name="status-full-text">
          {_(conversationJoinStrings.fullConversationSubhead)}
        </Text>
      </ContainerXS>
    );
  };

  renderJoin = () => {
    const {error, isAuthenticated, isTemporaryGuest} = this.props;
    const {isValidLink, forceNewTemporaryGuestAccount} = this.state;

    if (!isValidLink) {
      return <Redirect to={ROUTE.CONVERSATION_JOIN_INVALID} />;
    }
    if (this.isConversationFullError(error)) {
      return this.renderFullConversation();
    }
    const renderTemporaryGuestAccountCreation = !isAuthenticated || isTemporaryGuest || forceNewTemporaryGuestAccount;
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
        isTemporaryGuest: SelfSelector.isTemporaryGuest(state),
        selfName: SelfSelector.getSelfName(state),
      }),
      {
        ...AuthAction,
        ...ConversationAction,
        ...NotificationAction,
      }
    )(ConversationJoin)
  )
);
