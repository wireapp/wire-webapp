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
import {DeviceIdentity} from '@wireapp/core/lib/messagingProtocols/mls';
import {container} from 'tsyringe';

import {Core} from 'src/script/service/CoreSingleton';
import {base64ToArray} from 'Util/util';

import {mapMLSStatus} from './certificateDetails';

import {ConversationState} from '../conversation/ConversationState';

export enum MLSStatuses {
  VALID = 'valid',
  NOT_DOWNLOADED = 'not_downloaded',
  EXPIRED = 'expired',
  EXPIRES_SOON = 'expires_soon',
  REVOKED = 'revoked',
}

export type WireIdentity = Omit<DeviceIdentity, 'status'> & {
  status: MLSStatuses;
};

export function getCertificateDetails(identity: WireIdentity) {
  const currentDate = new Date();
  const timeRemainingMS = new Date(Number(identity.notAfter)).getTime() - currentDate.getTime();
  const certificateCreationTime = new Date(Number(identity.notBefore)).getTime();

  return {
    timeRemainingMS,
    certificateCreationTime,
  };
}

export function getE2EIdentityService() {
  const e2eIdentityService = container.resolve(Core).service?.e2eIdentity;
  if (!e2eIdentityService) {
    throw new Error('trying to query E2EIdentity data in an non-e2eidentity environment');
  }
  return e2eIdentityService;
}

function mapUserIdentities(userVerifications: Map<string, DeviceIdentity[]>): Map<string, WireIdentity[]> {
  const mappedUsers = new Map<string, WireIdentity[]>();

  for (const [userId, identities] of userVerifications.entries()) {
    mappedUsers.set(
      userId,
      identities.map(identity => ({...identity, status: mapMLSStatus(identity.status)})),
    );
  }

  return mappedUsers;
}

export async function getUsersIdentities(groupId: string, userIds: QualifiedId[]) {
  const userVerifications = await getE2EIdentityService().getUsersIdentities(groupId, userIds);
  return mapUserIdentities(userVerifications);
}

export async function getAllGroupUsersIdentities(groupId: string) {
  const userVerifications = await getE2EIdentityService().getAllGroupUsersIdentities(groupId);
  return mapUserIdentities(userVerifications);
}

export async function getConversationVerificationState(groupId: string) {
  return getE2EIdentityService().getConversationState(base64ToArray(groupId));
}

/**
 * Checks if E2EI has active certificate.
 */
const fetchSelfDeviceIdentity = async (): Promise<WireIdentity | undefined> => {
  const conversationState = container.resolve(ConversationState);
  const selfMLSConversation = conversationState.getSelfMLSConversation();
  const userIdentities = await getAllGroupUsersIdentities(selfMLSConversation.groupId);
  const currentClientId = selfMLSConversation.selfUser()?.localClient?.id;
  const userId = selfMLSConversation.selfUser()?.id;

  if (userId && currentClientId) {
    const identity = userIdentities.get(userId)?.find(identity => identity.deviceId === currentClientId);
    return identity;
  }
  return undefined;
};

export async function hasActiveCertificate(): Promise<boolean> {
  // isE2EIEnabled() is the name of the CC method that tells us if a user has a valid certificate (and is enrolled to E2EI)
  return getE2EIdentityService().isE2EIEnabled();
}

export async function getActiveWireIdentity(): Promise<WireIdentity | undefined> {
  const selfDeviceIdentity = await fetchSelfDeviceIdentity();

  if (!selfDeviceIdentity) {
    return undefined;
  }

  return selfDeviceIdentity;
}

export async function isFreshMLSSelfClient() {
  return getE2EIdentityService().isFreshMLSSelfClient();
}
