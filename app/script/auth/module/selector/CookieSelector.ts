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

import {APP_INSTANCE_ID} from '../../config';
import {RootState} from '../reducer';

export const COOKIE_NAME_APP_OPENED = 'app_opened';

export const isAppAlreadyOpen = (state: RootState) => {
  const selectedCookie: {[key: string]: any} = getCookies(state)[COOKIE_NAME_APP_OPENED];
  // eslint-disable-next-line dot-notation
  return selectedCookie ? selectedCookie['appInstanceId'] !== APP_INSTANCE_ID : false;
};
export const getCookies = (state: RootState): {[key: string]: object} => state.cookieState.cookies || {};
export const isFetching = (state: RootState) => state.cookieState.fetching;
export const getError = (state: RootState) => state.cookieState.error;
