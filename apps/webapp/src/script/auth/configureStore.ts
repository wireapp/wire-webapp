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

import {applyMiddleware, combineReducers, legacy_createStore as createStore} from 'redux';
import {withExtraArgument} from 'redux-thunk';

import {LOGGER_NAMESPACE} from 'Util/logger';

import {reducers} from './module/reducer';

const reduxLogdown = require('redux-logdown');

type HotReloadCapableModule = NodeJS.Module & {
  hot?: {
    accept: (dependencyPath: string, callback: () => void) => void;
  };
};

const configureStore = (thunkArguments: object = {}) => {
  const store = createStore(combineReducers(reducers), undefined, createMiddleware(thunkArguments));
  const hotReloadCapableModule = module as HotReloadCapableModule;

  if (process.env.NODE_ENV !== 'production') {
    if (hotReloadCapableModule.hot !== undefined) {
      hotReloadCapableModule.hot.accept('./module/reducer/index', () => {
        store.replaceReducer(combineReducers(require('./module/reducer/index').default) as any);
      });
    }
  }

  return store;
};

const createLoggerMiddleware = () => reduxLogdown(LOGGER_NAMESPACE, {diff: true});

const createMiddleware = (thunkArguments: object) => {
  const middlewares = [withExtraArgument(thunkArguments), createLoggerMiddleware()];
  return applyMiddleware(...middlewares);
};

export {configureStore};
