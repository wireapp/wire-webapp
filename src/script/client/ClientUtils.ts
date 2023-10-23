/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {RegisteredClient} from '@wireapp/api-client/lib/client';

import {weeksPassedSinceDate} from 'Util/TimeUtil';

export const wasClientActiveWithinLast4Weeks = ({last_active: lastActiveISODate}: RegisteredClient): boolean => {
  //if client has not requested /notifications endpoint yet with backend supporting last_active field, we assume it is not active
  if (!lastActiveISODate) {
    return false;
  }

  const passedWeeksSinceLastActive = weeksPassedSinceDate(new Date(lastActiveISODate));
  return passedWeeksSinceLastActive <= 4;
};

/**
 * Check if client is MLS-capable device.
 * Client is considered MLS capable if it was registered and has uploaded MLS public keys.
 * @param client - client to check
 * @returns {boolean}
 */
export const isClientMLSCapable = ({mls_public_keys: mlsPublicKeys}: RegisteredClient): boolean => {
  return Object.values(mlsPublicKeys).length > 0;
};
