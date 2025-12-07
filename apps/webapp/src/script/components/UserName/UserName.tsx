/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {User} from 'Repositories/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

interface UserNameProps {
  user: User;
}

/**
 * will return the name of the user, if available, otherwise a string indicating that the user is unavailable
 * @param user the user to get the name for
 */
export function useUserName(user: User) {
  const {isAvailable, name} = useKoSubscribableChildren(user, ['isAvailable', 'name']);
  return isAvailable ? name : t('unavailableUser');
}

/**
 * same as above, but using the current value of isAvailable and name instead of the knockout subscribable
 * @param user the user to get the name for
 */
export function getUserName(user: User) {
  return user.isAvailable() ? user.name() : t('unavailableUser');
}

/**
 * component that will display the username, if available, otherwise a string indicating that the user is unavailable
 */
export function UserName({user}: UserNameProps) {
  return useUserName(user);
}
