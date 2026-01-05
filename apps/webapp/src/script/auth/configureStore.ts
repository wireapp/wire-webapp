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

import {applyMiddleware, combineReducers, legacy_createStore as createStore, Middleware} from 'redux';
import {withExtraArgument} from 'redux-thunk';

import {getLogger} from 'Util/Logger';

import {reducers} from './module/reducer';

const logger = getLogger('redux');

const configureStore = (thunkArguments: object = {}) => {
  const store = createStore(combineReducers(reducers), undefined, createMiddleware(thunkArguments));

  if (process.env.NODE_ENV !== 'production') {
    if (module.hot) {
      module.hot.accept('./module/reducer/index.ts', () => {
        store.replaceReducer(combineReducers(require('./module/reducer/index.ts').default) as any);
      });
    }
  }

  return store;
};

const createLoggerMiddleware = (): Middleware => _store => next => (action: any) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.development.debug('Action dispatched', {
      action: action?.type ?? 'unknown',
      payload: action,
    });
  }
  return next(action);
};

const createMiddleware = (thunkArguments: object) => {
  const middlewares = [withExtraArgument(thunkArguments), createLoggerMiddleware()];
  return applyMiddleware(...middlewares);
};

export {configureStore};
