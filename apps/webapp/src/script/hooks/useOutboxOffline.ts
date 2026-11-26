/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {useNoInternetState} from '../view_model/WarningsContainer/noInternetState';

/**
 * Whether the app is offline with the outbox on; always `false` with the outbox off, so that nothing changes there.
 * It takes the toggle instead of reading the application context, which would tie every caller to a module cycle.
 */
export const useOutboxOffline = (isOutboxEnabled: boolean): boolean => {
  const hasNoInternet = useNoInternetState(state => {
    return state.hasNoInternet;
  });

  return isOutboxEnabled && hasNoInternet;
};
