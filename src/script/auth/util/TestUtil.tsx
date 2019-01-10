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

import {APIClient} from '@wireapp/api-client';
import {MemoryEngine} from '@wireapp/store-engine/dist/commonjs/engine';
import {mount} from 'enzyme';
import * as React from 'react';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
import {HashRouter} from 'react-router-dom';
import {Store} from 'redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import {RootState} from '../module/reducer';

const engine = new MemoryEngine();
engine.init('test-execution');

const apiClient = new APIClient({
  store: engine,
  urls: APIClient.BACKEND.STAGING,
});

export const mockStore = (
  state = {
    authState: {},
    languageState: {
      language: 'en',
    },
  },
  extraArgument = {
    apiClient,
  }
) => {
  const middlewares = [thunk.withExtraArgument(extraArgument)];
  return configureStore(middlewares)(state);
};

export const withStore = (children: React.ReactNode, store: Store<RootState>) => (
  <Provider store={store}>{children}</Provider>
);

export const withIntl = (component: React.ReactNode) => (
  <IntlProvider locale="en">
    <HashRouter hashType="noslash">{component}</HashRouter>
  </IntlProvider>
);

export const mountWithIntl = (component: React.ReactNode, store: Store<RootState>) =>
  mount(withStore(withIntl(component), store));

export const mountWithStore = (component: React.ReactNode, store: Store<RootState>) =>
  mount(withStore(component, store));
