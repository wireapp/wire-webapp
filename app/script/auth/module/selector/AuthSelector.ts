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

import {RootState} from '../reducer';

export const REGISTER_FLOW = {
  GENERIC_INVITATION: 'REGISTER_FLOW_GENERIC_INVITATION',
  PERSONAL: 'REGISTER_FLOW_PERSONAL',
  PERSONAL_INVITATION: 'REGISTER_FLOW_PERSONAL_INVITATION',
  TEAM: 'REGISTER_FLOW_TEAM',
};

export const isAuthenticated = (state: RootState) => state.authState.isAuthenticated;
export const isFetching = (state: RootState) => state.authState.fetching;
export const getError = (state: RootState) => state.authState.error;
export const getCurrentFlow = (state: RootState) => state.authState.currentFlow;
export const getAccount = (state: RootState) => state.authState.account || {team: {}};
export const getAccountTeam = (state: RootState) => getAccount(state).team || {};
export const getAccountTeamName = (state: RootState) => getAccountTeam(state).name;

export const isGenericInvitationFlow = (state: RootState) => getCurrentFlow(state) === REGISTER_FLOW.GENERIC_INVITATION;
export const isPersonalFlow = (state: RootState) => getCurrentFlow(state) === REGISTER_FLOW.PERSONAL;
export const isPersonalInvitationFlow = (state: RootState) =>
  getCurrentFlow(state) === REGISTER_FLOW.PERSONAL_INVITATION;
export const isTeamFlow = (state: RootState) => getCurrentFlow(state) === REGISTER_FLOW.TEAM;
