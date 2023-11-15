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
import {container} from 'tsyringe';

import {Core} from 'src/script/service/CoreSingleton';
import {base64ToArray} from 'Util/util';

function getE2EIdentityService() {
  return container.resolve(Core).service?.e2eIdentity;
}

/**
 * @param groupId id of the group
 * @param clientIdsWithUser client ids with user data
 * Returns devices E2EI certificates
 */
export async function getUserDeviceEntities(
  groupId: string | Uint8Array,
  clientIdsWithUser: Record<string, QualifiedId>,
) {
  return getE2EIdentityService()?.getUserDeviceEntities(groupId, clientIdsWithUser);
}

export async function getConversationState(groupId: string) {
  return getE2EIdentityService()?.getConversationState(base64ToArray(groupId));
}
/**
 * Checks if E2EI has active certificate.
 */
export function hasActiveCertificate() {
  return getE2EIdentityService()?.hasActiveCertificate();
}

/**
 * returns E2EI certificate data.
 */
export function getCertificateData() {
  if (!hasActiveCertificate()) {
    return undefined;
  }

  return getE2EIdentityService()?.getCertificateData();
}
