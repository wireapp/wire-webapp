/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {PreKey} from '@wireapp/api-client/lib/auth';
import {UserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId, UserPreKeyBundleMap} from '@wireapp/api-client/lib/user';
import {CoreCrypto} from '@wireapp/core-crypto/platforms/web/corecrypto';
import {Decoder} from 'bazinga64';
import {Logger} from 'logdown';

import {APIClient} from '@wireapp/api-client';

import {SessionId} from './SessionHandler.types';

import {flattenUserClients} from '../../../../conversation/message/UserClientsUtil';

interface ConstructSessionIdParams {
  userId: string | QualifiedId;
  clientId: string;
  useQualifiedIds: boolean;
  domain?: string;
}

const constructSessionId = ({userId, clientId, useQualifiedIds, domain}: ConstructSessionIdParams): string => {
  const id = typeof userId === 'string' ? userId : userId.id;
  const baseDomain = typeof userId === 'string' ? domain : userId.domain;
  const baseId = `${id}@${clientId}`;
  return baseDomain && useQualifiedIds ? `${baseDomain}@${baseId}` : baseId;
};

const isSessionId = (object: any): object is SessionId => {
  return object.userId && object.clientId;
};

/**
 * Splits a sessionId into userId, clientId & domain (if any).
 */
const parseSessionId = (sessionId: string): SessionId => {
  // see https://regex101.com/r/c8FtCw/1
  const regex = /((?<domain>.+)@)?(?<userId>.+)@(?<clientId>.+)$/g;
  const match = regex.exec(sessionId);
  if (!match || !isSessionId(match.groups)) {
    throw new Error(`given session id "${sessionId}" has wrong format`);
  }
  return match.groups;
};

interface CreateSessionParams {
  coreCrypto: CoreCrypto;
  apiClient: APIClient;
  sessionId: string;
  initialPrekey?: PreKey;
}
const createSession = async ({sessionId, initialPrekey, coreCrypto, apiClient}: CreateSessionParams): Promise<void> => {
  const {userId, clientId, domain} = parseSessionId(sessionId);
  const prekey =
    initialPrekey ?? (await apiClient.api.user.getClientPreKey({id: userId, domain: domain ?? ''}, clientId)).prekey;
  const prekeyBuffer = Decoder.fromBase64(prekey.key).asBytes;
  await coreCrypto.proteusSessionFromPrekey(sessionId, prekeyBuffer);
  await coreCrypto.proteusSessionSave(sessionId);
};

interface CreateSessionsBase {
  apiClient: APIClient;
  coreCrypto: CoreCrypto;
  logger?: Logger;
}

interface CreateLegacySessionsProps extends CreateSessionsBase {
  userClients: UserClients;
}

const createLegacySessions = async ({
  userClients,
  apiClient,
  coreCrypto,
  logger,
}: CreateLegacySessionsProps): Promise<string[]> => {
  const preKeyBundleMap = await apiClient.api.user.postMultiPreKeyBundles(userClients);
  const sessions = await createSessionsFromPreKeys({
    preKeyBundleMap,
    useQualifiedIds: false,
    coreCrypto,
    logger,
  });

  return sessions;
};

interface CreateQualifiedSessionsProps extends CreateSessionsBase {
  userClientMap: UserClients;
  domain: string;
}

/**
 * Create sessions for the qualified clients.
 * @param {userClientMap} map of domain to (map of user IDs to client IDs)
 */
const createQualifiedSessions = async ({
  userClientMap,
  domain,
  apiClient,
  coreCrypto,
  logger,
}: CreateQualifiedSessionsProps): Promise<string[]> => {
  const prekeyBundleMap = await apiClient.api.user.postQualifiedMultiPreKeyBundles({[domain]: userClientMap});

  const sessions: string[] = [];

  for (const domain in prekeyBundleMap) {
    const domainUsers = prekeyBundleMap[domain];

    const domainSessions = await createSessionsFromPreKeys({
      preKeyBundleMap: domainUsers,
      domain,
      useQualifiedIds: true,
      coreCrypto,
      logger,
    });
    sessions.push(...domainSessions);
  }

  return sessions;
};

interface CreateSessionsProps extends CreateSessionsBase {
  userClientMap: UserClients;
  domain?: string;
}

/**
 * Will make sure the session is available in coreCrypto
 * @param sessionId the session to init
 */
const initSession = async (
  {userId, clientId, initialPrekey}: {userId: QualifiedId; clientId: string; initialPrekey?: PreKey},
  {coreCrypto, apiClient}: {apiClient: APIClient; coreCrypto: CoreCrypto},
): Promise<string> => {
  const sessionId = constructSessionId({userId, clientId, useQualifiedIds: !!userId.domain});
  const sessionExists = await coreCrypto.proteusSessionExists(sessionId);
  if (!sessionExists) {
    await createSession({
      sessionId,
      initialPrekey,
      apiClient: apiClient,
      coreCrypto,
    });
  }
  return sessionId;
};

/**
 * Create sessions for legacy/qualified clients (umberella function).
 * Will call createQualifiedSessions or createLegacySessions based on passed userClientMap.
 * @param {userClientMap} map of domain to (map of user IDs to client IDs) or map of user IDs containg the lists of clients
 */
const createSessions = async ({
  userClientMap,
  domain,
  apiClient,
  coreCrypto,
  logger,
}: CreateSessionsProps): Promise<string[]> => {
  if (domain) {
    return await createQualifiedSessions({userClientMap, domain, apiClient, coreCrypto, logger});
  }
  return await createLegacySessions({
    userClients: userClientMap,
    apiClient,
    coreCrypto,
    logger,
  });
};

interface GetSessionsAndClientsFromRecipientsProps {
  recipients: UserClients | UserPreKeyBundleMap;
  domain?: string;
  apiClient: APIClient;
  coreCrypto: CoreCrypto;
  logger?: Logger;
}

/**
 * Will make sure all the sessions need to encrypt for those user/clients pair are set
 */
const initSessions = async ({
  recipients,
  domain = '',
  apiClient,
  coreCrypto,
  logger,
}: GetSessionsAndClientsFromRecipientsProps): Promise<string[]> => {
  const missingUserClients: UserClients = {};
  const existingSessions: string[] = [];
  const users = flattenUserClients<string[] | Record<string, unknown>>(recipients, domain);

  for (const user of users) {
    const {userId, data} = user;
    const clients = Array.isArray(data) ? data : Object.keys(data);
    for (const clientId of clients) {
      const sessionId = constructSessionId({userId, clientId, useQualifiedIds: !!domain});
      if (await coreCrypto.proteusSessionExists(sessionId)) {
        existingSessions.push(sessionId);
        continue;
      }
      missingUserClients[userId.id] = missingUserClients[userId.id] || [];
      missingUserClients[userId.id].push(clientId);
    }
  }

  if (Object.keys(missingUserClients).length === 0) {
    return existingSessions;
  }

  const newSessions = await createSessions({
    userClientMap: missingUserClients,
    domain,
    apiClient,
    coreCrypto,
    logger,
  });

  return [...existingSessions, ...newSessions];
};

interface DeleteSessionParams {
  userId: QualifiedId;
  clientId: string;
  coreCrypto: CoreCrypto;
  useQualifiedIds: boolean;
}
function deleteSession(params: DeleteSessionParams) {
  const sessionId = constructSessionId(params);
  return params.coreCrypto.proteusSessionDelete(sessionId);
}

interface CreateSessionsFromPreKeysProps {
  preKeyBundleMap: UserPreKeyBundleMap;
  coreCrypto: CoreCrypto;
  useQualifiedIds: boolean;
  domain?: string;
  logger?: Logger;
}

const createSessionsFromPreKeys = async ({
  preKeyBundleMap,
  domain = '',
  useQualifiedIds,
  coreCrypto,
  logger,
}: CreateSessionsFromPreKeysProps): Promise<string[]> => {
  const sessions: string[] = [];

  for (const userId in preKeyBundleMap) {
    const userClients = preKeyBundleMap[userId];

    for (const clientId in userClients) {
      const sessionId = constructSessionId({userId, clientId, domain, useQualifiedIds});
      const prekey = userClients[clientId];

      if (!prekey) {
        logger?.warn(
          `A prekey for client ${clientId} of user ${userId}${
            domain ? ` on domain ${domain}` : ''
          } was not found, session won't be created.`,
        );
        continue;
      }

      const prekeyBuffer = Decoder.fromBase64(prekey.key).asBytes;

      await coreCrypto.proteusSessionFromPrekey(sessionId, prekeyBuffer);
      await coreCrypto.proteusSessionSave(sessionId);

      sessions.push(sessionId);
    }
  }

  return sessions;
};

type EncryptedPayloads<T> = Record<string, Record<string, T>>;
/**
 * creates an encrypted payload that can be sent to backend from a bunch of sessionIds/encrypted payload
 */
const buildEncryptedPayloads = <T>(payloads: Map<string, T>): EncryptedPayloads<T> => {
  return [...payloads].reduce((acc, [sessionId, payload]) => {
    const {userId, clientId} = parseSessionId(sessionId);
    acc[userId] = acc[userId] ?? {};
    acc[userId][clientId] = payload;
    return acc;
  }, {} as EncryptedPayloads<T>);
};

export {constructSessionId, initSession, initSessions, deleteSession, buildEncryptedPayloads};
