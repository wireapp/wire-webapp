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

import {LoginData} from '@wireapp/api-client/lib/auth';
import {ClientType} from '@wireapp/api-client/lib/client/index';
import {BackendError, BackendErrorLabel, SyntheticErrorLabel} from '@wireapp/api-client/lib/http/';
import {LogoFullIcon} from 'Components/Icon';
import {StatusCodes} from 'http-status-codes';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {isBackendError} from 'Util/TypePredicateUtil';

import {Runtime, UrlUtil} from '@wireapp/commons';
import {
  ActionLinkButton,
  Button,
  ButtonVariant,
  Checkbox,
  CheckboxLabel,
  CodeInput,
  Column,
  Columns,
  Container,
  ContainerXS,
  FlexBox,
  Form,
  Heading,
  IsMobile,
  Label,
  Link,
  LinkVariant,
  Loading,
  QUERY,
  QueryKeys,
  Text,
  useMatchMedia,
} from '@wireapp/react-ui-kit';

import {EntropyContainer} from './EntropyContainer';
import {separator} from './Login.styles';
import {Page} from './Page';
import {styles} from './VerifyEmailCode.styles';

import {Config} from '../../Config';
import {AccountAlreadyExistsModal} from '../component/AccountAlreadyExistsModal';
import {AppAlreadyOpen} from '../component/AppAlreadyOpen';
import {BackButton} from '../component/BackButton';
import {Exception} from '../component/Exception';
import {JoinGuestLinkPasswordModal} from '../component/JoinGuestLinkPasswordModal';
import {LoginForm} from '../component/LoginForm';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {useRouteA11y} from '../hooks/useRouteA11y';
import {actionRoot} from '../module/action/';
import {LabeledError} from '../module/action/LabeledError';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, ThunkDispatch} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as ConversationSelector from '../module/selector/ConversationSelector';
import {QUERY_KEY, ROUTE} from '../route';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import {getEnterpriseLoginV2FF} from '../util/helpers';
import {getOAuthQueryString} from '../util/oauthUtil';
import {getPrefixedSSOCode} from '../util/urlUtil';
type Props = React.HTMLProps<HTMLDivElement> & {
  embedded?: boolean;
};

const LoginComponent = ({
  authError,
  resetAuthError,
  doCheckConversationCode,
  doGetConversationInfoByCode,
  doInit,
  doSetLocalStorage,
  doInitializeClient,
  doLoginAndJoin,
  doLogin,
  conversationError,
  pushEntropyData,
  doSendTwoFactorCode,
  isFetching,
  pushLoginData,
  loginData,
  defaultSSOCode,
  isSendingTwoFactorCode,
  conversationInfo,
  conversationInfoFetching,
  embedded,
  account,
}: Props & ConnectedProps & DispatchProps) => {
  const logger = getLogger('Login');
  const navigate = useNavigate();
  const isTablet = useMatchMedia(QUERY[QueryKeys.TABLET_DOWN]);

  const {accountCreationEnabled, shouldDisplayWarning} = account;

  const [conversationCode, setConversationCode] = useState<string | null>(null);
  const [conversationKey, setConversationKey] = useState<string | null>(null);
  const [conversationSubmitData, setConversationSubmitData] = useState<Partial<LoginData> | null>(null);
  const [isLinkPasswordModalOpen, setIsLinkPasswordModalOpen] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<Error[]>([]);
  const [isAccountAlreadyExistsModalOpen, setIsAccountAlreadyExistsModalOpen] = useState(false);

  const [twoFactorSubmitError, setTwoFactorSubmitError] = useState<string | Error>('');
  const [twoFactorLoginData, setTwoFactorLoginData] = useState<LoginData>();
  const [verificationCode, setVerificationCode] = useState('');
  const [twoFactorSubmitFailedOnce, setTwoFactorSubmitFailedOnce] = useState(false);
  const isEnterpriseLoginV2Enabled = getEnterpriseLoginV2FF();

  const isOauth = UrlUtil.hasURLParameter(QUERY_KEY.SCOPE, window.location.hash);

  const [routeAction, setRouteAction] = useState<'login' | 'verify'>('login');

  // this triggers the hook every time screen changes under the same route
  useRouteA11y(routeAction);

  const {
    ENABLE_ACCOUNT_REGISTRATION: isAccountRegistrationEnabled,
    ENABLE_DOMAIN_DISCOVERY: isDomainDiscoveryEnabled,
    ENABLE_EXTRA_CLIENT_ENTROPY: isEntropyRequired,
    ENABLE_SSO: isSSOEnabled,
  } = Config.getConfig().FEATURE;

  const showBackButton = !embedded && (isDomainDiscoveryEnabled || isSSOEnabled || isAccountRegistrationEnabled);

  const [showEntropyForm, setShowEntropyForm] = useState(false);
  const onEntropyGenerated = useRef<((entropy: Uint8Array) => void) | undefined>();
  const entropy = useRef<Uint8Array | undefined>();

  const getEntropy = isEntropyRequired
    ? () => {
        // This is somewhat hacky. When the login action detects a new device and that entropy is required, then we give back a promise to the login action.
        // This way we can just halt the login process, wait for the user to generate entropy and then give back the resulting entropy to the login action.
        setShowEntropyForm(true);
        return new Promise<Uint8Array>(resolve => {
          // we need to keep a reference to the resolve function of the promise as it's going to be called by the entropyContainer callback
          onEntropyGenerated.current = entropyData => {
            entropy.current = entropyData;
            resolve(entropyData);
          };
        });
      }
    : undefined;

  useEffect(() => {
    const queryClientType = UrlUtil.getURLParameter(QUERY_KEY.CLIENT_TYPE);
    if (queryClientType === ClientType.TEMPORARY) {
      pushLoginData({clientType: ClientType.TEMPORARY});
    }
  }, []);

  useEffect(() => {
    // Redirect to prefilled SSO login if default SSO code is set on backend unless we're following the guest link flow
    if (defaultSSOCode && !embedded) {
      navigate(`${ROUTE.SSO}/${getPrefixedSSOCode(defaultSSOCode)}`);
    }
  }, [defaultSSOCode, embedded, navigate]);

  useEffect(() => {
    const queryConversationCode = UrlUtil.getURLParameter(QUERY_KEY.CONVERSATION_CODE) || null;
    const queryConversationKey = UrlUtil.getURLParameter(QUERY_KEY.CONVERSATION_KEY) || null;

    const keyAndCodeExistent = queryConversationKey && queryConversationCode;
    if (keyAndCodeExistent) {
      setConversationCode(queryConversationCode);
      setConversationKey(queryConversationKey);
      doCheckConversationCode(queryConversationKey, queryConversationCode).catch(error => {
        logger.warn('Invalid conversation code', error);
      });
      doGetConversationInfoByCode(queryConversationKey, queryConversationCode).catch(error => {
        logger.warn('Failed to fetch conversation info', error);
      });
    }
  }, []);

  useEffect(() => {
    resetAuthError();
    const isImmediateLogin = UrlUtil.hasURLParameter(QUERY_KEY.IMMEDIATE_LOGIN);
    const is2FAEntropy = UrlUtil.hasURLParameter(QUERY_KEY.TWO_FACTOR) && isEntropyRequired;

    if ((isImmediateLogin && !is2FAEntropy) || isOauth) {
      immediateLogin();
    }
    return () => {
      resetAuthError();
    };
  }, []);

  const immediateLogin = async () => {
    try {
      await doInit({isImmediateLogin: true, shouldValidateLocalClient: false});
      const entropyData = await getEntropy?.();
      await doInitializeClient(ClientType.PERMANENT, undefined, undefined, entropyData);

      if (isOauth) {
        const queryString = getOAuthQueryString(window.location);
        return navigate(`${ROUTE.AUTHORIZE}/${queryString}`);
      }
      return navigate(ROUTE.HISTORY_INFO);
    } catch (error) {
      logger.error('Unable to login immediately', error);
      setShowEntropyForm(false);
    }
  };

  const handleSubmit = async (
    formLoginData: Partial<LoginData>,
    validationErrors: Error[] = [],
    conversationPassword?: string,
  ) => {
    setValidationErrors(validationErrors);

    if (
      !isLinkPasswordModalOpen &&
      (!!conversationInfo?.has_password ||
        (!!conversationError && conversationError.label === BackendErrorLabel.INVALID_CONVERSATION_PASSWORD))
    ) {
      setConversationSubmitData(formLoginData);
      setIsLinkPasswordModalOpen(true);
      return;
    }

    try {
      const login: LoginData = {...formLoginData, clientType: loginData.clientType};
      if (validationErrors.length) {
        throw validationErrors[0];
      }

      const hasKeyAndCode = conversationKey && conversationCode;
      if (hasKeyAndCode) {
        try {
          await doLoginAndJoin(login, conversationKey, conversationCode, undefined, getEntropy, conversationPassword);
        } catch (error) {
          if (isBackendError(error) && error.label === BackendErrorLabel.INVALID_CONVERSATION_PASSWORD) {
            await resetAuthError();
            setConversationSubmitData(formLoginData);
            setIsLinkPasswordModalOpen(true);
            return;
          }
          throw error;
        }
      } else {
        await doLogin(login, getEntropy);
      }

      if (isOauth) {
        const queryString = getOAuthQueryString(window.location);

        return navigate(`${ROUTE.AUTHORIZE}/${queryString}`);
      }

      if (shouldDisplayWarning) {
        setIsAccountAlreadyExistsModalOpen(true);
        return;
      }

      return navigate(ROUTE.HISTORY_INFO);
    } catch (error) {
      if (isBackendError(error)) {
        switch (error.label) {
          case BackendErrorLabel.INVALID_CONVERSATION_PASSWORD: {
            setConversationSubmitData(formLoginData);
            setIsLinkPasswordModalOpen(true);
            break;
          }
          case BackendErrorLabel.TOO_MANY_CLIENTS: {
            await resetAuthError();
            if (formLoginData?.verificationCode) {
              await doSetLocalStorage(QUERY_KEY.CONVERSATION_CODE, formLoginData.verificationCode);
            }
            if (entropy.current) {
              await pushEntropyData(entropy.current);
            }
            navigate(ROUTE.CLIENTS);
            break;
          }

          case BackendErrorLabel.CODE_AUTHENTICATION_REQUIRED: {
            await resetAuthError();
            const login: LoginData = {...formLoginData, clientType: loginData.clientType};
            if (login.email || login.handle) {
              await doSendTwoFactorCode(login.email || login.handle || '');
              setTwoFactorLoginData(login);
              setRouteAction('verify');
              await doSetLocalStorage(QUERY_KEY.JOIN_EXPIRES, Date.now() + 1000 * 60 * 10);
            }
            break;
          }

          case BackendErrorLabel.CODE_AUTHENTICATION_FAILED: {
            setTwoFactorSubmitError(error);
            setTwoFactorSubmitFailedOnce(true);
            break;
          }
          case BackendErrorLabel.INVALID_CREDENTIALS:
          case BackendErrorLabel.ACCOUNT_SUSPENDED:
          case LabeledError.GENERAL_ERRORS.LOW_DISK_SPACE:
          case LabeledError.GENERAL_ERRORS.SYSTEM_KEYCHAIN_ACCESS: {
            break;
          }
          default: {
            const backendError = error;
            const isValidationError = Object.values(ValidationError.ERROR).some(errorType =>
              backendError.label.endsWith(errorType),
            );
            if (!isValidationError) {
              throw error;
            }
          }
        }
      } else {
        throw error;
      }
    }
  };

  const resendTwoFactorCode = async () => {
    try {
      const email = twoFactorLoginData?.email;
      if (email) {
        await doSendTwoFactorCode(email);
      }
    } catch (error) {
      setTwoFactorSubmitError(
        new BackendError('', SyntheticErrorLabel.TOO_MANY_REQUESTS, StatusCodes.TOO_MANY_REQUESTS),
      );
    }
  };

  const submitTwoFactorLogin = (code?: string) => {
    setVerificationCode(code ?? '');
    setTwoFactorSubmitError('');
    // Do not auto submit if already failed once
    if (!twoFactorSubmitFailedOnce) {
      void handleSubmit({...twoFactorLoginData, verificationCode: code}, []);
    }
  };

  const storeEntropy = async (entropyData: Uint8Array) => {
    onEntropyGenerated.current?.(entropyData);
  };

  const submitJoinCodeWithPassword = async (password: string) => {
    if (!conversationSubmitData) {
      setIsLinkPasswordModalOpen(false);
      return;
    }
    await handleSubmit(conversationSubmitData, [], password);
  };

  const hideAccountAlreadyExistsModal = () => {
    setIsAccountAlreadyExistsModalOpen(false);
    return navigate(ROUTE.HISTORY_INFO);
  };

  return (
    <Page withSideBar={isEnterpriseLoginV2Enabled && !embedded}>
      {isAccountAlreadyExistsModalOpen && <AccountAlreadyExistsModal onClose={hideAccountAlreadyExistsModal} />}
      {showBackButton && (
        <IsMobile>
          <div style={{margin: 16}}>
            <BackButton />
          </div>
        </IsMobile>
      )}
      {isEntropyRequired && showEntropyForm ? (
        <EntropyContainer onSetEntropy={storeEntropy} />
      ) : (
        <Container centerText verticalCenter style={{width: '100%'}}>
          {isEnterpriseLoginV2Enabled && isTablet && (
            <LogoFullIcon
              aria-hidden="true"
              width={102}
              height={33}
              style={{marginBottom: '80px'}}
              data-uie-name="ui-wire-logo"
            />
          )}
          {!embedded && <AppAlreadyOpen />}
          {isLinkPasswordModalOpen && (
            <JoinGuestLinkPasswordModal
              onClose={() => {
                setIsLinkPasswordModalOpen(false);
                void resetAuthError();
                setValidationErrors([]);
              }}
              error={conversationError}
              conversationName={conversationInfo?.name}
              isLoading={isFetching || conversationInfoFetching}
              onSubmitPassword={submitJoinCodeWithPassword}
            />
          )}
          <Columns>
            {!embedded && (
              <IsMobile not>
                <Column style={{display: 'flex'}}>
                  {showBackButton && (
                    <div style={{margin: isEnterpriseLoginV2Enabled ? '0.75rem 0px auto auto' : 'auto'}}>
                      <BackButton />
                    </div>
                  )}
                </Column>
              </IsMobile>
            )}
            <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
              <ContainerXS
                centerText
                style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px'}}
              >
                {twoFactorLoginData ? (
                  <div>
                    <Text
                      fontSize="1.5rem"
                      css={{fontWeight: '500'}}
                      center
                      block
                      role="heading"
                      aria-level={1}
                      data-page-title
                      tabIndex={-1}
                    >
                      {t('login.twoFactorLoginTitle')}
                    </Text>
                    <Text block data-uie-name="label-with-email" fontSize="1rem" css={styles.subhead}>
                      <FormattedMessage
                        id="login.twoFactorLoginSubHead"
                        values={{
                          email: twoFactorLoginData.email as string,
                          newline: <br />,
                        }}
                      />
                    </Text>
                    <Label markInvalid={!!twoFactorSubmitError}>
                      <CodeInput
                        disabled={isFetching}
                        style={{marginTop: '1rem'}}
                        onCodeComplete={submitTwoFactorLogin}
                        data-uie-name="enter-code"
                        codeInputLabel={t('verify.codeLabel')}
                        codePlaceholder={t('verify.codePlaceholder')}
                      />
                    </Label>
                    <div style={{display: 'flex', justifyContent: 'center', marginTop: 10}}>
                      {!!twoFactorSubmitError && parseError(twoFactorSubmitError)}
                    </div>
                    <div style={{marginTop: '1rem'}}>
                      {isSendingTwoFactorCode ? (
                        <Loading size={20} />
                      ) : (
                        <ActionLinkButton
                          onClick={resendTwoFactorCode}
                          data-uie-name="do-resend-code"
                          css={styles.resendLink}
                        >
                          {t('verify.resendCode')}
                        </ActionLinkButton>
                      )}
                    </div>
                    <FlexBox justify="center">
                      <Button
                        disabled={!!twoFactorSubmitError || isFetching}
                        type="submit"
                        css={{marginTop: '1rem'}}
                        onClick={() => handleSubmit({...twoFactorLoginData, verificationCode}, [])}
                      >
                        {t('login.submitTwoFactorButton')}
                      </Button>
                    </FlexBox>
                  </div>
                ) : (
                  <>
                    <div>
                      {isEnterpriseLoginV2Enabled ? (
                        <div
                          css={{fontWeight: '500', fontSize: '1.5rem', marginBottom: '2rem'}}
                          role="heading"
                          aria-level={1}
                          data-page-title
                          tabIndex={-1}
                        >
                          {t('index.welcome', {brandName: Config.getConfig().BACKEND_NAME})}
                        </div>
                      ) : (
                        <Heading level={embedded ? '2' : '1'} center data-page-title tabIndex={-1}>
                          {t('login.headline')}
                        </Heading>
                      )}
                      <Text>{isEnterpriseLoginV2Enabled ? t('login.subheadsso') : t('login.subhead')}</Text>
                      <Form style={{marginTop: 30}} data-uie-name="login">
                        <LoginForm isFetching={isFetching} onSubmit={handleSubmit} />
                        {validationErrors.length
                          ? parseValidationErrors(validationErrors)
                          : authError && <Exception errors={[authError]} />}

                        {!Runtime.isDesktopApp() && (
                          <Checkbox
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                              void pushLoginData({
                                clientType: event.target.checked ? ClientType.TEMPORARY : ClientType.PERMANENT,
                              });
                            }}
                            checked={loginData.clientType === ClientType.TEMPORARY}
                            data-uie-name="enter-public-computer-sign-in"
                            style={{justifyContent: 'center', marginBottom: '16px'}}
                            aligncenter
                          >
                            <CheckboxLabel htmlFor="enter-public-computer-sign-in">
                              {t('login.publicComputer')}
                            </CheckboxLabel>
                          </Checkbox>
                        )}
                      </Form>
                    </div>
                    <Link
                      variant={LinkVariant.PRIMARY}
                      style={{textAlign: 'center'}}
                      href={EXTERNAL_ROUTE.WIRE_ACCOUNT_PASSWORD_RESET}
                      target="_blank"
                      data-uie-name="go-forgot-password"
                    >
                      {t('login.forgotPassword')}
                    </Link>
                    {embedded && (isDomainDiscoveryEnabled || isSSOEnabled) && (
                      <Button
                        type="button"
                        variant={ButtonVariant.SECONDARY}
                        onClick={() => navigate(`${ROUTE.SSO}/${getPrefixedSSOCode(defaultSSOCode)}`)}
                        style={{marginTop: '16px'}}
                        data-uie-name="go-sso-login"
                      >
                        {t(isDomainDiscoveryEnabled ? 'index.enterprise' : 'index.ssoLogin')}
                      </Button>
                    )}
                    {isEnterpriseLoginV2Enabled && accountCreationEnabled && (
                      <>
                        <div css={separator}>
                          <span>{t('index.or')}</span>
                        </div>

                        <div>
                          <Button
                            css={{width: '100%'}}
                            variant={ButtonVariant.SECONDARY}
                            onClick={async () => {
                              await resetAuthError();
                              navigate(ROUTE.SET_ACCOUNT_TYPE);
                            }}
                            data-uie-name="go-create-account"
                          >
                            {t('index.createAccount')}
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </ContainerXS>
            </Column>
            {!embedded && <Column />}
          </Columns>
        </Container>
      )}
      <IsMobile>
        <div style={{minWidth: 48}} />
      </IsMobile>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  defaultSSOCode: AuthSelector.getDefaultSSOCode(state),
  isFetching: AuthSelector.isFetching(state),
  conversationError: ConversationSelector.getError(state),
  isSendingTwoFactorCode: AuthSelector.isSendingTwoFactorCode(state),
  loginData: AuthSelector.getLoginData(state),
  authError: AuthSelector.getError(state),
  conversationInfo: ConversationSelector.conversationInfo(state),
  conversationInfoFetching: ConversationSelector.conversationInfoFetching(state),
  account: AuthSelector.getAccount(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: ThunkDispatch) => ({
  doCheckConversationCode: (...args: Parameters<typeof actionRoot.conversationAction.doCheckConversationCode>) =>
    dispatch(actionRoot.conversationAction.doCheckConversationCode(...args)),
  doInit: (...args: Parameters<typeof actionRoot.authAction.doInit>) =>
    dispatch(actionRoot.authAction.doInit(...args)),
  doInitializeClient: (...args: Parameters<typeof actionRoot.clientAction.doInitializeClient>) =>
    dispatch(actionRoot.clientAction.doInitializeClient(...args)),
  doLogin: (...args: Parameters<typeof actionRoot.authAction.doLogin>) =>
    dispatch(actionRoot.authAction.doLogin(...args)),
  doLoginAndJoin: (...args: Parameters<typeof actionRoot.authAction.doLoginAndJoin>) =>
    dispatch(actionRoot.authAction.doLoginAndJoin(...args)),
  doSendTwoFactorCode: (...args: Parameters<typeof actionRoot.authAction.doSendTwoFactorLoginCode>) =>
    dispatch(actionRoot.authAction.doSendTwoFactorLoginCode(...args)),
  doSetLocalStorage: (...args: Parameters<typeof actionRoot.localStorageAction.setLocalStorage>) =>
    dispatch(actionRoot.localStorageAction.setLocalStorage(...args)),
  pushEntropyData: (...args: Parameters<typeof actionRoot.authAction.pushEntropyData>) =>
    dispatch(actionRoot.authAction.pushEntropyData(...args)),
  pushLoginData: (...args: Parameters<typeof actionRoot.authAction.pushLoginData>) =>
    dispatch(actionRoot.authAction.pushLoginData(...args)),
  resetAuthError: (...args: Parameters<typeof actionRoot.authAction.resetAuthError>) =>
    dispatch(actionRoot.authAction.resetAuthError(...args)),
  doGetConversationInfoByCode: (...args: Parameters<typeof actionRoot.conversationAction.doGetConversationInfoByCode>) =>
    dispatch(actionRoot.conversationAction.doGetConversationInfoByCode(...args)),
});

const Login = connect(mapStateToProps, mapDispatchToProps)(LoginComponent);

export {Login};
