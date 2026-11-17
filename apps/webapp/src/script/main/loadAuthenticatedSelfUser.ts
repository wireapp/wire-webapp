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

import type {QualifiedId} from '../apiClient/user/qualifiedId';

type AuthenticatedSelfUser = {readonly qualifiedId: Readonly<QualifiedId>};

type LoadAuthenticatedSelfUserOptions<SelfUser extends AuthenticatedSelfUser> = {
  readonly getSelf: () => Promise<SelfUser>;
  readonly onAuthenticatedAccount: (qualifiedId: Readonly<QualifiedId>) => Promise<void>;
};

export async function loadAuthenticatedSelfUser<SelfUser extends AuthenticatedSelfUser>(
  options: LoadAuthenticatedSelfUserOptions<SelfUser>,
): Promise<SelfUser> {
  const {getSelf, onAuthenticatedAccount} = options;
  const selfUser = await getSelf();
  try {
    await onAuthenticatedAccount(selfUser.qualifiedId);
  } catch {
    // Optional identity observers cannot invalidate a successfully authenticated user.
  }

  return selfUser;
}
