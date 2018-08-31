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

const getSelfState = state => state.selfState || {};
export const getSelf = state => getSelfState(state).self || {};
export const getSelfName = state => getSelf(state).name;
export const getSelfHandle = state => getSelf(state).handle;
export const hasSelfHandle = state => !!getSelf(state).handle;
export const isTemporaryGuest = state => !!getSelf(state).expires_at;
export const getSelfTeamId = state => getSelf(state).team;
export const getSelfError = state => getSelfState(state).error;
export const isFetching = state => getSelfState(state).fetching;
export const getConsents = state => getSelfState(state).consents || {};
const getConsent = (state, consentType) => getConsents(state)[consentType];
export const hasUnsetConsent = (state, consentType) => getConsent(state, consentType) === undefined;
