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

export type OtherInstanceAction = 'none' | 'sign-out' | 'redirect-to-login';

type OtherInstanceState = {
  readonly hasOtherInstance: boolean;
  readonly isLoggingOut: boolean;
  readonly isAutoLoginEnabled: boolean;
};

export function getOtherInstanceAction(state: OtherInstanceState): OtherInstanceAction {
  // Logout wipes localStorage, including the single-instance marker, which looks like another tab taking over.
  // Reacting to it would replace the logout redirect (and its sign-out reason) with a multiple-tabs one.
  if (!state.hasOtherInstance || state.isLoggingOut) {
    return 'none';
  }

  return state.isAutoLoginEnabled ? 'sign-out' : 'redirect-to-login';
}
