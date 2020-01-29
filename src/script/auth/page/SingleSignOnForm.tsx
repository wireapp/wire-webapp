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

import {ClientType} from '@wireapp/api-client/dist/client/index';
import {BackendErrorLabel} from '@wireapp/api-client/dist/http';
import {UrlUtil} from '@wireapp/commons';
import {pathWithParams} from '@wireapp/commons/dist/commonjs/util/UrlUtil';
import {PATTERN, isValidEmail} from '@wireapp/commons/dist/commonjs/util/ValidationUtil';
import {
  ArrowIcon,
  Checkbox,
  CheckboxLabel,
  ErrorMessage,
  Form,
  Input,
  InputSubmitCombo,
  RoundIconButton,
} from '@wireapp/react-ui-kit';
import React, {useEffect, useRef, useState} from 'react';
import {FormattedHTMLMessage, useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {Config} from '../../Config';
import {loginStrings, logoutReasonStrings, ssoLoginStrings} from '../../strings';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {BackendError} from '../module/action/BackendError';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as ClientSelector from '../module/selector/ClientSelector';
import {QUERY_KEY, ROUTE} from '../route';
import {isDesktopApp} from '../Runtime';
import {parseError, parseValidationErrors} from '../util/errorUtil';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  doLogin: (code: string) => Promise<void>;
  initialClientType?: ClientType;
  initialCode?: string;
}

const SSO_CODE_PREFIX = 'wire-';
const SSO_CODE_PREFIX_REGEX = '[wW][iI][rR][eE]-';
const SingleSignOnForm = ({
  initialClientType = ClientType.PERMANENT,
  initialCode,
  isFetching,
  loginError,
  resetAuthError,
  validateSSOCode,
  doLogin,
  doFinalizeSSOLogin,
  doSendNavigationEvent,
  doGetDomainInfo,
  doNavigate,
}: Props & ConnectedProps & DispatchProps) => {
  const codeOrMailInput = useRef<HTMLInputElement>();
  const [codeOrMail, setCodeOrMail] = useState('');
  const [disableInput, setDisableInput] = useState(false);
  const {formatMessage: _} = useIntl();
  const {history} = useReactRouter();
  const [clientType, setClientType] = useState(initialClientType);
  const [ssoError, setSsoError] = useState(null);
  const [isCodeOrMailInputValid, setIsCodeOrMailInputValid] = useState(true);
  const [validationError, setValidationError] = useState();
  const [logoutReason, setLogoutReason] = useState();

  useEffect(() => {
    const queryLogoutReason = UrlUtil.getURLParameter(QUERY_KEY.LOGOUT_REASON) || null;
    if (queryLogoutReason) {
      setLogoutReason(queryLogoutReason);
    }
  }, []);

  useEffect(() => {
    if (initialCode && initialCode !== codeOrMail) {
      setCodeOrMail(initialCode);
      setDisableInput(true);
    }
  }, [initialCode]);

  // Automatically submit if codeOrMail is set via url
  useEffect(() => {
    if (initialCode === codeOrMail) {
      handleSubmit();
    }
  }, [codeOrMail]);

  const handleSubmit = async (event?: React.FormEvent): Promise<void> => {
    if (event) {
      event.preventDefault();
    }
    resetAuthError();
    if (isFetching) {
      return;
    }

    const currentlyDisabled = codeOrMailInput.current.disabled;
    codeOrMailInput.current.disabled = false;

    codeOrMailInput.current.value = codeOrMailInput.current.value.trim();
    const currentValidationError = codeOrMailInput.current.checkValidity()
      ? null
      : ValidationError.handleValidationState(codeOrMailInput.current.name, codeOrMailInput.current.validity);

    setValidationError(currentValidationError);
    setIsCodeOrMailInputValid(codeOrMailInput.current.validity.valid);

    codeOrMailInput.current.disabled = currentlyDisabled;

    try {
      if (currentValidationError) {
        throw currentValidationError;
      }
      if (isValidEmail(codeOrMail)) {
        const domain = codeOrMail.split('@')[1];
        const {webapp_welcome_url} = await doGetDomainInfo(domain);
        const [path, query = ''] = webapp_welcome_url.split('?');
        const welcomeUrl = pathWithParams(path, {[QUERY_KEY.CLIENT_TYPE]: clientType}, null, query);
        if (isDesktopApp()) {
          await doSendNavigationEvent(welcomeUrl);
        } else {
          doNavigate(welcomeUrl);
        }
      } else {
        const strippedCode = stripPrefix(codeOrMail);
        await validateSSOCode(strippedCode);
        await doLogin(strippedCode);
        await doFinalizeSSOLogin({clientType});
        history.push(ROUTE.HISTORY_INFO);
      }
    } catch (error) {
      switch (error.label) {
        case BackendError.LABEL.TOO_MANY_CLIENTS: {
          resetAuthError();
          history.push(ROUTE.CLIENTS);
          break;
        }
        case BackendErrorLabel.CUSTOM_BACKEND_NOT_FOUND: {
          setSsoError(error);
          break;
        }
        case BackendError.LABEL.SSO_USER_CANCELLED_ERROR:
        case BackendError.LABEL.SSO_NOT_FOUND: {
          break;
        }
        default: {
          setSsoError(error);
          const isValidationError = Object.values(ValidationError.ERROR).some(
            errorType => error.label && error.label.endsWith(errorType),
          );
          if (!isValidationError) {
            // tslint:disable-next-line:no-console
            console.warn('SSO authentication error', JSON.stringify(Object.entries(error)), error);
          }
          break;
        }
      }
    }
  };

  const stripPrefix = (prefixedCode: string) =>
    prefixedCode &&
    prefixedCode
      .trim()
      .toLowerCase()
      .replace(SSO_CODE_PREFIX, '');

  return (
    <Form style={{marginTop: 30}} data-uie-name="sso" onSubmit={handleSubmit}>
      <InputSubmitCombo>
        <Input
          name="sso-code"
          tabIndex={1}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setCodeOrMail(event.target.value);
            setIsCodeOrMailInputValid(true);
          }}
          ref={codeOrMailInput}
          markInvalid={!isCodeOrMailInputValid}
          placeholder={_(
            Config.FEATURE.ENABLE_DOMAIN_DISCOVERY
              ? ssoLoginStrings.codeOrMailInputPlaceholder
              : ssoLoginStrings.codeInputPlaceholder,
          )}
          value={codeOrMail}
          autoComplete="section-login sso-code"
          maxLength={1024}
          pattern={
            Config.FEATURE.ENABLE_DOMAIN_DISCOVERY
              ? `(${SSO_CODE_PREFIX_REGEX}${PATTERN.UUID_V4}|${PATTERN.EMAIL})`
              : `${SSO_CODE_PREFIX_REGEX}${PATTERN.UUID_V4}`
          }
          autoFocus
          type="text"
          required
          disabled={disableInput}
          data-uie-name="enter-code"
        />
        <RoundIconButton
          tabIndex={2}
          disabled={!codeOrMail}
          type="submit"
          formNoValidate
          data-uie-name="do-sso-sign-in"
        >
          <ArrowIcon />
        </RoundIconButton>
      </InputSubmitCombo>
      {validationError ? (
        parseValidationErrors([validationError])
      ) : loginError ? (
        parseError(loginError)
      ) : ssoError ? (
        parseError(ssoError)
      ) : logoutReason ? (
        <ErrorMessage center data-uie-name="status-logout-reason">
          <FormattedHTMLMessage {...logoutReasonStrings[logoutReason]} />
        </ErrorMessage>
      ) : (
        <span style={{marginBottom: '4px'}}>&nbsp;</span>
      )}
      {!isDesktopApp() && (
        <Checkbox
          tabIndex={3}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setClientType(event.target.checked ? ClientType.TEMPORARY : ClientType.PERMANENT)
          }
          checked={clientType === ClientType.TEMPORARY}
          data-uie-name="enter-public-computer-sso-sign-in"
          style={{justifyContent: 'center', marginTop: '36px'}}
        >
          <CheckboxLabel>{_(loginStrings.publicComputer)}</CheckboxLabel>
        </Checkbox>
      )}
    </Form>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  hasHistory: ClientSelector.hasHistory(state),
  isFetching: AuthSelector.isFetching(state),
  loginError: AuthSelector.getError(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doFinalizeSSOLogin: ROOT_ACTIONS.authAction.doFinalizeSSOLogin,
      doGetAllClients: ROOT_ACTIONS.clientAction.doGetAllClients,
      doGetDomainInfo: ROOT_ACTIONS.authAction.doGetDomainInfo,
      doNavigate: ROOT_ACTIONS.navigationAction.doNavigate,
      doSendNavigationEvent: ROOT_ACTIONS.wrapperEventAction.doSendNavigationEvent,
      resetAuthError: ROOT_ACTIONS.authAction.resetAuthError,
      validateSSOCode: ROOT_ACTIONS.authAction.validateSSOCode,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(SingleSignOnForm);
