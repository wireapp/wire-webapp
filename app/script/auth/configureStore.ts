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

import {Store, applyMiddleware, combineReducers, createStore} from 'redux';
import {composeWithDevTools} from 'redux-devtools-extension/developmentOnly';
import thunk from 'redux-thunk';
import {runtimeAction} from './module/action/RuntimeAction';
import reducers, {RootState, ThunkDispatch} from './module/reducer';
const {createLogger} = require('redux-logger');
import * as Environment from './Environment';

const configureStore = (thunkArguments: object = {}) => {
  const store: Store<RootState> = createStore(combineReducers(reducers), createMiddleware(thunkArguments));

  if (process.env.NODE_ENV !== 'production') {
    if (module.hot) {
      module.hot.accept('./module/reducer/index.ts', () => {
        store.replaceReducer(combineReducers(require('./module/reducer/index.ts').default));
      });
    }
  }

  const dispatch: ThunkDispatch = store.dispatch;
  dispatch(runtimeAction.checkIndexedDbSupport());
  dispatch(runtimeAction.checkCookieSupport());
  dispatch(runtimeAction.checkSupportedBrowser());

  return store;
};

const createMiddleware = (thunkArguments: object) => {
  const middlewares = [thunk.withExtraArgument(thunkArguments)];

  let localStorage;
  try {
    localStorage = window.localStorage;
  } catch (error) {}

  if (localStorage) {
    localStorage.removeItem('debug');
  }
  if (!Environment.isEnvironment(Environment.ENVIRONMENT.PRODUCTION)) {
    if (localStorage) {
      localStorage.setItem('debug', '@wireapp/*');
    }

    middlewares.push(
      createLogger({
        collapsed: true,
        diff: true,
        duration: true,
        level: {
          action: 'info',
          nextState: 'info',
          prevState: false,
        },
      })
    );
  }
  // Note: Redux DevTools will only be applied when NODE_ENV is NOT production
  // https://github.com/zalmoxisus/redux-devtools-extension/blob/master/npm-package/developmentOnly.js
  return composeWithDevTools(applyMiddleware(...middlewares));
};

export {configureStore};
