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

import {ClientType} from '@wireapp/api-client/dist/commonjs/client/index';
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
import React, {useState} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {loginStrings, ssoLoginStrings} from '../../strings';
import {externalRoute as EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {BackendError} from '../module/action/BackendError';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as ClientSelector from '../module/selector/ClientSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import {ROUTE} from '../route';
import {isDesktopApp, isSupportingClipboard} from '../Runtime';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import {UUID_REGEX} from '../util/stringUtil';
import {pathWithParams} from '../util/urlUtil';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  handleSSOWindow: (code: string) => {};
  initialCode?: string;
}

const SSO_CODE_PREFIX = 'wire-';
const SSO_CODE_PREFIX_REGEX = '[wW][iI][rR][eE]-';
const SingleSignOnForm = ({
  initialCode,
  isFetching,
  loginError,
  hasHistory,
  hasSelfHandle,
  resetAuthError,
  validateSSOCode,
  handleSSOWindow,
  doGetAllClients,
  doFinalizeSSOLogin,
}: Props & ConnectedProps & DispatchProps) => {
  const inputs: {code: React.RefObject<any>} = {code: React.createRef()};
  const [code, setCode] = useState(initialCode);
  const {formatMessage: _} = useIntl();
  const {history} = useReactRouter<{code?: string}>();
  const [persist, setPersist] = useState(true);
  const [ssoError, setSsoError] = useState(null);
  const [isCodeInputValid, setIsCodeInputValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState([]);

  const handleSubmit = (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    resetAuthError();
    if (isFetching) {
      return undefined;
    }
    inputs.code.current.value = inputs.code.current.value.trim();
    const validationErrors: Error[] = [];
    const validInputs: {[field: string]: boolean} = {
      code: isCodeInputValid,
    };

    Object.entries(inputs).forEach(([inputKey, {current}]) => {
      if (!current.checkValidity()) {
        validationErrors.push(ValidationError.handleValidationState(current.name, current.validity));
      }
      if (inputKey === 'code') {
        validInputs[inputKey] = current.validity.valid;
      }
    });

    setIsCodeInputValid(validInputs['code']);
    setValidationErrors(validationErrors);

    return Promise.resolve(validationErrors)
      .then(errors => {
        if (errors.length) {
          throw errors[0];
        }
        return validateSSOCode(stripPrefix(code));
      })
      .then(() => handleSSOWindow(stripPrefix(code)))
      .then(() => {
        const clientType = persist ? ClientType.PERMANENT : ClientType.TEMPORARY;
        return doFinalizeSSOLogin({clientType});
      })
      .then(navigateChooseHandleOrWebapp)
      .catch(error => {
        switch (error.label) {
          case BackendError.LABEL.NEW_CLIENT: {
            resetAuthError();
            /**
             * Show history screen if:
             *   1. database contains at least one event
             *   2. there is at least one previously registered client
             *   3. new local client is temporary
             */
            return doGetAllClients().then(clients => {
              const shouldShowHistoryInfo = hasHistory || clients.length > 1 || !persist;
              return shouldShowHistoryInfo ? history.push(ROUTE.HISTORY_INFO) : navigateChooseHandleOrWebapp();
            });
          }
          case BackendError.LABEL.TOO_MANY_CLIENTS: {
            resetAuthError();
            return history.push(ROUTE.CLIENTS);
          }
          case BackendError.LABEL.SSO_USER_CANCELLED_ERROR: {
            return;
          }
          case BackendError.LABEL.SSO_NOT_FOUND: {
            return;
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
          }
        }
      });
  };

  const navigateChooseHandleOrWebapp = () => {
    return hasSelfHandle
      ? window.location.replace(pathWithParams(EXTERNAL_ROUTE.WEBAPP))
      : history.push(ROUTE.CHOOSE_HANDLE);
  };

  const extractSSOLink = (event: React.MouseEvent, shouldEmitError = true) => {
    if (event) {
      event.preventDefault();
    }
    if (isSupportingClipboard()) {
      readFromClipboard()
        .then(text => {
          const isContainingValidSSOLink = containsSSOCode(text);
          if (isContainingValidSSOLink) {
            const code = extractCode(text);
            setCode(code);
          } else if (shouldEmitError) {
            throw new BackendError({code: 400, label: BackendError.SSO_ERRORS.SSO_NO_SSO_CODE});
          }
        })
        .catch(error => setSsoError(error));
    }
  };

  const readFromClipboard = () => window.navigator.clipboard.readText();

  const containsSSOCode = (text: string) => text && new RegExp(`${SSO_CODE_PREFIX}${UUID_REGEX}`, 'gm').test(text);

  const extractCode = (text: string) => {
    return containsSSOCode(text) ? text.match(new RegExp(`${SSO_CODE_PREFIX}${UUID_REGEX}`, 'gm'))[0] : '';
  };

  const stripPrefix = (code: string) =>
    code &&
    code
      .trim()
      .toLowerCase()
      .replace(SSO_CODE_PREFIX, '');

  return (
    <Form style={{marginTop: 30}} data-uie-name="sso" onSubmit={handleSubmit}>
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
            onClick={extractSSOLink}
            data-uie-name="do-paste-sso-code"
          >
            {_(ssoLoginStrings.pasteButton)}
          </Button>
        )}
        <Input
          name="sso-code"
          tabIndex={1}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setCode(event.target.value);
            setIsCodeInputValid(true);
          }}
          ref={inputs.code}
          markInvalid={!isCodeInputValid}
          placeholder={isSupportingClipboard() ? '' : _(ssoLoginStrings.codeInputPlaceholder)}
          value={code}
          autoComplete="section-login sso-code"
          maxLength={1024}
          pattern={`${SSO_CODE_PREFIX_REGEX}${UUID_REGEX}`}
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
  hasSelfHandle: SelfSelector.hasSelfHandle(state),
  isFetching: AuthSelector.isFetching(state),
  loginError: AuthSelector.getError(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doFinalizeSSOLogin: ROOT_ACTIONS.authAction.doFinalizeSSOLogin,
      doGetAllClients: ROOT_ACTIONS.clientAction.doGetAllClients,
      resetAuthError: ROOT_ACTIONS.authAction.resetAuthError,
      validateSSOCode: ROOT_ACTIONS.authAction.validateSSOCode,
    },
    dispatch,
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SingleSignOnForm);
