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

import * as cookieStore from 'js-cookie';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {AppContainer} from 'react-hot-loader';
import {Provider} from 'react-redux';
import {configureClient} from './configureClient';
import {configureCore} from './configureCore';
import {configureEnvironment} from './configureEnvironment';
import {configureStore} from './configureStore';
import actionRoot from './module/action';
import Root from './page/Root';

configureEnvironment();
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
  localStorage,
});

const Wrapper = (Component: React.ComponentClass) => (
  <AppContainer>
    <Provider store={store}>
      <Component />
    </Provider>
  </AppContainer>
);

const render = (Component: React.ComponentClass) => {
  ReactDOM.render(Wrapper(Component), document.getElementById('main'));
};

function runApp() {
  render(Root);
  if (module.hot) {
    module.hot.accept('./page/Root', () => {
      render(require('./page/Root').default);
    });
  }
}

runApp();
