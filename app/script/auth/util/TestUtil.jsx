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

import Client from '@wireapp/api-client';
import configureStore from 'redux-mock-store';
import React from 'react';
import {HashRouter} from 'react-router-dom';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
import {MemoryEngine} from '@wireapp/store-engine';
import {mount} from 'enzyme';
import thunk from 'redux-thunk';

const apiClient = new Client({
  store: new MemoryEngine('test-execution'),
  urls: Client.BACKEND.STAGING,
});

export const mockStore = (
  state = {
    languageState: {
      language: 'en',
    },
  },
  extraArgument = {
    apiClient,
    mixpanel: {track: () => 1},
  }
) => {
  const middlewares = [thunk.withExtraArgument(extraArgument)];
  return configureStore(middlewares)(state);
};

export const withStore = (children, store) => <Provider store={store}>{children}</Provider>;

export const withIntl = component => (
  <IntlProvider locale="en">
    <HashRouter hashType="noslash">{component}</HashRouter>
  </IntlProvider>
);

export const mountWithIntl = (component, store = () => {}) => mount(withStore(withIntl(component), store));

export const mountWithStore = (component, store = () => {}) => mount(withStore(component, store));
