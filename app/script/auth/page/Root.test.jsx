/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
import configureStore from 'redux-mock-store';
import React from 'react';
import renderer from 'react-test-renderer';
import {Provider} from 'react-redux';
import Root from './Root';
import thunk from 'redux-thunk';

const middleWares = [thunk.withExtraArgument()];
const mockStore = configureStore(middleWares);
const withStore = (children, store) => <Provider store={store}>{children}</Provider>;

describe('Root', () => {
  it('renders the Wire logo', () => {
    const state = {
      authState: {
        name: 'bob',
      },
      languageState: {
        language: 'en',
      },
    };

    const markup = <Root />;
    const store = mockStore(state);
    const component = renderer.create(withStore(markup, store));

    const tree = component.toJSON();
    expect(tree.type).toBe('div');
  });
});
