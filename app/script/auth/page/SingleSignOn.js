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
  Overlay,
  Text,
  Logo,
  Form,
  Input,
  H1,
  Muted,
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
import {UUID_REGEX} from '../util/stringUtil';
import {ClientType} from '@wireapp/api-client/dist/commonjs/client/index';

class SingleSignOn extends React.PureComponent {
  static SSO_CODE_PREFIX = 'wire-';

  inputs = {};
  state = {
    clipboardError: null,
    code: '',
    persist: true,
    validInputs: {
      code: true,
    },
    validationErrors: [],
  };

  componentDidMount = () => {
    if (isDesktopApp() && isSupportingClipboard()) {
      this.extractSSOLink(undefined, false);
    }
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
          code: this.stripPrefix(this.state.code),
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

  focusChildWindow = () => this.props.authWindowRef && this.props.authWindowRef.focus();

  extractSSOLink = (event, shouldEmitError = true) => {
    if (event) {
      event.preventDefault();
    }
    if (isSupportingClipboard()) {
      this.readFromClipboard()
        .then(text => {
          const isContainingValidSSOLink = this.containsSSOCode(text);
          if (isContainingValidSSOLink) {
            const code = this.extractCode(text);
            this.setState({code});
          } else if (shouldEmitError) {
            const error = new Error();
            error.label = BackendError.SSO_ERRORS.SSO_NO_SSO_CODE;
            throw error;
          }
        })
        .catch(error => this.setState({clipboardError: error}));
    }
  };

  readFromClipboard = () => navigator.clipboard.readText().catch(error => console.error('Something went wrong', error));

  containsSSOCode = text => text && new RegExp(`${SingleSignOn.SSO_CODE_PREFIX}${UUID_REGEX}`, 'gm').test(text);

  isSSOCode = text => text && new RegExp(`^${SingleSignOn.SSO_CODE_PREFIX}${UUID_REGEX}$`, 'i').test(text);

  extractCode = text => {
    if (this.containsSSOCode(text)) {
      return text.match(new RegExp(`${SingleSignOn.SSO_CODE_PREFIX}${UUID_REGEX}`, 'gm'))[0];
    }
    return '';
  };

  stripPrefix = code => code && code.trim().replace(SingleSignOn.SSO_CODE_PREFIX, '');

  render() {
    const {
      intl: {formatMessage: _},
      loginError,
      isAuthWindowOpen,
    } = this.props;
    const {persist, code, validInputs, validationErrors, clipboardError} = this.state;
    return (
      <Page>
        {isAuthWindowOpen && (
          <Overlay>
            <Container centerText style={{color: COLOR.WHITE, maxWidth: '330px'}}>
              <div style={{alignItems: 'center', display: 'flex', justifyContent: 'center', marginBottom: '30px'}}>
                <Logo height={24} color={COLOR.WHITE} />
              </div>
              <Text style={{fontSize: '14px', fontWeight: '400', marginTop: '32px'}} color={COLOR.WHITE}>
                {_(ssoLoginStrings.overlayDescription)}
              </Text>
              <Link
                block
                center
                style={{
                  color: COLOR.WHITE,
                  fontSize: '14px',
                  fontWeight: '600',
                  marginTop: '24px',
                  textDecoration: 'underline',
                  textTransform: 'none',
                }}
                onClick={this.focusChildWindow}
              >
                {_(ssoLoginStrings.overlayFocusLink)}
              </Link>
            </Container>
          </Overlay>
        )}
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
                  <Muted>{_(ssoLoginStrings.subhead)}</Muted>
                  <Form style={{marginTop: 30}} data-uie-name="sso">
                    <InputSubmitCombo>
                      {isSupportingClipboard() &&
                        !code && (
                          <Button
                            style={{
                              borderRadius: '4px',
                              fontSize: '11px',
                              lineHeight: '16px',
                              margin: '0 0 0 12px',
                              maxHeight: '32px',
                              minWidth: '100px',
                              padding: '0 12px',
                            }}
                            onClick={this.extractSSOLink}
                            data-uie-name="do-paste-sso-code"
                          >
                            {_(ssoLoginStrings.pasteButton)}
                          </Button>
                        )}
                      <Input
                        name="sso-code"
                        tabIndex="1"
                        onChange={event =>
                          this.setState({
                            code: event.target.value,
                            validInputs: {...validInputs, code: true},
                          })
                        }
                        innerRef={node => (this.inputs.code = node)}
                        markInvalid={!validInputs.code}
                        placeholder={isSupportingClipboard() ? '' : _(ssoLoginStrings.codeInputPlaceholder)}
                        value={code}
                        autoComplete="section-login sso-code"
                        maxLength="1024"
                        pattern={`${SingleSignOn.SSO_CODE_PREFIX}${UUID_REGEX}`}
                        autoFocus
                        type="text"
                        required
                        data-uie-name="enter-code"
                      />
                      <RoundIconButton
                        tabIndex="2"
                        disabled={!code}
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
                    ) : clipboardError ? (
                      <ErrorMessage data-uie-name="error-message">{parseError(clipboardError)}</ErrorMessage>
                    ) : (
                      <span style={{marginBottom: '4px'}}>&nbsp;</span>
                    )}
                    {!isDesktopApp() && (
                      <Checkbox
                        tabIndex="3"
                        onChange={event => this.setState({persist: !event.target.checked})}
                        checked={!persist}
                        data-uie-name="enter-public-computer-sso-sign-in"
                        style={{justifyContent: 'center', marginTop: '36px'}}
                      >
                        <CheckboxLabel>{_(loginStrings.publicComputer)}</CheckboxLabel>
                      </Checkbox>
                    )}
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
        authWindowRef: AuthSelector.getAuthWindowRef(state),
        hasHistory: ClientSelector.hasHistory(state),
        hasSelfHandle: SelfSelector.hasSelfHandle(state),
        isAuthWindowOpen: AuthSelector.isAuthWindowOpen(state),
        isFetching: AuthSelector.isFetching(state),
        loginError: AuthSelector.getError(state),
      }),
      {resetError, ...AuthAction, ...ConversationAction, ...ClientAction}
    )(SingleSignOn)
  )
);
