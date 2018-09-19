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

export const REGISTER_FLOW = {
  GENERIC_INVITATION: 'REGISTER_FLOW_GENERIC_INVITATION',
  PERSONAL: 'REGISTER_FLOW_PERSONAL',
  PERSONAL_INVITATION: 'REGISTER_FLOW_PERSONAL_INVITATION',
  TEAM: 'REGISTER_FLOW_TEAM',
};

export const getAccessToken = state => state.authState.accesstoken;
export const isAuthenticated = state => state.authState.isAuthenticated;
export const isFetching = state => state.authState.fetching;
export const getError = state => state.authState.error;
export const getCurrentFlow = state => state.authState.currentFlow;
export const getAccount = state => state.authState.account || {};
export const getAccountTeam = state => getAccount(state).team || {};
export const getAccountTeamName = state => getAccountTeam(state).name;

export const isGenericInvitationFlow = state => getCurrentFlow(state) === REGISTER_FLOW.GENERIC_INVITATION;
export const isPersonalFlow = state => getCurrentFlow(state) === REGISTER_FLOW.PERSONAL;
export const isPersonalInvitationFlow = state => getCurrentFlow(state) === REGISTER_FLOW.PERSONAL_INVITATION;
export const isTeamFlow = state => getCurrentFlow(state) === REGISTER_FLOW.TEAM;
