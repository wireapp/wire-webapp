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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {constructFullyQualifiedClientId} from '@wireapp/core/lib/util/fullyQualifiedClientIdUtils';

const e2eActivatedAtKey = 'e2eActivatedAt';
const e2eTimer = 'e2eTimer';

interface EnrollmentStore {
  store: {
    e2eiActivatedAt: (time: number) => void;
    timer: (time: number) => void;
  };
  get: {
    e2eiActivatedAt: () => number;
    timer: () => number;
  };
  clear: {
    deviceCreatedAt: () => void;
    timer: () => void;
  };
}

export const getEnrollmentStore = ({id: userId, domain}: QualifiedId, clientId: string): EnrollmentStore => {
  const clientStoreId = constructFullyQualifiedClientId(userId, clientId, domain);
  const constructKey = (key: string) => `${clientStoreId}_${key}`;

  return {
    store: {
      e2eiActivatedAt: (time: number) => localStorage.setItem(constructKey(e2eActivatedAtKey), String(time)),
      timer: (time: number) => localStorage.setItem(constructKey(e2eTimer), String(time)),
    },
    get: {
      e2eiActivatedAt: () => Number(localStorage.getItem(constructKey(e2eActivatedAtKey))),
      timer: () => Number(localStorage.getItem(constructKey(e2eTimer))),
    },
    clear: {
      deviceCreatedAt: () => localStorage.removeItem(constructKey(e2eActivatedAtKey)),
      timer: () => localStorage.removeItem(constructKey(e2eTimer)),
    },
  };
};
