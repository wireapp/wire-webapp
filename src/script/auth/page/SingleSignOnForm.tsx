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

import {ClientType, RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/index';
import {
  Button,
  Checkbox,
  CheckboxLabel,
  ErrorMessage,
  Form,
  ICON_NAME,
  Input,
  InputSubmitCombo,
  RoundIconButton,
} from '@wireapp/react-ui-kit';
import * as React from 'react';
import {InjectedIntlProps, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import {RouteComponentProps, withRouter} from 'react-router';
import {loginStrings, ssoLoginStrings} from '../../strings';
import EXTERNAL_ROUTE from '../externalRoute';
import ROOT_ACTIONS from '../module/action/';
import BackendError from '../module/action/BackendError';
import ValidationError from '../module/action/ValidationError';
import {RootState, ThunkDispatch} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as ClientSelector from '../module/selector/ClientSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import {ROUTE} from '../route';
import {isDesktopApp, isSupportingClipboard} from '../Runtime';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import {UUID_REGEX} from '../util/stringUtil';
import {pathWithParams} from '../util/urlUtil';

interface Props extends React.HTMLAttributes<SingleSignOnForm>, RouteComponentProps<{code?: string}> {
  handleSSOWindow: (code: string) => {};
}

interface ConnectedProps {
  code?: string;
  hasHistory: boolean;
  hasSelfHandle: boolean;
  isFetching: boolean;
  loginError: Error;
}

interface DispatchProps {
  resetAuthError: () => Promise<void>;
  validateSSOCode: (code: string) => Promise<void>;
  doFinalizeSSOLogin: (options: {clientType: ClientType}) => Promise<void>;
  doGetAllClients: () => Promise<RegisteredClient[]>;
}

interface State {
  code: string;
  isOverlayOpen: boolean;
  persist: boolean;
  ssoError: Error;
  validInputs: {
    [field: string]: boolean;
  };
  validationErrors: Error[];
}

class SingleSignOnForm extends React.PureComponent<Props & ConnectedProps & DispatchProps & InjectedIntlProps, State> {
  private static readonly SSO_CODE_PREFIX = 'wire-';
  private static readonly SSO_CODE_PREFIX_REGEX = '[wW][iI][rR][eE]-';

  private readonly inputs: {code: React.RefObject<any>} = {code: React.createRef()};
  state: State = {
    code: '',
    isOverlayOpen: false,
    persist: true,
    ssoError: null,
    validInputs: {
      code: true,
    },
    validationErrors: [],
  };

  updateCodeFromProps = (props: ConnectedProps) => {
    const ssoCode = props.code;
    const ssoCodeChanged = ssoCode !== this.state.code;

    if (ssoCodeChanged) {
      this.setState({code: ssoCode}, () => {
        if (this.inputs.code.current) {
          this.handleSubmit();
        }
      });
    }
  };

  componentDidMount = () => {
    if (this.props.code) {
      this.updateCodeFromProps(this.props);
    } else if (isDesktopApp() && isSupportingClipboard()) {
      this.extractSSOLink(undefined, false);
    }
  };

  componentWillReceiveProps = (nextProps: ConnectedProps) => {
    if (nextProps.code) {
      this.updateCodeFromProps(nextProps);
    }
  };

  componentWillUnmount = () => {
    this.props.resetAuthError();
  };

  handleSubmit = (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    this.props.resetAuthError();
    if (this.props.isFetching) {
      return undefined;
    }
    this.inputs.code.current.value = this.inputs.code.current.value.trim();
    const validationErrors: Error[] = [];
    const validInputs: {[field: string]: boolean} = this.state.validInputs;

    Object.entries(this.inputs).forEach(([inputKey, {current}]) => {
      if (!current.checkValidity()) {
        validationErrors.push(ValidationError.handleValidationState(current.name, current.validity));
      }
      validInputs[inputKey] = current.validity.valid;
    });

    this.setState({validInputs, validationErrors});
    return Promise.resolve(validationErrors)
      .then(errors => {
        if (errors.length) {
          throw errors[0];
        }
        return this.props.validateSSOCode(this.stripPrefix(this.state.code));
      })
      .then(() => this.props.handleSSOWindow(this.stripPrefix(this.state.code)))
      .then(() => {
        const clientType = this.state.persist ? ClientType.PERMANENT : ClientType.TEMPORARY;
        return this.props.doFinalizeSSOLogin({clientType});
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
          case BackendError.LABEL.SSO_USER_CANCELLED_ERROR: {
            return;
          }
          case BackendError.LABEL.SSO_NOT_FOUND: {
            return;
          }
          default: {
            this.setState({ssoError: error});
            const isValidationError = Object.values(ValidationError.ERROR).some(errorType =>
              error.label.endsWith(errorType)
            );
            if (!isValidationError) {
              throw error;
            }
          }
        }
      });
  };

  navigateChooseHandleOrWebapp = () => {
    return this.props.hasSelfHandle
      ? window.location.replace(pathWithParams(EXTERNAL_ROUTE.WEBAPP))
      : this.props.history.push(ROUTE.CHOOSE_HANDLE);
  };

  extractSSOLink = (event: React.MouseEvent, shouldEmitError = true) => {
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
            throw new BackendError({code: 400, label: BackendError.SSO_ERRORS.SSO_NO_SSO_CODE});
          }
        })
        .catch(error => this.setState({ssoError: error}));
    }
  };

  readFromClipboard = () => window.navigator.clipboard.readText();

  containsSSOCode = (text: string) =>
    text && new RegExp(`${SingleSignOnForm.SSO_CODE_PREFIX}${UUID_REGEX}`, 'gm').test(text);

  isSSOCode = (text: string) =>
    text && new RegExp(`^${SingleSignOnForm.SSO_CODE_PREFIX}${UUID_REGEX}$`, 'i').test(text);

  extractCode = (text: string) => {
    return this.containsSSOCode(text)
      ? text.match(new RegExp(`${SingleSignOnForm.SSO_CODE_PREFIX}${UUID_REGEX}`, 'gm'))[0]
      : '';
  };

  stripPrefix = (code: string) =>
    code &&
    code
      .trim()
      .toLowerCase()
      .replace(SingleSignOnForm.SSO_CODE_PREFIX, '');

  render() {
    const {
      intl: {formatMessage: _},
      loginError,
    } = this.props;
    const {persist, code, validInputs, validationErrors, ssoError} = this.state;
    return (
      <Form style={{marginTop: 30}} data-uie-name="sso" onSubmit={this.handleSubmit}>
        <InputSubmitCombo>
          {isSupportingClipboard() && !code && (
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
            tabIndex={1}
            onChange={event =>
              this.setState({
                code: event.target.value,
                validInputs: {...validInputs, code: true},
              })
            }
            ref={this.inputs.code}
            markInvalid={!validInputs.code}
            placeholder={isSupportingClipboard() ? '' : _(ssoLoginStrings.codeInputPlaceholder)}
            value={code}
            autoComplete="section-login sso-code"
            maxLength={1024}
            pattern={`${SingleSignOnForm.SSO_CODE_PREFIX_REGEX}${UUID_REGEX}`}
            autoFocus
            type="text"
            required
            data-uie-name="enter-code"
          />
          <RoundIconButton
            tabIndex={2}
            disabled={!code}
            type="submit"
            formNoValidate
            icon={ICON_NAME.ARROW}
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
            tabIndex={3}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => this.setState({persist: !event.target.checked})}
            checked={!persist}
            data-uie-name="enter-public-computer-sso-sign-in"
            style={{justifyContent: 'center', marginTop: '36px'}}
          >
            <CheckboxLabel>{_(loginStrings.publicComputer)}</CheckboxLabel>
          </Checkbox>
        )}
      </Form>
    );
  }
}

export default withRouter(
  injectIntl(
    connect(
      (state: RootState, ownProps: Props): ConnectedProps => {
        return {
          code: ownProps.match.params.code,
          hasHistory: ClientSelector.hasHistory(state),
          hasSelfHandle: SelfSelector.hasSelfHandle(state),
          isFetching: AuthSelector.isFetching(state),
          loginError: AuthSelector.getError(state),
        };
      },
      (dispatch: ThunkDispatch): DispatchProps => {
        return {
          doFinalizeSSOLogin: (options: {clientType: ClientType}) =>
            dispatch(ROOT_ACTIONS.authAction.doFinalizeSSOLogin(options)),
          doGetAllClients: () => dispatch(ROOT_ACTIONS.clientAction.doGetAllClients()),
          resetAuthError: () => dispatch(ROOT_ACTIONS.authAction.resetAuthError()),
          validateSSOCode: (code: string) => dispatch(ROOT_ACTIONS.authAction.validateSSOCode(code)),
        };
      }
    )(SingleSignOnForm)
  )
);
