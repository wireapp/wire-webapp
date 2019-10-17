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

import {pathWithParams} from '@wireapp/commons/dist/commonjs/util/UrlUtil';
import {StyledApp} from '@wireapp/react-ui-kit';
import * as React from 'react';
import {IntlProvider} from 'react-intl';
import {connect} from 'react-redux';
import {HashRouter as Router, Redirect, Route, Switch} from 'react-router-dom';
import {Config} from '../config';
import {mapLanguage, normalizeLanguage} from '../localeConfig';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {RootState, ThunkDispatch} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as CookieSelector from '../module/selector/CookieSelector';
import * as LanguageSelector from '../module/selector/LanguageSelector';
import {ROUTE} from '../route';
import ChooseHandle from './ChooseHandle';
import ClientManager from './ClientManager';
import ConversationJoin from './ConversationJoin';
import ConversationJoinInvalid from './ConversationJoinInvalid';
import CreateAccount from './CreateAccount';
import CreatePersonalAccount from './CreatePersonalAccount';
import HistoryInfo from './HistoryInfo';
import Index from './Index';
import InitialInvite from './InitialInvite';
import Login from './Login';
import SingleSignOn from './SingleSignOn';
import TeamName from './TeamName';
import Verify from './Verify';

interface Props extends React.HTMLAttributes<Root> {}

interface ConnectedProps {
  language: string;
  isAuthenticated: boolean;
}

interface DispatchProps {
  startPolling: (name?: string, interval?: number, asJSON?: boolean) => Promise<void>;
  safelyRemoveCookie: (name: string, value: string) => Promise<void>;
  stopPolling: (name?: string) => Promise<void>;
}

interface State {}

class Root extends React.Component<Props & ConnectedProps & DispatchProps, State> {
  componentDidMount = () => {
    this.props.startPolling();
    window.onbeforeunload = () => {
      this.props.safelyRemoveCookie(CookieSelector.COOKIE_NAME_APP_OPENED, Config.APP_INSTANCE_ID);
      this.props.stopPolling();
    };
  };

  loadLanguage = (language: string) => {
    return require(`Resource/translation/${mapLanguage(language)}.json`);
  };

  render = () => {
    const {isAuthenticated, language} = this.props;

    const navigate = (route: string): null => {
      window.location.assign(pathWithParams(route));
      return null;
    };

    const isAuthenticatedCheck = (page: any): any => (page ? (isAuthenticated ? page : navigate('/auth#login')) : null);

    const ProtectedChooseHandle = () => isAuthenticatedCheck(<ChooseHandle />);
    const ProtectedHistoryInfo = () => isAuthenticatedCheck(<HistoryInfo />);
    const ProtectedInitialInvite = () => isAuthenticatedCheck(<InitialInvite />);
    const ProtectedClientManager = () => isAuthenticatedCheck(<ClientManager />);

    return (
      <IntlProvider locale={normalizeLanguage(language)} messages={this.loadLanguage(language)}>
        <StyledApp style={{display: 'flex', height: '100%', minHeight: '100vh'}}>
          <Router hashType="noslash">
            <Switch>
              <Route exact path={ROUTE.INDEX} component={Index} />
              <Route path={ROUTE.CLIENTS} component={ProtectedClientManager} />
              <Route path={ROUTE.LOGIN} component={Login} />
              <Route path={ROUTE.CONVERSATION_JOIN} component={ConversationJoin} />
              <Route path={ROUTE.CONVERSATION_JOIN_INVALID} component={ConversationJoinInvalid} />
              <Route path={ROUTE.CREATE_TEAM} component={Config.FEATURE.ENABLE_ACCOUNT_REGISTRATION && TeamName} />
              <Route
                path={ROUTE.CREATE_ACCOUNT}
                component={Config.FEATURE.ENABLE_ACCOUNT_REGISTRATION && CreatePersonalAccount}
              />
              <Route
                path={ROUTE.CREATE_TEAM_ACCOUNT}
                component={Config.FEATURE.ENABLE_ACCOUNT_REGISTRATION && CreateAccount}
              />
              <Route path={ROUTE.VERIFY} component={Config.FEATURE.ENABLE_ACCOUNT_REGISTRATION && Verify} />
              <Route path={ROUTE.INITIAL_INVITE} component={ProtectedInitialInvite} />
              <Route path={ROUTE.CHOOSE_HANDLE} component={ProtectedChooseHandle} />
              <Route path={ROUTE.HISTORY_INFO} component={ProtectedHistoryInfo} />
              <Route path={ROUTE.SSO} component={SingleSignOn} />
              <Redirect to={ROUTE.INDEX} />
            </Switch>
          </Router>
        </StyledApp>
      </IntlProvider>
    );
  };
}

export default connect(
  (state: RootState): ConnectedProps => ({
    isAuthenticated: AuthSelector.isAuthenticated(state),
    language: LanguageSelector.getLanguage(state),
  }),
  (dispatch: ThunkDispatch): DispatchProps => ({
    safelyRemoveCookie: (name: string, value: string) =>
      dispatch(ROOT_ACTIONS.cookieAction.safelyRemoveCookie(name, value)),
    startPolling: (name?: string, interval?: number, asJSON?: boolean) =>
      dispatch(ROOT_ACTIONS.cookieAction.startPolling(name, interval, asJSON)),
    stopPolling: (name?: string) => dispatch(ROOT_ACTIONS.cookieAction.stopPolling(name)),
  }),
)(Root);
