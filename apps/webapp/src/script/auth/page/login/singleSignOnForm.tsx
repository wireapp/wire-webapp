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

import React, {useCallback, useEffect, useRef, useState} from 'react';

import is from '@sindresorhus/is';
import {ClientType} from '@wireapp/api-client/lib/client/index';
import {BackendError, BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {isValidEmail, PATTERN} from '@wireapp/commons/lib/util/ValidationUtil';
import {FormattedMessage} from 'react-intl';
import {connect, useDispatch} from 'react-redux';
import {Navigate, useNavigate} from 'react-router-dom';
import {container} from 'tsyringe';

import {Runtime, UrlUtil} from '@wireapp/commons';
import {Button, Checkbox, CheckboxLabel, ErrorMessage, Form, Input, InputBlock, Loading} from '@wireapp/react-ui-kit';

import {useApplicationContext} from 'src/script/page/RootProvider';
import {APIClient} from 'src/script/service/apiClientSingleton';
import {isBackendError} from 'Util/typePredicateUtil';

import {buildDomainRedirectUrl, handleEnterpriseLogin, handleSSOBackendError, requiresPasswordModal} from './util';

import {Config} from '../../../Config';
import {JoinGuestLinkPasswordModal} from '../../component/JoinGuestLinkPasswordModal';
import {actionRoot as ROOT_ACTIONS} from '../../module/action';
import {ValidationError} from '../../module/action/ValidationError';
import {RootState, ThunkDispatch} from '../../module/reducer';
import * as AuthSelector from '../../module/selector/AuthSelector';
import * as ConversationSelector from '../../module/selector/ConversationSelector';
import {QUERY_KEY, ROUTE} from '../../route';
import {parseError, parseValidationErrors} from '../../util/errorUtil';
import {getEnterpriseLoginV2FF} from '../../util/helpers';
import {logoutReasonStrings} from '../../util/logoutUtil';
import {getSearchParams, SSO_CODE_PREFIX} from '../../util/urlUtil';

interface SingleSignOnFormProps {
  doLogin: (code: string) => Promise<void>;
  initialCode?: string;
}

const SSO_CODE_PREFIX_REGEX = '[wW][iI][rR][eE]-';

const SingleSignOnFormComponent = ({
  initialCode,
  isFetching,
  authError,
  conversationError,
  conversationInfo,
  conversationInfoFetching,
  resetAuthError,
  validateSSOCode,
  doLogin,
  doFinalizeSSOLogin,
  doGetDomainInfo,
  doCheckConversationCode,
  doJoinConversationByCode,
  doGetConversationInfoByCode,
  doNavigate,
  pushAccountRegistrationData,
  account,
}: SingleSignOnFormProps & ConnectedProps & DispatchProps) => {
  const {translate} = useApplicationContext();
  const codeOrMailInput = useRef<HTMLInputElement>(null);
  const [codeOrMail, setCodeOrMail] = useState(account.email ?? '');
  const [disableInput, setDisableInput] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [clientType, setClientType] = useState<ClientType>(ClientType.PERMANENT);
  const [ssoError, setSsoError] = useState<BackendError | null>(null);
  const [isCodeOrMailInputValid, setIsCodeOrMailInputValid] = useState(true);
  const [validationError, setValidationError] = useState<unknown>();
  const [logoutReason, setLogoutReason] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  const [conversationCode, setConversationCode] = useState<string>();
  const [conversationKey, setConversationKey] = useState<string>();
  const [isValidLink, setIsValidLink] = useState(true);

  const [shouldAutoLogin, setShouldAutoLogin] = useState(false);

  const [isLinkPasswordModalOpen, setIsLinkPasswordModalOpen] = useState<boolean>(
    conversationInfo?.has_password === true ||
      (conversationError !== undefined &&
        conversationError !== null &&
        conversationError.label === BackendErrorLabel.INVALID_CONVERSATION_PASSWORD),
  );
  const isEnterpriseLoginV2Enabled = getEnterpriseLoginV2FF();

  const loginWithSSO = useCallback(
    async (code = codeOrMail, password?: string) => {
      setIsLoading(true);
      const strippedCode = stripPrefix(code);
      await validateSSOCode(strippedCode);
      await doLogin(strippedCode);
      await doFinalizeSSOLogin({clientType});
      const hasKeyAndCode = is.nonEmptyString(conversationKey) && is.nonEmptyString(conversationCode);
      if (hasKeyAndCode) {
        await doJoinConversationByCode(conversationKey, conversationCode, undefined, password);
      }

      navigate(ROUTE.HISTORY_INFO);
    },
    [
      clientType,
      codeOrMail,
      conversationCode,
      conversationKey,
      doFinalizeSSOLogin,
      doJoinConversationByCode,
      doLogin,
      navigate,
      validateSSOCode,
    ],
  );

  useEffect(() => {
    setIsLinkPasswordModalOpen(
      conversationInfo?.has_password === true ||
        (conversationError !== undefined &&
          conversationError !== null &&
          conversationError.label === BackendErrorLabel.INVALID_CONVERSATION_PASSWORD),
    );
  }, [conversationError, conversationInfo?.has_password]);

  useEffect(() => {
    const queryAutoLogin = UrlUtil.hasURLParameter(QUERY_KEY.SSO_AUTO_LOGIN);
    if (queryAutoLogin === true && is.nonEmptyString(initialCode)) {
      setShouldAutoLogin(true);
    }
  }, [initialCode]);

  useEffect(() => {
    const queryClientType = UrlUtil.getURLParameter(QUERY_KEY.CLIENT_TYPE);
    if (queryClientType === ClientType.TEMPORARY) {
      setClientType(ClientType.TEMPORARY);
    } else {
      setClientType(ClientType.PERMANENT);
    }
  }, [doCheckConversationCode, doGetConversationInfoByCode]);

  useEffect(() => {
    const queryLogoutReason = UrlUtil.getURLParameter(QUERY_KEY.LOGOUT_REASON) || null;
    if (is.nonEmptyString(queryLogoutReason)) {
      setLogoutReason(queryLogoutReason);
    }
  }, [doCheckConversationCode, doGetConversationInfoByCode]);

  useEffect(() => {
    const queryConversationCode = UrlUtil.getURLParameter(QUERY_KEY.CONVERSATION_CODE) || null;
    const queryConversationKey = UrlUtil.getURLParameter(QUERY_KEY.CONVERSATION_KEY) || null;

    const keyAndCodeExistent = is.nonEmptyString(queryConversationKey) && is.nonEmptyString(queryConversationCode);
    if (keyAndCodeExistent) {
      setConversationCode(queryConversationCode);
      setConversationKey(queryConversationKey);
      setIsValidLink(true);
      doCheckConversationCode(queryConversationKey, queryConversationCode).catch((error: unknown) => {
        console.warn('Invalid conversation code', error);
        setIsValidLink(false);
      });
      doGetConversationInfoByCode(queryConversationKey, queryConversationCode).catch((error: unknown) => {
        console.warn('Failed to fetch conversation info', error);
        setIsValidLink(false);
      });
    }
  }, [doCheckConversationCode, doGetConversationInfoByCode]);

  useEffect(() => {
    if (is.nonEmptyString(initialCode) && initialCode !== codeOrMail) {
      setCodeOrMail(initialCode);
      setDisableInput(true);
    }
  }, [codeOrMail, initialCode]);

  const onCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCodeOrMail(event.target.value);
    setIsCodeOrMailInputValid(true);
  };

  const validateInputElement = (inputElement: HTMLInputElement): {validationError: unknown; isValid: boolean} => {
    const wasDisabled = inputElement.disabled;
    inputElement.disabled = false;
    inputElement.value = inputElement.value.trim();
    const validationError = inputElement.checkValidity()
      ? null
      : ValidationError.handleValidationState(inputElement.name, inputElement.validity);
    const isValid = inputElement.validity.valid;
    inputElement.disabled = wasDisabled;
    return {validationError, isValid};
  };

  const handleSubmit = useCallback(
    async (event?: React.FormEvent, password?: string): Promise<void> => {
      if (event) {
        event.preventDefault();
      }
      void resetAuthError();

      if (isFetching || codeOrMailInput.current === null) {
        return;
      }

      if (requiresPasswordModal(isLinkPasswordModalOpen, conversationInfo?.has_password ?? false, conversationError)) {
        setIsLinkPasswordModalOpen(true);
        return;
      }

      const {validationError: currentValidationError, isValid} = validateInputElement(codeOrMailInput.current);
      setValidationError(currentValidationError);
      setIsCodeOrMailInputValid(isValid);

      try {
        if (currentValidationError) {
          throw currentValidationError;
        }
        const email = codeOrMail.trim();
        if (isValidEmail(email)) {
          await pushAccountRegistrationData({email});
          if (isEnterpriseLoginV2Enabled) {
            await handleEnterpriseLogin({
              email,
              password,
              loginWithSSO: loginWithSSO,
              dispatch,
              navigate,
              apiClient: container.resolve(APIClient),
            });
          } else {
            const domain = email.split('@')[1];
            const {webapp_welcome_url} = await doGetDomainInfo(domain);
            const [, query = ''] = webapp_welcome_url.split('?');
            const redirectUrl = buildDomainRedirectUrl(webapp_welcome_url, query, clientType);
            // This refreshes the page as we replace the whole URL.
            // This works for now as we don't need anything from the state anymore at this point.
            // Ideal would be to abandon the HashRouter (in the near future) and use something that
            // allows us to pass search query parameters.
            // https://reacttraining.com/react-router/web/api/HashRouter
            void doNavigate(
              `/auth?${getSearchParams({[QUERY_KEY.DESTINATION_URL]: encodeURIComponent(redirectUrl)})}#${ROUTE.CUSTOM_ENV_REDIRECT}`,
            );
          }
        } else {
          await loginWithSSO(codeOrMail, password);
        }
      } catch (error: unknown) {
        setIsLoading(false);
        if (isBackendError(error)) {
          handleSSOBackendError(error, {navigate, resetAuthError, setSsoError});
        }
      }
    },
    [
      clientType,
      codeOrMail,
      codeOrMailInput,
      conversationError,
      conversationInfo?.has_password,
      dispatch,
      doGetDomainInfo,
      doNavigate,
      isEnterpriseLoginV2Enabled,
      isFetching,
      isLinkPasswordModalOpen,
      loginWithSSO,
      navigate,
      pushAccountRegistrationData,
      resetAuthError,
    ],
  );

  useEffect(() => {
    if (shouldAutoLogin && is.nonEmptyString(initialCode) && initialCode === codeOrMail) {
      void handleSubmit();
    }
  }, [codeOrMail, handleSubmit, initialCode, shouldAutoLogin]);

  const stripPrefix = (prefixedCode: string) => {
    return prefixedCode.trim().toLowerCase().replace(SSO_CODE_PREFIX, '');
  };

  const enableDomainDiscovery = Config.getConfig().FEATURE.ENABLE_DOMAIN_DISCOVERY;

  const inputName = enableDomainDiscovery
    ? ValidationError.FIELD.SSO_EMAIL_CODE.name
    : ValidationError.FIELD.SSO_CODE.name;

  const inputPlaceholder = enableDomainDiscovery
    ? translate('ssoLogin.codeOrMailInputPlaceholder')
    : translate('ssoLogin.codeInputPlaceholder');

  const inputPattern = enableDomainDiscovery
    ? `(${SSO_CODE_PREFIX_REGEX}${PATTERN.UUID_V4}|${PATTERN.EMAIL})`
    : `${SSO_CODE_PREFIX_REGEX}${PATTERN.UUID_V4}`;

  const submitJoinCodeWithPassword = async (password?: string) => {
    await handleSubmit(undefined, password);
  };

  if (isLoading) {
    return <Loading style={{marginTop: '24px'}} />;
  }

  return (
    <>
      {isLinkPasswordModalOpen && (
        <JoinGuestLinkPasswordModal
          onClose={() => setIsLinkPasswordModalOpen(false)}
          error={conversationError}
          conversationName={conversationInfo?.name}
          isLoading={isFetching || conversationInfoFetching}
          onSubmitPassword={submitJoinCodeWithPassword}
        />
      )}
      <Form style={{marginTop: 30}} data-uie-name="sso" onSubmit={handleSubmit}>
        {!isValidLink && <Navigate to={ROUTE.CONVERSATION_JOIN_INVALID} replace />}
        <InputBlock>
          <Input
            id={inputName}
            name={inputName}
            onChange={onCodeChange}
            ref={codeOrMailInput}
            markInvalid={!isCodeOrMailInputValid}
            placeholder={inputPlaceholder}
            value={codeOrMail}
            autoComplete="section-login sso-code"
            maxLength={1024}
            pattern={inputPattern}
            type="text"
            required
            disabled={disableInput}
            data-uie-name="enter-code"
          />
        </InputBlock>
        <Button
          block
          type="submit"
          disabled={isFetching || !is.nonEmptyString(codeOrMail)}
          formNoValidate
          onClick={handleSubmit}
          aria-label={translate('login.headline')}
          data-uie-name="do-sso-sign-in"
        >
          {translate('login.headline')}
        </Button>
        {validationError !== null && validationError !== undefined
          ? parseValidationErrors([validationError])
          : authError !== null && authError !== undefined
            ? parseError(authError)
            : ssoError !== null
              ? parseError(ssoError)
              : is.nonEmptyString(logoutReason) && (
                  <ErrorMessage data-uie-name="status-logout-reason">
                    <FormattedMessage
                      id={logoutReasonStrings[logoutReason]}
                      values={{
                        newline: <br />,
                      }}
                    />
                  </ErrorMessage>
                )}

        {!Runtime.isDesktopApp() && (
          <Checkbox
            name="enter-public-computer-sso-sign-in"
            id="enter-public-computer-sso-sign-in"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setClientType(event.target.checked ? ClientType.TEMPORARY : ClientType.PERMANENT);
            }}
            checked={clientType === ClientType.TEMPORARY}
            data-uie-name="enter-public-computer-sso-sign-in"
            aligncenter
            style={{justifyContent: 'center', marginTop: '2rem'}}
          >
            <CheckboxLabel htmlFor="">{translate('login.publicComputer')}</CheckboxLabel>
          </Checkbox>
        )}
      </Form>
    </>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  isFetching: AuthSelector.isFetching(state),
  account: AuthSelector.getAccount(state),
  authError: AuthSelector.getError(state),
  conversationError: ConversationSelector.getError(state),
  conversationInfo: ConversationSelector.conversationInfo(state),
  conversationInfoFetching: ConversationSelector.conversationInfoFetching(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: ThunkDispatch) => ({
  doCheckConversationCode: (...args: Parameters<typeof ROOT_ACTIONS.conversationAction.doCheckConversationCode>) =>
    dispatch(ROOT_ACTIONS.conversationAction.doCheckConversationCode(...args)),
  doFinalizeSSOLogin: (...args: Parameters<typeof ROOT_ACTIONS.authAction.doFinalizeSSOLogin>) =>
    dispatch(ROOT_ACTIONS.authAction.doFinalizeSSOLogin(...args)),
  doGetDomainInfo: (...args: Parameters<typeof ROOT_ACTIONS.authAction.doGetDomainInfo>) =>
    dispatch(ROOT_ACTIONS.authAction.doGetDomainInfo(...args)),
  doJoinConversationByCode: (...args: Parameters<typeof ROOT_ACTIONS.conversationAction.doJoinConversationByCode>) =>
    dispatch(ROOT_ACTIONS.conversationAction.doJoinConversationByCode(...args)),
  doGetConversationInfoByCode: (
    ...args: Parameters<typeof ROOT_ACTIONS.conversationAction.doGetConversationInfoByCode>
  ) => dispatch(ROOT_ACTIONS.conversationAction.doGetConversationInfoByCode(...args)),
  doNavigate: (...args: Parameters<typeof ROOT_ACTIONS.navigationAction.doNavigate>) =>
    dispatch(ROOT_ACTIONS.navigationAction.doNavigate(...args)),
  resetAuthError: (...args: Parameters<typeof ROOT_ACTIONS.authAction.resetAuthError>) =>
    dispatch(ROOT_ACTIONS.authAction.resetAuthError(...args)),
  validateSSOCode: (...args: Parameters<typeof ROOT_ACTIONS.authAction.validateSSOCode>) =>
    dispatch(ROOT_ACTIONS.authAction.validateSSOCode(...args)),
  pushAccountRegistrationData: (...args: Parameters<typeof ROOT_ACTIONS.authAction.pushAccountRegistrationData>) =>
    dispatch(ROOT_ACTIONS.authAction.pushAccountRegistrationData(...args)),
});

const SingleSignOnForm = connect(mapStateToProps, mapDispatchToProps)(SingleSignOnFormComponent);

export {SingleSignOnForm};
