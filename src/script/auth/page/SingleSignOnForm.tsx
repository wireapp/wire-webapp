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

import React, {useEffect, useRef, useState} from 'react';

import {ClientType} from '@wireapp/api-client/lib/client/index';
import {BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {pathWithParams} from '@wireapp/commons/lib/util/UrlUtil';
import {isValidEmail, PATTERN} from '@wireapp/commons/lib/util/ValidationUtil';
import {FormattedMessage, useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {Navigate, useNavigate} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

import {Runtime, UrlUtil} from '@wireapp/commons';
import {
  ArrowIcon,
  Checkbox,
  CheckboxLabel,
  ErrorMessage,
  Form,
  Input,
  InputBlock,
  InputSubmitCombo,
  Loading,
  RoundIconButton,
} from '@wireapp/react-ui-kit';

import {Config} from '../../Config';
import {loginStrings, logoutReasonStrings, ssoLoginStrings} from '../../strings';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {BackendError} from '../module/action/BackendError';
import {ValidationError} from '../module/action/ValidationError';
import {bindActionCreators, RootState} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {QUERY_KEY, ROUTE} from '../route';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import {getSearchParams} from '../util/urlUtil';

export interface SingleSignOnFormProps extends React.HTMLAttributes<HTMLDivElement> {
  doLogin: (code: string) => Promise<void>;
  initialCode?: string;
}

const SSO_CODE_PREFIX = 'wire-';
const SSO_CODE_PREFIX_REGEX = '[wW][iI][rR][eE]-';
const SingleSignOnFormComponent = ({
  initialCode,
  isFetching,
  authError,
  resetAuthError,
  validateSSOCode,
  doLogin,
  doFinalizeSSOLogin,
  doGetDomainInfo,
  doCheckConversationCode,
  doJoinConversationByCode,
  doNavigate,
}: SingleSignOnFormProps & ConnectedProps & DispatchProps) => {
  const codeOrMailInput = useRef<HTMLInputElement>();
  const [codeOrMail, setCodeOrMail] = useState('');
  const [disableInput, setDisableInput] = useState(false);
  const {formatMessage: _} = useIntl();
  const navigate = useNavigate();
  const [clientType, setClientType] = useState<ClientType>(null);
  const [ssoError, setSsoError] = useState(null);
  const [isCodeOrMailInputValid, setIsCodeOrMailInputValid] = useState(true);
  const [validationError, setValidationError] = useState<any>();
  const [logoutReason, setLogoutReason] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  const [conversationCode, setConversationCode] = useState<string>();
  const [conversationKey, setConversationKey] = useState<string>();
  const [isValidLink, setIsValidLink] = useState(true);

  const [shouldAutoLogin, setShouldAutoLogin] = useState(false);

  useEffect(() => {
    const queryAutoLogin = UrlUtil.hasURLParameter(QUERY_KEY.SSO_AUTO_LOGIN);
    if (queryAutoLogin === true && initialCode) {
      setShouldAutoLogin(true);
    }
  }, []);

  useEffect(() => {
    const queryClientType = UrlUtil.getURLParameter(QUERY_KEY.CLIENT_TYPE);
    if (queryClientType === ClientType.TEMPORARY) {
      setClientType(ClientType.TEMPORARY);
    } else {
      setClientType(ClientType.PERMANENT);
    }
  }, []);

  useEffect(() => {
    const queryLogoutReason = UrlUtil.getURLParameter(QUERY_KEY.LOGOUT_REASON) || null;
    if (queryLogoutReason) {
      setLogoutReason(queryLogoutReason);
    }
  }, []);

  useEffect(() => {
    const queryConversationCode = UrlUtil.getURLParameter(QUERY_KEY.CONVERSATION_CODE) || null;
    const queryConversationKey = UrlUtil.getURLParameter(QUERY_KEY.CONVERSATION_KEY) || null;

    const keyAndCodeExistent = queryConversationKey && queryConversationCode;
    if (keyAndCodeExistent) {
      setConversationCode(queryConversationCode);
      setConversationKey(queryConversationKey);
      setIsValidLink(true);
      doCheckConversationCode(queryConversationKey, queryConversationCode).catch(error => {
        console.warn('Invalid conversation code', error);
        setIsValidLink(false);
      });
    }
  }, []);

  useEffect(() => {
    if (initialCode && initialCode !== codeOrMail) {
      setCodeOrMail(initialCode);
      setDisableInput(true);
    }
  }, [initialCode]);

  useEffect(() => {
    if (shouldAutoLogin && clientType && initialCode && initialCode === codeOrMail) {
      handleSubmit();
    }
  }, [shouldAutoLogin, clientType, initialCode, codeOrMail]);

  const onCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCodeOrMail(event.target.value);
    setIsCodeOrMailInputValid(true);
  };

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
      const email = codeOrMail.trim();
      if (isValidEmail(email)) {
        const domain = email.split('@')[1];
        const {webapp_welcome_url} = await doGetDomainInfo(domain);
        const [path, query = ''] = webapp_welcome_url.split('?');
        const welcomeUrl = pathWithParams(
          path,
          {[QUERY_KEY.CLIENT_TYPE]: clientType, [QUERY_KEY.SSO_AUTO_LOGIN]: true},
          null,
          query,
        );

        // This refreshes the page as we replace the whole URL.
        // This works for now as we don't need anything from the state anymore at this point.
        // Ideal would be to abandon the HashRouter (in the near future) and use something that
        // allows us to pass search query parameters.
        // https://reacttraining.com/react-router/web/api/HashRouter
        doNavigate(
          `/auth?${getSearchParams({[QUERY_KEY.DESTINATION_URL]: encodeURIComponent(welcomeUrl)})}#${
            ROUTE.CUSTOM_ENV_REDIRECT
          }`,
        );
      } else {
        setIsLoading(true);
        const strippedCode = stripPrefix(codeOrMail);
        await validateSSOCode(strippedCode);
        await doLogin(strippedCode);
        await doFinalizeSSOLogin({clientType});
        const hasKeyAndCode = conversationKey && conversationCode;
        if (hasKeyAndCode) {
          await doJoinConversationByCode(conversationKey, conversationCode);
        }

        navigate(ROUTE.HISTORY_INFO);
      }
    } catch (error) {
      setIsLoading(false);
      switch (error.label) {
        case BackendError.LABEL.TOO_MANY_CLIENTS: {
          resetAuthError();
          navigate(ROUTE.CLIENTS);
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
            console.warn('SSO authentication error', JSON.stringify(Object.entries(error)), error);
          }
          break;
        }
      }
    }
  };

  const stripPrefix = (prefixedCode: string) =>
    prefixedCode && prefixedCode.trim().toLowerCase().replace(SSO_CODE_PREFIX, '');

  const enableDomainDiscovery = Config.getConfig().FEATURE.ENABLE_DOMAIN_DISCOVERY;

  const inputName = enableDomainDiscovery
    ? ValidationError.FIELD.SSO_EMAIL_CODE.name
    : ValidationError.FIELD.SSO_CODE.name;

  const inputPlaceholder = enableDomainDiscovery
    ? ssoLoginStrings.codeOrMailInputPlaceholder
    : ssoLoginStrings.codeInputPlaceholder;

  const inputPattern = enableDomainDiscovery
    ? `(${SSO_CODE_PREFIX_REGEX}${PATTERN.UUID_V4}|${PATTERN.EMAIL})`
    : `${SSO_CODE_PREFIX_REGEX}${PATTERN.UUID_V4}`;

  return isLoading ? (
    <Loading style={{marginTop: '24px'}} />
  ) : (
    <Form style={{marginTop: 30}} data-uie-name="sso" onSubmit={handleSubmit}>
      {!isValidLink && <Navigate to={ROUTE.CONVERSATION_JOIN_INVALID} replace />}
      <InputBlock>
        <InputSubmitCombo>
          <Input
            id={inputName}
            name={inputName}
            onChange={onCodeChange}
            ref={codeOrMailInput}
            markInvalid={!isCodeOrMailInputValid}
            placeholder={_(inputPlaceholder)}
            value={codeOrMail}
            autoComplete="section-login sso-code"
            maxLength={1024}
            pattern={inputPattern}
            type="text"
            required
            disabled={disableInput}
            data-uie-name="enter-code"
          />
          <RoundIconButton disabled={!codeOrMail} type="submit" formNoValidate data-uie-name="do-sso-sign-in">
            <ArrowIcon />
          </RoundIconButton>
        </InputSubmitCombo>
      </InputBlock>
      {validationError ? (
        parseValidationErrors([validationError])
      ) : authError ? (
        parseError(authError)
      ) : ssoError ? (
        parseError(ssoError)
      ) : logoutReason ? (
        <ErrorMessage data-uie-name="status-logout-reason">
          <FormattedMessage
            {...logoutReasonStrings[logoutReason]}
            values={{
              newline: <br />,
            }}
          />
        </ErrorMessage>
      ) : (
        <span style={{marginBottom: '4px'}}>&nbsp;</span>
      )}
      {!Runtime.isDesktopApp() && (
        <Checkbox
          name="enter-public-computer-sso-sign-in"
          id="enter-public-computer-sso-sign-in"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setClientType(event.target.checked ? ClientType.TEMPORARY : ClientType.PERMANENT)
          }
          checked={clientType === ClientType.TEMPORARY}
          data-uie-name="enter-public-computer-sso-sign-in"
          aligncenter
          style={{justifyContent: 'center', marginTop: '36px'}}
        >
          <CheckboxLabel htmlFor="">{_(loginStrings.publicComputer)}</CheckboxLabel>
        </Checkbox>
      )}
    </Form>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  isFetching: AuthSelector.isFetching(state),
  authError: AuthSelector.getError(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doCheckConversationCode: ROOT_ACTIONS.conversationAction.doCheckConversationCode,
      doFinalizeSSOLogin: ROOT_ACTIONS.authAction.doFinalizeSSOLogin,
      doGetDomainInfo: ROOT_ACTIONS.authAction.doGetDomainInfo,
      doJoinConversationByCode: ROOT_ACTIONS.conversationAction.doJoinConversationByCode,
      doNavigate: ROOT_ACTIONS.navigationAction.doNavigate,
      resetAuthError: ROOT_ACTIONS.authAction.resetAuthError,
      validateSSOCode: ROOT_ACTIONS.authAction.validateSSOCode,
    },
    dispatch,
  );

const SingleSignOnForm = connect(mapStateToProps, mapDispatchToProps)(SingleSignOnFormComponent);

export {SingleSignOnForm};
