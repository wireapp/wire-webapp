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

export const getAccessToken = state => state.authState.accesstoken;
export const isAuthenticated = state => state.authState.isAuthenticated;
export const isFetching = state => state.authState.fetching;
export const getError = state => state.authState.error;
export const isInTeamFlow = state => state.authState.isInTeamFlow;

export const getAccount = state => state.authState.account || {};
export const getAccountTeam = state => getAccount(state).team || {};
export const getAccountTeamName = state => getAccountTeam(state).name;
