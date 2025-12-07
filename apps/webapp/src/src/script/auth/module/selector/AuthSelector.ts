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

import type {TeamData} from '@wireapp/api-client/lib/team/';

import type {RootState} from '../reducer';
import type {RegistrationDataState} from '../reducer/authReducer';

const unsetTeam: TeamData = {
  creator: '',
  icon: '',
  id: '',
  name: '',
};

const unsetRegistrationData: RegistrationDataState = {
  accent_id: 0,
  assets: [],
  email: '',
  email_code: '',
  invitation_code: '',
  label: '',
  locale: '',
  name: '',
  password: '',
  team: unsetTeam,
  termsAccepted: false,
  customBackendURL: '',
  accountCreationEnabled: false,
  shouldDisplayWarning: false,
  privacyPolicyAccepted: false,
};

export const isAuthenticated = (state: RootState) => state.authState.isAuthenticated;
export const isFetching = (state: RootState) => state.authState.fetching;
export const isSendingTwoFactorCode = (state: RootState) => state.authState.isSendingTwoFactorCode;
export const isFetchingSSOSettings = (state: RootState) => state.authState.fetchingSSOSettings;
export const getDefaultSSOCode = (state: RootState) => state.authState.ssoSettings?.default_sso_code;
export const hasDefaultSSOCode = (state: RootState) => !!state.authState.ssoSettings?.default_sso_code;
export const getError = (state: RootState) => state.authState.error;
export const getLoginData = (state: RootState) => state.authState.loginData;
export const getEntropy = (state: RootState) => state.authState.entropy;
export const getAccount = (state: RootState): RegistrationDataState => state.authState.account || unsetRegistrationData;
export const getAccountTeam = (state: RootState) => getAccount(state).team || unsetTeam;
export const getAccountTeamName = (state: RootState) => getAccountTeam(state).name;
