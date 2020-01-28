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

import {LoginData} from '@wireapp/api-client/dist/auth';
import {ClientType} from '@wireapp/api-client/dist/client/index';
import {
  ArrowIcon,
  COLOR,
  Checkbox,
  CheckboxLabel,
  Column,
  Columns,
  Container,
  ContainerXS,
  ErrorMessage,
  Form,
  H1,
  IsMobile,
  Link,
  Muted,
} from '@wireapp/react-ui-kit';
import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {Redirect} from 'react-router';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {getLogger} from 'Util/Logger';
import {Config} from '../../Config';
import {loginStrings} from '../../strings';
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
import {isDesktopApp} from '../Runtime';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import * as URLUtil from '../util/urlUtil';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const Login = ({
  loginError,
  resetAuthError,
  doCheckConversationCode,
  doInit,
  doInitializeClient,
  doLoginAndJoin,
  doLogin,
  isFetching,
  pushLoginData,
  loginData,
}: Props & ConnectedProps & DispatchProps) => {
  const logger = getLogger('Login');
  const {formatMessage: _} = useIntl();
  const {history} = useReactRouter();

  const [conversationCode, setConversationCode] = useState();
  const [conversationKey, setConversationKey] = useState();

  const [isValidLink, setIsValidLink] = useState(true);
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    const queryConversationCode = URLUtil.getURLParameter(QUERY_KEY.CONVERSATION_CODE) || null;
    const queryConversationKey = URLUtil.getURLParameter(QUERY_KEY.CONVERSATION_KEY) || null;

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
    const isImmediateLogin = URLUtil.hasURLParameter(QUERY_KEY.IMMEDIATE_LOGIN);
    if (isImmediateLogin) {
      immediateLogin();
    }
    return () => resetAuthError();
  }, []);

  const immediateLogin = async () => {
    try {
      await doInit({isImmediateLogin: true, shouldValidateLocalClient: false});
      await doInitializeClient(ClientType.PERMANENT, undefined);
      return history.push(ROUTE.HISTORY_INFO);
    } catch (error) {
      logger.error('Unable to login immediately', error);
    }
  };

  const forgotPassword = () => URLUtil.openTab(EXTERNAL_ROUTE.WIRE_ACCOUNT_PASSWORD_RESET);

  const handleSubmit = async (formLoginData: Partial<LoginData>, validationErrors: Error[]) => {
    setValidationErrors(validationErrors);
    try {
      if (validationErrors.length) {
        throw validationErrors[0];
      }
      const login: LoginData = {...formLoginData, clientType: loginData.clientType};

      const hasKeyAndCode = conversationKey && conversationCode;
      if (hasKeyAndCode) {
        await doLoginAndJoin(login, conversationKey, conversationCode);
      } else {
        await doLogin(login);
      }

      return history.push(ROUTE.HISTORY_INFO);
    } catch (error) {
      if ((error as BackendError).label) {
        const backendError = error as BackendError;
        switch (backendError.label) {
          case BackendError.LABEL.TOO_MANY_CLIENTS: {
            resetAuthError();
            history.push(ROUTE.CLIENTS);
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

  const backArrow = (
    <RouterLink to={ROUTE.INDEX} data-uie-name="go-index">
      <ArrowIcon direction="left" color={COLOR.TEXT} style={{opacity: 0.56}} />
    </RouterLink>
  );
  const isSSOCapable = !isDesktopApp() || (isDesktopApp() && window.wSSOCapable === true);
  return (
    <Page>
      {Config.FEATURE.ENABLE_ACCOUNT_REGISTRATION && (
        <IsMobile>
          <div style={{margin: 16}}>{backArrow}</div>
        </IsMobile>
      )}
      <Container centerText verticalCenter style={{width: '100%'}}>
        {!isValidLink && <Redirect to={ROUTE.CONVERSATION_JOIN_INVALID} />}
        <AppAlreadyOpen />
        <Columns>
          <IsMobile not>
            <Column style={{display: 'flex'}}>
              {Config.FEATURE.ENABLE_ACCOUNT_REGISTRATION && <div style={{margin: 'auto'}}>{backArrow}</div>}
            </Column>
          </IsMobile>
          <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
            <ContainerXS
              centerText
              style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
            >
              <div>
                <H1 center>{_(loginStrings.headline)}</H1>
                <Muted>{_(loginStrings.subhead)}</Muted>
                <Form style={{marginTop: 30}} data-uie-name="login">
                  <LoginForm isFetching={isFetching} onSubmit={handleSubmit} />
                  {validationErrors.length ? (
                    parseValidationErrors(validationErrors)
                  ) : loginError ? (
                    <ErrorMessage data-uie-name="error-message">{parseError(loginError)}</ErrorMessage>
                  ) : (
                    <div style={{marginTop: '4px'}}>&nbsp;</div>
                  )}
                  {!isDesktopApp() && (
                    <Checkbox
                      tabIndex={3}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        pushLoginData({clientType: event.target.checked ? ClientType.TEMPORARY : ClientType.PERMANENT});
                      }}
                      checked={loginData.clientType === ClientType.TEMPORARY}
                      data-uie-name="enter-public-computer-sign-in"
                      style={{justifyContent: 'center', marginTop: '12px'}}
                    >
                      <CheckboxLabel>{_(loginStrings.publicComputer)}</CheckboxLabel>
                    </Checkbox>
                  )}
                </Form>
              </div>
              {Config.FEATURE.ENABLE_SSO && isSSOCapable ? (
                <div style={{marginTop: '36px'}}>
                  <Link center onClick={forgotPassword} data-uie-name="go-forgot-password">
                    {_(loginStrings.forgotPassword)}
                  </Link>
                  <Columns style={{marginTop: '36px'}}>
                    {Config.FEATURE.ENABLE_PHONE_LOGIN && (
                      <Column>
                        <Link onClick={() => history.push(ROUTE.LOGIN_PHONE)} data-uie-name="go-sign-in-phone">
                          {_(loginStrings.phoneLogin)}
                        </Link>
                      </Column>
                    )}
                  </Columns>
                </div>
              ) : (
                <Columns>
                  <Column>
                    <Link onClick={forgotPassword} data-uie-name="go-forgot-password">
                      {_(loginStrings.forgotPassword)}
                    </Link>
                  </Column>
                  {Config.FEATURE.ENABLE_PHONE_LOGIN && (
                    <Column>
                      <Link onClick={() => history.push(ROUTE.LOGIN_PHONE)} data-uie-name="go-sign-in-phone">
                        {_(loginStrings.phoneLogin)}
                      </Link>
                    </Column>
                  )}
                </Columns>
              )}
            </ContainerXS>
          </Column>
          <Column />
        </Columns>
      </Container>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  isFetching: AuthSelector.isFetching(state),
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
      pushLoginData: actionRoot.authAction.pushLoginData,
      resetAuthError: actionRoot.authAction.resetAuthError,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(Login);
