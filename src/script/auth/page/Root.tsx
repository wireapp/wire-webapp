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

import {pathWithParams} from '@wireapp/commons/src/main/util/UrlUtil';
import {StyledApp, Loading, ContainerXS} from '@wireapp/react-ui-kit';
import React, {useEffect} from 'react';
import {IntlProvider} from 'react-intl';
import {connect} from 'react-redux';
import {HashRouter as Router, Redirect, Route, Switch} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';
import {Config} from '../../Config';
import {mapLanguage, normalizeLanguage} from '../localeConfig';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as CookieSelector from '../module/selector/CookieSelector';
import * as LanguageSelector from '../module/selector/LanguageSelector';
import {ROUTE} from '../route';
import CheckPassword from './CheckPassword';
import ClientManager from './ClientManager';
import ConversationJoin from './ConversationJoin';
import ConversationJoinInvalid from './ConversationJoinInvalid';
import CreateAccount from './CreateAccount';
import CreatePersonalAccount from './CreatePersonalAccount';
import HistoryInfo from './HistoryInfo';
import Index from './Index';
import InitialInvite from './InitialInvite';
import Login from './Login';
import PhoneLogin from './PhoneLogin';
import SetAccountType from './SetAccountType';
import SetEmail from './SetEmail';
import SetHandle from './SetHandle';
import SetPassword from './SetPassword';
import SingleSignOn from './SingleSignOn';
import TeamName from './TeamName';
import VerifyEmailCode from './VerifyEmailCode';
import VerifyEmailLink from './VerifyEmailLink';
import VerifyPhoneCode from './VerifyPhoneCode';
import CustomEnvironmentRedirect from './CustomEnvironmentRedirect';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const Root = ({
  isAuthenticated,
  language,
  isFetchingSSOSettings,
  startPolling,
  safelyRemoveCookie,
  stopPolling,
  doGetSSOSettings,
}: Props & ConnectedProps & DispatchProps) => {
  useEffect(() => {
    startPolling();
    window.onbeforeunload = () => {
      safelyRemoveCookie(CookieSelector.COOKIE_NAME_APP_OPENED, Config.getConfig().APP_INSTANCE_ID);
      stopPolling();
    };
  }, []);

  useEffect(() => {
    doGetSSOSettings();
  }, []);

  const loadLanguage = (language: string) => {
    return require(`I18n/${mapLanguage(language)}.json`);
  };

  const navigate = (route: string): null => {
    window.location.assign(pathWithParams(route));
    return null;
  };

  const isAuthenticatedCheck = (page: any): any => (page ? (isAuthenticated ? page : navigate('/auth')) : null);

  const ProtectedHistoryInfo = () => isAuthenticatedCheck(<HistoryInfo />);
  const ProtectedInitialInvite = () => isAuthenticatedCheck(<InitialInvite />);
  const ProtectedClientManager = () => isAuthenticatedCheck(<ClientManager />);

  const ProtectedSetHandle = () => isAuthenticatedCheck(<SetHandle />);
  const ProtectedSetEmail = () => isAuthenticatedCheck(<SetEmail />);
  const ProtectedSetPassword = () => isAuthenticatedCheck(<SetPassword />);

  return (
    <IntlProvider locale={normalizeLanguage(language)} messages={loadLanguage(language)}>
      <StyledApp style={{display: 'flex', height: '100%', minHeight: '100vh'}}>
        {isFetchingSSOSettings ? (
          <ContainerXS centerText verticalCenter style={{justifyContent: 'center'}}>
            <Loading />
          </ContainerXS>
        ) : (
          <Router hashType="noslash">
            <Switch>
              <Route exact path={ROUTE.INDEX} component={Index} />
              <Route path={ROUTE.CHECK_PASSWORD} component={CheckPassword} />
              <Route path={ROUTE.CLIENTS} component={ProtectedClientManager} />
              <Route path={ROUTE.CONVERSATION_JOIN_INVALID} component={ConversationJoinInvalid} />
              <Route path={ROUTE.CONVERSATION_JOIN} component={ConversationJoin} />
              <Route
                path={ROUTE.CREATE_TEAM}
                component={Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION && TeamName}
              />
              <Route path={ROUTE.HISTORY_INFO} component={ProtectedHistoryInfo} />
              <Route path={ROUTE.INITIAL_INVITE} component={ProtectedInitialInvite} />
              <Route path={ROUTE.LOGIN} component={Login} />
              <Route path={ROUTE.LOGIN_PHONE} component={PhoneLogin} />
              <Route path={ROUTE.SET_ACCOUNT_TYPE} component={SetAccountType} />
              <Route path={ROUTE.SET_EMAIL} component={ProtectedSetEmail} />
              <Route path={ROUTE.SET_HANDLE} component={ProtectedSetHandle} />
              <Route path={ROUTE.SET_PASSWORD} component={ProtectedSetPassword} />
              <Route path={`${ROUTE.SSO}/:code?`} component={SingleSignOn} />
              <Route path={ROUTE.VERIFY_EMAIL_LINK} component={VerifyEmailLink} />
              <Route path={ROUTE.VERIFY_PHONE_CODE} component={VerifyPhoneCode} />
              <Route path={ROUTE.CUSTOM_ENV_REDIRECT} component={CustomEnvironmentRedirect} />
              <Route
                path={ROUTE.VERIFY_EMAIL_CODE}
                component={Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION && VerifyEmailCode}
              />
              <Route
                path={ROUTE.CREATE_ACCOUNT}
                component={Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION && CreatePersonalAccount}
              />
              <Route
                path={ROUTE.CREATE_TEAM_ACCOUNT}
                component={Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION && CreateAccount}
              />
              <Redirect to={ROUTE.INDEX} />
            </Switch>
          </Router>
        )}
      </StyledApp>
    </IntlProvider>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  isAuthenticated: AuthSelector.isAuthenticated(state),
  isFetchingSSOSettings: AuthSelector.isFetchingSSOSettings(state),
  language: LanguageSelector.getLanguage(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doGetSSOSettings: ROOT_ACTIONS.authAction.doGetSSOSettings,
      safelyRemoveCookie: ROOT_ACTIONS.cookieAction.safelyRemoveCookie,
      startPolling: ROOT_ACTIONS.cookieAction.startPolling,
      stopPolling: ROOT_ACTIONS.cookieAction.stopPolling,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(Root);
