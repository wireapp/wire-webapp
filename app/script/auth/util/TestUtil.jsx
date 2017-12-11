import Client from '@wireapp/api-client';
import configureStore from 'redux-mock-store';
import React from 'react';
import {HashRouter} from 'react-router-dom';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
const {StoreEngine} = require('@wireapp/store-engine');
import {mount} from 'enzyme';
import thunk from 'redux-thunk';

const apiClient = new Client({
  store: new StoreEngine.MemoryEngine('test-execution'),
  urls: Client.BACKEND.STAGING,
});

export const mockStore = (state = {
  languageState: {
    language: 'en',
  },
}, extraArgument = {
  apiClient,
  mixpanel: {track: () => 1}
}) => {
  const middlewares = [thunk.withExtraArgument(extraArgument)];
  return configureStore(middlewares)(state);
};

export const withStore = (children, store) => <Provider store={store}>{children}</Provider>;

export const withIntl = component => <IntlProvider locale='en'><HashRouter>{component}</HashRouter></IntlProvider>;

export const mountWithIntl = (component, store = () => {}) => mount(withStore(withIntl(component), store));

export const mountWithStore = (component, store = () => {}) => mount(withStore(component, store));
