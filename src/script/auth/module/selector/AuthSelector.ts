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

import type {TeamData} from '@wireapp/api-client/src/team';

import type {RootState} from '../reducer';
import type {RegistrationDataState} from '../reducer/authReducer';

export const REGISTER_FLOW = {
  GENERIC_INVITATION: 'REGISTER_FLOW_GENERIC_INVITATION',
  PERSONAL: 'REGISTER_FLOW_PERSONAL',
  TEAM: 'REGISTER_FLOW_TEAM',
};

const unsetRegistrationData: RegistrationDataState = {
  accent_id: 0,
  assets: [],
  email: undefined,
  email_code: undefined,
  invitation_code: undefined,
  label: undefined,
  locale: undefined,
  name: undefined,
  password: undefined,
  phone: undefined,
  phone_code: undefined,
  team: undefined,
  termsAccepted: false,
};

const unsetTeam: TeamData = {
  binding: undefined,
  creator: undefined,
  icon: undefined,
  id: undefined,
  name: undefined,
};

export const isAuthenticated = (state: RootState) => state.authState.isAuthenticated;
export const isFetching = (state: RootState) => state.authState.fetching;
export const isFetchingSSOSettings = (state: RootState) => state.authState.fetchingSSOSettings;
export const getDefaultSSOCode = (state: RootState) => state.authState.ssoSettings?.default_sso_code;
export const hasDefaultSSOCode = (state: RootState) => !!state.authState.ssoSettings?.default_sso_code;
export const getError = (state: RootState) => state.authState.error;
export const getLoginData = (state: RootState) => state.authState.loginData;
export const getCurrentFlow = (state: RootState) => state.authState.currentFlow;
export const getAccount = (state: RootState): RegistrationDataState => state.authState.account || unsetRegistrationData;
export const getAccountTeam = (state: RootState) => getAccount(state).team || unsetTeam;
export const getAccountTeamName = (state: RootState) => getAccountTeam(state).name;

export const isGenericInvitationFlow = (state: RootState) => getCurrentFlow(state) === REGISTER_FLOW.GENERIC_INVITATION;
export const isPersonalFlow = (state: RootState) => getCurrentFlow(state) === REGISTER_FLOW.PERSONAL;
export const isTeamFlow = (state: RootState) => getCurrentFlow(state) === REGISTER_FLOW.TEAM;
