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
import {BackendError, BackendErrorLabel, SyntheticErrorLabel} from '@wireapp/api-client/lib/http';
import {pathWithParams} from '@wireapp/commons/lib/util/UrlUtil';
import {isValidEmail, PATTERN} from '@wireapp/commons/lib/util/ValidationUtil';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';
import {Navigate, useNavigate} from 'react-router-dom';

import {Runtime, UrlUtil} from '@wireapp/commons';
import {Button, Checkbox, CheckboxLabel, ErrorMessage, Form, Input, InputBlock, Loading} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';
import {isBackendError} from 'Util/TypePredicateUtil';

import {Config} from '../../Config';
import {JoinGuestLinkPasswordModal} from '../component/JoinGuestLinkPasswordModal';
import {useEnterpriseLoginV2} from '../hooks/useEnterpriseLoginV2';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, ThunkDispatch} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as ConversationSelector from '../module/selector/ConversationSelector';
import {QUERY_KEY, ROUTE} from '../route';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import {getEnterpriseLoginV2FF} from '../util/helpers';
import {logoutReasonStrings} from '../util/logoutUtil';
import {getSearchParams, SSO_CODE_PREFIX} from '../util/urlUtil';

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
  const codeOrMailInput = useRef<HTMLInputElement>();
  const [codeOrMail, setCodeOrMail] = useState(account.email || '');
  const [disableInput, setDisableInput] = useState(false);
  const navigate = useNavigate();
  const [clientType, setClientType] = useState<ClientType | null>(null);
  const [ssoError, setSsoError] = useState<BackendError | null>(null);
  const [isCodeOrMailInputValid, setIsCodeOrMailInputValid] = useState(true);
  const [validationError, setValidationError] = useState<any>();
  const [logoutReason, setLogoutReason] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  const [conversationCode, setConversationCode] = useState<string>();
  const [conversationKey, setConversationKey] = useState<string>();
  const [isValidLink, setIsValidLink] = useState(true);

  const [shouldAutoLogin, setShouldAutoLogin] = useState(false);

  const [isLinkPasswordModalOpen, setIsLinkPasswordModalOpen] = useState<boolean>(
    !!conversationInfo?.has_password ||
      (!!conversationError && conversationError.label === BackendErrorLabel.INVALID_CONVERSATION_PASSWORD),
  );
  const isEnterpriseLoginV2Enabled = getEnterpriseLoginV2FF();

  const loginWithSSO = async (code = codeOrMail, password?: string) => {
    setIsLoading(true);
    const strippedCode = stripPrefix(code);
    await validateSSOCode(strippedCode);
    await doLogin(strippedCode);
    await doFinalizeSSOLogin({clientType});
    const hasKeyAndCode = conversationKey && conversationCode;
    if (hasKeyAndCode) {
      await doJoinConversationByCode(conversationKey, conversationCode, undefined, password);
    }

    navigate(ROUTE.HISTORY_INFO);
  };

  const {loginV2} = useEnterpriseLoginV2({
    loginWithSSO,
  });

  useEffect(() => {
    setIsLinkPasswordModalOpen(
      !!conversationInfo?.has_password ||
        (!!conversationError && conversationError.label === BackendErrorLabel.INVALID_CONVERSATION_PASSWORD),
    );
  }, [conversationError, conversationInfo?.has_password]);

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
      doGetConversationInfoByCode(queryConversationKey, queryConversationCode).catch(error => {
        console.warn('Failed to fetch conversation info', error);
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

  const handleSubmit = async (event?: React.FormEvent, password?: string): Promise<void> => {
    if (event) {
      event.preventDefault();
    }

    resetAuthError();

    if (isFetching || !codeOrMailInput.current) {
      return;
    }

    if (
      !isLinkPasswordModalOpen &&
      (!!conversationInfo?.has_password ||
        (!!conversationError && conversationError.label === BackendErrorLabel.INVALID_CONVERSATION_PASSWORD))
    ) {
      setIsLinkPasswordModalOpen(true);
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
        await pushAccountRegistrationData({email});
        if (isEnterpriseLoginV2Enabled) {
          await loginV2(email, password);
        } else {
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
        }
      } else {
        await loginWithSSO(codeOrMail, password);
      }
    } catch (error) {
      setIsLoading(false);
      if (isBackendError(error)) {
        switch (error.label) {
          case BackendErrorLabel.TOO_MANY_CLIENTS: {
            resetAuthError();
            navigate(ROUTE.CLIENTS);
            break;
          }
          case BackendErrorLabel.CUSTOM_BACKEND_NOT_FOUND: {
            setSsoError(error);
            break;
          }
          case BackendErrorLabel.INVALID_CONVERSATION_PASSWORD: {
            // error will be hanlded by opening modal
            break;
          }
          case SyntheticErrorLabel.SSO_USER_CANCELLED_ERROR:
          case BackendErrorLabel.NOT_FOUND: {
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
    }
  };

  const stripPrefix = (prefixedCode: string) =>
    prefixedCode && prefixedCode.trim().toLowerCase().replace(SSO_CODE_PREFIX, '');

  const enableDomainDiscovery = Config.getConfig().FEATURE.ENABLE_DOMAIN_DISCOVERY;

  const inputName = enableDomainDiscovery
    ? ValidationError.FIELD.SSO_EMAIL_CODE.name
    : ValidationError.FIELD.SSO_CODE.name;

  const inputPlaceholder = enableDomainDiscovery
    ? t('ssoLogin.codeOrMailInputPlaceholder')
    : t('ssoLogin.codeInputPlaceholder');

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
          disabled={!codeOrMail}
          formNoValidate
          onClick={handleSubmit}
          aria-label={t('login.headline')}
          data-uie-name="do-sso-sign-in"
        >
          {t('login.headline')}
        </Button>
        {validationError
          ? parseValidationErrors([validationError])
          : authError
            ? parseError(authError)
            : ssoError
              ? parseError(ssoError)
              : logoutReason && (
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
            <CheckboxLabel htmlFor="">{t('login.publicComputer')}</CheckboxLabel>
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
