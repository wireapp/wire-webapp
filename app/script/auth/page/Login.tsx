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

import * as React from 'react';
import {
  Container,
  ContainerXS,
  Columns,
  Column,
  Form,
  ICON_NAME,
  InputSubmitCombo,
  Input,
  InputBlock,
  RoundIconButton,
  Checkbox,
  CheckboxLabel,
  H1,
  Muted,
  Small,
  Link,
  Loading,
  ArrowIcon,
  COLOR,
  ErrorMessage,
  IsMobile,
} from '@wireapp/react-ui-kit';
import * as Environment from '../Environment';
import {ROUTE, QUERY_KEY} from '../route';
import EXTERNAL_ROUTE from '../externalRoute';
import {Link as RRLink} from 'react-router-dom';
import {connect} from 'react-redux';
import {injectIntl, FormattedHTMLMessage, InjectedIntlProps} from 'react-intl';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import ValidationError from '../module/action/ValidationError';
import {loginStrings, logoutReasonStrings} from '../../strings';
import {isDesktopApp} from '../Runtime';
import AppAlreadyOpen from '../component/AppAlreadyOpen';
import BackendError from '../module/action/BackendError';
import {Redirect, withRouter, RouteComponentProps} from 'react-router';
import * as URLUtil from '../util/urlUtil';
import * as ClientSelector from '../module/selector/ClientSelector';
import Page from './Page';
import {ClientType, RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/index';
import {RootState, Api} from '../module/reducer';
import {ThunkDispatch} from 'redux-thunk';
import {AnyAction} from 'redux';
import ROOT_ACTIONS from '../module/action/';
import {LoginData} from '@wireapp/api-client/dist/commonjs/auth';

interface Props extends React.HTMLAttributes<Login>, RouteComponentProps {}

interface ConnectedProps {
  hasHistory: boolean;
  hasSelfHandle: boolean;
  isFetching: boolean;
  loginError: Error;
}

interface DispatchProps {
  doCheckConversationCode: (conversationKey: string, conversationCode: string) => Promise<void>;
  resetAuthError: () => Promise<void>;
  doInitializeClient: (clientType: ClientType, password?: string) => Promise<void>;
  doInit: (options: {isImmediateLogin: boolean}) => Promise<void>;
  doLoginAndJoin: (login: LoginData, conversationKey: string, conversationCode: string) => Promise<void>;
  doLogin: (login: LoginData) => Promise<void>;
  doGetAllClients: () => Promise<RegisteredClient[]>;
}

interface State {
  conversationCode: string;
  conversationKey: string;
  email: string;
  hideSSOLogin: boolean;
  isValidLink: boolean;
  logoutReason: string;
  password: string;
  persist: boolean;
  validInputs: {
    email: boolean;
    password: boolean;
  };
  validationErrors: Error[];
}

class Login extends React.Component<Props & ConnectedProps & DispatchProps & InjectedIntlProps, State> {
  private inputs: {
    email?: HTMLInputElement;
    password?: HTMLInputElement;
  } = {};

  state = {
    conversationCode: null,
    conversationKey: null,
    email: '',
    hideSSOLogin: false,
    isValidLink: true,
    logoutReason: null,
    password: '',
    persist: true,
    validInputs: {
      email: true,
      password: true,
    },
    validationErrors: [],
  };

  readAndUpdateParamsFromUrl = nextProps => {
    const logoutReason = URLUtil.getURLParameter(QUERY_KEY.LOGOUT_REASON) || null;
    const logoutReasonChanged = logoutReason !== this.state.logoutReason;

    if (logoutReason && logoutReasonChanged) {
      this.setState((state, props) => ({...state, logoutReason}));
    }

    const conversationCode = URLUtil.getURLParameter(QUERY_KEY.CONVERSATION_CODE) || null;
    const conversationKey = URLUtil.getURLParameter(QUERY_KEY.CONVERSATION_KEY) || null;

    const keyAndCodeExistent = conversationKey && conversationCode;
    const keyChanged = conversationKey !== this.state.conversationKey;
    const codeChanged = conversationCode !== this.state.conversationCode;
    const keyOrCodeChanged = keyChanged || codeChanged;
    if (keyAndCodeExistent && keyOrCodeChanged) {
      Promise.resolve()
        .then(() => {
          this.setState((state, props) => ({
            ...state,
            conversationCode,
            conversationKey,
            isValidLink: true,
            logoutReason,
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

    this.setState((state, props) => ({hideSSOLogin: URLUtil.hasURLParameter(QUERY_KEY.HIDE_SSO)}));
  };

  componentDidMount = () => {
    this.props.resetAuthError();
    const immediateLogin = URLUtil.hasURLParameter(QUERY_KEY.IMMEDIATE_LOGIN);
    if (immediateLogin) {
      return this.immediateLogin();
    }
    return this.readAndUpdateParamsFromUrl(this.props);
  };

  componentWillReceiveProps = nextProps => this.readAndUpdateParamsFromUrl(nextProps);

  componentWillUnmount = () => {
    this.props.resetAuthError();
  };

  immediateLogin = () => {
    return Promise.resolve()
      .then(() => this.props.doInit({isImmediateLogin: true}))
      .then(() => this.props.doInitializeClient(ClientType.PERMANENT, undefined))
      .then(this.navigateChooseHandleOrWebapp)
      .catch(() => {});
  };

  navigateChooseHandleOrWebapp = () => {
    return this.props.hasSelfHandle
      ? window.location.replace(URLUtil.pathWithParams(EXTERNAL_ROUTE.WEBAPP))
      : this.props.history.push(ROUTE.CHOOSE_HANDLE);
  };

  forgotPassword = () => URLUtil.openTab(EXTERNAL_ROUTE.WIRE_ACCOUNT_PASSWORD_RESET);

  handleSubmit = event => {
    event.preventDefault();
    if (this.props.isFetching) {
      return undefined;
    }
    this.inputs.email.value = this.inputs.email.value.trim();
    const validationErrors = [];
    const validInputs = this.state.validInputs;

    Object.entries(this.inputs).forEach(([inputKey, currentInput]) => {
      if (!currentInput.checkValidity()) {
        validationErrors.push(ValidationError.handleValidationState(currentInput.name, currentInput.validity));
      }
      validInputs[inputKey] = currentInput.validity.valid;
    });

    this.setState({validInputs, validationErrors});
    return Promise.resolve(validationErrors)
      .then(errors => {
        if (errors.length) {
          throw errors[0];
        }
      })
      .then(() => {
        const {password, persist} = this.state;
        const email = this.state.email.trim();
        const login: LoginData = {clientType: persist ? ClientType.PERMANENT : ClientType.TEMPORARY, password};

        if (this.isValidEmail(email)) {
          login.email = email;
        } else if (this.isValidUsername(email)) {
          login.handle = email.replace('@', '');
        } else if (this.isValidPhoneNumber(email)) {
          login.phone = email;
        }

        const hasKeyAndCode = this.state.conversationKey && this.state.conversationCode;
        return hasKeyAndCode
          ? this.props.doLoginAndJoin(login, this.state.conversationKey, this.state.conversationCode)
          : this.props.doLogin(login);
      })
      .then(this.navigateChooseHandleOrWebapp)
      .catch(error => {
        switch (error.label) {
          case BackendError.LABEL.NEW_CLIENT: {
            this.props.resetAuthError();
            /**
             * Show history screen if:
             *   1. database contains at least one event
             *   2. there is at least one previously registered client
             *   3. new local client is temporary
             */
            return this.props.doGetAllClients().then(clients => {
              const shouldShowHistoryInfo = this.props.hasHistory || clients.length > 1 || !this.state.persist;
              return shouldShowHistoryInfo
                ? this.props.history.push(ROUTE.HISTORY_INFO)
                : this.navigateChooseHandleOrWebapp();
            });
          }
          case BackendError.LABEL.TOO_MANY_CLIENTS: {
            this.props.resetAuthError();
            return this.props.history.push(ROUTE.CLIENTS);
          }
          default: {
            throw error;
          }
        }
      });
  };

  isValidEmail = email => {
    const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegex.test(email);
  };

  isValidPhoneNumber = phoneNumber => {
    const isProductionBackend = Environment.isEnvironment(Environment.PRODUCTION);
    const e164regex = isProductionBackend ? /^\+[1-9]\d{1,14}$/ : /^\+[0-9]\d{1,14}$/;

    return e164regex.test(phoneNumber);
  };

  isValidUsername = username => {
    if (username.startsWith('@')) {
      username = username.substring(1);
    }

    const usernameRegex = /^[a-z_0-9]{2,21}$/;
    return usernameRegex.test(username);
  };

  render() {
    const {
      intl: {formatMessage: _},
      loginError,
    } = this.props;
    const {
      logoutReason,
      isValidLink,
      hideSSOLogin,
      email,
      password,
      persist,
      validInputs,
      validationErrors,
    } = this.state;
    const backArrow = (
      <Link to={ROUTE.INDEX} component={RRLink} data-uie-name="go-index">
        <ArrowIcon direction="left" color={COLOR.TEXT} style={{opacity: 0.56}} />
      </Link>
    );
    return (
      <Page>
        <IsMobile>
          <div style={{margin: 16}}>{backArrow}</div>
        </IsMobile>
        <Container centerText verticalCenter style={{width: '100%'}}>
          {!isValidLink && <Redirect to={ROUTE.CONVERSATION_JOIN_INVALID} />}
          <AppAlreadyOpen />
          <Columns>
            <IsMobile not>
              <Column style={{display: 'flex'}}>
                <div style={{margin: 'auto'}}>{backArrow}</div>
              </Column>
            </IsMobile>
            <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
              <ContainerXS
                centerText
                style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
              >
                <div>
                  <H1 center>{_(loginStrings.headline)}</H1>
                  <Muted>{_(loginStrings.subhead)}</Muted>
                  <Form style={{marginTop: 30}} data-uie-name="login">
                    <InputBlock>
                      <Input
                        name="email"
                        tabIndex={1}
                        onChange={event =>
                          this.setState({
                            email: event.target.value,
                            validInputs: {...validInputs, email: true},
                          })
                        }
                        innerRef={node => (this.inputs.email = node)}
                        markInvalid={!validInputs.email}
                        value={email}
                        autoComplete="section-login email"
                        placeholder={_(loginStrings.emailPlaceholder)}
                        maxLength={128}
                        type="text"
                        required
                        data-uie-name="enter-email"
                      />
                      <InputSubmitCombo>
                        <Input
                          name="password-login"
                          tabIndex={2}
                          onChange={event =>
                            this.setState({
                              password: event.target.value,
                              validInputs: {...validInputs, password: true},
                            })
                          }
                          innerRef={node => (this.inputs.password = node)}
                          markInvalid={!validInputs.password}
                          value={password}
                          autoComplete="section-login password"
                          type="password"
                          placeholder={_(loginStrings.passwordPlaceholder)}
                          maxLength={1024}
                          minLength={8}
                          pattern=".{8,1024}"
                          required
                          data-uie-name="enter-password"
                        />
                        {this.props.isFetching ? (
                          <Loading size={32} />
                        ) : (
                          <RoundIconButton
                            tabIndex={4}
                            disabled={!email || !password}
                            type="submit"
                            formNoValidate
                            icon={ICON_NAME.ARROW}
                            onClick={this.handleSubmit}
                            data-uie-name="do-sign-in"
                          />
                        )}
                      </InputSubmitCombo>
                    </InputBlock>
                    {validationErrors.length ? (
                      parseValidationErrors(validationErrors)
                    ) : loginError ? (
                      <ErrorMessage data-uie-name="error-message">{parseError(loginError)}</ErrorMessage>
                    ) : logoutReason ? (
                      <Small center style={{marginBottom: '16px'}} data-uie-name="status-logout-reason">
                        <FormattedHTMLMessage {...logoutReasonStrings[logoutReason]} />
                      </Small>
                    ) : (
                      <div style={{marginTop: '4px'}}>&nbsp;</div>
                    )}
                    {!isDesktopApp() && (
                      <Checkbox
                        tabIndex={3}
                        onChange={event => this.setState({persist: !event.target.checked})}
                        checked={!persist}
                        data-uie-name="enter-public-computer-sign-in"
                        style={{justifyContent: 'center', marginTop: '12px'}}
                      >
                        <CheckboxLabel>{_(loginStrings.publicComputer)}</CheckboxLabel>
                      </Checkbox>
                    )}
                  </Form>
                </div>
                {Environment.isInternalEnvironment() && !isDesktopApp() && !hideSSOLogin ? (
                  <div style={{marginTop: '36px'}}>
                    <Link center onClick={this.forgotPassword} data-uie-name="go-forgot-password">
                      {_(loginStrings.forgotPassword)}
                    </Link>
                    <Columns style={{marginTop: '36px'}}>
                      <Column>
                        <Link to={ROUTE.SSO} component={RRLink} data-uie-name="go-sign-in-sso">
                          {_(loginStrings.ssoLogin)}
                        </Link>
                      </Column>
                      <Column>
                        <Link
                          href={EXTERNAL_ROUTE.PHONE_LOGIN + window.location.search}
                          data-uie-name="go-sign-in-phone"
                        >
                          {_(loginStrings.phoneLogin)}
                        </Link>
                      </Column>
                    </Columns>
                  </div>
                ) : (
                  <Columns>
                    <Column>
                      <Link onClick={this.forgotPassword} data-uie-name="go-forgot-password">
                        {_(loginStrings.forgotPassword)}
                      </Link>
                    </Column>
                    <Column>
                      <Link href={EXTERNAL_ROUTE.PHONE_LOGIN + window.location.search} data-uie-name="go-sign-in-phone">
                        {_(loginStrings.phoneLogin)}
                      </Link>
                    </Column>
                  </Columns>
                )}
              </ContainerXS>
            </Column>
            <Column />
          </Columns>
        </Container>
      </Page>
    );
  }
}

export default withRouter(
  injectIntl(
    connect(
      (state: RootState): ConnectedProps => ({
        hasHistory: ClientSelector.hasHistory(state),
        hasSelfHandle: SelfSelector.hasSelfHandle(state),
        isFetching: AuthSelector.isFetching(state),
        loginError: AuthSelector.getError(state),
      }),
      (dispatch: ThunkDispatch<RootState, Api, AnyAction>): DispatchProps => ({
        doCheckConversationCode: (conversationKey: string, conversationCode: string) =>
          dispatch(ROOT_ACTIONS.conversationAction.doCheckConversationCode(conversationKey, conversationCode)),
        resetAuthError: () => dispatch(ROOT_ACTIONS.authAction.resetAuthError()),
        doInitializeClient: (clientType: ClientType, password?: string) =>
          dispatch(ROOT_ACTIONS.clientAction.doInitializeClient(clientType, password)),
        doInit: (options: {isImmediateLogin: boolean; shouldValidateLocalClient: boolean}) =>
          dispatch(ROOT_ACTIONS.authAction.doInit(options)),
        doLoginAndJoin: (login: LoginData, conversationKey: string, conversationCode: string) =>
          dispatch(ROOT_ACTIONS.authAction.doLoginAndJoin(login, conversationKey, conversationCode)),
        doLogin: (login: LoginData) => dispatch(ROOT_ACTIONS.authAction.doLogin(login)),
        doGetAllClients: () => dispatch(ROOT_ACTIONS.clientAction.doGetAllClients()),
      })
    )(Login)
  )
);
