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
import {StringifiedQualifiedId, stringifyQualifiedId} from '@wireapp/core/lib/util/qualifiedIdUtil';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {Core} from 'src/script/service/CoreSingleton';
import {container} from 'tsyringe';
import {base64ToArray} from 'Util/util';

import {mapMLSStatus, MLSStatuses} from './mlsStatus';

export {MLSStatuses};

export type WireIdentity = Omit<DeviceIdentity, 'status'> & {
  status: MLSStatuses;
};

export function getE2EIdentityService() {
  const e2eIdentityService = container.resolve(Core).service?.e2eIdentity;
  if (!e2eIdentityService) {
    throw new Error('trying to query E2EIdentity data in an non-e2eidentity environment');
  }
  return e2eIdentityService;
}

export function getCoreConversationService() {
  const conversationService = container.resolve(Core).service?.conversation;
  if (!conversationService) {
    throw new Error('Conversation service not available');
  }
  return conversationService;
}

function mapUserIdentities(
  userVerifications: Map<StringifiedQualifiedId, DeviceIdentity[]>,
): Map<StringifiedQualifiedId, WireIdentity[]> {
  const mappedUsers = new Map<StringifiedQualifiedId, WireIdentity[]>();

  for (const [stringifiedQualifiedId, identities] of userVerifications.entries()) {
    mappedUsers.set(
      stringifiedQualifiedId,
      identities.map(identity => ({...identity, status: mapMLSStatus(identity.status)})),
    );
  }

  return mappedUsers;
}

export async function getUsersIdentities(groupId: string, userIds: QualifiedId[]) {
  const userVerifications = await getE2EIdentityService().getUsersIdentities(groupId, userIds);
  return userVerifications && mapUserIdentities(userVerifications);
}

export async function getAllGroupUsersIdentities(groupId: string) {
  const userVerifications = await getE2EIdentityService().getAllGroupUsersIdentities(groupId);
  return userVerifications && mapUserIdentities(userVerifications);
}

export async function getConversationVerificationState(groupId: string) {
  return getE2EIdentityService().getConversationState(base64ToArray(groupId));
}

/**
 * Checks if E2EI has active certificate.
 */
const getSelfDeviceIdentity = async (): Promise<WireIdentity | undefined> => {
  const conversationState = container.resolve(ConversationState);

  // Try to get the self MLS conversation from the conversation state
  // If the conversation state is not available, try to get the self MLS conversation from backend
  const selfMLSConversationGroupId =
    conversationState.selfMLSConversation()?.groupId ??
    (await getCoreConversationService().getMLSSelfConversation()).group_id;

  const userIdentities = await getAllGroupUsersIdentities(selfMLSConversationGroupId);

  if (!userIdentities) {
    return undefined;
  }

  const core = container.resolve(Core);

  const currentClientId = core.clientId;
  const userId = {id: core.userId, domain: core.backendFeatures.domain};

  if (userId && currentClientId) {
    const identity = userIdentities
      .get(stringifyQualifiedId(userId))
      ?.find(identity => identity.deviceId === currentClientId);
    return identity;
  }
  return undefined;
};

export async function hasActiveCertificate(): Promise<boolean> {
  // isE2EIEnabled() is the name of the CC method that tells us if a user has a valid certificate (and is enrolled to E2EI)
  return getE2EIdentityService().isE2EIEnabled();
}

export async function getActiveWireIdentity(): Promise<WireIdentity | undefined> {
  const selfDeviceIdentity = await getSelfDeviceIdentity();

  if (!selfDeviceIdentity) {
    return undefined;
  }

  return selfDeviceIdentity;
}

export async function isFreshMLSSelfClient() {
  return getE2EIdentityService().isFreshMLSSelfClient();
}
