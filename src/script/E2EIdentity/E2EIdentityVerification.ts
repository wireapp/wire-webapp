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
import {WireIdentity as CoreWireIdentity} from '@wireapp/core/lib/messagingProtocols/mls';
import {container} from 'tsyringe';

import {Core} from 'src/script/service/CoreSingleton';
import {base64ToArray, supportsMLS} from 'Util/util';

import {mapMLSStatus} from './certificateDetails';

import {Config} from '../Config';

export enum MLSStatuses {
  VALID = 'valid',
  NOT_DOWNLOADED = 'not_downloaded',
  EXPIRED = 'expired',
  EXPIRES_SOON = 'expires_soon',
}

export type WireIdentity = Omit<CoreWireIdentity, 'status' | 'free'> & {
  status: MLSStatuses;
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
): Promise<WireIdentity | undefined> {
  const identities = await getE2EIdentityService().getUserDeviceEntities(groupId, {[deviceId]: userId});
  if (identities?.length && identities[0]) {
    return {
      ...identities[0],
      status: mapMLSStatus(identities[0].status),
    };
  }
  return undefined;
}

// TODO: replace implementation with CoreCrypto once it has user verification method
export async function getUsersVerificationState(groupId: string, userIds: QualifiedId[]) {
  const userVerifications = await getE2EIdentityService().getUsersIdentities(groupId, userIds);

  const mappedUsers = new Map<string, WireIdentity[]>();

  for (const [userId, identities] of userVerifications.entries()) {
    mappedUsers.set(
      userId,
      identities.map(identity => ({...identity, status: mapMLSStatus(identity.status)})),
    );
  }

  return mappedUsers;
}

export async function getUserVerificationState(groupId: string, userId: QualifiedId) {
  const usersVerifications = await getUsersVerificationState(groupId, [userId]);
  return usersVerifications.get(userId.id)?.some(identity => identity.status !== MLSStatuses.VALID)
    ? MLSStatuses.NOT_DOWNLOADED
    : MLSStatuses.VALID;
}

export async function getConversationVerificationState(groupId: string) {
  return getE2EIdentityService().getConversationState(base64ToArray(groupId));
}

/**
 * Checks if E2EI has active certificate.
 */
export function hasActiveCertificate() {
  return getE2EIdentityService().hasActiveCertificate();
}
