/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import React from 'react';
import {StyledApp, Content} from '@wireapp/react-ui-kit/Layout';
import {HashRouter as Router, Redirect, Route, Switch} from 'react-router-dom';
import Index from './Index';
import TeamName from './TeamName';
import CreateAccount from './CreateAccount';
import Verify from './Verify';
import {IntlProvider, addLocaleData} from 'react-intl';
import {connect} from 'react-redux';
import de from 'react-intl/locale-data/de';
import ROUTE from '../route';

addLocaleData([...de]);

const Root = ({language}) => (
  <IntlProvider locale={language} messages={require(`../../../i18n/webapp-${language}.json`)}>
    <StyledApp>
      <Router>
        <Content>
          <Switch>
            <Route exact path={ROUTE.INDEX} component={Index} />
            <Route path={ROUTE.CREATE_TEAM} component={TeamName} />
            <Route path={ROUTE.CREATE_ACCOUNT} component={CreateAccount} />
            <Route path={ROUTE.VERIFY} component={Verify} />
            <Redirect to={ROUTE.INDEX} />
          </Switch>
        </Content>
      </Router>
    </StyledApp>
  </IntlProvider>
);

export default connect(({languageState}) => ({language: languageState.language}))(Root);
