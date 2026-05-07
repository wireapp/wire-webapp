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

import type {Self} from '@wireapp/api-client/lib/self/';
import {UserType} from '@wireapp/api-client/lib/user';

import {Config} from '../../../Config';
import type {RootState} from '../reducer';

const unsetSelf: Self = {
  accent_id: undefined,
  assets: [],
  expires_at: undefined,
  handle: undefined,
  id: '',
  qualified_id: {id: '', domain: ''},
  locale: '',
  name: '',
  sso_id: undefined,
  team: undefined,
  type: UserType.REGULAR,
};

export const getConsents = (state: RootState) => state.selfState.consents ?? {};
export const getSelf = (state: RootState) => state.selfState.self ?? unsetSelf;
export const getSelfError = (state: RootState) => state.selfState.error;
export const getSelfHandle = (state: RootState): string | undefined => getSelf(state).handle;
export const getSelfEmail = (state: RootState): string | undefined => getSelf(state).email;
export const getSelfName = (state: RootState): string | undefined => getSelf(state).name;
export const getSelfTeamId = (state: RootState): string | undefined => getSelf(state).team;
export const hasSelfHandle = (state: RootState) => {
  const selfHandle = getSelfHandle(state);
  return selfHandle !== undefined && selfHandle.length > 0;
};
export const hasSelfEmail = (state: RootState) => {
  const selfEmail = getSelfEmail(state);
  return selfEmail !== undefined && selfEmail.length > 0;
};
export const hasSelfPassword = (state: RootState) => state.selfState.hasPassword === true;
export const isFetching = (state: RootState) => state.selfState.fetching;
export const isSSOUser = (state: RootState) => getSelf(state).sso_id !== undefined;
export const isNoPasswordSSO = (state: RootState) => {
  const subject = getSelf(state).sso_id?.subject;
  return subject !== undefined && subject.length > 0;
};
export const isTemporaryGuest = (state: RootState) => getSelf(state).expires_at !== undefined;
const getConsent = (state: RootState, consentType: number) => getConsents(state)[consentType];
export const hasUnsetConsent = (state: RootState, consentType: number) =>
  !Config.getConfig().FEATURE.CHECK_CONSENT ? false : getConsent(state, consentType) === undefined;
