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

import type {RootState} from '../reducer';

export const isFetching = (state: RootState) => state.conversationState.fetching;
export const getError = (state: RootState) => state.conversationState.error;
export const conversationInfo = (state: RootState) => state.conversationState.conversationInfo;
export const conversationInfoError = (state: RootState) => state.conversationState.conversationInfoError;
export const conversationInfoFetching = (state: RootState) => state.conversationState.conversationInfoFetching;
