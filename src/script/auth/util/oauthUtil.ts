/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {OAuthBody} from '@wireapp/api-client/lib/oauth/OAuthBody';

import {Scope} from '../page/OAuthPermissions';

/**
 *  Takes the oauth parameters and returns the oauth object expected by the API.
 * @param location window.location
 * @returns OAuthBody
 */
export const oAuthParams = (location: Location) => {
  const params = new URLSearchParams(location.search);
  return Object.fromEntries(params) as unknown as OAuthBody;
};

/**
 * Takes the oauth body and returns the scopes as an array of Scopes accepted by the app.
 * @param oauthBody oauth body object
 * @returns Scope[]
 */
export const oAuthScope = (oauthBody: OAuthBody) =>
  oauthBody.scope.split(/\+|%20|\s/).filter(scope => Object.values(Scope).includes(scope as Scope)) as Scope[];
