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

import {StyledApp} from '@wireapp/react-ui-kit';
import * as React from 'react';
import {IntlProvider, addLocaleData} from 'react-intl';
import * as cs from 'react-intl/locale-data/cs';
import * as da from 'react-intl/locale-data/da';
import * as de from 'react-intl/locale-data/de';
import * as el from 'react-intl/locale-data/el';
import * as en from 'react-intl/locale-data/en';
import * as es from 'react-intl/locale-data/es';
import * as et from 'react-intl/locale-data/et';
import * as fi from 'react-intl/locale-data/fi';
import * as fr from 'react-intl/locale-data/fr';
import * as hr from 'react-intl/locale-data/hr';
import * as hu from 'react-intl/locale-data/hu';
import * as it from 'react-intl/locale-data/it';
import * as lt from 'react-intl/locale-data/lt';
import * as nl from 'react-intl/locale-data/nl';
import * as pl from 'react-intl/locale-data/pl';
import * as pt from 'react-intl/locale-data/pt';
import * as ro from 'react-intl/locale-data/ro';
import * as ru from 'react-intl/locale-data/ru';
import * as sk from 'react-intl/locale-data/sk';
import * as sl from 'react-intl/locale-data/sl';
import * as tr from 'react-intl/locale-data/tr';
import * as uk from 'react-intl/locale-data/uk';
import {connect} from 'react-redux';
import {HashRouter as Router, Redirect, Route, Switch} from 'react-router-dom';
import {Config} from '../config';
import {mapLanguage, normalizeLanguage} from '../localeConfig';
import ROOT_ACTIONS from '../module/action/';
import {RootState, ThunkDispatch} from '../module/reducer';
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

addLocaleData([
  ...cs,
  ...da,
  ...de,
  ...el,
  ...en,
  ...es,
  ...et,
  ...fi,
  ...fr,
  ...hr,
  ...hu,
  ...it,
  ...lt,
  ...nl,
  ...pl,
  ...pt,
  ...ro,
  ...ru,
  ...sk,
  ...sl,
  ...tr,
  ...uk,
]);

interface Props extends React.HTMLAttributes<Root> {}

interface ConnectedProps {
  language: string;
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
    return require(`resource/translation/${mapLanguage(language)}.json`);
  };

  render = () => {
    const {language} = this.props;
    return (
      <IntlProvider locale={normalizeLanguage(language)} messages={this.loadLanguage(language)}>
        <StyledApp style={{display: 'flex', height: '100%', minHeight: '100vh'}}>
          <Router hashType="noslash">
            <Switch>
              <Route exact path={ROUTE.INDEX} component={Index} />
              <Route path={ROUTE.CLIENTS} component={ClientManager} />
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
              <Route path={ROUTE.INITIAL_INVITE} component={InitialInvite} />
              <Route path={ROUTE.CHOOSE_HANDLE} component={ChooseHandle} />
              <Route path={ROUTE.HISTORY_INFO} component={HistoryInfo} />
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
  (state: RootState): ConnectedProps => {
    return {language: LanguageSelector.getLanguage(state)};
  },
  (dispatch: ThunkDispatch): DispatchProps => {
    return {
      safelyRemoveCookie: (name: string, value: string) => {
        return dispatch(ROOT_ACTIONS.cookieAction.safelyRemoveCookie(name, value));
      },
      startPolling: (name?: string, interval?: number, asJSON?: boolean) => {
        return dispatch(ROOT_ACTIONS.cookieAction.startPolling(name, interval, asJSON));
      },
      stopPolling: (name?: string) => dispatch(ROOT_ACTIONS.cookieAction.stopPolling(name)),
    };
  }
)(Root);
