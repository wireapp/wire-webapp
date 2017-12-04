import configureStore from 'redux-mock-store';
import React from 'react';
import renderer from 'react-test-renderer';
import {Provider} from 'react-redux';
import thunk from 'redux-thunk';

export const mockStore = (state = {}, extraArgument = {}) => {
  const middlewares = [thunk.withExtraArgument(extraArgument)];
  return configureStore(middlewares)(state);
};

export const withStore = (children, store) => <Provider store={store}>{children}</Provider>;

export const renderWithStore = (component, store = () => {}) => renderer.create(withStore(component, store));
