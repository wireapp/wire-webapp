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
  Button,
  Container,
  ContainerXS,
  Columns,
  Column,
  Checkbox,
  CheckboxLabel,
  RoundIconButton,
  InputSubmitCombo,
  ErrorMessage,
  ICON_NAME,
  Form,
  Input,
  H1,
  Text,
  Link,
  ArrowIcon,
  COLOR,
} from '@wireapp/react-ui-kit';
import * as AuthAction from '../module/action/AuthAction';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as ClientAction from '../module/action/ClientAction';
import * as ClientSelector from '../module/selector/ClientSelector';
import * as ConversationAction from '../module/action/ConversationAction';
import * as SelfSelector from '../module/selector/SelfSelector';
import * as URLUtil from '../util/urlUtil';
import AppAlreadyOpen from '../component/AppAlreadyOpen';
import BackendError from '../module/action/BackendError';
import Page from './Page';
import ValidationError from '../module/action/ValidationError';
import {Link as RRLink} from 'react-router-dom';
import {ROUTE} from '../route';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import {isDesktopApp, isSupportingClipboard} from '../Runtime';
import {loginStrings, ssoLoginStrings} from '../../strings';
import {parseValidationErrors, parseError} from '../util/errorUtil';
import {resetError} from '../module/action/creator/AuthActionCreator';
import {withRouter} from 'react-router';
import {isUUID} from '../util/stringUtil';
import {ClientType} from '@wireapp/api-client/dist/commonjs/client/index';

class SingleSignOn extends React.PureComponent {
  static SSO_CODE_PREFIX = 'wire-';

  inputs = {};
  state = {
    code: '',
    persist: true,
    validInputs: {
      code: true,
    },
    validationErrors: [],
  };

  componentDidMount = () => {
    this.extractSSOLink();
  };

  componentWillReceiveProps = nextProps => {};

  componentWillUnmount = () => {
    this.props.resetError();
  };

  handleSubmit = event => {
    event.preventDefault();
    if (this.props.isFetching) {
      return;
    }
    this.inputs.code.value = this.inputs.code.value.trim();
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
      .then(() =>
        this.props.doLoginSSO({
          clientType: this.state.persist ? ClientType.PERMANENT : ClientType.TEMPORARY,
          code: this.stripCode(this.state.code),
        })
      )
      .then(this.navigateChooseHandleOrWebapp)
      .catch(error => {
        switch (error.label) {
          case BackendError.LABEL.NEW_CLIENT: {
            this.props.resetError();
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
            this.props.resetError();
            return this.props.history.push(ROUTE.CLIENTS);
          }
          default: {
            throw error;
          }
        }
      });
  };

  navigateChooseHandleOrWebapp = () => {
    return this.props.hasSelfHandle
      ? window.location.replace(URLUtil.getAppPath())
      : this.props.history.push(ROUTE.CHOOSE_HANDLE);
  };

  extractSSOLink = event => {
    if (event) {
      event.preventDefault();
    }
    if (isSupportingClipboard()) {
      this.readFromClipboard().then(code => {
        const isValidSSOLink = this.isValidSSOCode(code);
        if (isValidSSOLink) {
          this.setState({code});
        }
      });
    }
  };

  readFromClipboard = () => navigator.clipboard.readText().catch(error => console.error('Something went wrong', error));

  isValidSSOCode = code => code && code.startsWith(SingleSignOn.SSO_CODE_PREFIX) && isUUID(this.stripCode(code));

  stripCode = code => code && code.trim().replace(SingleSignOn.SSO_CODE_PREFIX, '');

  render() {
    const {
      intl: {formatMessage: _},
      loginError,
    } = this.props;
    const {persist, code, validInputs, validationErrors} = this.state;
    return (
      <Page>
        <Container centerText verticalCenter style={{width: '100%'}}>
          <AppAlreadyOpen />
          <Columns>
            <Column style={{display: 'flex'}}>
              <div style={{margin: 'auto'}}>
                <Link to={ROUTE.LOGIN} component={RRLink} data-uie-name="go-login">
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
                  <H1 center>{_(ssoLoginStrings.headline)}</H1>
                  <Text>{_(ssoLoginStrings.subhead)}</Text>
                  <Form style={{marginTop: 30}} data-uie-name="sso">
                    <InputSubmitCombo>
                      <Input
                        name="code"
                        tabIndex="1"
                        onChange={event =>
                          this.setState({
                            code: event.target.value,
                            validInputs: {...validInputs, code: true},
                          })
                        }
                        innerRef={node => (this.inputs.code = node)}
                        markInvalid={!validInputs.code}
                        value={code}
                        autoComplete="section-login sso-code"
                        placeholder={_(ssoLoginStrings.codePlaceholder)}
                        maxLength="128"
                        autoFocus
                        type="text"
                        required
                        data-uie-name="enter-code"
                      />
                      <RoundIconButton
                        tabIndex="2"
                        disabled={!this.isValidSSOCode(code)}
                        type="submit"
                        formNoValidate
                        icon={ICON_NAME.ARROW}
                        onClick={this.handleSubmit}
                        data-uie-name="do-sso-sign-in"
                      />
                    </InputSubmitCombo>
                    {validationErrors.length ? (
                      parseValidationErrors(validationErrors)
                    ) : loginError ? (
                      <ErrorMessage data-uie-name="error-message">{parseError(loginError)}</ErrorMessage>
                    ) : null}
                    {!isDesktopApp() && (
                      <Checkbox
                        tabIndex="3"
                        onChange={event => this.setState({persist: !event.target.checked})}
                        checked={!persist}
                        data-uie-name="enter-public-computer-sso-sign-in"
                        style={{justifyContent: 'center'}}
                      >
                        <CheckboxLabel>{_(loginStrings.publicComputer)}</CheckboxLabel>
                      </Checkbox>
                    )}
                    <Button
                      style={{marginTop: '16px'}}
                      onClick={this.extractSSOLink}
                      disabled={!isSupportingClipboard()}
                      data-uie-name="do-paste-sso-code"
                    >
                      {_(ssoLoginStrings.pasteButton)}
                    </Button>
                  </Form>
                </div>
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
      state => ({
        hasHistory: ClientSelector.hasHistory(state),
        hasSelfHandle: SelfSelector.hasSelfHandle(state),
        isFetching: AuthSelector.isFetching(state),
        loginError: AuthSelector.getError(state),
      }),
      {resetError, ...AuthAction, ...ConversationAction, ...ClientAction}
    )(SingleSignOn)
  )
);
