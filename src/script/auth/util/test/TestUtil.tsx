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

import React from 'react';

import {render} from '@testing-library/react';
import {RecursivePartial} from '@wireapp/commons/lib/util/TypeUtil';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
import {HashRouter as Router} from 'react-router-dom';
import {AnyAction} from 'redux';
import {MockStoreEnhanced} from 'redux-mock-store';
import {ThunkDispatch} from 'redux-thunk';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {Api, RootState} from '../../module/reducer';

export const withStore = (
  children: React.ReactNode,
  store: MockStoreEnhanced<RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
) => <Provider store={store}>{children}</Provider>;

export const withIntl = (component: React.ReactNode) => <IntlProvider locale="en">{component}</IntlProvider>;

export const withTheme = (component: React.ReactNode) => <StyledApp themeId={THEME_ID.DEFAULT}>{component}</StyledApp>;

export const withRouter = (component: React.ReactNode) => <Router>{component}</Router>;

const wrapComponent = (
  component: React.ReactNode,
  store: MockStoreEnhanced<RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
) => withRouter(withTheme(withStore(withIntl(component), store)));

export const mountComponent = (
  component: React.ReactNode,
  store: MockStoreEnhanced<RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
) => render(wrapComponent(component, store));
