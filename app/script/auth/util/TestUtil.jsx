import configureStore from 'redux-mock-store';
import React from 'react';
import {HashRouter} from 'react-router-dom';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
import renderer from 'react-test-renderer';
import thunk from 'redux-thunk';
import {mount} from 'enzyme';

export const mockStore = (state = {}, extraArgument = {}) => {
  const middlewares = [thunk.withExtraArgument(extraArgument)];
  return configureStore(middlewares)(state);
};

export const withStore = (children, store) => <Provider store={store}>{children}</Provider>;

export const withIntl = (component) => <IntlProvider><HashRouter>{component}</HashRouter></IntlProvider>;

export const mountWithStore = (component, store = () => {}) => mount(withStore(withIntl(component), store));

export const renderWithStore = (component, store = () => {}) => renderer.create(withStore(component, store));
