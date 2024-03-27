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
import type {QualifiedUserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {RecursivePartial} from '@wireapp/commons/lib/util/TypeUtil';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
import {HashRouter as Router} from 'react-router-dom';
import {AnyAction} from 'redux';
import {MockStoreEnhanced} from 'redux-mock-store';
import {ThunkDispatch} from 'redux-thunk';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {User} from 'src/script/entity/User';
import {createUuid} from 'Util/uuid';

import {Api, RootState} from '../../module/reducer';

const withStore = (
  children: React.ReactNode,
  store: MockStoreEnhanced<RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
) => <Provider store={store}>{children}</Provider>;

const withRouter = (component: React.ReactNode) => <Router>{component}</Router>;

export const withIntl = (component: React.ReactNode) => <IntlProvider locale="en">{component}</IntlProvider>;

export const withTheme = (component: React.ReactNode) => <StyledApp themeId={THEME_ID.DEFAULT}>{component}</StyledApp>;

const wrapComponent = (
  component: React.ReactNode,
  store: MockStoreEnhanced<RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
) => withRouter(withTheme(withStore(withIntl(component), store)));

export const mountComponent = (
  component: React.ReactNode,
  store: MockStoreEnhanced<RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
) => render(wrapComponent(component, store));

export function generateUsers(nbUsers: number, domain: string) {
  const users: User[] = [];
  for (let i = 0; i < nbUsers; i++) {
    const user = new User(createUuid(), domain);
    user.name(`User ${i}`);
    users.push(user);
  }
  return users;
}

export function generateUserClients(users: User[]): QualifiedUserClients {
  const userClients: QualifiedUserClients = {};
  users.forEach(user => {
    const domainUsers = userClients[user.qualifiedId.domain] || {};
    domainUsers[user.qualifiedId.id] = [];
    userClients[user.qualifiedId.domain] = domainUsers;
  });
  return userClients;
}

export function generateQualifiedIds(nbUsers: number, domain: string) {
  const users: QualifiedId[] = [];
  for (let i = 0; i < nbUsers; i++) {
    users.push({id: createUuid(), domain});
  }
  return users;
}
