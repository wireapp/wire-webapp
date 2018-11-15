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

import {Self} from '@wireapp/api-client/dist/commonjs/self';
import * as config from '../../config';
import {RootState} from '../reducer';

const unsetSelf: Self = {
  accent_id: undefined,
  assets: [],
  expires_at: undefined,
  handle: undefined,
  id: undefined,
  locale: undefined,
  name: undefined,
  sso_id: undefined,
  team: undefined,
};

export const getConsents = (state: RootState) => state.selfState.consents || {};
export const getSelf = (state: RootState) => state.selfState.self || unsetSelf;
export const getSelfError = (state: RootState) => state.selfState.error;
export const getSelfHandle = (state: RootState) => getSelf(state).handle;
export const getSelfName = (state: RootState) => getSelf(state).name;
export const getSelfTeamId = (state: RootState) => getSelf(state).team;
export const hasSelfHandle = (state: RootState) => !!getSelf(state).handle;
export const isFetching = (state: RootState) => state.selfState.fetching;
export const isSSOUser = (state: RootState) => !!getSelf(state).sso_id;
export const isTemporaryGuest = (state: RootState) => !!getSelf(state).expires_at;
const getConsent = (state: RootState, consentType: number) => getConsents(state)[consentType];
export const hasUnsetConsent = (state: RootState, consentType: number) =>
  !config.FEATURE.CHECK_CONSENT ? false : getConsent(state, consentType) === undefined;
