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
import {BACKEND} from '../Environment';

class SingleSignOn extends React.PureComponent {
  static SSO_CODE_PREFIX = 'wire-';

  ssoWindow = undefined;
  inputs = {};
  state = {
    code: '',
    isOverlayOpen: false,
    persist: true,
    ssoError: null,
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

  componentWillUnmount = () => {
    this.props.resetError();
  };

  calculateChildPosition = (childHeight, childWidth) => {
    const screenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const screenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

    const hasInnerMeasurements = window.innerHeight && window.innerWidth;

    const parentHeight = hasInnerMeasurements
      ? window.innerHeight
      : document.documentElement.clientHeight || window.screen.height;
    const parentWidth = hasInnerMeasurements
      ? window.innerWidth
      : document.documentElement.clientWidth || window.screen.width;

    const left = parentWidth / 2 - childWidth / 2 + screenLeft;
    const top = parentHeight / 2 - childHeight / 2 + screenTop;
    return {left, top};
  };

  handleSSOWindow = code => {
    const POPUP_HEIGHT = 520;
    const POPUP_WIDTH = 480;
    const SSO_WINDOW_CLOSE_POLLING_INTERVAL = 1000;

    return new Promise((resolve, reject) => {
      let timerId = undefined;
      let onReceiveChildWindowMessage = undefined;
      let onParentWindowClose = undefined;

      const onChildWindowClose = () => {
        clearInterval(timerId);
        window.removeEventListener('message', onReceiveChildWindowMessage);
        window.removeEventListener('unload', onParentWindowClose);
        this.setState({isOverlayOpen: false});
      };

      onReceiveChildWindowMessage = event => {
        const isExpectedOrigin = event.origin === BACKEND.rest;
        if (!isExpectedOrigin) {
          onChildWindowClose();
          this.ssoWindow.close();
          return reject(
            new BackendError({
              label: BackendError.LABEL.SSO_GENERIC_ERROR,
              message: `Origin "${event.origin}" of event "${JSON.stringify(event)}" not matching "${BACKEND.rest}"`,
            })
          );
        }

        const eventType = event.data && event.data.type;
        switch (eventType) {
          case 'AUTH_SUCCESS': {
            onChildWindowClose();
            this.ssoWindow.close();
            return resolve();
          }
          case 'AUTH_ERROR': {
            onChildWindowClose();
            this.ssoWindow.close();
            return reject(
              new BackendError({
                label: event.data.payload.label,
                message: `Authentication error: "${JSON.stringify(event.data.payload)}"`,
              })
            );
          }
          default: {
            onChildWindowClose();
            this.ssoWindow.close();
            return reject(
              new BackendError({
                label: BackendError.LABEL.SSO_GENERIC_ERROR,
                message: `Unmatched event type: "${JSON.stringify(event)}"`,
              })
            );
          }
        }
      };
      window.addEventListener('message', onReceiveChildWindowMessage, {once: true});

      const childPosition = this.calculateChildPosition(POPUP_HEIGHT, POPUP_WIDTH);

      this.ssoWindow = window.open(
        `${BACKEND.rest}/sso/initiate-login/${code}`,
        'WIRE_SSO',
        `
          height=${POPUP_HEIGHT},
          left=${childPosition.left}
          location=no,
          menubar=no,
          resizable=no,
          status=no,
          toolbar=no,
          top=${childPosition.top},
          width=${POPUP_WIDTH}
        `
      );

      this.setState({isOverlayOpen: true});

      if (this.ssoWindow) {
        timerId = window.setInterval(() => {
          if (this.ssoWindow && this.ssoWindow.closed) {
            onChildWindowClose();
            reject(new BackendError({label: BackendError.LABEL.SSO_USER_CANCELLED_ERROR}));
          }
        }, SSO_WINDOW_CLOSE_POLLING_INTERVAL);

        onParentWindowClose = () => {
          this.ssoWindow.close();
          reject(new BackendError({label: BackendError.LABEL.SSO_USER_CANCELLED_ERROR}));
        };
        window.addEventListener('unload', onParentWindowClose);
      }
    });
  };

  handleSubmit = event => {
    event.preventDefault();
    this.props.resetError();
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
        if (isDesktopApp()) {
          return this.props.validateSSOCode(this.stripPrefix(this.state.code));
        }
      })
      .then(() => this.handleSSOWindow(this.stripPrefix(this.state.code)))
      .then(() => {
        const clientType = this.state.persist ? ClientType.PERMANENT : ClientType.TEMPORARY;
        return this.props.doFinalizeSSOLogin({clientType});
      })
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
          case BackendError.LABEL.SSO_USER_CANCELLED_ERROR: {
            return;
          }
          default: {
            this.setState({ssoError: error});
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

  focusChildWindow = () => this.ssoWindow && this.ssoWindow.focus();

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
        .catch(error => this.setState({ssoError: error}));
    }
  };

  readFromClipboard = () => navigator.clipboard.readText();

  containsSSOCode = text => text && new RegExp(`${SingleSignOn.SSO_CODE_PREFIX}${UUID_REGEX}`, 'gm').test(text);

  isSSOCode = text => text && new RegExp(`^${SingleSignOn.SSO_CODE_PREFIX}${UUID_REGEX}$`, 'i').test(text);

  extractCode = text => {
    return this.containsSSOCode(text)
      ? text.match(new RegExp(`${SingleSignOn.SSO_CODE_PREFIX}${UUID_REGEX}`, 'gm'))[0]
      : '';
  };

  stripPrefix = code => code && code.trim().replace(SingleSignOn.SSO_CODE_PREFIX, '');

  render() {
    const {
      intl: {formatMessage: _},
      loginError,
    } = this.props;
    const {persist, code, isOverlayOpen, validInputs, validationErrors, ssoError} = this.state;
    return (
      <Page>
        {isOverlayOpen && (
          <Overlay>
            <Container centerText style={{color: COLOR.WHITE, maxWidth: '330px'}}>
              <div style={{alignItems: 'center', display: 'flex', justifyContent: 'center', marginBottom: '30px'}}>
                <Logo height={24} color={COLOR.WHITE} />
              </div>
              <Text
                style={{fontSize: '14px', fontWeight: '400', marginTop: '32px'}}
                color={COLOR.WHITE}
                data-uie-name="status-overlay-description"
              >
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
                data-uie-name="do-focus-child-window"
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
                    ) : ssoError ? (
                      <ErrorMessage data-uie-name="error-message">{parseError(ssoError)}</ErrorMessage>
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
        hasHistory: ClientSelector.hasHistory(state),
        hasSelfHandle: SelfSelector.hasSelfHandle(state),
        isFetching: AuthSelector.isFetching(state),
        loginError: AuthSelector.getError(state),
      }),
      {resetError, ...AuthAction, ...ConversationAction, ...ClientAction}
    )(SingleSignOn)
  )
);
