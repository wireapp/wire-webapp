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
import React from 'react';
import Root from './Root';
import {Provider} from 'react-redux';
import {mount} from 'enzyme';

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

describe('Root', () => {
  it('should render logo', () => {
    const component = mount(
      withStore(
        <Root />,
        mockStore()({
          authState: {
            name: 'bob',
          },
          languageState: {
            language: 'en',
          },
        })
      )
    );
    console.log('component', component.html());
    expect(component.find('#wire-logo').exists()).toBe(true);
  });
});

const withStore = (children, store) => {
  return <Provider store={store}>{children}</Provider>;
};

const mockStore = () => configureStore([thunk.withExtraArgument()]);
