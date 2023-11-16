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
import {WireIdentity} from '@wireapp/core/lib/messagingProtocols/mls';
import {container} from 'tsyringe';

import {Core} from 'src/script/service/CoreSingleton';
import {base64ToArray, supportsMLS} from 'Util/util';
import {createUuid} from 'Util/uuid';

import {Config} from '../Config';

export type TMP_DecoratedWireIdentity = WireIdentity & {
  state: 'verified' | 'unverified';
  thumbprint: string;
};

export function getE2EIdentityService() {
  const e2eIdentityService = container.resolve(Core).service?.e2eIdentity;
  if (!e2eIdentityService) {
    throw new Error('trying to query E2EIdentity data in an non-e2eidentity environment');
  }
  return e2eIdentityService;
}

export function isE2EIEnabled(): boolean {
  return supportsMLS() && Config.getConfig().FEATURE.ENABLE_E2EI;
}

export async function getDeviceIdentity(
  groupId: string,
  userId: QualifiedId,
  deviceId: string,
): Promise<TMP_DecoratedWireIdentity | undefined> {
  const identities = await getE2EIdentityService().getUserDeviceEntities(groupId, {[deviceId]: userId});
  return identities ? {...identities[0], state: 'verified', thumbprint: createUuid()} : undefined;
}

export async function getConversationState(groupId: string) {
  return getE2EIdentityService().getConversationState(base64ToArray(groupId));
}

/**
 * Checks if E2EI has active certificate.
 */
export function hasActiveCertificate() {
  return getE2EIdentityService().hasActiveCertificate();
}
