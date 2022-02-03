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

// Polyfill "Object.entries" & "Object.values"
import 'core-js/es7/object';
import 'core-js/es7/reflect';
import * as cookieStore from 'js-cookie';
import React from 'react';
import * as ReactDOM from 'react-dom';
import {AppContainer} from 'react-hot-loader';
import {Provider, ConnectedComponent} from 'react-redux';

import {enableLogging} from 'Util/LoggerUtil';
import {exposeWrapperGlobals} from 'Util/wrapper';

import {Config} from '../Config';
import {configureClient} from './configureClient';
import {configureCore} from './configureCore';
import './configureEnvironment';
import {configureStore} from './configureStore';
import {actionRoot} from './module/action';
import Root from './page/Root';

exposeWrapperGlobals();

const apiClient = configureClient();
const core = configureCore(apiClient);

let localStorage;
try {
  localStorage = window.localStorage;
} catch (error) {}

const store = configureStore({
  actions: actionRoot,
  apiClient,
  cookieStore,
  core,
  getConfig: Config.getConfig,
  localStorage,
});

const Wrapper = (Component: ConnectedComponent<React.FunctionComponent, any>): JSX.Element => (
  <AppContainer>
    <Provider store={store}>
      <Component />
    </Provider>
  </AppContainer>
);

const render = (Component: ConnectedComponent<React.FunctionComponent, any>): void => {
  ReactDOM.render(Wrapper(Component), document.getElementById('main'));
};

function runApp(): void {
  render(Root);
  if (module.hot) {
    module.hot.accept('./page/Root', () => {
      render(require('./page/Root').default);
    });
  }
}

enableLogging(Config.getConfig().FEATURE.ENABLE_DEBUG);
runApp();
