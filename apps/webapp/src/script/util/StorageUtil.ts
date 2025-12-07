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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {amplify} from 'amplify';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

export function loadValue<T>(key: string): T | undefined {
  return amplify.store(key);
}

export function resetStoreValue(key: string): void {
  return storeValue(key, null);
}

export function storeValue(key: string, value: any, secondsToExpire?: number): void {
  const config = secondsToExpire ? {expires: secondsToExpire * TIME_IN_MILLIS.SECOND} : undefined;
  return amplify.store(key, value, config);
}

export function constructUserPrimaryKey({id, domain}: QualifiedId): string {
  if (domain) {
    return `${domain}@${id}`;
  }
  return id;
}
