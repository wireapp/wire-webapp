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

import React from 'react';
import {
  Container,
  ContainerXS,
  Columns,
  Column,
  Form,
  InputSubmitCombo,
  Input,
  InputBlock,
  RoundIconButton,
  Checkbox,
  CheckboxLabel,
  H1,
  Text,
  Link,
  ArrowIcon,
  COLOR,
  ErrorMessage,
} from '@wireapp/react-ui-kit';
import ROUTE from '../route';
import EXTERNAL_ROUTE from '../externalRoute';
import {Link as RRLink} from 'react-router-dom';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import * as AuthAction from '../module/action/AuthAction';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as ConversationAction from '../module/action/ConversationAction';
import ValidationError from '../module/action/ValidationError';
import {loginStrings} from '../../strings';
import RuntimeUtil from '../util/RuntimeUtil';
import AppAlreadyOpen from '../component/AppAlreadyOpen';
import BackendError from '../module/action/BackendError';
import {Redirect, withRouter} from 'react-router';
import * as URLUtil from '../util/urlUtil';
import * as ClientSelector from '../module/selector/ClientSelector';

class Login extends React.PureComponent {
  inputs = {};

  state = {
    conversationCode: null,
    conversationKey: null,
    email: '',
    isValidLink: true,
    loginError: null,
    password: '',
    persist: true,
    validInputs: {
      email: true,
      password: true,
    },
    validationErrors: [],
  };

  readAndUpdateParamsFromUrl = (nextProps = this.props) => {
    const conversationCode = nextProps.match.params.conversationCode;
    const conversationKey = nextProps.match.params.conversationKey;

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

  forgotPassword = () => {
    z.util.safeWindowOpen(z.util.URLUtil.buildUrl(z.util.URLUtil.TYPE.ACCOUNT, z.config.URL_PATH.PASSWORD_RESET));
  };

  handleSubmit = event => {
    event.preventDefault();
    if (this.props.isFetching) {
      return;
    }
    const validationErrors = [];
    const validInputs = this.state.validInputs;
    for (const inputKey of Object.keys(this.inputs)) {
      const currentInput = this.inputs[inputKey];
      if (!currentInput.checkValidity()) {
        validationErrors.push(ValidationError.handleValidationState(currentInput.name, currentInput.validity));
      }
      validInputs[inputKey] = currentInput.validity.valid;
    }
    this.setState({validInputs, validationErrors});
    return Promise.resolve(validationErrors)
      .then(errors => {
        if (errors.length) {
          throw errors[0];
        }
      })
      .then(() => {
        const {email, password, persist} = this.state;
        const login = {password, persist};

        if (this.isValidEmail(email)) {
          login.email = email;
        } else if (this.isValidUsername(email)) {
          login.handle = email.replace('@', '');
        }

        const hasKeyAndCode = this.state.conversationKey && this.state.conversationCode;
        return hasKeyAndCode
          ? this.props.doLoginAndJoin(login, this.state.conversationKey, this.state.conversationCode)
          : this.props.doLogin(login);
      })
      .then(() => window.location.replace(URLUtil.pathWithParams(EXTERNAL_ROUTE.WEBAPP)))
      .catch(error => {
        switch (error.label) {
          case BackendError.LABEL.NEW_CLIENT: {
            const isFirstPersistentClient = login.persist && this.props.clients.length === 1;
            return isFirstPersistentClient
              ? window.location.replace(URLUtil.pathWithParams(EXTERNAL_ROUTE.WEBAPP))
              : this.props.history.push(ROUTE.HISTORY_INFO);
          }
          case BackendError.LABEL.TOO_MANY_CLIENTS: {
            return this.props.history.push(ROUTE.CLIENTS);
          }
          default: {
            this.setState({...this.state, validInputs: {...validInputs, email: false, password: false}});
            throw error;
          }
        }
      });
  };

  isValidEmail = email => {
    const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegex.test(email);
  };

  isValidUsername = username => {
    if (username.startsWith('@')) {
      username = username.substring(1);
    }

    const usernameRegex = /^[a-z_0-9]{2,21}$/;
    return usernameRegex.test(username);
  };

  render() {
    const {intl: {formatMessage: _}, loginError} = this.props;
    const {isValidLink, email, password, persist, validInputs, validationErrors} = this.state;
    return (
      <Container centerText verticalCenter style={{width: '100%'}}>
        {!isValidLink && <Redirect to={ROUTE.CONVERSATION_JOIN_INVALID} />}
        <AppAlreadyOpen />
        <Columns>
          <Column style={{display: 'flex'}}>
            <div style={{margin: 'auto'}}>
              <Link to={ROUTE.INDEX} component={RRLink} data-uie-name="go-index">
                <ArrowIcon direction="left" color={COLOR.GRAY} />
              </Link>
            </div>
          </Column>
          <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
            <ContainerXS
              centerText
              style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
            >
              <div>
                <H1 center>{_(loginStrings.headline)}</H1>
                <Text>{_(loginStrings.subhead)}</Text>
                <Form style={{marginTop: 30}} data-uie-name="login">
                  <InputBlock>
                    <Input
                      name="email"
                      onChange={event =>
                        this.setState({
                          email: event.target.value,
                          validInputs: {...validInputs, email: true},
                        })
                      }
                      innerRef={node => (this.inputs.email = node)}
                      markInvalid={!validInputs.email}
                      disabled={this.props.disableEmail}
                      value={email}
                      autoComplete="section-login email"
                      placeholder={_(loginStrings.emailPlaceholder)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          this.inputs.password.focus();
                        }
                      }}
                      maxLength="128"
                      type="text"
                      required
                      data-uie-name="enter-email"
                    />
                    <InputSubmitCombo>
                      <Input
                        name="password"
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
                        maxLength="1024"
                        minLength="8"
                        pattern=".{8,1024}"
                        required
                        data-uie-name="enter-password"
                      />
                      <RoundIconButton
                        disabled={!email || !password}
                        type="submit"
                        formNoValidate
                        onClick={this.handleSubmit}
                        data-uie-name="do-sign-in"
                      />
                    </InputSubmitCombo>
                  </InputBlock>
                  {validationErrors.length ? (
                    parseValidationErrors(validationErrors)
                  ) : loginError ? (
                    <ErrorMessage data-uie-name="error-message">{parseError(loginError)}</ErrorMessage>
                  ) : null}
                  {!RuntimeUtil.isDesktop() && (
                    <Checkbox
                      onChange={event => this.setState({persist: !event.target.checked})}
                      checked={!persist}
                      data-uie-name="enter-public-computer-sign-in"
                      style={{justifyContent: 'center'}}
                    >
                      <CheckboxLabel>{_(loginStrings.publicComputer)}</CheckboxLabel>
                    </Checkbox>
                  )}
                </Form>
              </div>
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
        clients: ClientSelector.getClients(state),
        isFetching: AuthSelector.isFetching(state),
        loginError: AuthSelector.getError(state),
      }),
      {...AuthAction, ...ConversationAction}
    )(Login)
  )
);
