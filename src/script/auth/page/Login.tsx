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

import {LoginData} from '@wireapp/api-client/lib/auth';
import {ClientType} from '@wireapp/api-client/lib/client/index';
import {
  ArrowIcon,
  COLOR,
  Checkbox,
  CheckboxLabel,
  CodeInput,
  Column,
  Columns,
  Container,
  ContainerXS,
  Form,
  H1,
  H2,
  Label,
  IsMobile,
  Link,
  TextLink,
  Loading,
  Muted,
  Text,
} from '@wireapp/react-ui-kit';
import React, {useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {Navigate} from 'react-router';
import {AnyAction, Dispatch} from 'redux';
import {useNavigate} from 'react-router-dom';
import {getLogger} from 'Util/Logger';
import {Config} from '../../Config';
import {loginStrings, verifyStrings} from '../../strings';
import AppAlreadyOpen from '../component/AppAlreadyOpen';
import LoginForm from '../component/LoginForm';
import RouterLink from '../component/RouterLink';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot} from '../module/action/';
import {BackendError} from '../module/action/BackendError';
import {LabeledError} from '../module/action/LabeledError';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {QUERY_KEY, ROUTE} from '../route';
import {Runtime} from '@wireapp/commons';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import {UrlUtil} from '@wireapp/commons';
import Page from './Page';
import EntropyContainer from './EntropyContainer';
import {StatusCodes} from 'http-status-codes';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const Login = ({
  loginError,
  resetAuthError,
  doCheckConversationCode,
  doInit,
  doSetLocalStorage,
  doInitializeClient,
  doLoginAndJoin,
  doLogin,
  pushEntropyData,
  doSendTwoFactorCode,
  isFetching,
  pushLoginData,
  loginData,
  defaultSSOCode,
  isSendingTwoFactorCode,
}: Props & ConnectedProps & DispatchProps) => {
  const logger = getLogger('Login');
  const {formatMessage: _} = useIntl();
  const navigate = useNavigate();
  const [conversationCode, setConversationCode] = useState<string | null>(null);
  const [conversationKey, setConversationKey] = useState<string | null>(null);

  const [isValidLink, setIsValidLink] = useState(true);
  const [validationErrors, setValidationErrors] = useState([]);

  const [twoFactorSubmitError, setTwoFactorSubmitError] = useState<string | Error>('');
  const [twoFactorLoginData, setTwoFactorLoginData] = useState<LoginData>();

  const [showEntropyForm, setShowEntropyForm] = useState(false);
  const isEntropyRequired = Config.getConfig().FEATURE.ENABLE_EXTRA_CLIENT_ENTROPY;

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
    // Redirect to prefilled SSO login if default SSO code is set on backend
    if (defaultSSOCode) {
      navigate(`${ROUTE.SSO}/${defaultSSOCode}`);
    }
  }, [defaultSSOCode]);

  useEffect(() => {
    const queryConversationCode = UrlUtil.getURLParameter(QUERY_KEY.CONVERSATION_CODE) || null;
    const queryConversationKey = UrlUtil.getURLParameter(QUERY_KEY.CONVERSATION_KEY) || null;

    const keyAndCodeExistent = queryConversationKey && queryConversationCode;
    if (keyAndCodeExistent) {
      setConversationCode(queryConversationCode);
      setConversationKey(queryConversationKey);
      setIsValidLink(true);
      doCheckConversationCode(queryConversationKey, queryConversationCode).catch(error => {
        logger.warn('Invalid conversation code', error);
        setIsValidLink(false);
      });
    }
  }, []);

  useEffect(() => {
    resetAuthError();
    const isImmediateLogin = UrlUtil.hasURLParameter(QUERY_KEY.IMMEDIATE_LOGIN);
    if (isImmediateLogin) {
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
      return navigate(ROUTE.HISTORY_INFO);
    } catch (error) {
      logger.error('Unable to login immediately', error);
    }
  };

  const handleSubmit = async (formLoginData: Partial<LoginData>, validationErrors: Error[] = []) => {
    setValidationErrors(validationErrors);
    try {
      const login: LoginData = {...formLoginData, clientType: loginData.clientType};
      if (validationErrors.length) {
        throw validationErrors[0];
      }

      const hasKeyAndCode = conversationKey && conversationCode;
      if (hasKeyAndCode) {
        await doLoginAndJoin(login, conversationKey, conversationCode, undefined, getEntropy);
      } else {
        await doLogin(login, getEntropy);
      }

      return navigate(ROUTE.HISTORY_INFO);
    } catch (error) {
      if ((error as BackendError).label) {
        const backendError = error as BackendError;
        switch (backendError.label) {
          case BackendError.LABEL.TOO_MANY_CLIENTS: {
            resetAuthError();
            if (formLoginData?.verificationCode) {
              doSetLocalStorage(QUERY_KEY.CONVERSATION_CODE, formLoginData.verificationCode);
            }
            if (entropy.current) {
              pushEntropyData(entropy.current);
            }
            navigate(ROUTE.CLIENTS);
            break;
          }
          case BackendError.LABEL.CODE_AUTHENTICATION_REQUIRED: {
            const login: LoginData = {...formLoginData, clientType: loginData.clientType};
            setTwoFactorLoginData(login);
            doSendTwoFactorCode(login.email);
            doSetLocalStorage(QUERY_KEY.JOIN_EXPIRES, Date.now() + 1000 * 60 * 10);
            break;
          }
          case BackendError.LABEL.CODE_AUTHENTICATION_FAILED: {
            setTwoFactorSubmitError(error);
            break;
          }
          case BackendError.LABEL.INVALID_CREDENTIALS:
          case LabeledError.GENERAL_ERRORS.LOW_DISK_SPACE: {
            break;
          }
          default: {
            const isValidationError = Object.values(ValidationError.ERROR).some(errorType =>
              backendError.label.endsWith(errorType),
            );
            if (!isValidationError) {
              throw backendError;
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
      await doSendTwoFactorCode(twoFactorLoginData.email);
    } catch (error) {
      setTwoFactorSubmitError(
        new BackendError({code: StatusCodes.TOO_MANY_REQUESTS, label: BackendError.GENERAL_ERRORS.TOO_MANY_REQUESTS}),
      );
    }
  };

  const submitTwoFactorLogin = (code: string) => {
    setTwoFactorSubmitError('');
    handleSubmit({...twoFactorLoginData, verificationCode: code}, []);
  };

  const storeEntropy = async (entropyData: Uint8Array) => {
    onEntropyGenerated.current?.(entropyData);
  };

  const backArrow = (
    <RouterLink to={ROUTE.INDEX} data-uie-name="go-index" aria-label={_(loginStrings.goBack)}>
      <ArrowIcon direction="left" color={COLOR.TEXT} style={{opacity: 0.56}} />
    </RouterLink>
  );

  return (
    <Page>
      {(Config.getConfig().FEATURE.ENABLE_DOMAIN_DISCOVERY ||
        Config.getConfig().FEATURE.ENABLE_SSO ||
        Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION) && (
        <IsMobile>
          <div style={{margin: 16}}>{backArrow}</div>
        </IsMobile>
      )}
      {isEntropyRequired && showEntropyForm ? (
        <EntropyContainer onSetEntropy={storeEntropy} />
      ) : (
        <Container centerText verticalCenter style={{width: '100%'}}>
          {!isValidLink && <Navigate to={ROUTE.CONVERSATION_JOIN_INVALID} replace />}
          <AppAlreadyOpen />
          <Columns>
            <IsMobile not>
              <Column style={{display: 'flex'}}>
                {(Config.getConfig().FEATURE.ENABLE_DOMAIN_DISCOVERY ||
                  Config.getConfig().FEATURE.ENABLE_SSO ||
                  Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION) && (
                  <div style={{margin: 'auto'}}>{backArrow}</div>
                )}
              </Column>
            </IsMobile>
            <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
              <ContainerXS
                centerText
                style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
              >
                {twoFactorLoginData ? (
                  <div>
                    <H2 center>{_(loginStrings.twoFactorLoginTitle)}</H2>
                    <Text data-uie-name="label-with-email">
                      {_(loginStrings.twoFactorLoginSubHead, {email: twoFactorLoginData.email})}
                    </Text>
                    <Label markInvalid={!!twoFactorSubmitError}>
                      <CodeInput
                        style={{marginTop: 60}}
                        onCodeComplete={submitTwoFactorLogin}
                        data-uie-name="enter-code"
                        markInvalid={!!twoFactorSubmitError}
                      />
                    </Label>
                    <div style={{display: 'flex', justifyContent: 'center', marginTop: 10}}>
                      {!!twoFactorSubmitError && parseError(twoFactorSubmitError)}
                    </div>
                    <div style={{marginTop: 20}}>
                      {isSendingTwoFactorCode ? (
                        <Loading size={20} />
                      ) : (
                        <TextLink onClick={resendTwoFactorCode} center data-uie-name="do-resend-code">
                          {_(verifyStrings.resendCode)}
                        </TextLink>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <H1 center>{_(loginStrings.headline)}</H1>
                      <Muted>{_(loginStrings.subhead)}</Muted>
                      <Form style={{marginTop: 30}} data-uie-name="login">
                        <LoginForm isFetching={isFetching} onSubmit={handleSubmit} />
                        {validationErrors.length ? (
                          parseValidationErrors(validationErrors)
                        ) : loginError ? (
                          parseError(loginError)
                        ) : (
                          <div style={{marginTop: '4px'}}>&nbsp;</div>
                        )}
                        {!Runtime.isDesktopApp() && (
                          <Checkbox
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                              pushLoginData({
                                clientType: event.target.checked ? ClientType.TEMPORARY : ClientType.PERMANENT,
                              });
                            }}
                            checked={loginData.clientType === ClientType.TEMPORARY}
                            data-uie-name="enter-public-computer-sign-in"
                            style={{justifyContent: 'center', marginTop: '12px'}}
                            aligncenter
                          >
                            <CheckboxLabel htmlFor="enter-public-computer-sign-in">
                              {_(loginStrings.publicComputer)}
                            </CheckboxLabel>
                          </Checkbox>
                        )}
                      </Form>
                    </div>
                    <Columns>
                      <Column>
                        <Link
                          href={EXTERNAL_ROUTE.WIRE_ACCOUNT_PASSWORD_RESET}
                          target="_blank"
                          data-uie-name="go-forgot-password"
                        >
                          {_(loginStrings.forgotPassword)}
                        </Link>
                      </Column>
                      {Config.getConfig().FEATURE.ENABLE_PHONE_LOGIN && (
                        <Column>
                          <RouterLink to={ROUTE.LOGIN_PHONE} data-uie-name="go-sign-in-phone">
                            {_(loginStrings.phoneLogin)}
                          </RouterLink>
                        </Column>
                      )}
                    </Columns>
                  </>
                )}
              </ContainerXS>
            </Column>
            <Column />
          </Columns>
        </Container>
      )}
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  defaultSSOCode: AuthSelector.getDefaultSSOCode(state),
  isFetching: AuthSelector.isFetching(state),
  isSendingTwoFactorCode: AuthSelector.isSendingTwoFactorCode(state),
  loginData: AuthSelector.getLoginData(state),
  loginError: AuthSelector.getError(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doCheckConversationCode: actionRoot.conversationAction.doCheckConversationCode,
      doInit: actionRoot.authAction.doInit,
      doInitializeClient: actionRoot.clientAction.doInitializeClient,
      doLogin: actionRoot.authAction.doLogin,
      doLoginAndJoin: actionRoot.authAction.doLoginAndJoin,
      doSendTwoFactorCode: actionRoot.authAction.doSendTwoFactorLoginCode,
      doSetLocalStorage: actionRoot.localStorageAction.setLocalStorage,
      pushEntropyData: actionRoot.authAction.pushEntropyData,
      pushLoginData: actionRoot.authAction.pushLoginData,
      resetAuthError: actionRoot.authAction.resetAuthError,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(Login);
