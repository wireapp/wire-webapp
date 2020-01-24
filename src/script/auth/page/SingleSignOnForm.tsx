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
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {loginStrings, ssoLoginStrings} from '../../strings';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {BackendError} from '../module/action/BackendError';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as ClientSelector from '../module/selector/ClientSelector';
import {ROUTE} from '../route';
import {isDesktopApp} from '../Runtime';
import {parseError, parseValidationErrors} from '../util/errorUtil';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  doLogin: (code: string) => Promise<void>;
  initialCode?: string;
}

const SSO_CODE_PREFIX = 'wire-';
const SSO_CODE_PREFIX_REGEX = '[wW][iI][rR][eE]-';
const SingleSignOnForm = ({
  initialCode,
  isFetching,
  loginError,
  resetAuthError,
  validateSSOCode,
  doLogin,
  doFinalizeSSOLogin,
  doSendNavigationEvent,
}: Props & ConnectedProps & DispatchProps) => {
  const codeOrMailInput = useRef<HTMLInputElement>();
  const [codeOrMail, setCodeOrMail] = useState('');
  const {formatMessage: _} = useIntl();
  const {history} = useReactRouter();
  const [persist, setPersist] = useState(true);
  const [ssoError, setSsoError] = useState(null);
  const [isCodeOrMailInputValid, setIsCodeOrMailInputValid] = useState(true);
  const [validationError, setValidationError] = useState();

  useEffect(() => {
    if (initialCode && initialCode !== codeOrMail) {
      setCodeOrMail(initialCode);
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
    codeOrMailInput.current.value = codeOrMailInput.current.value.trim();
    const currentValidationError = codeOrMailInput.current.checkValidity()
      ? null
      : ValidationError.handleValidationState(codeOrMailInput.current.name, codeOrMailInput.current.validity);

    setValidationError(currentValidationError);
    setIsCodeOrMailInputValid(codeOrMailInput.current.validity.valid);

    try {
      if (currentValidationError) {
        throw currentValidationError;
      }
      if (isValidEmail(codeOrMail)) {
        // TODO fetch domain info - redirect to the current host for testing purposes
        const customWebappUrl = `${location.protocol}//${location.hostname}${location.port ? `:${location.port}` : ''}`;
        const isWrapper = isDesktopApp();
        // tslint:disable-next-line:no-console
        console.warn('icusWrapper', isWrapper);
        if (isDesktopApp()) {
          await doSendNavigationEvent(customWebappUrl);
        } else {
          window.location.assign(customWebappUrl);
        }
      } else {
        const strippedCode = stripPrefix(codeOrMail);
        await validateSSOCode(strippedCode);
        await doLogin(strippedCode);
        const clientType = persist ? ClientType.PERMANENT : ClientType.TEMPORARY;
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
          placeholder={_(ssoLoginStrings.codeOrMailInputPlaceholder)}
          value={codeOrMail}
          autoComplete="section-login sso-code"
          maxLength={1024}
          pattern={`(${SSO_CODE_PREFIX_REGEX}${PATTERN.UUID_V4}|${PATTERN.EMAIL})`}
          autoFocus
          type="text"
          required
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
        <ErrorMessage data-uie-name="error-message">{parseError(loginError)}</ErrorMessage>
      ) : ssoError ? (
        <ErrorMessage data-uie-name="error-message">{parseError(ssoError)}</ErrorMessage>
      ) : (
        <span style={{marginBottom: '4px'}}>&nbsp;</span>
      )}
      {!isDesktopApp() && (
        <Checkbox
          tabIndex={3}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPersist(!event.target.checked)}
          checked={!persist}
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
      doSendNavigationEvent: ROOT_ACTIONS.wrapperEventAction.doSendNavigationEvent,
      resetAuthError: ROOT_ACTIONS.authAction.resetAuthError,
      validateSSOCode: ROOT_ACTIONS.authAction.validateSSOCode,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(SingleSignOnForm);
